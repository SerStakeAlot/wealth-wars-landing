# Phase 3: Backend Integration Plan

## Overview
Integrate the on-chain lotto program with the existing backend by adding Solana RPC helpers, PDA calculators, and transaction builders. The backend will orchestrate on-chain operations while maintaining a local database for indexing and caching.

---

## Architecture

### Hybrid On-Chain + Off-Chain Model
- **On-Chain (Source of Truth):** Round state, entries, treasury balances, winners
- **Off-Chain (Backend DB):** User profiles, transaction history, webhooks, analytics
- **Sync Strategy:** Backend polls/subscribes to program accounts and indexes events

### Components to Build

1. **Solana Client Layer** (`packages/backend/src/solana/`)
   - `connection.ts` - RPC connection management
   - `pdas.ts` - PDA derivation helpers
   - `program.ts` - Program interface & IDL loading
   - `transactions.ts` - Transaction builders for each instruction

2. **Lotto Service Layer** (`packages/backend/src/services/lotto/`)
   - `round-manager.ts` - Create/manage rounds
   - `entry-processor.ts` - Handle ticket purchases
   - `settlement-service.ts` - Settle rounds & pick winners
   - `claim-service.ts` - Process payouts/refunds
   - `indexer.ts` - Sync on-chain state to DB

3. **API Endpoints** (extend `packages/backend/src/index.ts`)
   - `GET /lotto/status` - Current round info
   - `POST /lotto/join` - Generate join transaction
   - `POST /lotto/settle` - Admin settle round
   - `POST /lotto/claim` - Generate claim transaction
   - `GET /lotto/history` - User's entries & wins

4. **Telegram Bot Integration** (extend `telegram-bot.ts`)
   - `/lotto` - Show current round
   - `/join [tickets]` - Join current round
   - `/claim` - Claim winnings
   - `/balance` - Show lotto balance

---

## Implementation Tasks

### Task 1: Solana Client Infrastructure ✅
- [x] Create `packages/backend/src/solana/` directory
- [x] Build connection manager with retry logic
- [x] Implement PDA derivation functions matching program seeds
- [x] Load and validate program IDL
- [x] Add transaction builder utilities

### Task 2: Database Schema Extensions ✅
- [x] Add `Round` table (round_id, status, pot, winner, etc.)
- [x] Add `Entry` table (user_id, round_id, tickets, lamports_paid)
- [x] Add `Transaction` table (signature, type, status, user_id)
- [x] Create indexes for efficient queries

### Task 3: Core Lotto Services
- [ ] Implement `RoundManager` for creating/closing rounds
- [ ] Build `EntryProcessor` to validate & submit join transactions
- [ ] Create `SettlementService` for winner selection & settlement
- [ ] Add `ClaimService` for payout/refund processing

### Task 4: Account Indexer
- [ ] Build WebSocket subscription to program account changes
- [ ] Parse and decode account data using IDL
- [ ] Update local DB when on-chain state changes
- [ ] Emit events for frontend/bot consumption

### Task 5: REST API Endpoints
- [ ] Add health check with program account verification
- [ ] Implement round status endpoint
- [ ] Create transaction builder endpoints (unsigned TXs for wallet signing)
- [ ] Add history/analytics endpoints

### Task 6: Telegram Bot Commands
- [ ] Extend bot with lotto commands
- [ ] Add wallet linking flow
- [ ] Implement join confirmation & transaction submission
- [ ] Add winner notifications

### Task 7: Admin Dashboard
- [ ] Create admin endpoints for round management
- [ ] Add monitoring/metrics (entries, volume, winners)
- [ ] Build emergency controls (admin_close)

---

## Environment Variables

Add to `.env`:
```bash
# Solana Configuration
SOLANA_RPC_URL=http://127.0.0.1:8899
SOLANA_CLUSTER=localnet
LOTTO_PROGRAM_ID=DfJJWgdxk5qw8ujuyZQ6FmNVz8Xi6cZStXhbsGrK2LQj

# Lotto Authority (admin wallet for managing rounds)
LOTTO_AUTHORITY_KEYPAIR=/path/to/authority-keypair.json
LOTTO_TREASURY_ADDRESS=<derived-from-authority>

# Round Configuration
LOTTO_DEFAULT_TICKET_PRICE=1000000
LOTTO_DEFAULT_DURATION_SLOTS=200
LOTTO_DEFAULT_RETAINED_BPS=500
```

---

## Testing Strategy

1. **Unit Tests:** Test PDA derivation, transaction building
2. **Integration Tests:** Test against local validator
3. **E2E Tests:** Full flow from Telegram bot → transaction → settlement → claim
4. **Load Tests:** Simulate multiple concurrent entries

---

## Migration Plan

### Initial Deployment (Devnet)
1. Deploy program to devnet
2. Configure backend with devnet RPC
3. Test all flows with test wallets
4. Monitor for any issues

### Production Deployment
1. Deploy program to mainnet-beta
2. Update backend env vars
3. Seed initial round with authority wallet
4. Announce to community
5. Monitor first round closely

---

## Success Criteria

- [ ] Backend can create rounds on-chain
- [ ] Users can join via Telegram bot
- [ ] Automatic settlement works correctly
- [ ] Winners can claim prizes
- [ ] Refunds work when rounds cancelled
- [ ] Local DB stays in sync with on-chain state
- [ ] All transactions properly signed and submitted
- [ ] Error handling for failed transactions
- [ ] Metrics/monitoring operational

---

## Next Steps

Start with Task 1: Build the Solana client infrastructure layer.
