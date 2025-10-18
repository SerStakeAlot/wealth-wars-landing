# Lotto Program Architecture

The on-chain lotto program manages rounds of ticket sales, escrow of SOL, and deterministic payouts. This document defines the Solana accounts, instruction API, state transitions, and security controls that guide implementation.

---

## Accounts & PDAs

### `Round`
- **Seeds:** `[b"round", authority.key().as_ref(), round_id.to_le_bytes()]`
- **Bump:** Stored for CPI usage when reopening the PDA.
- **Fields:**
  - `authority` – Pubkey that can start/settle rounds.
  - `round_id` – `u64` monotonically increasing identifier.
  - `round_seed` – Cached little-endian bytes used when deriving the PDA.
  - `ticket_price_lamports` – Fixed price per entry.
  - `max_entries` – Optional cap; zero means unlimited.
  - `start_slot` / `end_slot` – Inclusive window where joins are permitted.
  - `pot_lamports` – Total escrowed lamports collected.
  - `winner` – Optional Pubkey set during settlement.
  - `status` – Enum (`Pending`, `Open`, `Closed`, `Settled`).
  - `entry_count` – Number of entries stored.
  - `randomness_request` – Optional reference (for future VRF integration).

### `Entry`
- **Seeds:** `[b"entry", round.key().as_ref(), entrant.key().as_ref(), nonce]`
- **Fields:**
  - `round` – Pubkey of the associated `Round` PDA.
  - `entrant` – Wallet that paid for the ticket.
  - `tickets` – `u16` number of tickets purchased in this receipt.
  - `lamports_paid` – Total lamports transferred for these tickets.
  - `claimed` – Bool to prevent duplicate refunds/payouts.
  - `created_at` – Slot when entry recorded.

> *Implementation note*: We can use a PDA escrow ATA instead of storing lamports in the `Entry` account if we choose SPL tokens. For native SOL we keep lamports tracked in the `Round` and implicitly escrowed in the `Treasury` PDA.

### `Treasury`
- **Seeds:** `[b"treasury", authority.key().as_ref()]`
- **Bump:** Stored for runtime access.
- **Fields:**
  - `authority` – Same signer that controls rounds.
  - `vault_bump` – Bump used for CPI withdrawals.
  - `retained_bps` – Basis points allocated to the house/treasury.
  - `last_withdraw_slot` – For rate-limiting withdrawals.
  - *Native lamports* – Balance held in the PDA itself.

### `GlobalConfig` (optional future)
- **Purpose:** Anchor state for parameters shared across rounds (fees, randomness providers).
- Excluded for MVP unless configuration needs to span authorities.

---

## Instruction Set

### `initialize_round`
Creates and configures a new `Round` account.
- **Accounts:** `authority (signer)`, `Round (PDA)`, `Treasury (PDA)`, `SystemProgram`.
- **Inputs:** `round_id`, `ticket_price`, `max_entries`, `duration_slots`.
- **Effects:**
  - Validates round does not already exist.
  - Sets `start_slot` to current slot, `end_slot` to `start + duration`.
  - Zeroes financial counters.

### `join_round`
Allows a user to purchase one or more tickets.
- **Accounts:** `entrant (signer)`, `Round`, `Treasury`, `Entry (PDA)`, `SystemProgram`.
- **Inputs:** `tickets` (u16), optional `nonce` for deterministic PDA.
- **Effects:**
  - Verifies round `status == Open` and within time window.
  - Checks `entry_count < max_entries` when capped.
  - Transfers lamports from entrant to `Treasury` PDA.
  - Increments `pot_lamports`, `entry_count`.
  - Emits `JoinEvent { entrant, tickets, amount }`.

### `settle_round`
Picks a winner and transitions escrow to payout state.
- **Accounts:** `authority (signer)`, `Round`, `Treasury`, `Randomness` (optional CPI), `SystemProgram`.
- **Inputs:** `winning_index` (derived off-chain or via randomness oracle).
- **Effects:**
  - Requires `status == Closed` (time elapsed or manually closed).
  - Sets `winner` and updates `status = Settled`.
  - Calculates `treasury_cut = pot * retained_bps / 10_000`.
  - Leaves payout lamports in `Treasury` for the `claim_payout` instruction.
  - Emits `SettleEvent { round_id, winner, pot, treasury_cut }`.

