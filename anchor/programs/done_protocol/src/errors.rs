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
}
