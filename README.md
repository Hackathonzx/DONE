# DONE Protocol — Programmable Settlement for Verifiable Work on Solana

[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-14F195?logo=solana&logoColor=black&style=flat-square)](https://explorer.solana.com/?cluster=devnet)
[![Token: SPL USDC](https://img.shields.io/badge/Settlement-SPL%20USDC-2775CA?logo=usd-coin&logoColor=white&style=flat-square)](https://explorer.solana.com/address/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU?cluster=devnet)
[![Framework: Next.js 15](https://img.shields.io/badge/Framework-Next.js%2015-black?logo=next.js&style=flat-square)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

> **DONE Protocol** is programmable settlement infrastructure for verifiable work on Solana. It eliminates subjective escrow releases by enforcing an explicit, deterministic execution pipeline:
>
> $$\text{Definition of Done (DoD)} \longrightarrow \text{Evidence Submission} \longrightarrow \text{Verification} \longrightarrow \text{Settlement}$$

---

## Table of Contents

- [1. System Overview & Problem Statement](#1-system-overview--problem-statement)
- [2. The 4-Stage Protocol Pipeline](#2-the-4-stage-protocol-pipeline)
- [3. Architecture & Data Flow](#3-architecture--data-flow)
- [4. Canonical Commitment Hashing](#4-canonical-commitment-hashing)
- [5. On-Chain States & Invariants](#5-on-chain-states--invariants)
- [6. Anchor Program & Instruction Reference](#6-anchor-program--instruction-reference)
- [7. Key Features & Non-Negotiables](#7-key-features--non-negotiables)
- [8. Getting Started](#8-getting-started)
- [9. Transition & Cutover Strategy](#9-transition--cutover-strategy)

---

## 1. System Overview & Problem Statement

Traditional freelance platforms and web3 bounties rely on subjective escrow releases, informal disputes, or centralized mediators. This results in scope creep, delayed payouts, and counterparty risk.

**DONE Protocol** replaces subjective milestones with deterministic cryptographic commitments:
* Milestones are bound to an immutable **Definition of Done (DoD)** hash stored on-chain at account initialization.
* Workers submit verifiable evidence (permanent Arweave/IPFS artifact URIs, pull request diffs, invariant test outputs).
* Authorized verifiers (Sponsors, multisigs, or on-chain oracles) audit the deliverables against the committed criteria checklist.
* Once verified, funds held in the protocol's Escrow Vault PDA can be disbursed directly to the worker's Associated Token Account (ATA) in **USDC**.

---

## 2. The 4-Stage Protocol Pipeline

```
  +-------------------------------------------------------------------------+
  |  STAGE 1: Definition of Done (DoD)                                      |
  |  • Criteria sorted, normalized, and hashed via SHA-256                   |
  |  • Committed immutably into Milestone Account PDA                       |
  +------------------------------------+------------------------------------+
                                       |
                                       v
  +-------------------------------------------------------------------------+
  |  STAGE 2: Evidence Submission                                           |
  |  • Worker uploads deliverable artifacts (Arweave, IPFS, GitHub)          |
  |  • Canonical evidence pre-image hash submitted on-chain                 |
  +------------------------------------+------------------------------------+
                                       |
                                       v
  +-------------------------------------------------------------------------+
  |  STAGE 3: Verification Audit                                            |
  |  • Verifier (Sponsor or Oracle) audits items against committed DoD      |
  |  • Verifier signs block confirmation; state unlocks for settlement      |
  +------------------------------------+------------------------------------+
                                       |
                                       v
  +-------------------------------------------------------------------------+
  |  STAGE 4: Deterministic Settlement                                      |
  |  • Escrow Vault PDA disburses exact USDC allocation to Worker ATA        |
  |  • Transaction signature confirmed on Solana runtime                    |
  +-------------------------------------------------------------------------+
```

---

## 3. Architecture & Data Flow

For the complete technical blueprint, see [ARCHITECTURE.md](./ARCHITECTURE.md).

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

## 4. Canonical Commitment Hashing

To guarantee that off-chain agreements and on-chain program states cannot diverge, criteria are serialized deterministically before hashing:

```typescript
import { hashDefinitionOfDone } from '@/lib/protocol/hashing';

// Criteria are trimmed, filtered, and alphabetically sorted
const criteria = [
  'Architecture threat model document covering all CPI call paths',
  'Automated Slither / cargo-audit report with zero unaddressed high-risk alerts',
  'Initial security findings memo signed by Lead Security Researcher'
];

const dodHashBytes = await hashDefinitionOfDone(criteria);
// => Uint8Array (32-byte SHA-256 pre-image commitment)
```

The resulting 32-byte hash is recorded directly in the on-chain milestone account upon initialization.

---

## 5. On-Chain States & Invariants

### 5.1 Agreement Account State
- `DRAFT`: Initialized with metadata and terms commitment; awaiting capital deposit.
- `FUNDED`: Total milestone budget locked in the Escrow Vault PDA.
- `ACTIVE`: Work is underway on at least one milestone.
- `COMPLETED`: Terminal state; all milestones have reached `RELEASED`.
- `CANCELLED`: Vault capital reclaimed per program rules.

### 5.2 Milestone Account State
- `PENDING`: Work in flight; awaiting Worker evidence submission.
- `EVIDENCE_SUBMITTED`: Deliverables and proof recorded; awaiting verification.
- `VERIFIED`: Criteria audit signed; vault unlocked for settlement.
- `RELEASED`: USDC transferred to Worker ATA; Solana transaction finalized.

---

## 6. Anchor Program & Instruction Reference

### 6.1 Core Instructions

| Instruction | Signer | Mutated Accounts | Description |
|---|---|---|---|
| `createAgreement` | Sponsor | Agreement PDA | Initializes agreement metadata and canonical terms hash |
| `createMilestone` | Sponsor | Milestone PDA, Agreement | Allocates USDC budget and commits canonical DoD hash |
| `fundAgreement` | Sponsor | Vault ATA, Sponsor ATA | Locks USDC from sponsor ATA into Escrow Vault PDA |
| `submitEvidence` | Worker | Milestone PDA | Records artifact URIs and evidence payload hash |
| `verifyMilestone` | Verifier | Milestone PDA | Asserts all DoD criteria satisfied; unlocks disbursement |
| `releasePayment` | Anyone | Vault ATA, Worker ATA | Transfers USDC from vault to worker ATA |

### 6.2 Program Errors Reference

* `6000: InvalidAgreementState` — Current state does not permit this instruction.
* `6001: InvalidDoDHash` — Definition of Done hash mismatch.
* `6002: MilestoneNotVerified` — Milestone must be verified before payment release.
* `6003: InsufficientVaultBalance` — Escrow vault balance is insufficient.
* `6004: UnauthorizedWorker` — Signer is not the designated worker.
* `6005: UnauthorizedVerifier` — Signer is not the authorized verifier.
* `6006: EscrowAlreadyFunded` — Vault has already been funded.
* `6007: MilestoneAlreadyReleased` — Milestone funds were already disbursed.

---

## 7. Key Features & Non-Negotiables

1. **Strictly USDC on Devnet:** Payments and vaults target the official Devnet USDC mint (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`). No arbitrary tokens.
2. **Deterministic UI State:** Status updates never trigger optimistically on click. UI transitions strictly upon verified block confirmation.
3. **Transaction Transparency:** Every mutate action provides a modal detailing:
   * Keypair signature approval simulation
   * Transaction hash / signature
   * Solana Explorer links
   * Compute Units consumed & network fee
   * Anchor error code decoding
4. **Role Simulation:** Instant switching between **Sponsor** (capital lock & verification), **Worker** (evidence submission & claiming), and **Oracle** accounts, plus a built-in Devnet USDC faucet (+5,000 USDC).
5. **Zero Marketplace Fluff:** Pure protocol settlement infrastructure. No user profiles, chats, ratings, or bidding.

---

## 8. Getting Started

### Prerequisites
* Node.js 18+ or Bun
* Modern web browser with Web Crypto API support

### Installation

```bash
# Clone the repository
git clone https://github.com/done-protocol/done-web-client.git
cd done-web-client

# Install dependencies
npm install
```

### Running Locally

```bash
# Start Next.js development server on port 3000
npm run dev
```

Visit `http://localhost:3000` to interact with the application.

### Building for Production

```bash
# Validate TypeScript and build standalone distribution
npm run build

# Start production server
npm start
```

### Linting & Code Quality

```bash
npm run lint
```

---

## 9. Transition & Cutover Strategy

The protocol interaction layer is structured so that when the compiled Anchor program ID and IDL are deployed to Solana Devnet, switching from the mock driver to the live RPC client requires flipping a single flag in `lib/protocol/client.ts` (`isLiveContract = true`), without requiring any changes to React presentation code.

---

## License

MIT © [DONE Protocol Foundation](https://doneprotocol.io)
