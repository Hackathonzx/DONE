use anchor_lang::prelude::*;

use crate::errors::DoneError;
use crate::events::AgreementAcceptedEvent;
use crate::state::{Agreement, AgreementStatus};

#[derive(Accounts)]
pub struct AcceptAgreement<'info> {
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
}

pub fn handler(ctx: Context<AcceptAgreement>) -> Result<()> {
    let agreement = &mut ctx.accounts.agreement;

    require!(
        agreement.status == AgreementStatus::Draft,
        DoneError::InvalidAgreementStatus
    );

    require!(
        !agreement.worker_accepted,
        DoneError::AgreementAlreadyAccepted
    );

    require!(
        agreement.milestone_count > 0
            && agreement.allocated_amount == agreement.total_amount,
        DoneError::IncompleteMilestoneAllocation
    );

    agreement.worker_accepted = true;

    emit!(AgreementAcceptedEvent {
        agreement: agreement.key(),
        sponsor: agreement.sponsor,
        worker: agreement.worker,
        definition_hash: agreement.definition_hash,
        total_amount: agreement.total_amount,
        milestone_count: agreement.milestone_count,
        unix_timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}