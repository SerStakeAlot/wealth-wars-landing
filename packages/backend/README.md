# Wealth Wars Backend (Express)

A tiny API used for wallet linking (message signing) and checking $WEALTH SPL token balance.

## Quick start (local)

1) Install deps and run dev

```bash
npm install
npm -w packages/backend run dev
```

Defaults:
- PORT=8787
- SOLANA_CLUSTER=mainnet-beta
- SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
- WEALTH_MINT=56vQJqn9UekqgV52ff2DYvTqxK74sHNxAQVZgXeEpump

Health check: http://localhost:8787/healthz

## One‑click deploy (Render)

1) Push this repo to GitHub (if not already).
2) Visit https://render.com and click “New +” → “Blueprint”.
3) Paste your repo URL, Render will detect `render.yaml`.
4) Click “Apply”. Render will build and deploy the service.
5) When it’s live, copy the public URL. It’ll look like: `https://wealth-wars-backend.onrender.com`
6) In GitHub → Settings → Secrets and variables → Actions → New repository secret:
   - Name: BACKEND_API_BASE
   - Value: the URL from step 5
7) Re-run the GitHub Pages deploy workflow (or push a commit). Frontend will use your backend.

## API

- POST /link/start
- POST /link/finish { address, signature }
- GET /wallet/:address/wealth
- GET /me
- GET /healthz

Notes:
- In-memory store only; replace with DB if needed (for persistence).
- Rate limit: 60/min per instance.
- SPL balance cached ~30s.
