import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { getOrCreateAssociatedTokenAccount, getAssociatedTokenAddress, getAccount, createMint, mintToChecked } from '@solana/spl-token';
import { SolanaNftStaking } from '../target/types/solana_nft_staking';
import { LootboxProgram } from '../target/types/lootbox_program'
import { PROGRAM_ID as METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { CreateNftOutput } from '@metaplex-foundation/js';
import { setupNft } from './utils/setupNft';
import { expect } from 'chai';
import { BN } from '@project-serum/anchor'
import { promiseWithTimeout, SwitchboardTestContext } from "@switchboard-xyz/sbv2-utils";
import { setupSwitchboard } from "./utils/setupSwitchboard";
import * as sbv2 from "@switchboard-xyz/switchboard-v2";

describe('Solana NFT Staking && Lootbox', () => {

  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const stakingProgram = anchor.workspace.SolanaNftStaking as Program<SolanaNftStaking>;
  const lootboxProgram = anchor.workspace.LootboxProgram as Program<LootboxProgram>;

  const wallet = anchor.workspace.SolanaNftStaking.provider.wallet;

  let nft: CreateNftOutput
  let delegatedAuthPda: anchor.web3.PublicKey
  let stakeStatePda: anchor.web3.PublicKey
  let mint: anchor.web3.PublicKey
  let mintAuth: anchor.web3.PublicKey
  let tokenAddress: anchor.web3.PublicKey

  let switchboard: SwitchboardTestContext
  let userState: anchor.web3.PublicKey
  let lootboxPointerPda: anchor.web3.PublicKey
  let permissionBump: number
  let switchboardStateBump: number
  let vrfAccount: sbv2.VrfAccount
  let switchboardStateAccount: sbv2.ProgramStateAccount
  let permissionAccount: sbv2.PermissionAccount

  before(async () => {
    ;({ nft, delegatedAuthPda, stakeStatePda, mint, mintAuth, tokenAddress } =
      await setupNft(stakingProgram, wallet.payer))
    ;({ switchboard, lootboxPointerPda, permissionBump, switchboardStateBump, vrfAccount, switchboardStateAccount, permissionAccount } =
      await setupSwitchboard(provider, lootboxProgram, wallet.payer))
  })


  /* ******************************
           STAKING PROGRAM
  ****************************** */

  it('Stake NFT', async () => {
    await stakingProgram.methods
      .stake()
      .accounts({
        nftTokenAccount: nft.tokenAddress,
        nftMint: nft.mintAddress,
        nftEdition: nft.masterEditionAddress,
        metadataProgram: METADATA_PROGRAM_ID,
      })
      .rpc()

    const account = await stakingProgram.account.userStakeInfo.fetch(stakeStatePda)
    expect(account.stakeState === 'Staked')
  })

  it('Redeem Reward', async () => {
    await stakingProgram.methods
      .redeem()
      .accounts({
        nftTokenAccount: nft.tokenAddress,
        stakeMint: mint,
        userStakeAta: tokenAddress,
      })
      .rpc()

    const account = await stakingProgram.account.userStakeInfo.fetch(stakeStatePda)
    expect(account.stakeState === 'Unstaked')
    const tokenAccount = await getAccount(provider.connection, tokenAddress)
  })

  it('Unstake NFT', async () => {
    await stakingProgram.methods
      .unstake()
      .accounts({
        nftTokenAccount: nft.tokenAddress,
        nftMint: nft.mintAddress,
        nftEdition: nft.masterEditionAddress,
        metadataProgram: METADATA_PROGRAM_ID,
        stakeMint: mint,
        userStakeAta: tokenAddress,
      })
      .rpc()

    const account = await stakingProgram.account.userStakeInfo.fetch(stakeStatePda)
    expect(account.stakeState === 'Unstaked')
  })


  /* ******************************
          LOOTBOX PROGRAM V2
  ****************************** */

  it("init user", async () => {
    const tx = await lootboxProgram.methods
      .initUser({
        switchboardStateBump: switchboardStateBump,
        vrfPermissionBump: permissionBump,
      })
      .accounts({
        state: userState,
        vrf: vrfAccount.publicKey,
        payer: wallet.pubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
  })

  it("Chooses a mint pseudorandomly", async () => {
    const mint = await createMint(
      provider.connection,
      wallet.payer,
      wallet.publicKey,
      wallet.publicKey,
      2
    )
    const ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      wallet.payer,
      mint,
      wallet.publicKey
    )

    await mintToChecked(
      provider.connection,
      wallet.payer,
      mint,
      ata.address,
      wallet.payer,
      1000,
      2
    )

    const [stakeAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [wallet.publicKey.toBuffer(), nft.tokenAddress.toBuffer()],
      stakingProgram.programId
    )

    const vrfState = await vrfAccount.loadData()
    const { authority, dataBuffer } = await switchboard.queue.loadData()

    await lootboxProgram.methods
      .openLootbox(new BN(10))
      .accounts({
        user: wallet.publicKey,
        stakeMint: mint,
        stakeMintAta: ata.address,
        stakeState: stakeAccount,
        state: userState,
        vrf: vrfAccount.publicKey,
        oracleQueue: switchboard.queue.publicKey,
        queueAuthority: authority,
        dataBuffer: dataBuffer,
        permission: permissionAccount.publicKey,
        escrow: vrfState.escrow,
        programState: switchboardStateAccount.publicKey,
        switchboardProgram: switchboard.program.programId,
        payerWallet: switchboard.payerTokenWallet,
        recentBlockhashes: anchor.web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
      })
      .rpc()

    await awaitCallback(
      lootboxProgram,
      lootboxPointerPda,
      20_000,
      "Didn't get random mint"
    )
  })

  it("Mints the selected song", async () => {
    const [pointerAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("lootbox"), wallet.publicKey.toBuffer()],
      lootboxProgram.programId
    )

    const pointer = await lootboxProgram.account.lootboxPointer.fetch(
      pointerAddress
    )

    let previousSongCount = 0
    const songATA = await getAssociatedTokenAddress(
      pointer.mint,
      wallet.publicKey
    )
    try {
      let songAccount = await getAccount(provider.connection, songATA)
      previousSongCount = Number(songAccount.amount)
    } catch (error) {}

    await lootboxProgram.methods
      .retrieveItemFromLootbox()
      .accounts({
        mint: pointer.mint,
        userSongAta: songATA,
      })
      .rpc()

    const songAccount = await getAccount(provider.connection, songATA)
    expect(Number(songAccount.amount)).to.equal(previousSongCount + 1)
  })

});

async function awaitCallback(
  program: Program<LootboxProgram>,
  lootboxPointerAddress: anchor.web3.PublicKey,
  timeoutInterval: number,
  errorMsg = "Timed out waiting for VRF Client callback"
) {
  let ws: number | undefined = undefined
  const result: boolean = await promiseWithTimeout(
    timeoutInterval,
    new Promise((resolve: (result: boolean) => void) => {
      ws = program.provider.connection.onAccountChange(
        lootboxPointerAddress,
        async (
          accountInfo: anchor.web3.AccountInfo<Buffer>,
          context: anchor.web3.Context
        ) => {
          const lootboxPointer = await program.account.lootboxPointer.fetch(
            lootboxPointerAddress
          )

          if (lootboxPointer.redeemable) {
            resolve(true)
          }
        }
      )
    }).finally(async () => {
      if (ws) {
        await program.provider.connection.removeAccountChangeListener(ws)
      }
      ws = undefined
    }),
    new Error(errorMsg)
  ).finally(async () => {
    if (ws) {
      await program.provider.connection.removeAccountChangeListener(ws)
    }
    ws = undefined
  })

  return result
}


/* ******************************
        LOOTBOX PROGRAM V1
****************************** */

/* it('Chooses a mint pseudorandomly', async () => {
  const mint = await createMint(
    provider.connection,
    wallet.payer,
    wallet.publicKey,
    wallet.publicKey,
    2
  );
  const ata = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    wallet.payer,
    mint,
    wallet.publicKey
  );

  await mintToChecked(
    provider.connection,
    wallet.payer,
    mint,
    ata.address,
    wallet.payer,
    1000,
    2
  );

  const [stakeAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    [wallet.publicKey.toBuffer(), nft.tokenAddress.toBuffer()],
    stakingProgram.programId
  );

  await lootboxProgram.methods
    .openLootbox(new BN(10))
    .accounts({
      stakeMint: mint,
      stakeMintAta: ata.address,
      stakeState: stakeAccount,
    })
    .rpc();

  const [address] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('lootbox'), wallet.publicKey.toBuffer()],
    lootboxProgram.programId
  );
  const pointer = await lootboxProgram.account.lootboxPointer.fetch(address);

  expect(pointer.mint.toBase58());
})

it('Mints the selected song', async () => {

  const [pointerAddress] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('lootbox'), wallet.publicKey.toBuffer()],
    lootboxProgram.programId
  );

  const pointer = await lootboxProgram.account.lootboxPointer.fetch(
    pointerAddress
  );

  const songATA = await getAssociatedTokenAddress(
    pointer.mint,
    wallet.publicKey
  );

  await lootboxProgram.methods
    .retrieveItemFromLootbox()
    .accounts({
      mint: pointer.mint,
      userSongAta: songATA,
    })
    .rpc();

  const songAccount = await getAccount(provider.connection, songATA);
  expect(Number(songAccount.amount)).to.equal(1);
}) */
