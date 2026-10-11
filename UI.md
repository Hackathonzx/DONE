# UI.md — DONE Protocol UI/UX Specification

## 1. Design Principles & Aesthetic Invariants

* **Pitch-Black Dark Mode Only:** Absolute pure black base surfaces (`#000000`), deep ash surface containers (`#0d0d0f`, `#141416`), and subtle border dividers (`#26262a`).
* **Primary Accent Color: VIOLET:** Rich radiant violet accents (`violet-500` / `#8b5cf6`, `violet-600` / `#7c3aed`, `violet-400` / `#a78bfa`, `border-violet-500/30`, `bg-violet-600`). All primary actions, state badges, brand marks, and active toggles use violet.
* **Ample Gentle Curvature:** Zero sharp industrial 90-degree corners. Use balanced, organic border radii (`rounded-2xl` / `16px` for cards and panels; `rounded-xl` / `12px` for buttons, inputs, and badges; `rounded-3xl` / `24px` for bottom drawers and sheets).
* **Zero Floating Popups / Modals:** Absolutely no centered modal dialog popups or intrusive backdrop alert boxes.
  * **Desktop:** Flyouts and detailed inspection occur strictly via **Right Sidebars** (`w-[440px]`) or slide-down **Top Drawers**.
  * **Mobile:** Complex interactions occur strictly via swipeable **Bottom Drawers** (`max-h-[85vh]`).
* **Button-First Controls & Aggressive Text Reduction:** No terminal essay outputs or documentation walls of text. High data density, instant 1-click preset buttons, segmented pills, quick-increment buttons, and direct protocol interaction flows.
* **Agent Skill Location:** Repository agent skill specification resides in `.agents/skills/done_protocol/SKILL.md`.

---

## 2. Shell & Navigation Anatomy

### 2.1 Desktop Layout (`md:` and above)

```
+------------------------------------------------------------------------------------+
| [Logo] DONE    | Top Context Bar: Active Cluster (Devnet), RPC Ping, Wallet Pill   |
+----------------+-------------------------------------------------+-----------------+
| Fixed Left Nav | Main Viewport                                   | Slide-in Right  |
| (w-64)         | (Max width container, p-8)                      | Sidebar (w-96)  |
|                |                                                 |                 |
| - Overview     | [Aggregated metrics & active protocol feeds]    | [Evidence /     |
| - Agreements   |                                                 |  Verification / |
| - Sponsor View |                                                 |  Tx Inspect]    |
| - Worker View  |                                                 |                 |
| - Settings     |                                                 | (Collapsible)   |
+----------------+-------------------------------------------------+-----------------+
```

