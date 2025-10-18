# Lotto On-Chain Migration Plan

## Phase 0 — Project Setup & Tracking
- [x] Create dedicated feature branch (e.g. `lotto-onchain`).
- [x] Establish Anchor workspace under `programs/lotto` with default tests.
- [x] Configure Anchor.toml, Cargo.toml, and Solana toolchain versions locally.
- [x] Document environment variables needed for building and deploying the program. See `docs/lotto-env.md`.

## Phase 1 — Program Architecture
- [x] Define account models: `Round`, `Entry`, `Treasury`, plus PDAs and seeds. See `docs/lotto-program-architecture.md`.
- [x] Specify instruction set (`initialize_round`, `join_round`, `settle_round`, `claim_refund`, `admin_close`).
- [x] Write state transition diagrams and invariants (max players, timeouts, treasury split math).
- [x] Draft security checklist (signer requirements, replay protection, rent exemption).

## Phase 2 — Smart Contract Implementation
- [x] Implement account structs and borsh serialization.
- [x] Implement each instruction with validation, escrow handling, and events.
- [ ] Add unit & integration tests (Anchor) covering join, settle, refund scenarios.
- [ ] Run `anchor test` locally and document expected output.

## Phase 3 — Backend Integration
- [x] Add Solana RPC helpers and PDA calculators in `packages/backend/src/solana/`.
- [ ] Update Telegram bot commands to build and submit on-chain transactions (or return unsigned TX for wallets).
- [ ] Replace off-chain DB bookkeeping with on-chain state syncing (webhooks or polling).
- [ ] Provide migration script to align existing DB records with new program state.

## Phase 4 — Frontend & UX Updates
- [ ] Update `src/components/Lotto.tsx` to surface on-chain status (pot, entrants, claimable amounts).
- [ ] Add claim button workflow (call backend endpoint or client-side transaction builder).
- [ ] Document fallback UX for failed transactions / retries.
- [ ] Refresh public marketing copy to highlight on-chain escrow.

## Phase 5 — Deployment & Operations
- [ ] Configure deployment pipeline for Anchor program (build + `solana program deploy`).
- [ ] Record program ID, bump, and share with frontend/backend configs.
- [ ] Update env vars (treasury PDA, program ID, cluster URLs).
- [ ] Run end-to-end rehearsal on devnet/mainnet-beta with real wallets.
- [ ] Monitor logs/metrics, confirm payouts, and cut production release.

---
Use this checklist to track progress; check items off as each step is completed.
