use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM");

#[program]
pub mod done_protocol {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
    ) -> Result<()> {
        instructions::initialize_config::handler(ctx)
    }

    pub fn create_agreement(
        ctx: Context<CreateAgreement>,
        agreement_id: u64,
        total_amount: u64,
        definition_hash: [u8; 32],
    ) -> Result<()> {
        instructions::create_agreement::handler(
            ctx,
            agreement_id,
            total_amount,
            definition_hash,
        )
    }

    pub fn create_milestone(
        ctx: Context<CreateMilestone>,
        index: u32,
        amount: u64,
        definition_hash: [u8; 32],
        verifier: Pubkey,
    ) -> Result<()> {
        instructions::create_milestone::handler(
            ctx,
            index,
            amount,
            definition_hash,
            verifier,
        )
    }

    pub fn fund_agreement(
        ctx: Context<FundAgreement>,
    ) -> Result<()> {
        instructions::fund_agreement::handler(ctx)
    }

    pub fn submit_evidence(
        ctx: Context<SubmitEvidence>,
        evidence_hash: [u8; 32],
    ) -> Result<()> {
        instructions::submit_evidence::handler(ctx, evidence_hash)
    }

    pub fn verify_evidence(
        ctx: Context<VerifyEvidence>,
    ) -> Result<()> {
        instructions::verify_evidence::handler(ctx)
    }

    pub fn reject_evidence(
        ctx: Context<RejectEvidence>,
        rejection_reason_hash: [u8; 32],
    ) -> Result<()> {
        instructions::reject_evidence::handler(ctx, rejection_reason_hash)
    }

    pub fn release_milestone(
        ctx: Context<ReleaseMilestone>,
    ) -> Result<()> {
        instructions::release_milestone::handler(ctx)
    }
}
