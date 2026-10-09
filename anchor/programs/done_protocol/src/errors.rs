use anchor_lang::prelude::*;

#[error_code]
pub enum DoneError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,

    #[msg("Agreement is not in Draft status")]
    InvalidAgreementStatus,

    #[msg("Milestone allocation exceeds agreement total")]
    AllocationExceedsTotal,

    #[msg("Milestone index must be sequential")]
    InvalidMilestoneIndex,

    #[msg("Unauthorized caller")]
    Unauthorized,

    #[msg("Payment mint does not match the agreement")]
    InvalidPaymentMint,

    #[msg("Worker must be a nonzero key different from the sponsor")]
    InvalidWorker,

    #[msg("Definition of Done hash cannot be empty")]
    InvalidDefinitionHash,

    #[msg("Verifier public key cannot be the default public key")]
    InvalidVerifier,

    #[msg("Evidence hash cannot be empty")]
    InvalidEvidenceHash,

    #[msg("Milestone is not in the required status")]
    InvalidMilestoneStatus,

    #[msg("Worker token account does not belong to the assigned worker")]
    InvalidWorkerTokenAccount,

    #[msg("Escrow token account is invalid")]
    InvalidEscrowAccount,

    #[msg("Release would exceed the agreement total")]
    ReleaseExceedsTotal,

    #[msg("Rejection reason hash cannot be empty")]
    InvalidRejectionReason,
}
