use crate::state::*;
use crate::*;

#[derive(Accounts)]
pub struct ConsumeRandomness<'info> {
    #[account(
        mut,
        // PRODUCTION
        /* seeds = [
            payer.key().as_ref(),
        ], */
        // TESTING
        seeds = [
            vrf.key().as_ref(),
            payer.key().as_ref()
        ],
        bump = state.load()?.bump,
        has_one = vrf @ LootboxError::InvalidVrfAccount
    )]
    pub state: AccountLoader<'info, UserState>,
    pub vrf: AccountLoader<'info, VrfAccountData>,
    #[account(
        mut,
        seeds=["lootbox".as_bytes(), payer.key().as_ref()],
        bump
      )]
    pub lootbox_pointer: Account<'info, LootboxPointer>,
    /// CHECK: ...
    pub payer: AccountInfo<'info>,
}

impl ConsumeRandomness<'_> {
    pub fn process_instruction(ctx: &mut Context<Self>) -> Result<()> {
        let vrf = ctx.accounts.vrf.load()?;
        let state = &mut ctx.accounts.state.load_mut()?;

        let result_buffer = vrf.get_result()?;
        if result_buffer == [0u8; 32] {
            msg!("vrf buffer empty");
            return Ok(());
        }

        if result_buffer == state.result_buffer {
            msg!("result_buffer unchanged");
            return Ok(());
        }

        let available_song: Vec<Pubkey> = Self::AVAILABLE_SONG
            .into_iter()
            .map(|key| key.parse::<Pubkey>().unwrap())
            .collect();

        // maximum value to convert randomness buffer
        let max_result = available_song.len();
        let value: &[u8] = bytemuck::cast_slice(&result_buffer[..]);
        let i = (value[0] as usize) % max_result;
        msg!("The chosen mint index is {} out of {}", i, max_result);

        let mint = available_song[i];
        msg!("Next mint is {:?}", mint);
        ctx.accounts.lootbox_pointer.mint = mint;
        ctx.accounts.lootbox_pointer.redeemable = true;

        Ok(())
    }

    const AVAILABLE_SONG: [&'static str; 10] = [
        "qX4nyer3pWH6GeJQs7BAhUGPR6dFyp6cKFWzPnRDMZJ",
        "AWpvNodKYa4jFiJX59yr5P2VgfFkRGBpExZcmCpDvv6M",
        "4MP6JePppK5dEYjzsACzi1dppKFizW7ti5z4KRSLsFuH",
        "9Sb4FNAYBshL25Zn9gqgaKE4MZ2jDEMQKBWV5iS8KyjE",
        "DxTjFAHkkwqFToD4EffGYaZSyj34YzMGSCrU2GrYEbzY",
        "7sqrQAUfEFxauN16coMmR6PzLfD2ETZtSUgmtsvLPNJF",
        "6QUM81ezHasqKu1SB6MRUY4Bus2mN2yxog6wJXURBbSC",
        "Dk9W9vraksfJYKhk1j8TFJPkVw4fYVHmsHKKKc5c6wrr",
        "BXa9V3j4Vr6AxJMK7WttmTRPGUNGdDjr5ukPtmVzUWZj",
        "ApsMC2gD5BHu4qQVkenLBB8PnAjFMekg1wFLGhqgFQV4",
    ];
}
