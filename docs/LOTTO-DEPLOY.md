## Lotto program deployment and backend wiring

This guide gets your on-chain lotto live and the backend healthy. It covers mainnet-beta and a quick devnet path for testing.

---

### Prerequisites

- Solana CLI and Anchor CLI installed
- A funded payer wallet for the target cluster (mainnet requires real SOL)
- Program keypair: `target/deploy/lotto-keypair.json`
- Built program artifact: `target/deploy/lotto.so`

Notes
- The program ID is derived from `lotto-keypair.json`. In this repo it is:
  - Program ID: `CRN6xipYR35mQeAzPFvatKYk6WsTfzhbWshrMp2Jn3FR`
- The IDL is generated at `target/idl/lotto.json`. We’ve provided copies:
  - Minified JSON: `scripts/lotto.idl.min.json`
  - Base64: `scripts/lotto.idl.base64.txt`

---

### 1) Verify the program ID (optional)

```bash
solana-keygen pubkey target/deploy/lotto-keypair.json
# expect: CRN6xipYR35mQeAzPFvatKYk6WsTfzhbWshrMp2Jn3FR
```

---

### 2) Choose a cluster and set RPC

Mainnet-beta (production)
```bash
solana config set --url https://api.mainnet-beta.solana.com
# or set to your provider RPC URL
```

Devnet (fast testing)
```bash
solana config set --url https://api.devnet.solana.com
```

Confirm connectivity
```bash
solana --version
solana cluster-version
solana get-slot
```

---

### 3) Build (if needed)

```bash
# from repo root
anchor build
# produces target/deploy/lotto.so and target/idl/lotto.json
```

---

### 4) Deploy the program

```bash
# Make sure your payer wallet is funded on the selected cluster
solana balance

# Deploy using the fixed program ID from the keypair
solana program deploy target/deploy/lotto.so \
  --program-id target/deploy/lotto-keypair.json

# Verify it’s on-chain and executable
solana program show CRN6xipYR35mQeAzPFvatKYk6WsTfzhbWshrMp2Jn3FR
```

You should see an account with `Executable: true`.

---

### 5) Configure the backend environment

Set the following envs on your deployment platform (Railway/Render/etc.):

- LOTTO_PROGRAM_ID = `CRN6xipYR35mQeAzPFvatKYk6WsTfzhbWshrMp2Jn3FR`
- ONE of
  - LOTTO_IDL_JSON = contents of `scripts/lotto.idl.min.json` (single line)
  - LOTTO_IDL_BASE64 = contents of `scripts/lotto.idl.base64.txt` (single line)
- SOLANA_CLUSTER = `mainnet` or `devnet` (must match the cluster you deployed to)
- SOLANA_RPC_URL = your RPC endpoint URL for that cluster

Other required envs (abridged; see backend docs):
- TELEGRAM_BOT_TOKEN, DATABASE_URL, AUTHORITY_SECRET_KEY, ADMIN_API_KEY/ADMIN_API_TOKEN

Redeploy your backend after updating envs.

---

### 6) Verify health and bot mode

Backend health endpoints (replace base URL with your service):

- `GET /health` — overall check
- `GET /api/lotto/health` — lotto services

Expected healthy state snippet:
```
program: {
  status: 'healthy',
  message: 'Program deployed',
  ...
}
```

The Telegram bot should automatically run in the lotto-integrated mode when services are ready.

---

### Troubleshooting

Program not deployed in health
- Ensure the env `LOTTO_PROGRAM_ID` exactly matches `CRN6xip...`
- Make sure the backend’s `SOLANA_CLUSTER` and `SOLANA_RPC_URL` point to the SAME cluster where you deployed
- Check on-chain: `solana program show CRN6xip...` — if not found or not executable, (re)deploy
- If you previously used a different program ID (e.g., DfJJ...), remove it from envs

IDL/ABI errors
- Set only one of `LOTTO_IDL_JSON` or `LOTTO_IDL_BASE64`
- Ensure the IDL corresponds to the same version you deployed (current repo build)

Multiple bot instances (Telegram 409)
- Confirm you have only one running service using the same TELEGRAM_BOT_TOKEN

RPC flakiness
- Temporary differences in `feature-set`/versions across providers are okay; focus on cluster consistency and program account existence

---

### Quick devnet test path

1) `solana config set --url https://api.devnet.solana.com`
2) `anchor build` (if needed)
3) `solana airdrop 2` (devnet only) until balance is sufficient
4) `solana program deploy target/deploy/lotto.so --program-id target/deploy/lotto-keypair.json`
5) Set backend envs:
   - `SOLANA_CLUSTER=devnet`
   - `SOLANA_RPC_URL=https://api.devnet.solana.com`
   - `LOTTO_PROGRAM_ID=CRN6xip...`
   - `LOTTO_IDL_JSON` or `LOTTO_IDL_BASE64`
6) Redeploy backend and check `/api/lotto/health`
