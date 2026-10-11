# On-chain Specification

## Program and token

- Program: `done_protocol`
- Program ID (Devnet): `82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM`
- Anchor/Rust dependency: Anchor 0.32.1 (workspace's deployed build)
- Payment token program: classic SPL Token Program (`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`), not Token-2022.
- Devnet USDC mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`, 6 decimals.
- Config PDA: `6HamdMRRAhWZyThM5dpCjyfQBkZaAsLrMVjQenMJPua1`.

## PDA derivation

All program PDAs below are derived with the DONE Protocol program ID. Integer seeds are fixed-width little-endian bytes.

| Account | Seeds in order |
|---|---|
| Protocol config | `b"config"` |
| Agreement | `b"agreement"`, sponsor public key bytes, `agreement_id` as u64 LE (8 bytes) |
| Milestone | `b"milestone"`, agreement PDA bytes, milestone index as u32 LE (4 bytes) |
| Escrow authority | `b"escrow"`, agreement PDA bytes |
| Escrow token account | `b"escrow-token"`, agreement PDA bytes |
| ProgramData (upgradeable loader) | Program ID bytes under `BPFLoaderUpgradeab1e11111111111111111111111` |

The escrow token account address is a PDA derived under the DONE program, but its account data is owned by the SPL Token Program. Its token authority is the escrow authority PDA.

## State accounts

### `ProtocolConfig`

- `admin: Pubkey`
- `paymentMint: Pubkey`
- `bump: u8`

It is a singleton PDA and is initialized once. The initialization instruction requires the authority to be the program's upgrade authority and stores the selected mint. The devnet config is already initialized with the devnet USDC mint above. Do not attempt to initialize it again.

### `Agreement`

- `sponsor: Pubkey`
- `worker: Pubkey`
- `paymentMint: Pubkey`
- `agreementId: u64`
- `status: AgreementStatus`
- `totalAmount: u64` (raw token units)
- `allocatedAmount: u64` (raw token units)
- `releasedAmount: u64` (raw token units; tracks historical payouts)
- `milestoneCount: u32`
- `definitionHash: [u8; 32]`
- `bump: u8`
- `workerAccepted: bool`

Agreement status variants, in the declared enum order: `Draft`, `Funded`, `Active`, `Completed`, `Cancelled`.

### `Milestone`

- `agreement: Pubkey`
- `index: u32`
- `amount: u64` (raw token units)
- `status: MilestoneStatus`
- `definitionHash: [u8; 32]`
- `evidenceHash: [u8; 32]`
- `evidenceSubmitted: bool`
- `verifier: Pubkey`
- `releasedAmount: u64`
- `bump: u8`

Milestone status variants, in the declared enum order: `Pending`, `EvidenceSubmitted`, `Verified`, `Released`.

## Instructions and account requirements

Account names below use Anchor IDL/client camelCase. `Signer` means that key must sign. The final downloaded IDL is authoritative if generated account-resolution behavior differs.

### `initializeConfig()` — protocol deployment/admin operation only

Accounts: `authority` (signer, upgrade authority), `config` PDA, `paymentMint` mint account, `program`, `programData`, `systemProgram`.

Initializes the singleton config. Already completed on Devnet; end users should not call it.

### `createAgreement(agreementId: u64, totalAmount: u64, definitionHash: [u8;32])`

Accounts: `sponsor` (signer, writable/payer), `worker`, `paymentMint`, `config`, `agreement` PDA, `systemProgram`.

Requires a positive total, nonzero worker key different from sponsor, nonzero Definition of Done hash, and payment mint matching ProtocolConfig. Initializes Draft state with `workerAccepted = false` and zero allocation/release counters.

### `createMilestone(index: u32, amount: u64, definitionHash: [u8;32], verifier: Pubkey)`

Accounts: `sponsor` (signer, payer), `agreement`, `milestone` PDA, `systemProgram`.

Only in Draft and before worker acceptance. Requires positive amount, nonzero definition hash/verifier, sequential index, and allocation not exceeding total. Worker acceptance later requires at least one milestone and allocation exactly equal to total.

### `acceptAgreement()`

Accounts: `worker` (signer), `agreement` PDA.

Only the assigned worker can accept. Agreement must be Draft; it must not already be accepted; there must be at least one milestone and `allocatedAmount == totalAmount`. Emits `AgreementAcceptedEvent`. Milestones are frozen after acceptance.

### `fundAgreement()`

Accounts: `sponsor` (signer, writable), `agreement`, `paymentMint`, `sponsorTokenAccount`, `escrowAuthority`, `escrowTokenAccount` (initialized by this instruction), `tokenProgram`, `systemProgram`.

Only while Draft; worker acceptance must be true; allocations must equal total. Sponsor source token account must be owned by sponsor and have the agreed mint. Uses `TransferChecked` to move the full total into escrow and sets status to Funded.

### `submitEvidence(evidenceHash: [u8;32])`

Accounts: `worker` (signer), `agreement`, `milestone`.

Assigned worker only; agreement must be Funded/Active; milestone must be Pending with no current evidence; hash must be nonzero. Sets evidence hash/submitted flag, moves milestone to EvidenceSubmitted and agreement to Active. Emits `EvidenceSubmittedEvent`.

### `verifyEvidence()`

Accounts: `verifier` (signer), `agreement`, `milestone`.

Only the milestone's assigned verifier; agreement Funded/Active; milestone EvidenceSubmitted with evidence present. Moves milestone to Verified and emits an accepted `VerificationAttestedEvent`.

### `rejectEvidence(rejectionReasonHash: [u8;32])`

Accounts: `verifier` (signer), `agreement`, `milestone`.

Same verifier/status constraints as verification; reason hash must be nonzero. Emits a rejected `VerificationAttestedEvent`, clears the currently stored evidence hash/submission flag, and returns milestone to Pending so the worker can resubmit. Prior evidence/reason is represented in transaction logs/events, not stored as a growing on-account history.

### `releaseMilestone()`

Accounts: `agreement`, `milestone`, `paymentMint`, `escrowAuthority`, `escrowTokenAccount`, `workerTokenAccount`, `tokenProgram`.

No application-level signer is required by this instruction; a transaction fee payer must still submit the transaction. This permits a third party to trigger a release once conditions are met, but they cannot redirect funds: the destination token account owner must be `agreement.worker`, and its mint must match the payment mint. The milestone must be Verified, evidence submitted, not previously released, and amount positive. Transfer uses the escrow authority PDA signer seeds. Updates the milestone to Released and increments agreement historical `releasedAmount`. Agreement becomes Completed if released amount equals total, otherwise Active. Emits `MilestoneReleasedEvent`.

### `cancelAgreement()`

Accounts: `sponsor` (signer), `worker` (signer), `agreement`, `paymentMint`, `sponsorTokenAccount`, `escrowAuthority`, `escrowTokenAccount`, `tokenProgram`.

Requires both sponsor and worker signatures in the same transaction. Only Funded/Active agreements can be cancelled. Transfers the entire remaining escrow token-account balance to the sponsor's correctly owned USDC token account; already released payments are not reversed. Sets status Cancelled and emits `AgreementCancelledEvent`. No separate delayed cancellation proposal/approval instruction exists.

## Events

All are Anchor events emitted into transaction logs.

- `EvidenceSubmittedEvent`: `agreement`, `milestone`, `worker`, `definitionHash`, `evidenceHash`, `unixTimestamp`.
- `VerificationAttestedEvent`: `agreement`, `milestone`, `index`, `verifier`, `definitionHash`, `evidenceHash`, `accepted`, `rejectionReasonHash`, `unixTimestamp`.
- `MilestoneReleasedEvent`: `agreement`, `milestone`, `worker`, `amount`, `definitionHash`, `evidenceHash`, `unixTimestamp`.
- `AgreementAcceptedEvent`: `agreement`, `sponsor`, `worker`, `definitionHash`, `totalAmount`, `milestoneCount`, `unixTimestamp`.
- `AgreementCancelledEvent`: `agreement`, `sponsor`, `worker`, `refundAmount`, `unixTimestamp`.

## Important state/accounting rules

- Allocations must exactly equal total before worker acceptance and funding.
- Total allocated cannot exceed the agreement total.
- `releasedAmount` tracks payments that already happened; a refund does not decrement it.
- All amounts are integer `u64` values in base token units. Devnet USDC has six decimals.
- Standard SPL Token accounts only. The code uses Anchor SPL `token`, not Token-2022.
- Hashes are commitments (`[u8; 32]`), not proof that off-chain data is truthful.
