# DONE Protocol

Programmable settlement for verifiable work.

DONE Protocol is a Solana program for USDC-funded work agreements. A sponsor creates an agreement and milestones, the assigned worker accepts the finalized allocation, funds are placed in a program-controlled escrow, evidence is submitted and reviewed, and verified milestone payments can be released. Funded or active agreements can be cancelled only with both sponsor and worker signatures; only the remaining escrow is refunded.

> **Current status:** deployed and smoke-tested on Solana Devnet. 

## Start here

- **Frontend teammate:** read [`docs/FRONTEND_INTEGRATION.md`]() first.
- **FRONTEND_MESSAGE:** https://docs.google.com/document/d/1NJMJOkSi8_ZFK4H69xi3xNsn0jJRX1x_XbPa_qumCdA/edit?usp=sharing
- **Instruction/account/PDA reference:** [`docs/ON_CHAIN_SPEC.md`]()
- **Security assumptions and limitations:** [`docs/SECURITY_AND_TRUST_MODEL.md`]().
- **Automated account-check attestation:** [`docs/VERIFICATION_RECIPE.md`]().
- **Devnet addresses and transactions:** [`docs/DEVNET_DEPLOYMENT_LOG.md`]().
- **IDL export instructions:** [`docs/IDL_AND_SETUP.md`]().
- **Submission checklist:** [`docs/SUBMISSION_CHECKLIST.md`](https://docs.google.com/document/d/11hNi3npOYO7GrwvekcIFo13zDkYYjudhxtbyHvboOL8/edit?usp=sharing).
- check here for deployed IDL: \docs\idl\done_protocol.devnet.json

## Documentation

- [Frontend integration guide](https://docs.google.com/document/d/1eRdrpOdlyEiV4Pzyi79fMp61ykGWpQtxmu3P7Wd_-EM/edit?usp=sharing)
- [On-chain instructions, accounts, PDAs, and events](https://docs.google.com/document/d/18TuPMDJIuwzIy4m0CfpC50pxoMBBVj4_U8xZgg6azco/edit?usp=sharing)
- [Security and trust model](https://docs.google.com/document/d/1jDiAhl7Xs88UwZdHZ0AUVeuLS0_AtD3PyZUJe0RvWzo/edit?usp=sharing)
- [Automated account-check verification recipe](https://docs.google.com/document/d/19De09nQx0iA7cVJRiCD1fOFTq6LjAmKyEDjWKbm_8gA/edit?usp=sharing)
- [Devnet deployment and smoke-test record](https://docs.google.com/document/d/1J5rZmAObT8nhAE2GXgGYFfkh_9S9mNIjDR1JO3tvXyo/edit?usp=sharing)
- [IDL and setup instructions](https://docs.google.com/document/d/1xvlOSvJ_gefdLs5BHcXtLiZvEW99ZWbDdbR5eCGCYHk/edit?usp=sharing)

The deployed IDL is the interface source of truth for client integration. Do not manually reconstruct or edit it. Confirm the checked-out Rust source, generated types, and deployed IDL refer to the same program version before integration or release.

## Devnet deployment

| Setting | Value |
|---|---|
| Cluster | Solana Devnet |
| RPC | `https://api.devnet.solana.com` |
| Program ID | `82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM` |
| ProgramData PDA | `9rraZSR21igaq3pvTwbnoJgtsj5sJoeSXkZBUBafXC4B` |
| Upgrade authority / config admin | `APCVxcE8EfdnP5bfkbVTb8foLAa2f3RACgbb1uFyUCSB` |
| Protocol config PDA | `6HamdMRRAhWZyThM5dpCjyfQBkZaAsLrMVjQenMJPua1` |
| Devnet USDC mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| USDC decimals | `6` |
| Deployed IDL | [`docs/idl/done_protocol.devnet.json`](docs/idl/done_protocol.devnet.json) |

Explorer links:

- [Program account](https://explorer.solana.com/address/82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM?cluster=devnet)
- [ProgramData account](https://explorer.solana.com/address/9rraZSR21igaq3pvTwbnoJgtsj5sJoeSXkZBUBafXC4B?cluster=devnet)
- [Config PDA](https://explorer.solana.com/address/6HamdMRRAhWZyThM5dpCjyfQBkZaAsLrMVjQenMJPua1?cluster=devnet)


## Protocol lifecycle

1. The sponsor creates an agreement and sequential milestones.
2. Milestone allocations must add up to the agreement total.
3. The assigned worker accepts the finalized allocation.
4. The sponsor funds escrow in USDC.
5. The worker submits a 32-byte evidence hash.
6. The milestone's assigned verifier verifies or rejects the submission. Rejection records a reason hash and permits resubmission.
7. A verified milestone can be released to a token account owned by the assigned worker.
8. After the full agreement total has been released, the agreement becomes `Completed`.
9. For a `Funded` or `Active` agreement, cancellation requires the sponsor and worker to sign the same transaction. Only remaining escrow is refunded; past payouts are not reversed.


## Documentation

- [Frontend integration guide](docs/FRONTEND_INTEGRATION.md)
- [On-chain instructions, accounts, PDAs, and events](docs/ON_CHAIN_SPEC.md)
- [Security and trust model](docs/SECURITY_AND_TRUST_MODEL.md)
- [Automated account-check verification recipe](docs/VERIFICATION_RECIPE.md)
- [Devnet deployment and smoke-test record](docs/DEVNET_DEPLOYMENT_LOG.md)
- [IDL and setup instructions](docs/IDL_AND_SETUP.md)

The deployed IDL is the interface source of truth for client integration. Do not manually reconstruct or edit it. Confirm the checked-out Rust source, generated types, and deployed IDL refer to the same program version before integration or release.


## Build and test

Prerequisites: Rust, Solana CLI, Anchor CLI **0.32.1**, Node.js, and Yarn. Commands below assume the tools are available in your shell `PATH`.

```bash
cd anchor
anchor --version
anchor build
anchor test --skip-build
```

Use `anchor test --skip-build` for TypeScript-only test iterations after a successful build. Rebuild after Rust/Anchor program changes. The current integration suite consolidates multiple assertions into one Mocha test, so it can report `1 passing` while exercising many cases.


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

## Devnet smoke-test evidence

- [Deployment transaction](https://explorer.solana.com/tx/5toYvUkkLHp6GDGi8fRGXzkhoFFxixDyqPY1RdGRkCPdBYG6jDYmc6WY3HqzP6veH8aQKSRC87UBbwJS4RaKUYPr?cluster=devnet)
- [Config initialization](https://explorer.solana.com/tx/3schhcX4kf45wuedWLF9LsQ5qeRxppMPwiAPbmfF2FkaaoybrusyioxKD8Ci1SW1YrWpQaVFAkdEa3N2NgaYAnVh?cluster=devnet)
- [Verifier attestation](https://explorer.solana.com/tx/3UpkcC6ZmspCXR2CUdqMLqixSTVnv9vxZxULbJbHcZCDqinkqaVNRbEq5c59Ep6j4Pzd5ve5pcjBqqLp9wmrCCfM?cluster=devnet)
- [Settlement transaction](https://explorer.solana.com/tx/4agy2v8ezKNL4vvFrTPQYxAMsxWgCiirPgxdH6DRTQocNckXc4TExcXf9w1y59HCu1Lt8c1igHM8aMswh9RcRPTV?cluster=devnet)

The smoke test completed a 1-USDC agreement-to-payment flow. It used a temporary worker keypair generated in memory; that private key was not persisted. The worker token account contains only test tokens and should not be treated as a reusable wallet.

## Security and limitations

- Amounts are integer SPL-token base units: `1 USDC = 1_000_000` units.
- The contract uses the classic SPL Token Program, not Token-2022.
- Funding requires worker acceptance and full milestone allocation.
- Only the verifier recorded on the milestone can verify or reject its evidence.
- Cancellation requires same-transaction signatures from both sponsor and worker; there is no separate on-chain cancellation-request/approval workflow.
- Evidence is stored as hashes. Hashes do not prove off-chain work is correct or truthful.
- The sample verifier checks account-level deployment properties (existence, executable flag, upgradeable-loader ownership, ProgramData linkage). It does not prove the target program's source code implements its promised behavior.
- The program remains upgradeable by the listed upgrade authority. No independent security audit or formal verification has been completed.

Devnet success proves the tested transactions completed on that deployment; it does not establish mainnet readiness or correctness of every possible edge case.