### `claim_payout`
Winner withdraws the prize.
- **Accounts:** `winner (signer)`, `Round`, `Treasury (PDA)`, `SystemProgram`.
- **Effects:**
  - Ensures `Round.status == Settled` and caller matches `winner`.
  - Transfers `pot - treasury_cut` to winner.
  - Marks round finished (`status = ClosedOut`).

### `claim_refund`
Entrant reclaims funds when round cancelled or expired without settlement.
- **Accounts:** `entrant (signer)`, `Round`, `Entry`, `Treasury`, `SystemProgram`.
- **Effects:**
  - Allowed when `status == Cancelled` or timed out.
  - Prevents double-claim via `Entry.claimed`.
  - Transfers `lamports_paid` back to entrant.

### `admin_close`
Emergency stop that cancels a round and refunds players.
- **Accounts:** `authority (signer)`, `Round`, `Treasury`, `SystemProgram`.
- **Effects:**
  - Sets `status = Cancelled`.
  - Leaves lamports in `Treasury` for players to call `claim_refund`.
  - Optionally emits `AdminCloseEvent` with reason code.

---

## State Transitions & Invariants

### Lifecycle
1. **Pending → Open** via `initialize_round` (opened immediately after creation).
2. **Open → Closed** automatically when `Clock::slot > end_slot` or via manual `admin_close` after cap reached.
3. **Closed → Settled** through `settle_round` when randomness available.
4. **Settled → ClosedOut** once winner claims. Alternatively:
   - **Any → Cancelled** triggered by `admin_close` for emergencies.

### Invariants
- `round_id` strictly increases per authority; enforce by comparing against previous round (tracked off-chain) or storing `last_round_id` in `Treasury`.
- `pot_lamports == Σ(Entry.lamports_paid) - Σ(refunds issued) - payouts`.
- `entry_count == number of Entry accounts where claimed == false OR true?` (counts all entries irrespective of claim status).
- `max_entries == 0 || entry_count <= max_entries`.
- `ticket_price_lamports > 0` and `tickets > 0` in `join_round`.
- `Treasury.lamports >= pot_lamports` at all times; enforced via runtime checks on SOL balance.
- `winner` may be set only once per round.

---

## Security Checklist

- **Signer assertions:**
  - `authority` must sign `initialize_round`, `settle_round`, `admin_close`.
  - `entrant` must sign `join_round`, `claim_refund`.
  - `winner` (or a delegated authority) must sign `claim_payout`.

- **Rent & allocation:**
  - Pre-calculate account sizes to ensure rent exemption for `Round`, `Entry`, and `Treasury` PDAs.
  - Use Anchor `init` with `space = ...` and `payer = entrant/authority` as appropriate.

- **Escrow guarantees:**
  - All lamports flow through PDAs to avoid intermediate custodial accounts.
  - Validate PDA bumps to prevent spoofed accounts.
  - Check `SystemProgram::id()` for CPI target when transferring SOL.

- **Replay protection:**
  - Derive `Entry` PDAs with a unique nonce or incremental counter so replays cannot overwrite existing entries.
  - Use `require!(round.status == Open, …)` gate checks.

- **Timing controls:**
  - Compare `Clock::slot` to `start_slot`/`end_slot` on join/refund.
  - Optional: enforce cooldown between rounds using `Treasury.last_withdraw_slot`.

- **Numerical safety:**
  - Use checked arithmetic via `checked_add`, `checked_mul` for pot calculations.
  - Bound `tickets` to avoid u16 overflow and ensure `tickets * price` fits in `u64`.

- **Authority rotation:**
  - Provide future instruction to update `Treasury.authority` (not in MVP), with two-phase confirm to avoid account hijack.

- **Event logging:**
  - Emit events for joins, settlements, payouts, refunds to simplify off-chain indexing.

---

This architecture establishes the contract surface area required for backend integration (Phase 3) and frontend UX updates (Phase 4). Future revisions can extend the design with randomness oracles, SPL-token prizes, or NFT rewards while preserving the same core account model.
