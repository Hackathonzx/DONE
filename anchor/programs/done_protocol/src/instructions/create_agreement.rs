use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

use crate::errors::DoneError;
use crate::state::{Agreement, AgreementStatus, ProtocolConfig};

#[derive(Accounts)]
#[instruction(agreement_id: u64)]
pub struct CreateAgreement<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,

    /// CHECK: Stored as the intended recipient. Payment authorization
    /// will be enforced by the settlement instruction.
    pub worker: UncheckedAccount<'info>,

    pub payment_mint: Account<'info, Mint>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.payment_mint == payment_mint.key()
            @ DoneError::InvalidPaymentMint
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = sponsor,
        space = 8 + Agreement::INIT_SPACE,
        seeds = [
            b"agreement",
            sponsor.key().as_ref(),
            &agreement_id.to_le_bytes()
        ],
        bump
    )]
    pub agreement: Account<'info, Agreement>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateAgreement>,
    agreement_id: u64,
    total_amount: u64,
    definition_hash: [u8; 32],
) -> Result<()> {
    require!(
        total_amount > 0,
        crate::errors::DoneError::InvalidAmount
    );

    require!(
        ctx.accounts.worker.key() != Pubkey::default()
            && ctx.accounts.worker.key() != ctx.accounts.sponsor.key(),
        crate::errors::DoneError::InvalidWorker
    );

    require!(
        definition_hash != [0u8; 32],
        crate::errors::DoneError::InvalidDefinitionHash
    );

    let agreement = &mut ctx.accounts.agreement;

    agreement.sponsor = ctx.accounts.sponsor.key();
    agreement.worker = ctx.accounts.worker.key();
    agreement.payment_mint = ctx.accounts.payment_mint.key();

    agreement.agreement_id = agreement_id;
    agreement.status = AgreementStatus::Draft;

    agreement.total_amount = total_amount;
    agreement.allocated_amount = 0;
    agreement.released_amount = 0;
    agreement.milestone_count = 0;

    agreement.definition_hash = definition_hash;
agreement.bump = ctx.bumps.agreement;
agreement.worker_accepted = false;

    Ok(())
}
