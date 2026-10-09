use anchor_lang::prelude::*;

use crate::errors::DoneError;
use crate::events::EvidenceSubmittedEvent;
use crate::state::{
    Agreement,
    AgreementStatus,
    Milestone,
    MilestoneStatus,
};

#[derive(Accounts)]
pub struct SubmitEvidence<'info> {
    pub worker: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"agreement",
            agreement.sponsor.as_ref(),
            agreement.agreement_id.to_le_bytes().as_ref()
        ],
        bump = agreement.bump,
        has_one = worker @ DoneError::Unauthorized
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
}

pub fn handler(
    ctx: Context<SubmitEvidence>,
    evidence_hash: [u8; 32],
) -> Result<()> {
    let agreement_status = ctx.accounts.agreement.status;

    require!(
        agreement_status == AgreementStatus::Funded
            || agreement_status == AgreementStatus::Active,
        DoneError::InvalidAgreementStatus
    );

    require!(
        ctx.accounts.milestone.status == MilestoneStatus::Pending
            && !ctx.accounts.milestone.evidence_submitted,
        DoneError::InvalidMilestoneStatus
    );

    require!(
        evidence_hash != [0u8; 32],
        DoneError::InvalidEvidenceHash
    );

    ctx.accounts.milestone.evidence_hash = evidence_hash;
    ctx.accounts.milestone.evidence_submitted = true;
    ctx.accounts.milestone.status = MilestoneStatus::EvidenceSubmitted;

    ctx.accounts.agreement.status = AgreementStatus::Active;

    emit!(EvidenceSubmittedEvent {
        agreement: ctx.accounts.agreement.key(),
        milestone: ctx.accounts.milestone.key(),
        worker: ctx.accounts.worker.key(),
        definition_hash: ctx.accounts.milestone.definition_hash,
        evidence_hash: ctx.accounts.milestone.evidence_hash,
        unix_timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
