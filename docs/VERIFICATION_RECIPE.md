# Automated Account-level Verification Recipe

## Purpose

A small TypeScript helper verifies a predefined Solana program-account checklist and submits the existing on-chain `verifyEvidence` instruction using the milestone's assigned verifier key. It is a demonstrator of `Definition of Done → Evidence → Verification → Settlement`, not a generic proof of program correctness.

Script in the contract workspace: `anchor/scripts/verify_solana_program.ts`.

## Current hash recipe

Hashing uses UTF-8 text exactly as below, lines separated by a single LF (`\n`), with no trailing newline, then SHA-256.

### Definition of Done preimage

```text
DONE_SOLANA_PROGRAM_ACCOUNT_DOD_V1
cluster_genesis=EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG
expected_program_id=82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM
expected_owner=BPFLoaderUpgradeab1e11111111111111111111111
expected_executable=true
```

Hash on the recorded Devnet smoke check:

`98c20aab27c1638fc261dce3f1f2a3db7553bd2522b57f7f0617f6a4ff4cd006`

### Evidence preimage

```text
DONE_SOLANA_PROGRAM_ACCOUNT_EVIDENCE_V1
cluster_genesis=EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG
program_id=82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM
owner=BPFLoaderUpgradeab1e11111111111111111111111
executable=true
program_data=9rraZSR21igaq3pvTwbnoJgtsj5sJoeSXkZBUBafXC4B
```

Hash on the recorded Devnet smoke check:

`8c5e5f5d3abe7e03b5d938d2ec756755830d7042e84df18793362ee93913f1b4`

These hashes are specific to the Devnet genesis and target program details above. Re-run `--prepare` for another target program or cluster. The smoke-test target was DONE Protocol itself, not a separate worker-created program.

## Prepare mode

From `anchor/`:

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com \
EXPECTED_PROGRAM_ID=82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM \
./node_modules/.bin/ts-node --project tsconfig.json scripts/verify_solana_program.ts --prepare
```

`--prepare` is read-only. It checks the account and outputs definition/evidence hashes and the evidence byte array to give to the frontend/workflow.

## Attestation mode

After the worker submits the evidence hash and the milestone stores the matching Definition of Done hash, run:

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com \
EXPECTED_PROGRAM_ID=82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM \
AGREEMENT_PDA=<agreement-pda> \
MILESTONE_PDA=<milestone-pda> \
VERIFIER_KEYPAIR=~/.config/solana/id.json \
./node_modules/.bin/ts-node --project tsconfig.json scripts/verify_solana_program.ts --attest
```

The script checks that the signer is the assigned verifier, worker acceptance is recorded, agreement is Funded/Active, evidence is submitted, and the milestone's stored hashes match the recalculated hashes. It then invokes `verifyEvidence`. Treat the verifier keypair as a secret; do not put it in frontend code or commit it to Git.

## Trust boundary

The recipe checks:

- RPC cluster genesis hash;
- target account exists;
- target account is executable;
- owner is the expected upgradeable BPF loader;
- account discriminator is `Program` and its stored ProgramData address matches the expected PDA;
- ProgramData account exists, is loader-owned, and has the `ProgramData` discriminator.

It does **not** compute a hash of the program's deployed executable bytes, fetch or audit source code, prove semantics, verify the target's security, or automatically judge subjective Definition of Done text. A malicious or incorrectly implemented program can be executable and have the correct loader owner. The verifier still makes the trust decision based on the configured checks.
