use anchor_lang::prelude::*;

#[event]
pub struct EvidenceSubmittedEvent {
    pub agreement: Pubkey,
    pub milestone: Pubkey,
    pub worker: Pubkey,
    pub definition_hash: [u8; 32],
    pub evidence_hash: [u8; 32],
    pub unix_timestamp: i64,
}

#[event]
pub struct VerificationAttestedEvent {
    pub agreement: Pubkey,
    pub milestone: Pubkey,
    pub index: u32,
    pub verifier: Pubkey,
    pub definition_hash: [u8; 32],
    pub evidence_hash: [u8; 32],
    pub accepted: bool,
    pub rejection_reason_hash: [u8; 32],
    pub unix_timestamp: i64,
}

#[event]
pub struct MilestoneReleasedEvent {
    pub agreement: Pubkey,
    pub milestone: Pubkey,
    pub worker: Pubkey,
    pub amount: u64,
    pub definition_hash: [u8; 32],
    pub evidence_hash: [u8; 32],
    pub unix_timestamp: i64,
}

#[event]
pub struct AgreementCancelledEvent {
    pub agreement: Pubkey,
    pub sponsor: Pubkey,
    pub worker: Pubkey,
    pub refund_amount: u64,
    pub unix_timestamp: i64,
}
