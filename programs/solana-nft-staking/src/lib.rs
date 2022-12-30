use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Approve, Mint, MintTo, Revoke, Token, TokenAccount},
};
use mpl_token_metadata::{
    instruction::{freeze_delegated_account, thaw_delegated_account},
    ID as MetadataTokenId,
};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod solana_nft_staking {
    use super::*;

    pub fn stake(ctx: Context<Stake>) -> Result<()> {
        Ok(())
    }

    pub fn redeem(ctx: Context<Redeem>) -> Result<()> {
        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Stake {}

#[derive(Accounts)]
pub struct Redeem {}

#[derive(Accounts)]
pub struct Unstake {}

#[account]
pub struct UserStakeInfo {
    pub token_account: Pubkey,
    pub stake_start_time: i64,
    pub last_stake_redeem: i64,
    pub user_pubkey: Pubkey,
    pub stake_state: StakeState,
    pub is_initialized: bool,
}

#[derive(Debug, PartialEq, AnchorDeserialize, AnchorSerialize, Clone)]
pub enum StakeState {
    Unstaked,
    Staked,
}

impl Default for StakeState {
    fn default() -> Self {
        StakeState::Unstaked
    }
}
