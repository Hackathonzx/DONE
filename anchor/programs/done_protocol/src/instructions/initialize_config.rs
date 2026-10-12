use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

use crate::errors::DoneError;
use crate::state::ProtocolConfig;

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + ProtocolConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, ProtocolConfig>,

    pub payment_mint: Account<'info, Mint>,

    #[account(
        constraint = program.programdata_address()?
            == Some(program_data.key())
    )]
    pub program: Program<'info, crate::program::DoneProtocol>,

    #[account(
        constraint = program_data.upgrade_authority_address
            == Some(authority.key()) @ DoneError::Unauthorized
    )]
    pub program_data: Account<'info, ProgramData>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeConfig>) -> Result<()> {
    let config = &mut ctx.accounts.config;

    config.admin = ctx.accounts.authority.key();
    config.payment_mint = ctx.accounts.payment_mint.key();
    config.bump = ctx.bumps.config;

    Ok(())
}
