# ARCHITECTURE.md — DONE Protocol (Web Client & Integration Layer)

## 1. System Overview

DONE Protocol is programmable settlement infrastructure for verifiable work on Solana. It eliminates subjective escrow releases by enforcing an explicit pipeline:

```
Definition of Done (DoD) → Evidence Submission → Verification → Settlement
```

The web application is a deterministic interface to the Solana Anchor program. It is **not** a standalone SaaS or marketplace. Every critical UI state transition maps directly to an on-chain account state or Anchor instruction.

---

## 2. Tech Stack

* **Framework:** Next.js (App Router), React, TypeScript (strict mode)
* **Styling:** Tailwind CSS (functional, high-contrast, zero superfluous decoration)
* **State & Data Fetching:** TanStack Query (`@tanstack/react-query`) + React Context for wallet/session
* **Solana / Web3 Layer:**
  * `@solana/web3.js` (v1.x)
  * `@solana/spl-token` (USDC SPL mint interactions on Devnet)
  * `@coral-xyz/anchor` compatible IDL representation (`done_protocol.json` & `done_protocol.ts`)
* **Cryptography / Canonical Hashing:** Web Crypto API (`crypto.subtle.digest('SHA-256', ...)`)

---

## 3. High-Level Architecture & Data Flow

```
+-------------------------------------------------------------------------+
|                              Next.js Frontend                           |
|                                                                         |
|  +-------------------+   +--------------------+   +------------------+  |
|  | Sponsor Dashboard |   |  Worker Dashboard  |   | Milestone Detail |  |
|  +---------+---------+   +---------+----------+   +--------+---------+  |
|            |                       |                       |            |
|            +-----------------------+-----------------------+            |
|                                    |                                    |
|                        +-----------v------------+                       |
|                        | Protocol Client Layer  |                       |
|                        |   (Anchor IDL Adapter) |                       |
|                        +-----------+------------+                       |
+------------------------------------|------------------------------------+
                                     | RPC / Instructions
                                     v
+-------------------------------------------------------------------------+
|                        Solana Runtime (Devnet)                          |
|                                                                         |
|  +-----------------------+                     +---------------------+  |
|  | Program Accounts      |                     | Token Accounts      |  |
|  | - Agreement Account   |                     | - Protocol Escrow   |  |
|  | - Milestone Account   |                     |   Vault (USDC)      |  |
|  | - Evidence Hash Record|                     | - Worker ATA (USDC) |  |
|  +-----------------------+                     +---------------------+  |
+-------------------------------------------------------------------------+
```

---

## 4. On-Chain State & Frontend Enum Mapping

The client UI strictly reflects on-chain states. No simulated optimistic status changes are permitted without verified block confirmation.

### 4.1 Agreement State

| State | Description | Permitted UI Actions |
| --- | --- | --- |
| `DRAFT` | Created off-chain or initialized without escrow. | Add Milestones, Edit Terms, Fund Escrow Vault |
| `FUNDED` | Total milestone budget locked in protocol escrow vault. | Worker starts execution |
| `ACTIVE` | At least one milestone is in flight. | Submit Evidence |
| `COMPLETED` | All milestones reached terminal state (`RELEASED`). | Read-only archive |
| `CANCELLED` | Escrow reclaimed according to program rules. | Read-only archive |

### 4.2 Milestone State

| State | Description | Permitted UI Actions |
| --- | --- | --- |
| `PENDING` | Milestone active, work in progress. | Worker: Submit Evidence |
| `EVIDENCE_SUBMITTED` | Proof recorded; awaiting verification. | Sponsor/Oracle: Run Verification |
| `VERIFIED` | DoD criteria satisfied; settlement unlocked. | Anyone / Sponsor: Trigger Settlement |
| `RELEASED` | USDC successfully transferred to Worker ATA. | View Solana transaction signature |

---

## 5. Protocol Interaction Layer (Anchor Program Bridge)

All blockchain operations flow through a strongly typed service module (`lib/protocol/`). The client is decoupled from direct program internals via an interface matching the Anchor IDL.

### 5.1 Target Instruction Set

