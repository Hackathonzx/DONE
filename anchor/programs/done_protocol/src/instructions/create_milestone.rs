use anchor_lang::prelude::*;

use crate::errors::DoneError;
use crate::state::{
    Agreement,
    AgreementStatus,
    Milestone,
    MilestoneStatus,
};

#[derive(Accounts)]
#[instruction(index: u32)]
pub struct CreateMilestone<'info> {
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
        init,
        payer = sponsor,
        space = 8 + Milestone::INIT_SPACE,
        seeds = [
            b"milestone",
            agreement.key().as_ref(),
            index.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub milestone: Account<'info, Milestone>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateMilestone>,
    index: u32,
    amount: u64,
    definition_hash: [u8; 32],
    verifier: Pubkey,
) -> Result<()> {
    require!(
        ctx.accounts.agreement.status == AgreementStatus::Draft,
        DoneError::InvalidAgreementStatus
    );

    require!(
        !ctx.accounts.agreement.worker_accepted,
        DoneError::AgreementAlreadyAccepted
    );

    require!(amount > 0, DoneError::InvalidAmount);

    require!(
        verifier != Pubkey::default(),
        DoneError::InvalidVerifier
    );

    require!(
        definition_hash != [0u8; 32],
        DoneError::InvalidDefinitionHash
    );

    require!(
        index == ctx.accounts.agreement.milestone_count,
        DoneError::InvalidMilestoneIndex
    );

    let new_allocated = ctx
        .accounts
        .agreement
        .allocated_amount
        .checked_add(amount)
        .ok_or(DoneError::AllocationExceedsTotal)?;

    require!(
        new_allocated <= ctx.accounts.agreement.total_amount,
        DoneError::AllocationExceedsTotal
    );

    let agreement_key = ctx.accounts.agreement.key();
    let milestone = &mut ctx.accounts.milestone;

    milestone.agreement = agreement_key;
    milestone.index = index;
    milestone.amount = amount;
    milestone.status = MilestoneStatus::Pending;
    milestone.definition_hash = definition_hash;
    milestone.evidence_hash = [0u8; 32];
    milestone.evidence_submitted = false;
    milestone.verifier = verifier;
    milestone.released_amount = 0;
    milestone.bump = ctx.bumps.milestone;

    let agreement = &mut ctx.accounts.agreement;

    agreement.allocated_amount = new_allocated;
    agreement.milestone_count = agreement
        .milestone_count
        .checked_add(1)
        .ok_or(DoneError::AllocationExceedsTotal)?;

    Ok(())
}
