use anchor_lang::prelude::*;

use crate::errors::DoneError;
use crate::events::VerificationAttestedEvent;
use crate::state::{
    Agreement,
    AgreementStatus,
    Milestone,
    MilestoneStatus,
};

#[derive(Accounts)]
pub struct VerifyEvidence<'info> {
    pub verifier: Signer<'info>,

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
        has_one = agreement @ DoneError::InvalidMilestoneStatus,
        has_one = verifier @ DoneError::Unauthorized
    )]
    pub milestone: Account<'info, Milestone>,
}

pub fn handler(ctx: Context<VerifyEvidence>) -> Result<()> {
    let agreement_status = ctx.accounts.agreement.status;

    require!(
        agreement_status == AgreementStatus::Funded
            || agreement_status == AgreementStatus::Active,
        DoneError::InvalidAgreementStatus
    );

    require!(
        ctx.accounts.milestone.status == MilestoneStatus::EvidenceSubmitted
            && ctx.accounts.milestone.evidence_submitted,
        DoneError::InvalidMilestoneStatus
    );

    ctx.accounts.milestone.status = MilestoneStatus::Verified;

    emit!(VerificationAttestedEvent {
        agreement: ctx.accounts.agreement.key(),
        milestone: ctx.accounts.milestone.key(),
        index: ctx.accounts.milestone.index,
        verifier: ctx.accounts.verifier.key(),
        definition_hash: ctx.accounts.milestone.definition_hash,
        evidence_hash: ctx.accounts.milestone.evidence_hash,
        accepted: true,
        rejection_reason_hash: [0u8; 32],
        unix_timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
