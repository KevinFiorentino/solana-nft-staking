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
        "EKZAwmvmWRTBqMZ3PpGQUfw7ZiDzpWgTfYQAwskuo9ez",
        "7AxUAnPk3VmQ1Gp46EcY8ScqGgR5SwididM6sWfZuhuy",
        "C1b3NcZRdwqNrKUH8HFCdgZTdyMY2hmqCAwpwdoJ1Xn2",
        "PN6LobK3kgxcpq6f1AVRCuN6tjVbn2rb1iBnqS14L21",
        "4zJ6HPtkhT2guMq6TLFVK3BwPQFdZ1ZKfrZZMNemE69Z",
        "BzoVWKFBP3HQRaXxmJM5jLyVQEEzQLdtrDXDqn1R4ytC",
        "7KLa55BQXE4bjbK77SrZKQmBTKKzeps5aDY9AoBY7acD",
        "GsXGYX8WNQoDRSBKBG2VNzZmVenV4bkD4gksMkPBsRLZ",
        "8QBHuqvhmQAzQNT39QGUGeT65f5CQnKxJyRsPYAf4BeR",
        "FpstSSBDYNKcRMqxMPyvz5A6xFNiQKazxwxLzhEFFYYh",
    ];
}
