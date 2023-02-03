import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token"
import { SolanaNftStaking } from "../target/types/solana_nft_staking";
import { PROGRAM_ID as METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { CreateNftOutput } from '@metaplex-foundation/js';
import { setupNft } from './utils/setupNft';
import { expect } from "chai";

describe("Solana NFT Staking", () => {

  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.SolanaNftStaking as Program<SolanaNftStaking>;

  const wallet = anchor.workspace.SolanaNftStaking.provider.wallet

  let nft: CreateNftOutput
  let delegatedAuthPda: anchor.web3.PublicKey
  let stakeStatePda: anchor.web3.PublicKey
  let mint: anchor.web3.PublicKey
  let mintAuth: anchor.web3.PublicKey
  let tokenAddress: anchor.web3.PublicKey

  before(async () => {
    ;({ nft, delegatedAuthPda, stakeStatePda, mint, mintAuth, tokenAddress } =
      await setupNft(program, wallet.payer))
  })

  it("Stake NFT", async () => {
    await program.methods
      .stake()
      .accounts({
        nftTokenAccount: nft.tokenAddress,
        nftMint: nft.mintAddress,
        nftEdition: nft.masterEditionAddress,
        metadataProgram: METADATA_PROGRAM_ID,
      })
      .rpc()

    const account = await program.account.userStakeInfo.fetch(stakeStatePda)
    expect(account.stakeState === "Staked")
  })

  it("Redeem Reward", async () => {
    await program.methods
      .redeem()
      .accounts({
        nftTokenAccount: nft.tokenAddress,
        stakeMint: mint,
        userStakeAta: tokenAddress,
      })
      .rpc()

    const account = await program.account.userStakeInfo.fetch(stakeStatePda)
    expect(account.stakeState === "Unstaked")
    const tokenAccount = await getAccount(provider.connection, tokenAddress)
  })

  it("Unstake NFT", async () => {
    await program.methods
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

    const account = await program.account.userStakeInfo.fetch(stakeStatePda)
    expect(account.stakeState === "Unstaked")
  })

});
