# Solana NFT Staking

Stake NFTs and win a token reward

[See dapp](https://github.com/KevinFiorentino/pink-floyd-nft-collection)

### Deploy program

- `anchor build`
- `solana address -k target/deploy/solana_nft_staking-keypair.json`
- Replace Program ID in `lib.rs` and `Anchor.toml`
- `anchor build` (again)
- `anchor deploy`

### Test

- `anchor test --skip-build --skip-deploy`
