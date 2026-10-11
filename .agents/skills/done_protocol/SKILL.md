---
name: "done-protocol-ui-architecture"
description: >
  Architecture, UI/UX specification, and integration guidelines for DONE Protocol on Solana.
  Enforces deterministic escrow pipelines, pitch-black dark mode with vibrant violet primary accents,
  zero floating popups, right sidebar / bottom drawer flyouts, ample buttons with low-text density,
  canonical SHA-256 DoD hashing, and live Anchor state mapping.
---

# DONE Protocol — Architecture & UI/UX Specification

DONE Protocol is programmable settlement infrastructure for verifiable work on Solana. It eliminates subjective escrow releases by enforcing an explicit, deterministic pipeline:

$$\text{Definition of Done (DoD)} \longrightarrow \text{Evidence Submission} \longrightarrow \text{Verification} \longrightarrow \text{Settlement}$$

This document serves as the agent skill reference for both the technical architecture and the strict UI/UX invariants.

---

## 1. Core Architecture & Protocol Mechanics

### 1.1 Tech Stack
* **Framework:** Next.js (App Router), React 19, TypeScript (strict mode)
* **Styling:** Tailwind CSS (Pitch-black surfaces `#000000`, `#0d0d0f`, `#141416`, borders `#26262a`, primary brand accent **Violet** `#8b5cf6` / `#7c3aed`)
* **State & Data Fetching:** TanStack Query (`@tanstack/react-query`) + React Context for wallet/session
* **Solana / Web3 Layer:**
  * `@solana/web3.js` (v1.x)
  * `@solana/spl-token` (USDC SPL mint interactions on Devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`)
  * `@coral-xyz/anchor` compatible IDL (`done_protocol.json` & `done_protocol.ts`)
* **Cryptography:** Web Crypto API (`crypto.subtle.digest('SHA-256', ...)`) for canonical commitment hashing

### 1.2 Program Accounts & PDAs
* **Agreement Account PDA:** `seeds = [b"agreement", sponsor.key(), nonce]`
* **Protocol Escrow Vault PDA:** `seeds = [b"vault", agreement.key()]`
* **Milestone Account PDA:** `seeds = [b"milestone", agreement.key(), &[index]]`
* **Evidence Hash Record:** `seeds = [b"evidence", milestone.key()]`

### 1.3 State Transitions & Invariants
* **Agreement States:** `DRAFT` $\rightarrow$ `FUNDED` $\rightarrow$ `ACTIVE` $\rightarrow$ `COMPLETED` (or `CANCELLED`)
* **Milestone States:** `PENDING` $\rightarrow$ `EVIDENCE_SUBMITTED` $\rightarrow$ `VERIFIED` $\rightarrow$ `RELEASED` (or `DISPUTED`)
* **Invariant:** Vault funds can ONLY be released when Milestone State is `VERIFIED` and authorized by the Verifier/Sponsor signature or automated Oracle rule.
* **Deterministic DoD Hashing:** Criteria array is normalized (trimmed, non-empty), sorted alphabetically, JSON serialized, and SHA-256 hashed.

---

## 2. UI/UX Constitution & Design Invariants

### 2.1 Color Palette & Aesthetic
* **Base Surfaces:**
  * Background: `#000000` (absolute pitch black)
  * Containers & Cards: `#0d0d0f` (deep ash)
  * Elevated Elements: `#141416` (slate ash)
  * Hairline Borders: `#26262a` / `#323238`
* **Primary Color: VIOLET**
  * Brand Primary: `violet-500` (`#8b5cf6`), `violet-600` (`#7c3aed`)
  * Violet Glow & Highlights: `violet-500/20`, `border-violet-500/40`
  * Active states, primary buttons, badges, steppers, and progress bars utilize vibrant violet.
* **Aggressive Text Reduction & Button-First Design:**
  * Zero marketing essays, filler copy, or walls of terminal-like logs.
  * Rapid interactive controls: segmented pills, preset buttons, quick-increment buttons, direct action triggers.
  * Crisp monospace addresses and numbers, clean labels.

### 2.2 Ample Gentle Curvature (Zero 90° Corners)
* Cards and panels: `rounded-2xl` (16px)
* Buttons, inputs, chips, badges: `rounded-xl` (12px)
* Bottom drawers: `rounded-3xl` (24px)
* Inner badges: `rounded-lg` (8px)

### 2.3 Zero Floating Popups / Modals (Strict Invariant)
* **Never use centered modal dialog popups or intrusive backdrop alert boxes.**
* **Desktop ( $\ge$ md ):** All inspections, forms, and actions slide in via the **Right Sidebar Flyout** (`w-[440px]`, `#0d0d0f`, `border-l border-[#26262a]`).
* **Mobile ( < md ):** All inspections, forms, and actions slide up via the **Bottom Drawer** (`rounded-t-3xl`, `max-h-[85vh]`).
* **Transaction Execution:** Slides down via the **Top Drawer Banner** (`animate-in slide-in-from-top`).

### 2.4 Shell & Navigation Layout
* **Desktop:** Fixed Left Nav (`w-64`, `#0d0d0f`) + Top Context Bar (`h-16`) + Responsive Main Viewport + Contextual Right Flyout.
* **Mobile:** Top Header + Main Viewport + Fixed Bottom Nav Dock (`h-16`, 5 icon tabs).
