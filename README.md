# Solana NFT Staking

Stake NFTs and win a token reward

[See dapp](https://github.com/KevinFiorentino/pink-floyd-nft-collection)

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

- `anchor upgrade target/deploy/solana_nft_staking.so --provider.cluster devnet --program-id 8eFKYubnkNpv3V1xKSmgWVeQTCG96gYFw1AoMHk9axLh`
- `anchor upgrade target/deploy/lootbox_program.so --provider.cluster devnet --program-id DR9bKxkN4A8AoCQfcBQ3Vz7mf8ireZ6JqWxSDfgmD72H`

### Test Both Programs


- Comment lines !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


- `nvm use 16`
- `anchor test --skip-build --skip-deploy`