```typescript
interface DoneProtocolProgram {
  createAgreement(params: {
    worker: PublicKey;
    termsHash: Uint8Array;
    milestoneCount: number;
    title: string;
    description: string;
    termsText: string;
  }): Promise<{ signature: string; agreementPda: PublicKey }>;

  createMilestone(params: {
    agreement: PublicKey;
    index: number;
    amount: number;
    dodHash: Uint8Array;
    verificationType: VerificationType; // 0 = Sponsor, 1 = OnChain, 2 = Attestation
    title: string;
    description: string;
    dodCriteria: string[];
  }): Promise<{ signature: string; milestonePda: PublicKey }>;

  fundAgreement(params: {
    agreement: PublicKey;
    amount: number;
  }): Promise<{ signature: string; vaultPda: PublicKey }>;

  submitEvidence(params: {
    agreement: PublicKey;
    milestoneIndex: number;
    evidenceHash: Uint8Array;
    metadataUri: string;
    notes: string;
    deliverableLinks: string[];
  }): Promise<{ signature: string }>;

  verifyMilestone(params: {
    agreement: PublicKey;
    milestoneIndex: number;
    notes?: string;
  }): Promise<{ signature: string }>;

  releasePayment(params: {
    agreement: PublicKey;
    milestoneIndex: number;
  }): Promise<{ signature: string; workerAta: PublicKey }>;
}
```

### 5.2 Canonical Commitment Hashing

To prevent off-chain vs. on-chain divergence, DoD criteria are serialized into deterministic JSON and hashed prior to account creation:

```typescript
// Standard DoD Hashing Primitive
export async function hashDefinitionOfDone(criteria: string[]): Promise<Uint8Array> {
  const normalized = JSON.stringify(
    criteria
      .map(c => c.trim())
      .filter(Boolean)
      .sort()
  );
  const buffer = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return new Uint8Array(hashBuffer);
}
```

---

## 6. Directory Structure

```
├── app/
│   ├── layout.tsx                # Root layout with Solana WalletProvider & QueryClient
│   ├── page.tsx                  # Protocol Explorer & overview page
│   ├── agreements/
│   │   ├── new/page.tsx          # Agreement & Milestone creation wizard
│   │   ├── [id]/page.tsx         # Agreement overview & milestone tracker
│   │   └── [id]/m/[mId]/page.tsx # Milestone detail, evidence input, verification
│   ├── sponsor/page.tsx          # Sponsor portfolio view (committed vs settled)
│   └── worker/page.tsx           # Worker portfolio view (assigned agreements)
├── components/
│   ├── ui/                       # Minimal, functional primitives (Button, Card, Input, Badge)
│   ├── web3/                     # WalletConnectButton, TxStateModal, NetworkBadge
│   └── protocol/                 # VerificationCard, MilestoneRow, EvidenceForm, FundingModal
├── hooks/
│   ├── useAgreement.ts           # Fetch & deserialize on-chain agreement accounts
│   ├── useMilestone.ts           # Fetch milestone status & DoD requirements
│   └── useTransactionExecution.ts# Transaction signing, spinner, error parser, & explorer link
├── lib/
│   ├── idl/
│   │   ├── done_protocol.json    # Target Anchor IDL file
│   │   └── done_protocol.ts      # Exported TypeScript types & error definitions from Anchor
│   ├── protocol/
│   │   ├── client.ts             # Program instantiation & transaction factory
│   │   ├── pda.ts                # PDA derivation helpers (Agreement, Vault, Milestone)
│   │   └── hashing.ts            # Canonical SHA-256 commitments for DoD, terms & evidence
│   └── solana.ts                 # Connection, cluster configuration (Devnet), USDC mint
└── types/
    └── protocol.ts               # Core domain models and verification interfaces
```

---

## 7. Mock-to-Contract Transition Strategy

To support frontend execution while the smart contract is finalized:

1. **IDL Contract Mocking:** A typed implementation satisfying the `DoneProtocolProgram` interface using a reactive storage driver with Devnet simulation parameters.
2. **Deterministic Interfaces:** UI components consume exclusively through custom React hooks (`useAgreement`, `useMilestone`, `useTransactionExecution`).
3. **Cutover Protocol:** When the smart contract engineer deploys the compiled program to Devnet, flip the `isLiveContract` flag in `lib/protocol/client.ts` to connect directly to the Anchor Provider without touching presentation code.

---

## 8. Non-Negotiable Engineering Constraints

1. **Strictly USDC on Devnet:** No arbitrary tokens. Escrow vaults and disbursements strictly utilize the standard SPL Token program targeting the official Devnet USDC mint (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`).
2. **Deterministic States:** Never indicate a milestone is "Verified" or "Released" based solely on frontend click handlers. The UI changes state strictly after the transaction signature is confirmed on-chain.
3. **No Marketplace Overhead:** Do not implement user profiles, chatting, ratings, bidding, social graphs, or discovery engines. The entire scope is agreement lifecycle, verification, and settlement.
4. **Transaction Transparency:** Every mutate action presents a clear modal with:
   * Wallet approval state
   * RPC submission / signature hash
   * Solana Explorer link upon confirmation
   * Error parser for program-specific Anchor error codes (6000–6007)
