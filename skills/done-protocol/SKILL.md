---
name: done-protocol
description: Complete architecture, Solana Anchor settlement pipeline, and UI/UX design specifications for DONE Protocol on Solana.
---

# DONE Protocol — Agent Skill

This skill documents the full on-chain architecture, instruction set, data flow, canonical commitment hashing, and UI/UX invariants for DONE Protocol.

---

## 1. System Overview & Core Invariants

DONE Protocol is programmable settlement infrastructure for verifiable work on Solana. It eliminates subjective escrow releases by enforcing an explicit, deterministic pipeline:

$$\text{Definition of Done (DoD)} \longrightarrow \text{Evidence Submission} \longrightarrow \text{Verification} \longrightarrow \text{Settlement}$$

* **Deterministic States:** Never indicate a milestone is "Verified" or "Released" based solely on frontend click handlers. The UI changes state strictly after the transaction signature is confirmed on-chain.
* **Strictly USDC on Devnet:** Escrow vaults and payments strictly utilize standard SPL Token interactions targeting the official Devnet USDC mint (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`).
* **No Marketplace Overhead:** Do not implement user profiles, chatting, ratings, bidding, or discovery engines. The entire scope is agreement lifecycle, verification, and settlement.
* **Transaction Transparency:** Every mutate action must present wallet approval state, RPC signature broadcast, Solana Explorer confirmation link, compute units consumed, and Anchor error code decoding (6000–6007).

---

## 2. On-Chain States & Enum Mapping

### Agreement State
| State | Description | Permitted UI Actions |
|---|---|---|
| `DRAFT` | Initialized without escrow. | Add Milestones, Edit Terms, Fund Escrow Vault |
| `FUNDED` | Total milestone budget locked in Escrow Vault PDA. | Worker starts execution |
| `ACTIVE` | At least one milestone is in flight. | Submit Evidence |
| `COMPLETED` | All milestones reached terminal state (`RELEASED`). | Read-only archive |
| `CANCELLED` | Escrow reclaimed according to program rules. | Read-only archive |

### Milestone State
| State | Description | Permitted UI Actions |
|---|---|---|
| `PENDING` | Milestone active, work in progress. | Worker: Submit Evidence |
| `EVIDENCE_SUBMITTED` | Proof recorded; awaiting verification. | Sponsor/Oracle: Run Verification |
| `VERIFIED` | DoD criteria satisfied; settlement unlocked. | Anyone / Sponsor: Trigger Settlement |
| `RELEASED` | USDC successfully transferred to Worker ATA. | View Solana transaction signature |

---

## 3. Canonical Commitment Hashing

To prevent off-chain vs. on-chain divergence, DoD criteria are serialized into deterministic JSON (trimmed, filtered, alphabetically sorted) and hashed via SHA-256 prior to account creation:

```typescript
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

## 4. UI/UX Design System Specification

### 4.1 Aesthetic Invariants
* **Pitch-Black Dark Mode Only:** Absolute pure black base surfaces (`#000000`), deep ash surface containers (`#0d0d0f`, `#141416`), and subtle border dividers (`#26262a`).
* **Ample Gentle Curvature:** Zero sharp industrial 90-degree corners. Use balanced, organic border radii:
  * `rounded-2xl` (16px) for cards, panels, and containers.
  * `rounded-xl` (12px) for buttons, inputs, and list items.
  * `rounded-3xl` (24px) for bottom drawers and sheets.
  * `rounded-lg` for badges.
* **Zero Floating Popups / Modals:** Absolutely NO centered modal dialog popups or intrusive backdrop alert boxes.
  * **Desktop:** Flyouts and detailed inspection occur strictly via **Right Sidebars** (`w-[440px]`, `fixed top-0 right-0 h-full bg-[#0d0d0f] border-l border-[#26262a] z-50 overflow-y-auto`) or slide-down **Top Drawers**.
  * **Mobile:** Complex interactions occur strictly via swipeable **Bottom Drawers** (`fixed inset-x-0 bottom-0 bg-[#0d0d0f] border-t border-[#26262a] rounded-t-3xl p-6 z-50 max-h-[85vh] overflow-y-auto`).

### 4.2 Shell & Navigation Anatomy
* **Desktop (`md:` and above):**
  * Fixed Left Navigation (`w-64`, `#0d0d0f`, `border-r border-[#26262a]`): Logo, high-contrast nav items (`Overview`, `Agreements`, `Sponsor View`, `Worker View`, `Settings`).
  * Top Bar: Active cluster (Devnet), RPC Ping, Wallet Pill, Devnet USDC balance, Faucet button.
  * Main Viewport: Max-width container (`p-8`).
  * Contextual Right Sidebar: Inspection, evidence submission, verification audit, and transaction submission timeline.
* **Mobile (`< md`):**
  * Top Header with Logo and Wallet Trigger.
  * Scrollable Content (`p-4, pb-24`).
  * Fixed Bottom Nav Bar (`h-16`, `#0d0d0f`, `border-t border-[#26262a]`, 5 icon tabs).
  * Swipeable Bottom Drawer for all detailed interactions and confirmations.

### 4.3 Component Styling Tokens
* **Buttons (`rounded-xl`):**
  * Primary: `bg-white text-black font-semibold hover:bg-neutral-200 transition-colors py-2.5 px-4 rounded-xl`
  * Secondary/Outline: `bg-transparent border border-[#26262a] text-neutral-200 hover:bg-[#141416] py-2.5 px-4 rounded-xl`
  * Destructive: `bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 py-2.5 px-4 rounded-xl`
* **Cards & Containers (`rounded-2xl`):**
  * Base: `bg-[#0d0d0f] border border-[#26262a] p-5 rounded-2xl`
  * Elevated/Nested: `bg-[#141416] border border-[#202024] p-4 rounded-xl`
* **Badges (`rounded-lg`):**
  * `DRAFT`: Neutral ash (`bg-neutral-800 text-neutral-300 rounded-lg px-2.5 py-1 text-xs font-mono font-medium`)
  * `FUNDED` / `ACTIVE`: Amber glow (`bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg px-2.5 py-1 text-xs font-mono font-medium`)
  * `VERIFIED`: Emerald green (`bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg px-2.5 py-1 text-xs font-mono font-medium`)
  * `RELEASED`: Indigo blue (`bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg px-2.5 py-1 text-xs font-mono font-medium`)
