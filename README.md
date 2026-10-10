# DONE Protocol

Programmable settlement for verifiable work.

DONE Protocol is a Solana program for USDC-funded work agreements. A sponsor creates an agreement and milestones, the assigned worker accepts the finalized allocation, funds are placed in a program-controlled escrow, evidence is submitted and reviewed, and verified milestone payments can be released. Funded or active agreements can be cancelled only with both sponsor and worker signatures; only the remaining escrow is refunded.

> **Current status:** deployed and smoke-tested on Solana Devnet. 

## Start here

- **Frontend teammate:** read [`docs/FRONTEND_INTEGRATION.md`](https://docs.google.com/document/d/1eRdrpOdlyEiV4Pzyi79fMp61ykGWpQtxmu3P7Wd_-EM/edit?usp=sharing) first.
- **FRONTEND_MESSAGE:** https://docs.google.com/document/d/1NJMJOkSi8_ZFK4H69xi3xNsn0jJRX1x_XbPa_qumCdA/edit?usp=sharing
- **Instruction/account/PDA reference:** [`docs/ON_CHAIN_SPEC.md`](https://docs.google.com/document/d/18TuPMDJIuwzIy4m0CfpC50pxoMBBVj4_U8xZgg6azco/edit?usp=sharing)
- **Security assumptions and limitations:** [`docs/SECURITY_AND_TRUST_MODEL.md`](https://docs.google.com/document/d/1jDiAhl7Xs88UwZdHZ0AUVeuLS0_AtD3PyZUJe0RvWzo/edit?usp=sharing).
- **Automated account-check attestation:** [`docs/VERIFICATION_RECIPE.md`](https://docs.google.com/document/d/19De09nQx0iA7cVJRiCD1fOFTq6LjAmKyEDjWKbm_8gA/edit?usp=sharing).
- **Devnet addresses and transactions:** [`docs/DEVNET_DEPLOYMENT_LOG.md`](https://docs.google.com/document/d/1J5rZmAObT8nhAE2GXgGYFfkh_9S9mNIjDR1JO3tvXyo/edit?usp=sharing).
- **IDL export instructions:** [`docs/IDL_AND_SETUP.md`](https://docs.google.com/document/d/1xvlOSvJ_gefdLs5BHcXtLiZvEW99ZWbDdbR5eCGCYHk/edit?usp=sharing).
- **Submission checklist:** [`docs/SUBMISSION_CHECKLIST.md`](https://docs.google.com/document/d/11hNi3npOYO7GrwvekcIFo13zDkYYjudhxtbyHvboOL8/edit?usp=sharing).

## Devnet deployment reference

| Setting | Value |
|---|---|
| Cluster | Solana Devnet (`https://api.devnet.solana.com`) |
| Program ID | `82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM` |
| ProgramData PDA | `9rraZSR21igaq3pvTwbnoJgtsj5sJoeSXkZBUBafXC4B` |
| Upgrade authority / config admin | `APCVxcE8EfdnP5bfkbVTb8foLAa2f3RACgbb1uFyUCSB` |
| Protocol config PDA | `6HamdMRRAhWZyThM5dpCjyfQBkZaAsLrMVjQenMJPua1` |
| Devnet USDC mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| USDC decimals | `6` |
| IDL metadata address printed during deploy | `Bio7ZXi791RrZsS4uSbC1gG2yquQv5D937kEMsxgDjLu` |

Explorer links:

- [Program account](https://explorer.solana.com/address/82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM?cluster=devnet)
- [ProgramData account](https://explorer.solana.com/address/9rraZSR21igaq3pvTwbnoJgtsj5sJoeSXkZBUBafXC4B?cluster=devnet)
- [Config PDA](https://explorer.solana.com/address/6HamdMRRAhWZyThM5dpCjyfQBkZaAsLrMVjQenMJPua1?cluster=devnet)

**Important:** `target/idl/done_protocol.json` is generated locally and may be ignored by Git. Before handing the client to the frontend developer, export the deployed Devnet IDL as described in [`docs/IDL_AND_SETUP.md`](docs/IDL_AND_SETUP.md). Do not manually reconstruct the IDL from this prose document.

## Protocol lifecycle

1. Sponsor creates an agreement with a worker, payment mint, total amount, and agreement-level Definition of Done hash.
2. Sponsor creates sequential milestones. Amounts must be positive and total milestone allocation must equal the agreement total before funding.
3. Assigned worker accepts the finalized allocation. Acceptance is allowed only while the agreement is Draft and only when at least one milestone exists and allocations equal the total.
4. Sponsor funds the agreement. Funding is rejected until worker acceptance and full allocation are recorded.
5. Assigned worker submits a nonzero evidence hash for a Pending milestone.
6. The milestone's assigned verifier either verifies or rejects the evidence. Rejection records a reason hash and allows resubmission.
7. Anyone may submit a release transaction for a Verified milestone, but payout is constrained to a token account owned by the assigned worker.
8. When all of the agreement's total amount has been released, the agreement becomes Completed.
9. A Funded or Active agreement can be cancelled only when sponsor and worker sign the same cancellation transaction. The remaining escrow goes to the sponsor; previous worker payments are not reversed.

## Build and test

Run these commands from the WSL Ubuntu shell. The paths below reflect the development setup used by the team; adapt them if your Anchor CLI is installed elsewhere.

```bash
cd /mnt/c/Users/jumcee/Blockchain/DONE/anchor
/home/jumcee/.avm/bin/anchor-0.32.1 build
/home/jumcee/.avm/bin/anchor-0.32.1 test --skip-build
```

Use `--skip-build` for TypeScript-only test iterations. Rebuild after Rust/Anchor program changes.

The integration suite has reported `1 passing` because the lifecycle and security assertions are inside one Mocha `it(...)` case. The latest recorded local run after worker-acceptance changes passed. The Rust build and the Devnet end-to-end smoke flow also succeeded.

## Scripts in `anchor/scripts/`

These scripts were used during the devnet validation work:

- `initialize_config_devnet.ts` — initializes the singleton protocol config on Devnet; it safely refuses to overwrite an existing config with unexpected settings. **Do not rerun to try another mint.**
- `check_devnet_usdc.ts` — read-only sponsor USDC balance check.
- `verify_solana_program.ts` — `--prepare` calculates Definition of Done/evidence commitments after checking a program account; `--attest` repeats the checks and invokes `verifyEvidence` using the configured verifier keypair.
- `devnet_smoke_test.ts` — `--start` creates, accepts, funds, and submits evidence for a fresh one-USDC smoke-test agreement; `--finish` settles it after attestation. `--start` creates new on-chain state and spends test USDC, rent, and fees, so do not rerun casually.


## What the frontend must respect

- Always use the Devnet cluster and the USDC mint listed above for this deployment.
- Amounts are raw SPL token units (`USDC amount × 1,000,000`).
- Use the deployed IDL as the client interface; method names are camelCase in Anchor TypeScript (`createAgreement`, `acceptAgreement`, etc.).
- Derive PDAs using the exact seed bytes and little-endian integer encodings in `docs/ON_CHAIN_SPEC.md`.
- Do not allow funding until the assigned worker accepted and the allocation is complete; the program also enforces these conditions.
- A verifier must equal the milestone's stored verifier public key.
- Never allow UI-only checks to substitute for the program's authorization/state checks.
- Cancellation requires both parties to sign the same transaction. There is no separate on-chain pending-cancellation approval state.
- Do not describe the evidence hash as proof of work correctness. The current recipe proves only defined account-level checks; an authorized verifier attests on-chain.
- Never put secret key JSON, seed phrases, or private keys in frontend source, documentation, commits, or browser bundles.

## Devnet smoke-test transactions

- [Program deployment](https://explorer.solana.com/tx/5toYvUkkLHp6GDGi8fRGXzkhoFFxixDyqPY1RdGRkCPdBYG6jDYmc6WY3HqzP6veH8aQKSRC87UBbwJS4RaKUYPr?cluster=devnet)
- [Config initialization](https://explorer.solana.com/tx/3schhcX4kf45wuedWLF9LsQ5qeRxppMPwiAPbmfF2FkaaoybrusyioxKD8Ci1SW1YrWpQaVFAkdEa3N2NgaYAnVh?cluster=devnet)
- [Verifier attestation](https://explorer.solana.com/tx/3UpkcC6ZmspCXR2CUdqMLqixSTVnv9vxZxULbJbHcZCDqinkqaVNRbEq5c59Ep6j4Pzd5ve5pcjBqqLp9wmrCCfM?cluster=devnet)
- [Settlement](https://explorer.solana.com/tx/4agy2v8ezKNL4vvFrTPQYxAMsxWgCiirPgxdH6DRTQocNckXc4TExcXf9w1y59HCu1Lt8c1igHM8aMswh9RcRPTV?cluster=devnet)

The smoke-test worker keypair was generated in memory and was not persisted. Its token account received 1 devnet USDC in the test.

## Scope disclaimer

This project has not received an independent security audit or formal verification. Devnet success proves that the tested transactions completed on the deployed program; it does not establish mainnet readiness, upgrade immutability, or correctness of every edge case.
