# Solana NFT Staking

Stake NFTs and win a token reward

[See front-end](https://github.com/KevinFiorentino/pink-floyd-nft-collection)

> Use at least NodeJS v16

## Procedure to Deploy Programs and Prepare DApp

> In `staking-program` there are two lines to change depending Test or Production: Find the comment: `CHANGE DEPENDING TEST OR PRODUCTION` before deploy program

1. Prepare to deploy both programs (Don't deploy them yet)
2. Go to [front-end repo](https://github.com/KevinFiorentino/pink-floyd-nft-collection) and set both program IDs in `src/utils/constanst.ts`
3. In that repo, follow `README.md` to generate reward token PINK and SONG tokens
4. The third step generated several public key for each token, replace them on `lootbox-program`
5. Deploy both programs

### Deploy Staking Program

- `anchor build`
- `solana address -k target/deploy/solana_nft_staking-keypair.json`
- Replace Program ID in `lib.rs` and `Anchor.toml`
- `anchor build` (again)
- `anchor deploy -p solana-nft-staking`

### Deploy Lootbox Program

- `anchor build`
- `solana address -k target/deploy/lootbox_program-keypair.json`
- Replace Program ID in `lib.rs` and `Anchor.toml`
- `anchor build` (again)
- `anchor deploy -p lootbox-program`

### Upgrade Programs

- `anchor upgrade target/deploy/solana_nft_staking.so --provider.cluster devnet --program-id XXXXX`
- `anchor upgrade target/deploy/lootbox_program.so --provider.cluster devnet --program-id XXXXX`

### Test Programs

- `nvm use 16`
- `anchor test --skip-build --skip-deploy`
