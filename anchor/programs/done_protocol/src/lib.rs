use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM");

#[program]
pub mod done_protocol {
    use super::*;

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
    ) -> Result<()> {
        instructions::create_milestone::handler(
            ctx,
            index,
            amount,
            definition_hash,
        )
    }
    pub fn fund_agreement(
        ctx: Context<FundAgreement>,
    ) -> Result<()> {
        crate::instructions::fund_agreement::handler(ctx)
    }

}
