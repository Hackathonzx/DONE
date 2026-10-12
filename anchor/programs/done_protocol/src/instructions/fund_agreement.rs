use anchor_lang::prelude::*;
use anchor_spl::token::{
    self,
    Mint,
    Token,
    TokenAccount,
    TransferChecked,
};

use crate::errors::DoneError;
use crate::state::{Agreement, AgreementStatus};

#[derive(Accounts)]
pub struct FundAgreement<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"agreement",
            sponsor.key().as_ref(),
            agreement.agreement_id.to_le_bytes().as_ref()
        ],
        bump = agreement.bump,
        has_one = sponsor @ DoneError::Unauthorized
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

    /// CHECK: This PDA is the authority of the escrow token account.
    #[account(
        seeds = [b"escrow", agreement.key().as_ref()],
        bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = sponsor,
        seeds = [b"escrow-token", agreement.key().as_ref()],
        bump,
        token::mint = payment_mint,
        token::authority = escrow_authority
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<FundAgreement>) -> Result<()> {
    let agreement = &ctx.accounts.agreement;

    require!(
        agreement.status == AgreementStatus::Draft,
        DoneError::InvalidAgreementStatus
    );

    require!(
    agreement.worker_accepted,
    DoneError::WorkerAcceptanceRequired
);

    require!(
        agreement.total_amount > 0,
        DoneError::InvalidAmount
    );

    require!(
        agreement.allocated_amount == agreement.total_amount,
        DoneError::AllocationExceedsTotal
    );

    let amount = agreement.total_amount;
    let decimals = ctx.accounts.payment_mint.decimals;

    let transfer_accounts = TransferChecked {
        from: ctx.accounts.sponsor_token_account.to_account_info(),
        mint: ctx.accounts.payment_mint.to_account_info(),
        to: ctx.accounts.escrow_token_account.to_account_info(),
        authority: ctx.accounts.sponsor.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
    );

    token::transfer_checked(cpi_ctx, amount, decimals)?;

    ctx.accounts.agreement.status = AgreementStatus::Funded;

    Ok(())
}
