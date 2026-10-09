use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Milestone {
    pub agreement: Pubkey,
    pub index: u32,
    pub amount: u64,
    pub status: MilestoneStatus,
    pub definition_hash: [u8; 32],
    pub evidence_hash: [u8; 32],
    pub evidence_submitted: bool,
    pub verifier: Pubkey,
    pub released_amount: u64,
    pub bump: u8,
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
pub enum MilestoneStatus {
    Pending,
    EvidenceSubmitted,
    Verified,
    Released,
}
