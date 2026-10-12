# Security and Trust Model

## Current posture

DONE Protocol has been built and deployed to Solana Devnet, and the recorded local integration test and live one-USDC lifecycle smoke test passed. This is not an independent audit, formal verification, or a claim of mainnet readiness.

## On-chain protections implemented

- Agreement PDA is bound to sponsor public key and unique sponsor-scoped agreement ID.
- Config PDA restricts the payment mint to the initialized configured mint.
- Program initialization validates the program's ProgramData and current upgrade authority.
- Agreement creation rejects zero total, zero/default worker, sponsor-as-worker, and empty definition hash.
- Milestones use sequential indexes, positive amounts, nonzero definition hash and verifier, and bounded aggregate allocation.
- Worker acceptance can occur only while Draft, once, by the assigned worker, after at least one milestone exists and allocations equal total.
- Milestones cannot be added after acceptance; funding is blocked before acceptance and complete allocation.
- Only assigned worker submits evidence; only assigned verifier verifies/rejects.
- Rejection requires a nonzero reason hash and resets the milestone for resubmission.
- Release requires a Verified milestone and prevents duplicate release through status/released amount checks.
- Release destination must be a token account owned by the assigned worker with the configured mint; a caller cannot route payment to an arbitrary owner.
- Escrow uses PDAs; token transfers use `TransferChecked`.
- Cancellation requires sponsor and worker signatures, only in Funded/Active state, and refunds remaining escrow; prior worker payments are not reversed.

## Trust boundaries and limitations

### Verifier attestation is trusted

The program stores evidence/definition hashes and enforces the assigned verifier public key. The program itself does not read GitHub, inspect a PR, run tests, or execute the worker's application logic. Correct interpretation of evidence remains an off-chain task performed by the assigned verifier.

### Current automated verification is narrow

`scripts/verify_solana_program.ts` checks a target account on the expected cluster for existence, executable flag, upgradeable-loader ownership, Program state, derived ProgramData address linkage, and ProgramData state. It computes a deterministic hash recipe and can submit the existing verifier attestation if the milestone hashes match. It does **not** hash the target program's compiled executable bytes, prove source-code provenance, prove semantic correctness, or detect every upgrade/behavioral change behind a stable program ID. In the smoke test, the target was DONE Protocol itself to demonstrate the mechanism; a product demo should use the actual Solana program/account that the milestone promises to verify.

### Upgrade authority

The deployed program remains upgradeable. Current upgrade authority and `ProtocolConfig.admin` are `APCVxcE8EfdnP5bfkbVTb8foLAa2f3RACgbb1uFyUCSB`. Whoever controls that key can upgrade the program under Solana's upgradeable-loader model. Secure the key and never embed it in frontend code. Do not claim immutability.

### Fixed singleton config

The `config` PDA is initialized once and stores the payment mint. There is no ordinary instruction to replace that mint. The active Devnet config points to Devnet USDC. Do not try to initialize it a second time to switch mints.

### Cancellation workflow

Both participants must sign the same transaction. There is no on-chain asynchronous cancellation-request account, dispute process, timeout, arbitrator, or sponsor-only refund. The app must explain this constraint. Cancelled means remaining escrow was refunded, not that the protocol reversed earlier worker payments.

### Token compatibility

The program uses the classic SPL Token Program interface. Do not assume Token-2022 extensions (transfer fees, hooks, confidential transfers, etc.) are supported. The configured devnet USDC mint is a standard mint with six decimals.

### Availability and disputes

No deadline/timeout-based cancellation, on-chain arbitration, appeal mechanism, or automatic dispute resolution is implemented. If the other party will not co-sign cancellation, this version has no independent cancellation path. Product copy must not promise one.

### Evidence availability

Only hashes and small state flags are stored on-chain. Off-chain work artifacts should be stored using an agreed URL/IPFS/Arweave/Git repository process, and the exact canonical data to hash must be specified by product UX. A hash does not preserve the evidence content by itself.

## Recommended claims for hackathon materials

Good: “The on-chain program gates USDC milestone payments on worker acceptance, evidence submission, and an assigned verifier attestation, with account-checked payout routing and mutual-consent refunds.”

Avoid: “The protocol automatically proves work is correct,” “fully trustless verification,” “audited,” “mainnet-ready,” or “immutable.”

## Focused tests already exercised

The existing integration test has assertions for: invalid worker/empty hashes, configured mint restriction, incomplete and over-allocation scenarios, sequential milestones, funding/second-funding rejection, unauthorized evidence submission, premature/unauthorized verification, verifier rejection and resubmission, successful verification, duplicate payment prevention, recipient/verified-state release protection (added to the test), acceptance-before-funding checks, acceptance authorization/repeat prevention, milestone freeze after acceptance, mutual cancellation, partial refund, and release-after-cancellation rejection. It is one Mocha test containing multiple assertions, so the runner reports `1 passing`.

The latest successful live Devnet smoke test covered a single 1-USDC agreement: agreement create, worker acceptance, funding, evidence submission, off-chain verifier check + `verifyEvidence`, and settlement. It did not test every edge case on Devnet.