* **Fixed Left Navigation (Desktop):** Pure vertical bar (`w-64`, `#0d0d0f`, border-r border-[#26262a]). Contains logo, high-contrast nav items with soft rounded highlights (`rounded-xl`), and current active network indicator.
* **Top Bar (Desktop):** Minimal utility strip. Displays protocol status, Devnet USDC balance, wallet address abbreviation, and disconnect/connect triggers.
* **Right Sidebar (Desktop Flyout):** Contextual inspection drawer (`w-[440px]`, `#0d0d0f`, border-l border-[#26262a]). Slides in from the right edge for:
  * Definition of Done full breakdown
  * Evidence submission payload inspection
  * On-chain verification proof checking
  * Transaction submission timeline & explorer link

### 2.2 Mobile Layout (`< md`)

```
+------------------------------------------------------------------------------------+
| Top Header: [Logo]                                              [Wallet Button]    |
+------------------------------------------------------------------------------------+
| Scrollable Content Area (p-4, pb-24)                                               |
|                                                                                    |
| [Cards, agreement lists, milestone cards with ample rounded corners]              |
|                                                                                    |
+------------------------------------------------------------------------------------+
| Fixed Bottom Nav Bar (Docked, rounded-t-2xl, h-16, 5 icon tabs)                    |
+------------------------------------------------------------------------------------+
```

* **Bottom Navigation Bar (Mobile):** Anchored dock (`h-16`, `#0d0d0f`, border-t border-[#26262a], safe-area-pb).
  * 5 primary action targets: `Overview`, `Agreements`, `Sponsor`, `Worker`, `Settings`.
* **Bottom Drawer (Mobile Inspection):** Replaces all modals. Slides up from the bottom with a drag handle, `rounded-t-3xl`, housing verification checks, evidence inputs, and tx progress.
* **Top Drawer (Global Alerts):** Slides down smoothly from top screen bounds for urgent transaction status changes or network switches.

---

## 3. Page-by-Page Functional Breakdown

### 3.1 Overview / Landing View (`/`)
* **Intent:** High-level protocol entry point and instant workspace pulse.
* **Components:**
  * **Hero Functional Banner:** Single bold heading: *"Programmable settlement for verifiable work."* Brief 1-line subtext with two immediate CTAs: `[Create Agreement]` and `[Explore Protocol State]`.
  * **Settlement Metrics Row:** 3 concise cards (`rounded-2xl`, background `#0d0d0f`, border `#26262a`): Total Escrowed (USDC), Total Settled (USDC), Active In-Flight Milestones.
  * **Recent Activity Ledger:** Minimal table/list showing latest verifiable settlements (Agreement Name, Milestone, Worker Key, Amount, Verified Badge, Tx Hash).

### 3.2 Agreements Explorer (`/agreements`)
* **Intent:** Complete catalog of all on-chain agreements associated with the connected wallet or public network.
* **Components:**
  * **Filter Segment Control:** `All` | `Sponsoring` | `Assigned (Worker)` | `Completed`.
  * **Agreement List Cards:** Cards styled with `rounded-2xl`, `#0d0d0f`, hover border highlight:
    * Agreement Title & Target Worker Key (truncated monospace).
    * Status Badge: `DRAFT`, `FUNDED`, `ACTIVE`, `COMPLETED`.
    * Milestone Progress Bar (e.g., `2 / 4 Settled`, visual step track).
    * Total Escrowed vs. Released USDC amounts.
  * **Trigger:** Clicking a card navigates to `/agreements/[id]`.

### 3.3 New Agreement Creation Wizard (`/agreements/new`)
* **Intent:** Deterministic form generating the on-chain agreement and initial milestone parameters.
* **Components:**
  * **Sponsor Step Card (`rounded-2xl`):**
    * Worker Solana Address input (validates Base58).
    * Total Budget (USDC).
    * High-level project specifications & scope.
  * **Milestone Builder Section:**
    * Dynamic row appender: Add Milestone button.
    * Each Milestone item (`rounded-xl`, `#141416`): Title & Allocated Amount (USDC), Definition of Done Checklist, Verification Mode selector.
  * **Canonical Commitment Preview:** Live calculated SHA-256 hash preview of DoD terms.
  * **Action Bar:** `[Initialize Agreement & Fund Escrow]` button with pending wallet state integration.

### 3.4 Agreement & Milestone Detail View (`/agreements/[id]`)
* **Intent:** The core command center for monitoring, evidence submission, and verification.
* **Components:**
  * **Agreement Summary Header:** Total locked USDC, Worker public key, Sponsor public key, status chip.
  * **Milestone Sequential Pipeline:** Vertical stacked interactive cards (`rounded-2xl`, `#0d0d0f`):
    * Status Indicator: `PENDING` (Grey), `EVIDENCE_SUBMITTED` (Yellow), `VERIFIED` (Green), `RELEASED` (Blue).
    * Milestone Title, allocated USDC, and verification mechanism.
    * Action Triggers: Worker `[Submit Evidence]` button; Sponsor/Verifier `[Run Verification]` button.
  * **Inspection Panel Trigger:** Clicking any milestone opens the **Right Sidebar** (Desktop) or **Bottom Drawer** (Mobile).

### 3.5 Contextual Panels (Right Sidebar / Bottom Drawer)
* **Panel A: Evidence Submission:** Proof Type, Link, Notes, live Evidence Hash calculation, `[Submit Proof to Chain]`.
* **Panel B: Verification Engine:** Individual DoD items checklist, confirm checkboxes, `[Confirm & Verify Milestone]`.
* **Panel C: Settlement Execution:** Verified payout amount, `[Release Escrowed USDC]`, tx confirmation hash & explorer link.

### 3.6 Sponsor Dashboard (`/sponsor`)
* **Intent:** Portfolio overview for project creators.
* **Components:** Escrow Health Metrics, Pending Review Queue (`EVIDENCE_SUBMITTED`).

### 3.7 Worker Dashboard (`/worker`)
* **Intent:** Action station for builders and contractors.
* **Components:** Earnings Metrics, Actionable Milestones List (`PENDING`).

### 3.8 Settings & Diagnostics (`/settings`)
* **Intent:** Developer diagnostics, network parameters, and wallet configuration.
* **Components:** Cluster Selector (Devnet default), Deployed Program ID & USDC Mint Address, Mock Mode Toggle, Clear Local Storage / Reset State button.

---

## 4. UI Component Library Specifications

* **Buttons (`rounded-xl`):**
  * Primary: `bg-white text-black font-semibold hover:bg-neutral-200 transition-colors py-2.5 px-4`
  * Secondary/Outline: `bg-transparent border border-[#26262a] text-neutral-200 hover:bg-[#141416] py-2.5 px-4`
  * Destructive: `bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 py-2.5 px-4`
* **Cards & Containers (`rounded-2xl`):**
  * Base: `bg-[#0d0d0f] border border-[#26262a] p-5`
  * Elevated/Nested: `bg-[#141416] border border-[#202024] p-4 rounded-xl`
* **Drawers & Sheets:**
  * Mobile Bottom Drawer: `fixed inset-x-0 bottom-0 bg-[#0d0d0f] border-t border-[#26262a] rounded-t-3xl p-6 z-50 max-h-[85vh] overflow-y-auto`
  * Desktop Right Sidebar: `fixed top-0 right-0 h-full w-[440px] bg-[#0d0d0f] border-l border-[#26262a] p-6 z-40 overflow-y-auto`
* **Badges (`rounded-lg`):**
  * Pill badges (`px-2.5 py-1 text-xs font-mono font-medium rounded-lg`):
    * `DRAFT`: Neutral ash (`bg-neutral-800 text-neutral-300`)
    * `FUNDED` / `ACTIVE`: Amber glow (`bg-amber-500/10 text-amber-400 border border-amber-500/20`)
    * `VERIFIED`: Emerald green (`bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`)
    * `RELEASED`: Indigo blue (`bg-indigo-500/10 text-indigo-400 border border-indigo-500/20`)
