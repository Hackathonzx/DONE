use anchor_lang::prelude::*;
use anchor_spl::token::{
    self,
    Mint,
    Token,
    TokenAccount,
    TransferChecked,
};

use crate::errors::DoneError;
use crate::events::AgreementCancelledEvent;
use crate::state::{Agreement, AgreementStatus};

#[derive(Accounts)]
pub struct CancelAgreement<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,

    pub worker: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"agreement",
            sponsor.key().as_ref(),
            agreement.agreement_id.to_le_bytes().as_ref()
        ],
        bump = agreement.bump,
        has_one = sponsor @ DoneError::Unauthorized,
        has_one = worker @ DoneError::Unauthorized
    )]
    pub agreement: Account<'info, Agreement>,

    #[account(
        constraint = payment_mint.key() == agreement.payment_mint
            @ DoneError::InvalidPaymentMint
    )]
    pub payment_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = sponsor_token_account.owner == sponsor.key()
            @ DoneError::Unauthorized,
        constraint = sponsor_token_account.mint == payment_mint.key()
            @ DoneError::InvalidPaymentMint
    )]
    pub sponsor_token_account: Account<'info, TokenAccount>,

    /// CHECK: Validated using the escrow authority PDA seeds.
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

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CancelAgreement>) -> Result<()> {
    let status = ctx.accounts.agreement.status;

    // Only funded or active agreements can be cancelled.
    require!(
        status == AgreementStatus::Funded
            || status == AgreementStatus::Active,
        DoneError::InvalidAgreementStatus
    );

    // Refund the remaining escrow balance. Previously released
    // milestone payments are not reversed.
    let refund_amount = ctx.accounts.escrow_token_account.amount;

    require!(refund_amount > 0, DoneError::InvalidAmount);

    let agreement_key = ctx.accounts.agreement.key();
    let decimals = ctx.accounts.payment_mint.decimals;

    let transfer_accounts = TransferChecked {
        from: ctx.accounts.escrow_token_account.to_account_info(),
        mint: ctx.accounts.payment_mint.to_account_info(),
        to: ctx.accounts.sponsor_token_account.to_account_info(),
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

    token::transfer_checked(cpi_ctx, refund_amount, decimals)?;

    // Mark the agreement cancelled only after the transfer succeeds.
    ctx.accounts.agreement.status = AgreementStatus::Cancelled;

    emit!(AgreementCancelledEvent {
        agreement: agreement_key,
        sponsor: ctx.accounts.sponsor.key(),
        worker: ctx.accounts.worker.key(),
        refund_amount,
        unix_timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}