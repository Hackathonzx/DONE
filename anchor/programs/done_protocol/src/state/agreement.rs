use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Agreement {
    pub sponsor: Pubkey,
    pub worker: Pubkey,
    pub payment_mint: Pubkey,
    pub agreement_id: u64,
    pub status: AgreementStatus,
    pub total_amount: u64,
    pub allocated_amount: u64,
    pub released_amount: u64,
    pub milestone_count: u32,
    pub definition_hash: [u8; 32],
    pub bump: u8,
    pub worker_accepted: bool,
}

#[derive(
    AnchorSerialize,
    AnchorDeserialize,
    Clone,
    Copy,
    PartialEq,
    Eq,
    InitSpace
)]
pub enum AgreementStatus {
    Draft,
    Funded,
    Active,
    Completed,
    Cancelled,
}


