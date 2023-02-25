

use crate::state::*;
use crate::*;

#[derive(Accounts)]
pub struct ConsumeRandomness<'info> {
    #[account(
        mut,
        // TESTING - Comment out these seeds for testing
        seeds = [
            payer.key().as_ref(),
        ],
        // TESTING - Uncomment these seeds for testing
        // seeds = [
        //     vrf.key().as_ref(),
        //     payer.key().as_ref()
        // ],
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
        "9KsHKQZK1tg67DUBRzBTHMXHea93MoM9gw1VAzefMUaV",
        "5xNy3TDu4qye5QA2qkUdvhrodLmViN1cPMTYeB1YphYX",
        "E5uMyHVBKY48buPFVq6ScaWyycm4TcavzA2BfLCzEcqt",
        "6sS6NGmZwyYXYZBWJASJm5ZoXdr9wAeZJMTXaexRev48",
        "8i8ESTW6VEX5VyaLJt5Z96JMJWheLy7r3L4huwoBqvyS",
        "GnW3W1Yvd5Vyav4Y3cxnU8iuqz3XwCxYR7pjPtMN9AHJ",
        "JCDZUs81jBeM8phgnhbdFPpgPT4AD5LCiLDvE3GGqPvC",
        "gf77ttAUtwSPTrqbEqx8bchuEDMrJKhnXGi8oyCfzft",
        "AdMy5qDg26yLoZLRXbyoAq5HK8xGXMmCm5fNN9ErVyBH",
        "9T88FX7HymhwuDutMwpwVZSyoYEbnwvhYFGHaySg3b6X",
    ];
}
