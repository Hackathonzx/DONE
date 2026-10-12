use anchor_lang::prelude::*;

use anchor_spl::token::{
    self,
    Mint,
    Token,
    TokenAccount,
    TransferChecked,
};

use crate::errors::DoneError;
use crate::events::MilestoneReleasedEvent;

use crate::state::{
    Agreement,
    AgreementStatus,
    Milestone,
    MilestoneStatus,
};

#[derive(Accounts)]
pub struct ReleaseMilestone<'info> {
    #[account(
        mut,
        seeds = [
            b"agreement",
            agreement.sponsor.as_ref(),
            agreement.agreement_id.to_le_bytes().as_ref()
        ],
        bump = agreement.bump
    )]
    pub agreement: Account<'info, Agreement>,

    #[account(
        mut,
        seeds = [
            b"milestone",
            agreement.key().as_ref(),
            milestone.index.to_le_bytes().as_ref()
        ],
        bump = milestone.bump,
        has_one = agreement @ DoneError::InvalidMilestoneStatus
    )]
    pub milestone: Account<'info, Milestone>,

    #[account(
        constraint = payment_mint.key() == agreement.payment_mint
            @ DoneError::InvalidPaymentMint
    )]
    pub payment_mint: Account<'info, Mint>,

    /// CHECK: Validated against the escrow authority PDA seeds.
    #[account(
        seeds = [b"escrow", agreement.key().as_ref()],
        bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"escrow-token", agreement.key().as_ref()],
        bump,
        constraint = escrow_token_account.owner == escrow_authority.key()
            @ DoneError::InvalidEscrowAccount,
        constraint = escrow_token_account.mint == payment_mint.key()
            @ DoneError::InvalidPaymentMint
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = worker_token_account.owner == agreement.worker
            @ DoneError::InvalidWorkerTokenAccount,
        constraint = worker_token_account.mint == payment_mint.key()
            @ DoneError::InvalidPaymentMint
    )]
    pub worker_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ReleaseMilestone>) -> Result<()> {
    let agreement_status = ctx.accounts.agreement.status;

    require!(
        agreement_status == AgreementStatus::Funded
            || agreement_status == AgreementStatus::Active,
        DoneError::InvalidAgreementStatus
    );

    require!(
        ctx.accounts.milestone.status == MilestoneStatus::Verified
            && ctx.accounts.milestone.evidence_submitted,
        DoneError::InvalidMilestoneStatus
    );

    require!(
        ctx.accounts.milestone.released_amount == 0,
        DoneError::InvalidMilestoneStatus
    );

    let amount = ctx.accounts.milestone.amount;

    require!(amount > 0, DoneError::InvalidAmount);

    let new_released_amount = ctx
        .accounts
        .agreement
        .released_amount
        .checked_add(amount)
        .ok_or(DoneError::ReleaseExceedsTotal)?;

    require!(
        new_released_amount <= ctx.accounts.agreement.total_amount,
        DoneError::ReleaseExceedsTotal
    );

    let agreement_key = ctx.accounts.agreement.key();
    let decimals = ctx.accounts.payment_mint.decimals;

    let transfer_accounts = TransferChecked {
        from: ctx.accounts.escrow_token_account.to_account_info(),
        mint: ctx.accounts.payment_mint.to_account_info(),
        to: ctx.accounts.worker_token_account.to_account_info(),
        authority: ctx.accounts.escrow_authority.to_account_info(),
    };

    let bump_seed = [ctx.bumps.escrow_authority];

    let signer_seeds: &[&[u8]] = &[
        b"escrow",
        agreement_key.as_ref(),
        &bump_seed,
    ];

    let signer = &[signer_seeds];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
        signer,
    );

    token::transfer_checked(cpi_ctx, amount, decimals)?;

    ctx.accounts.milestone.released_amount = amount;
    ctx.accounts.milestone.status = MilestoneStatus::Released;

    ctx.accounts.agreement.released_amount = new_released_amount;

    ctx.accounts.agreement.status =
        if new_released_amount == ctx.accounts.agreement.total_amount {
            AgreementStatus::Completed
        } else {
            AgreementStatus::Active
        };

    emit!(MilestoneReleasedEvent {
        agreement: ctx.accounts.agreement.key(),
        milestone: ctx.accounts.milestone.key(),
        worker: ctx.accounts.agreement.worker,
        amount,
        definition_hash: ctx.accounts.milestone.definition_hash,
        evidence_hash: ctx.accounts.milestone.evidence_hash,
        unix_timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
