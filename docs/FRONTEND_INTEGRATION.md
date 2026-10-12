# Frontend Integration Handoff

This is the frontend developer's starting point. Pair this document with the actual deployed IDL exported as described in [`IDL_AND_SETUP.md`](IDL_AND_SETUP.md).

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

## 1. Network configuration

```ts
export const DONE_NETWORK = {
  cluster: "devnet",
  rpcUrl: "https://api.devnet.solana.com",
  programId: "82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM",
  configPda: "6HamdMRRAhWZyThM5dpCjyfQBkZaAsLrMVjQenMJPua1",
  usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  usdcDecimals: 6,
} as const;
```

Use testnet/devnet RPC and wallet network consistently. Mainnet settings must not reuse this devnet mint or be inferred from it.

## 2. Program client

Use the `@coral-xyz/anchor` package/version compatible with the generated IDL and project (the contract workspace uses Anchor 0.32.1). Copy the exported deployed IDL into the frontend source tree and import its generated type if the frontend TypeScript project is configured to use one.

Example shape (adapt wallet types to the existing wallet-adapter setup):

```ts
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
// Import the actual deployed IDL and the generated IDL type from the copied artifact.
// import idl from "./idl/done_protocol.devnet.json";
// import type { DoneProtocol } from "./idl/done_protocol";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// `wallet` is the connected wallet-adapter wallet; ensure it implements the
// signing interface expected by the installed Anchor client.
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
  preflightCommitment: "confirmed",
});

// Use the IDL's program address or explicitly verify it equals DONE_NETWORK.programId.
// const program = new anchor.Program<DoneProtocol>(idl as DoneProtocol, provider);
```

Do not hardcode test signer keypairs into the browser. In the frontend, connected wallets sign their own transactions. The protocol's admin/deployer keypair must never be shipped to the client.

## 3. PDA derivation helpers

Use the exact seed strings, pubkey bytes, integer widths, and little-endian encoding below. Do not concatenate Base58 strings as seeds.

```ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey(
  "82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM"
);
const USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

export function deriveConfigPda() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
}

export function deriveAgreementPda(sponsor: PublicKey, agreementId: anchor.BN) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("agreement"),
      sponsor.toBuffer(),
      agreementId.toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID
  );
}

export function deriveMilestonePda(agreement: PublicKey, index: number) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("milestone"),
      agreement.toBuffer(),
      new anchor.BN(index).toArrayLike(Buffer, "le", 4),
    ],
    PROGRAM_ID
  );
}

export function deriveEscrowAuthorityPda(agreement: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), agreement.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveEscrowTokenAccountPda(agreement: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow-token"), agreement.toBuffer()],
    PROGRAM_ID
  );
}
```

The worker's USDC account should normally be their Associated Token Account (ATA) for the configured USDC mint. At release, the on-chain program validates the destination token account's owner equals `agreement.worker` and its mint equals `agreement.paymentMint`; the account is not required by the Rust code to be a specific ATA address.

## 4. Human amounts and raw token amounts

USDC uses six decimals. Convert user-facing amounts to integer base units before calling the program.

```ts
// One USDC
const oneUsdcRaw = new anchor.BN(1_000_000);

// Avoid floating point for arbitrary decimal conversions. For a UI amount
// string, parse the decimal string into an integer using a safe helper.
```

`totalAmount`, milestone `amount`, and settlement amounts are integer `u64` raw units. Never send `1` when the user means one USDC: `1` is one micro-USDC unit.

## 5. Instruction flow

1. **Sponsor:** `createAgreement(agreementId, totalAmountRaw, agreementDefinitionHashBytes)`.
2. **Sponsor:** one `createMilestone(index, amountRaw, milestoneDefinitionHashBytes, verifierPublicKey)` per milestone.
3. **Worker:** `acceptAgreement()` after all intended milestones exist and the allocations sum exactly to the total.
4. **Sponsor:** `fundAgreement()`; transfers the complete agreement total from sponsor USDC ATA into the escrow token PDA.
5. **Worker:** `submitEvidence(evidenceHashBytes)` for a Pending milestone.
6. **Assigned verifier:** `verifyEvidence()` or `rejectEvidence(reasonHashBytes)`.
7. **Anyone willing to pay the transaction fee:** `releaseMilestone()` after verification; the program routes funds only to an account owned by the assigned worker.
8. **Sponsor + worker:** `cancelAgreement()` only for Funded/Active agreements, with both signatures on the same transaction. The remaining escrow amount is refunded to sponsor.

Use the actual IDL account schema. The script examples use `.accountsStrict(...)` when supplying every account because it makes the account list explicit; this can be convenient while stabilizing client integration.

## 6. Instruction accounts and arguments

See [`ON_CHAIN_SPEC.md`](ON_CHAIN_SPEC.md) for all required account names and constraints. Frontend method names are generated in camelCase by Anchor from the snake_case Rust instruction names.

## 7. UI states and actions

- Draft + not accepted: sponsor can add milestones; worker can review terms but acceptance only succeeds once allocation is complete.
- Draft + accepted: milestones are frozen; sponsor can fund.
- Funded/Active: worker can submit evidence for Pending milestones; the assigned verifier can verify/reject submitted evidence; verified milestones can be released.
- Completed: no further milestone payment or cancellation.
- Cancelled: no further milestone payment; remaining escrow has been refunded.

Fetch account state from the chain after a transaction. Do not treat a successful button click or an off-chain optimistic state update as settlement proof.

## 8. Cancellation UX caveat

`cancelAgreement` requires sponsor and worker signatures in one Solana transaction. The program has no separate on-chain pending cancellation proposal/approval account. The UI must coordinate co-signatures or serialize/partially-sign a transaction and deliver it to the other party before it expires. Do not promise that a sponsor can submit a cancellation request now and that a worker can approve it on-chain later using a separate instruction; that mechanism does not exist.

## 9. Error handling

Use Anchor errors and on-chain state to show user-friendly messages. Expected rejection cases include: incomplete milestone allocation, worker acceptance required, agreement already accepted, invalid state, unauthorized worker/verifier, invalid mint/token account, evidence hash empty, and duplicate release. Error strings may change; use error codes/names from the final IDL and error definitions where possible.

## 10. Evidence and verification

Evidence and Definition of Done are committed as 32-byte hashes; the program does not store the off-chain artifacts themselves. The current sample verifier checks account-level deployment conditions for a specific Solana program and produces hashes. It is a demo verification recipe, not proof that arbitrary source code has the promised behavior. Explain the verifier/trust boundary in the UI and submission.
