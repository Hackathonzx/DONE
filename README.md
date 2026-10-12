# DONE Protocol — Programmable Settlement for Verifiable Work on Solana

[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-14F195?logo=solana&logoColor=black&style=flat-square)](https://explorer.solana.com/address/82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM?cluster=devnet)
[![Settlement: SPL USDC](https://img.shields.io/badge/Settlement-SPL%20USDC-2775CA?logo=usd-coin&logoColor=white&style=flat-square)](https://explorer.solana.com/address/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU?cluster=devnet)
[![Anchor: 0.32.1](https://img.shields.io/badge/Anchor-0.32.1-blueviolet?style=flat-square)](https://www.anchor-lang.com/)
[![Framework: Next.js 15](https://img.shields.io/badge/Framework-Next.js%2015-black?logo=next.js&style=flat-square)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

> **DONE Protocol** is programmable settlement infrastructure for verifiable work on Solana. It eliminates subjective escrow releases by enforcing an explicit, deterministic execution pipeline:
>
> $$\text{Definition of Done (DoD)} \longrightarrow \text{Worker Acceptance} \longrightarrow \text{Escrow Funding} \longrightarrow \text{Evidence Submission} \longrightarrow \text{Verification} \longrightarrow \text{Settlement}$$

---

## Table of Contents

- [1. System Overview & Problem Statement](#1-system-overview--problem-statement)
- [2. Solana Devnet Deployment Reference](#2-solana-devnet-deployment-reference)
- [3. The 4-Stage Protocol Pipeline](#3-the-4-stage-protocol-pipeline)
- [4. Complete On-Chain Protocol Lifecycle](#4-complete-on-chain-protocol-lifecycle)
- [5. Anchor Smart Contract (`anchor/`)](#5-anchor-smart-contract-anchor)
  - [5.1 Instructions & Accounts Specification](#51-instructions--accounts-specification)
  - [5.2 Canonical Commitment Hashing](#52-canonical-commitment-hashing)
  - [5.3 Anchor Error Code Catalog](#53-anchor-error-code-catalog)
  - [5.4 Build & Test Instructions](#54-build--test-instructions)
  - [5.5 Devnet Validation Scripts](#55-devnet-validation-scripts)
- [6. Next.js Web Client (`app/`, `components/`)](#6-nextjs-web-client-app-components)
  - [6.1 Live Devnet Integration & Zero Mock State](#61-live-devnet-integration--zero-mock-state)
  - [6.2 Deterministic Off-Chain Metadata Store](#62-deterministic-off-chain-metadata-store)
  - [6.3 Two-Party Mutual Cancellation Flow](#63-two-party-mutual-cancellation-flow)
  - [6.4 Mobile Deep-Linking](#64-mobile-deep-linking)
- [7. Project Directory Structure](#7-project-directory-structure)
- [8. Getting Started](#8-getting-started)
- [9. Devnet Smoke-Test & Verification Evidence](#9-devnet-smoke-test--verification-evidence)
- [10. Documentation Index](#10-documentation-index)
- [11. Security Considerations & Disclaimers](#11-security-considerations--disclaimers)

---

## 1. System Overview & Problem Statement

Traditional freelance agreements, grant programs, and web3 bounties suffer from subjective escrow releases, informal disputes, and counterparty lock-in:
* **Sponsors** risk non-delivery after disbursing advance funds.
* **Workers** risk unpaid work, scope creep, and arbitrary rejections.
* **Escrows** rely on human arbitration committees, multi-week delays, or custodial third parties.

**DONE Protocol** solves this by establishing cryptographic, verifiable settlement on Solana:
* **Immutable Scope Commitments**: Milestones are initialized with a 32-byte SHA-256 hash of their canonical Definition of Done (DoD).
* **Worker Acceptance Gate**: Milestone allocations must equal 100% of the agreement total before the assigned worker accepts the on-chain terms.
* **Program-Controlled Escrow**: Escrow funds are held exclusively in a Program Derived Address (PDA) vault in official Devnet USDC (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`).
* **Cryptographic Evidence & Independent Verification**: Workers submit a canonical evidence pre-image hash. Only the designated verifier (sponsor or external auditor/oracle) can approve or reject the submission.
* **Mutual Protection**: Cancellation of funded or active agreements strictly requires **both** sponsor and worker to sign the exact same transaction; unilateral escrow drainage is impossible.

---

## 2. Solana Devnet Deployment Reference

The DONE Protocol Anchor program is deployed, initialized, and verified on Solana Devnet:

| Configuration Parameter | On-Chain Address / Value |
|---|---|
| **Solana Cluster** | Devnet |
| **RPC Endpoint** | `https://api.devnet.solana.com` |
| **Program ID** | `82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM` |
| **ProgramData Account** | `9rraZSR21igaq3pvTwbnoJgtsj5sJoeSXkZBUBafXC4B` |
| **Upgrade Authority / Admin** | `APCVxcE8EfdnP5bfkbVTb8foLAa2f3RACgbb1uFyUCSB` |
| **Protocol Config PDA** | `6HamdMRRAhWZyThM5dpCjyfQBkZaAsLrMVjQenMJPua1` |
| **Devnet USDC Mint** | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| **USDC Token Decimals** | `6` (`1 USDC = 1,000,000` base units) |
| **Deployed IDL** | [`docs/idl/done_protocol.devnet.json`](docs/idl/done_protocol.devnet.json) & [`lib/protocol/idl/done_protocol.json`](lib/protocol/idl/done_protocol.json) |

### Solana Explorer Quick Links
* [DONE Program on Solana Explorer](https://explorer.solana.com/address/82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM?cluster=devnet)
* [ProgramData PDA](https://explorer.solana.com/address/9rraZSR21igaq3pvTwbnoJgtsj5sJoeSXkZBUBafXC4B?cluster=devnet)
* [Protocol Config PDA](https://explorer.solana.com/address/6HamdMRRAhWZyThM5dpCjyfQBkZaAsLrMVjQenMJPua1?cluster=devnet)
* [Devnet USDC Mint](https://explorer.solana.com/address/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU?cluster=devnet)

---

## 3. The 4-Stage Protocol Pipeline

```
  +-------------------------------------------------------------------------+
  |  STAGE 1: Definition of Done (DoD) & Terms Commitment                   |
  |  • Criteria sorted alphabetically, normalized, and hashed via SHA-256   |
  |  • Committed immutably into Milestone Account PDA upon initialization   |
  +------------------------------------+------------------------------------+
                                       |
                                       v
  +-------------------------------------------------------------------------+
  |  STAGE 2: Worker Acceptance & Escrow Capital Lock                       |
  |  • Milestones sum to 100% agreement total; Worker accepts on-chain      |
  |  • Sponsor deposits exact USDC into Program Escrow Vault PDA            |
  +------------------------------------+------------------------------------+
                                       |
                                       v
  +-------------------------------------------------------------------------+
  |  STAGE 3: Evidence Submission & Independent Verification Audit          |
  |  • Worker uploads deliverables and commits 32-byte Evidence Hash        |
  |  • Designated Verifier attests DoD criteria or rejects with reason hash |
  +------------------------------------+------------------------------------+
                                       |
                                       v
  +-------------------------------------------------------------------------+
  |  STAGE 4: Deterministic Settlement Release                              |
  |  • Escrow Vault PDA disburses exact USDC allocation to Worker ATA       |
  |  • Mutual cancellation available for unreleased escrow with both signers|
  +-------------------------------------------------------------------------+
```

---

## 4. Complete On-Chain Protocol Lifecycle

1. **`createAgreement` (Sponsor)**:
   - Derives `agreement` PDA: `["agreement", sponsor_pubkey, agreement_index_le_bytes]`.
   - Records sponsor, worker, total USDC amount, and terms hash.
   - Status initialized to `Draft`.
2. **`createMilestone` (Sponsor)**:
   - Derives `milestone` PDA: `["milestone", agreement_pda, milestone_index_byte]`.
   - Sequential milestone creation. Validates that running allocations do not exceed agreement total.
   - Commits 32-byte canonical DoD hash and designates milestone verifier.
3. **`acceptAgreement` (Worker)**:
   - Validates milestone allocations equal 100% of agreement total (`IncompleteMilestoneAllocation` check).
   - Only assigned worker can sign. Transitions agreement status to `Accepted`.
4. **`fundAgreement` (Sponsor)**:
   - Worker must have accepted beforehand (`WorkerAcceptanceRequired` check).
   - Transfers USDC from Sponsor ATA to Program Escrow Vault PDA (`["escrow", agreement_pda]`).
   - Transitions agreement status to `Funded`.
5. **`submitEvidence` (Worker)**:
   - Worker commits a 32-byte evidence SHA-256 hash.
   - Transitions milestone status to `EvidenceSubmitted`.
6. **`verifyEvidence` (Verifier)**:
   - Only the assigned milestone verifier can sign.
   - Asserts deliverables meet committed DoD. Transitions milestone to `Verified`.
   - *(Alternative: `rejectEvidence` logs rejection reason hash and permits re-submission).*
7. **`releaseMilestone` (Anyone / Worker / Sponsor)**:
   - Validates milestone is in `Verified` state.
   - Releases exact milestone USDC allocation from Escrow Vault PDA directly to Worker's ATA.
   - Transitions milestone to `Released`.
8. **Agreement Completion**:
   - Once all milestone allocations are released, agreement automatically transitions to `Completed`.
9. **`cancelAgreement` (Mutual Sponsor & Worker)**:
   - Both sponsor and worker **must** co-sign the transaction (`Signer<'info>` for both).
   - Refunds any remaining balance in the Escrow Vault PDA to the Sponsor ATA.
   - Past released payments to worker remain untouched and immutable.

---

## 5. Anchor Smart Contract (`anchor/`)

### 5.1 Instructions & Accounts Specification

| Instruction | Signers | Accounts | Description |
|---|---|---|---|
| `initializeConfig` | Admin | `config`, `payment_mint`, `payer`, `system_program` | Initializes protocol singleton config |
| `createAgreement` | Sponsor | `agreement`, `config`, `sponsor`, `payment_mint`, `system_program` | Initializes agreement PDA in `Draft` status |
| `createMilestone` | Sponsor | `agreement`, `milestone`, `sponsor`, `system_program` | Adds sequential milestone with DoD hash |
| `acceptAgreement` | Worker | `agreement`, `worker` | Worker formally accepts agreement terms |
| `fundAgreement` | Sponsor | `agreement`, `escrow_vault`, `sponsor_token_account`, `payment_mint`, `sponsor`, `token_program` | Locks USDC in program Escrow PDA |
| `submitEvidence` | Worker | `agreement`, `milestone`, `worker` | Submits 32-byte canonical evidence hash |
| `verifyEvidence` | Verifier | `agreement`, `milestone`, `verifier` | Approves evidence; unlocks milestone payout |
| `rejectEvidence` | Verifier | `agreement`, `milestone`, `verifier` | Records rejection reason hash; reverts to `Pending` |
| `releaseMilestone` | Payer | `agreement`, `milestone`, `escrow_vault`, `worker_token_account`, `token_program` | Transfers milestone USDC to Worker ATA |
| `cancelAgreement` | Sponsor & Worker | `agreement`, `escrow_vault`, `sponsor_token_account`, `sponsor`, `worker`, `token_program` | Mutual cancellation and escrow refund |

### 5.2 Canonical Commitment Hashing

To guarantee that off-chain deliverables and on-chain commitments never diverge, DoD criteria and evidence metadata are canonicalized deterministically before hashing:

```typescript
import { hashDefinitionOfDone, hashEvidencePayload } from '@/lib/protocol/hashing';

// Criteria are trimmed, filtered, and alphabetically sorted
const criteria = [
  'Architecture threat model document covering all CPI call paths',
  'Automated cargo-audit report with zero unaddressed high-risk alerts',
  'Devnet program deployment verified on Solana Explorer'
];

const dodHashBytes = await hashDefinitionOfDone(criteria);
// => Uint8Array (32-byte SHA-256 pre-image commitment)
```

### 5.3 Anchor Error Code Catalog

The smart contract implements explicit custom errors (`anchor/programs/done_protocol/src/errors.rs`):

| Code | Hex | Name | Message |
|---|---|---|---|
| `6000` | `0x1770` | `InvalidAmount` | Amount must be greater than zero. |
| `6001` | `0x1771` | `InvalidAgreementStatus` | Agreement state does not permit this instruction. |
| `6002` | `0x1772` | `AllocationExceedsTotal` | Milestone allocation exceeds agreement total. |
| `6003` | `0x1773` | `InvalidMilestoneIndex` | Milestone index must be sequential. |
| `6004` | `0x1774` | `Unauthorized` | Signer is unauthorized for this instruction. |
| `6005` | `0x1775` | `InvalidPaymentMint` | Payment mint does not match the agreement. |
| `6006` | `0x1776` | `InvalidWorker` | Worker must be a valid key different from sponsor. |
| `6007` | `0x1777` | `InvalidDefinitionHash` | Definition of Done hash cannot be empty. |
| `6008` | `0x1778` | `InvalidVerifier` | Verifier public key cannot be the default key. |
| `6009` | `0x1779` | `InvalidEvidenceHash` | Evidence hash cannot be empty. |
| `6010` | `0x177a` | `InvalidMilestoneStatus` | Milestone is not in the required status. |
| `6011` | `0x177b` | `InvalidWorkerTokenAccount` | Worker token account does not belong to worker. |
| `6012` | `0x177c` | `InvalidEscrowAccount` | Escrow token account is invalid. |
| `6013` | `0x177d` | `ReleaseExceedsTotal` | Release would exceed the agreement total. |
| `6014` | `0x177e` | `InvalidRejectionReason` | Rejection reason hash cannot be empty. |
| `6015` | `0x177f` | `IncompleteMilestoneAllocation` | All milestone allocations must equal 100% of agreement total before acceptance. |
| `6016` | `0x1780` | `AgreementAlreadyAccepted` | The worker has already accepted this agreement. |
| `6017` | `0x1781` | `WorkerAcceptanceRequired` | The assigned worker must accept on-chain before funding. |

### 5.4 Build & Test Instructions

Prerequisites: Rust toolchain (`1.79+`), Solana CLI (`1.18+`), Anchor CLI **`0.32.1`**, Node.js 18+, Yarn.

```bash
cd anchor

# Check Anchor CLI version
anchor --version

# Build Anchor smart contract
anchor build

# Run local integration test suite
anchor test --skip-build
```

### 5.5 Devnet Validation Scripts

Located in `anchor/scripts/`:
* `initialize_config_devnet.ts` — Initializes protocol singleton config on Devnet.
* `check_devnet_usdc.ts` — Read-only sponsor USDC balance and ATA check.
* `verify_solana_program.ts` — `--prepare` calculates Definition of Done / evidence commitments; `--attest` executes attestation.
* `devnet_smoke_test.ts` — Full lifecycle command-line smoke test.

---

## 6. Next.js Web Client (`app/`, `components/`)

### 6.1 Live Devnet Integration & Zero Mock State

The web client connects directly to Solana Devnet via Anchor 0.32.1 RPC client:
* **Real Wallet Connection**: Connects Phantom, Solflare, Backpack, or browser standard wallets.
* **On-Chain Deserialization**: Uses `getProgramAccounts` with discriminator filters (`lib/protocol/anchorClient.ts`) to fetch and parse on-chain `Agreement` and `Milestone` accounts in real time.
* **Zero Synthetic Balances**: Balances for SOL and Devnet USDC are queried live from the RPC and Associated Token Accounts.
* **Explorer Verification**: All transaction confirmations display explorer links with real signatures.

### 6.2 Deterministic Off-Chain Metadata Store

Because Solana account space is expensive, the on-chain accounts store participant public keys, amounts, statuses, and 32-byte cryptographic commitments. Human-readable titles, descriptions, and criteria checklists are stored deterministically in `lib/protocol/metadataStore.ts`, keyed by `agreementPda`, ensuring complete synchronization between UI and blockchain.

### 6.3 Two-Party Mutual Cancellation Flow

In compliance with the on-chain `cancelAgreement` instruction:
* Cancellation cannot be performed unilaterally by the sponsor.
* The frontend provides a co-signing modal: Sponsor signs first to prepare the cancellation transaction, and Worker submits the co-signature before sending to Devnet.

### 6.4 Mobile Deep-Linking

For mobile testers, `WalletConnectButton.tsx` and `WalletContext.tsx` support native deep-linking to Phantom and Solflare mobile in-app browsers via `phantom://browse/...` and `solflare://browse/...`.

---

## 7. Project Directory Structure

```
.
├── README.md                      # Unified documentation (Smart Contract + Frontend)
├── ARCHITECTURE.md                # System technical architecture blueprint
├── UI.md                          # Frontend UI specifications & design tokens
├── anchor/                        # Solana Anchor Smart Contract workspace
│   ├── Anchor.toml                # Anchor configuration & program IDs
│   ├── Cargo.toml                 # Cargo workspace definition
│   ├── programs/
│   │   └── done_protocol/         # Core Rust program
│   │       ├── Cargo.toml
│   │       └── src/
│   │           ├── lib.rs         # Instruction routing & program ID declaration
│   │           ├── errors.rs      # Error code catalog (6000-6017)
│   │           ├── events.rs      # Protocol events
│   │           ├── state/         # Account structures (Config, Agreement, Milestone)
│   │           └── instructions/  # Anchor instruction handlers
│   ├── scripts/                   # Devnet verification & smoke-test scripts
│   ├── tests/                     # Mocha/Chai integration test suite
│   └── target/idl/                # Anchor generated IDL artifacts
├── docs/                          # Protocol documentation & specifications
│   ├── DEVNET_DEPLOYMENT_LOG.md   # Deployment transactions and smoke test history
│   ├── FRONTEND_INTEGRATION.md    # Integration guidelines for client developers
│   ├── IDL_AND_SETUP.md           # Setup manual and account layout
│   ├── ON_CHAIN_SPEC.md           # Byte-exact account layouts and PDAs
│   ├── SECURITY_AND_TRUST_MODEL.md# Security invariants and attack vectors
│   ├── VERIFICATION_RECIPE.md     # Automated account verification recipe
│   └── idl/                       # Deployed Devnet IDL (`done_protocol.devnet.json`)
├── app/                           # Next.js 15 App Router pages
│   ├── layout.tsx                 # Root layout with providers & navigation
│   ├── page.tsx                   # Protocol overview & dashboard landing
│   ├── agreements/                # Agreement views (list, creation, details)
│   ├── sponsor/                   # Sponsor workflow dashboard
│   ├── worker/                    # Worker workflow dashboard
│   └── settings/                  # Protocol diagnostics & Devnet RPC configuration
├── components/                    # Reusable React UI components
│   ├── protocol/                  # Agreement drawers, modals, evidence forms, timeline
│   ├── web3/                      # Wallet connection button & wallet context provider
│   └── ui/                        # Badges, cards, alerts, modal dialogs
├── hooks/                         # React hooks (useAgreement, useTransactionExecution)
├── lib/                           # Core utilities & Anchor client
│   ├── solana.ts                  # Cluster RPC config, Program ID, and USDC mint
│   ├── idl/                       # TypeScript IDL types and error parser
│   └── protocol/                  # Anchor client, PDA derivations, hashing, metadata store
└── types/                         # TypeScript interfaces and domain models
```

---

## 8. Getting Started

### Prerequisites
* **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
* **Solana Wallet**: Phantom, Solflare, or Backpack extension set to **Solana Devnet**
* **Devnet SOL & USDC**: Faucet available via wallet or protocol tools

### Running the Web Client

```bash
# 1. Install dependencies
npm install

# 2. Run Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
# Typecheck and production build
npm run build

# Start production server
npm run start
```

### Code Quality & Linting

```bash
# Validate codebase with ESLint
npm run lint
```

---

## 9. Devnet Smoke-Test & Verification Evidence

The on-chain program underwent an end-to-end command-line and frontend validation on Solana Devnet:

| Step | Transaction Signature on Solana Devnet |
|---|---|
| **Program Deployment** | [`5toYvUkkLHp6GDGi8fRGXzkhoFFxixDyqPY1RdGRkCPdBYG6jDYmc6WY3HqzP6veH8aQKSRC87UBbwJS4RaKUYPr`](https://explorer.solana.com/tx/5toYvUkkLHp6GDGi8fRGXzkhoFFxixDyqPY1RdGRkCPdBYG6jDYmc6WY3HqzP6veH8aQKSRC87UBbwJS4RaKUYPr?cluster=devnet) |
| **Config Initialization** | [`3schhcX4kf45wuedWLF9LsQ5qeRxppMPwiAPbmfF2FkaaoybrusyioxKD8Ci1SW1YrWpQaVFAkdEa3N2NgaYAnVh`](https://explorer.solana.com/tx/3schhcX4kf45wuedWLF9LsQ5qeRxppMPwiAPbmfF2FkaaoybrusyioxKD8Ci1SW1YrWpQaVFAkdEa3N2NgaYAnVh?cluster=devnet) |
| **Verifier Attestation** | [`3UpkcC6ZmspCXR2CUdqMLqixSTVnv9vxZxULbJbHcZCDqinkqaVNRbEq5c59Ep6j4Pzd5ve5pcjBqqLp9wmrCCfM`](https://explorer.solana.com/tx/3UpkcC6ZmspCXR2CUdqMLqixSTVnv9vxZxULbJbHcZCDqinkqaVNRbEq5c59Ep6j4Pzd5ve5pcjBqqLp9wmrCCfM?cluster=devnet) |
| **Settlement Disbursement** | [`4agy2v8ezKNL4vvFrTPQYxAMsxWgCiirPgxdH6DRTQocNckXc4TExcXf9w1y59HCu1Lt8c1igHM8aMswh9RcRPTV`](https://explorer.solana.com/tx/4agy2v8ezKNL4vvFrTPQYxAMsxWgCiirPgxdH6DRTQocNckXc4TExcXf9w1y59HCu1Lt8c1igHM8aMswh9RcRPTV?cluster=devnet) |

---

## 10. Documentation Index

Detailed specifications and guides are located in `docs/` and project root:
* [**Architecture Blueprint**](ARCHITECTURE.md) — Comprehensive technical architecture, account schemas, and runtime interaction diagrams.
* [**Frontend Integration Guide**](docs/FRONTEND_INTEGRATION.md) — Step-by-step account derivation, instruction building, and transaction crafting.
* [**On-Chain Specification**](docs/ON_CHAIN_SPEC.md) — Byte-exact account layouts, seeds, PDAs, and event structures.
* [**Security & Trust Model**](docs/SECURITY_AND_TRUST_MODEL.md) — Threat model, escrow custody invariants, and signer constraints.
* [**Automated Verification Recipe**](docs/VERIFICATION_RECIPE.md) — Automated account-verification recipe commitments for verifiable deployments.
* [**Devnet Deployment Log**](docs/DEVNET_DEPLOYMENT_LOG.md) — Historical deployment logs, account sizes, and initialization records.
* [**IDL & Setup Guide**](docs/IDL_AND_SETUP.md) — Anchor IDL definitions, type mappings, and environment setup.
* [**UI Specification**](UI.md) — Component architecture, UX state machines, and styling system.

---

## 11. Security Considerations & Disclaimers

* **Token Standard**: The protocol strictly interfaces with standard SPL Token accounts (Classic Token Program). Token-2022 extensions are not supported.
* **Escrow Authority**: Escrow funds are solely controlled by the protocol program via PDA seeds `["escrow", agreement.key().as_ref()]`. No protocol administrator can withdraw or reallocate escrow funds.
* **Mutual Cancellation**: Cancellation requires concurrent signatures from both sponsor and worker; unilateral escrow reclamation is rejected at the smart contract level.
* **Verifiable Evidence**: Evidence is recorded on-chain as a 32-byte cryptographic SHA-256 pre-image commitment. Verification attestation proves compliance with the committed recipe, not external subjective intent.
* **Environment**: Deployed on Solana Devnet for testing and evaluation.

---

## License

MIT © [DONE Protocol Foundation](https://github.com/Hackathonzx/DONE)
