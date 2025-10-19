# Railway Deployment Guide for Wealth Wars Lotto Backend

## Overview

This guide walks you through deploying the Wealth Wars Lotto backend to Railway, connecting it to your existing Telegram bot.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Telegram Bot Token**: From your existing production bot (@WealthWarsLottoBot)
3. **Solana Authority Keypair**: The keypair authorized to manage the lotto program
4. **Admin API Key**: For protecting admin endpoints

## Step 1: Create Railway Project

1. Go to [railway.app/new](https://railway.app/new)
2. Click "Empty Project"
3. Name it "wealth-wars-lotto"

## Step 2: Add PostgreSQL Database

1. In your project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Wait for it to provision
4. Railway will automatically provide `DATABASE_URL` env var

## Step 3: Deploy Backend Service

### Option A: Deploy from GitHub (Recommended)

1. Push your code to GitHub (lotto-onchain branch)
2. In Railway project, click "+ New" → "GitHub Repo"
3. Select your repository and branch (`lotto-onchain`)
4. Railway will auto-detect and deploy
# Railway Deployment and Bot Uptime

This service runs the Telegram bot 24/7 using the prebuilt `dist/` bundle and a Dockerfile. Use this as the source of truth when deploying to Railway or Render.

## Required environment variables

Set these in your deployment (Railway or Render):

- TELEGRAM_BOT_TOKEN: Bot token from BotFather
- DATABASE_URL: Postgres connection string (Railway public URL or Render Postgres). The bot can start without DB, but features will be limited.
- ADMIN_API_TOKEN or ADMIN_API_KEY: Admin key for protected routes
- SOLANA_CLUSTER: mainnet-beta
- SOLANA_RPC_URL: https://api.mainnet-beta.solana.com
- WEALTH_MINT: 56vQJqn9UekqgV52ff2DYvTqxK74sHNxAQVZgXeEpump
- AUTHORITY_SECRET_KEY: Base58 or JSON array secret key (required only for lotto services)

## Health checks

- Root `/` always returns JSON and does not require DB connection
- `/health` tries DB and lotto checks; may return 503 if DB is down

## Verify the running version

In Telegram DM with the bot, run:

- `/version` → should reply with: `Bot Version: 2.0 (Updated Oct 19, 2025)`
- `/start` and `/help` → updated guidance with /bet and /join

## Common pitfalls

- Multiple bot instances cause 409 polling conflicts. Ensure only one service runs with the TELEGRAM_BOT_TOKEN.
- Render cannot reach Railway's internal DB URL. Use a public connection string or Render Postgres.
- Lotto services are optional. If `AUTHORITY_SECRET_KEY` or IDL is missing, the bot still starts but lotto endpoints are disabled.

## Quick redeploy

1) Commit changes to main
2) Redeploy the backend service (Railway or Render)
3) Check logs for `Bot initialized and launched`
4) Test `/version` in Telegram


### Option B: Deploy from CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up
```

## Step 4: Configure Environment Variables

In Railway dashboard, go to your backend service → Variables tab:

### Required Variables

```env
# Database (auto-configured by Railway)
DATABASE_URL=postgresql://...

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_CLUSTER=devnet
LOTTO_PROGRAM_ID=DfJJWgdxk5qw8ujuyZQ6FmNVz8Xi6cZStXhbsGrK2LQj

# Authority Keypair (base58 format)
AUTHORITY_SECRET_KEY=your_base58_secret_key_here

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

# Admin Authentication
ADMIN_API_KEY=your_secure_random_key_here

# Signing Page URL
SIGNING_BASE_URL=https://your-app.railway.app

# Optional: $WEALTH Token
WEALTH_MINT=56vQJqn9UekqgV52ff2DYvTqxK74sHNxAQVZgXeEpump

# Node Environment
NODE_ENV=production
PORT=3000
```

### Getting Your Authority Secret Key

If you have the keypair JSON file:

```bash
# Convert JSON keypair to base58
cd packages/backend
node -e "
const bs58 = require('bs58');
const fs = require('fs');
const keypair = JSON.parse(fs.readFileSync('./authority-keypair.json'));
console.log(bs58.encode(Buffer.from(keypair)));
"
```

Or use the existing one from your `.env` file.

## Step 5: Configure Build Settings

Railway should auto-detect, but verify:

### Root Directory
```
packages/backend
```

### Build Command
```bash
npm install && npx prisma generate && npm run build
```

### Start Command
```bash
npm start
```

## Step 6: Configure Networking

1. In Railway dashboard → Settings → Networking
2. Click "Generate Domain"
3. Copy the public URL (e.g., `wealth-wars-lotto-production.up.railway.app`)
4. Update `SIGNING_BASE_URL` env var with this URL

## Step 7: Run Database Migration

After first deployment, run Prisma migration:

### Option A: Railway CLI

```bash
railway run npx prisma db push
```

### Option B: One-time Job in Dashboard

1. Go to your backend service
2. Click "New Deployment"
3. Override start command: `npx prisma db push && echo "Migration complete"`
4. Wait for it to complete
5. Restore original start command

## Step 8: Connect to Existing Bot

Your existing bot is already deployed somewhere (Railway/Heroku/other). You have two options:

### Option A: Use Same Bot Token (Recommended)

1. Stop your old bot deployment
2. Use the same `TELEGRAM_BOT_TOKEN` in new Railway deployment
3. Your bot will now use the new backend automatically

### Option B: Keep Both (For Testing)

1. Create a test bot with @BotFather
2. Use test bot token in Railway
3. Test thoroughly before switching production

## Step 9: Verify Deployment

### Check Health Endpoint

```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
    "services": {
      "database": "healthy",
      "lotto": "healthy",
      "telegram": "healthy"
    }
  }
}
```

### Check Lotto Services

```bash
curl https://your-app.railway.app/api/lotto/health
```

### Test Telegram Bot

1. Open Telegram
2. Find your bot
3. Send `/start`
4. Should see welcome message with updated commands

## Step 10: Create First Round (Admin)

```bash
curl -X POST https://your-app.railway.app/api/lotto/rounds \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -d '{
    "ticketPriceLamports": "100000000",
    "maxEntries": 0,
    "durationSlots": "1000"
  }'
```

## Monitoring & Logs

### View Logs

In Railway dashboard:
1. Click on your service
2. Go to "Deployments" tab
3. Click on active deployment
4. View real-time logs

### Useful Log Filters

- `[Lotto]` - Lotto service events
- `[Telegram]` - Bot events
- `[Database]` - Database events
- `ERROR` - All errors

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `LOTTO_PROGRAM_ID` | ✅ | Deployed program ID | `DfJJ...2LQj` |
| `SIGNING_BASE_URL` | ✅ | Public app URL | `https://your-app.railway.app` |

## Troubleshooting

### Bot Not Responding

1. Check logs for `[Telegram]` errors
2. Verify `TELEGRAM_BOT_TOKEN` is correct
3. Ensure no other instance is using same token
4. Check Railway service is running

### Database Connection Errors

1. Verify PostgreSQL service is running
2. Check `DATABASE_URL` is set
3. Try redeploying after database is ready

### Lotto Services Not Initializing

1. Check `AUTHORITY_SECRET_KEY` format (base58)
2. Verify `LOTTO_PROGRAM_ID` is correct
3. Check Solana RPC is accessible
4. Review logs for specific error

### Transaction Failures

1. Ensure authority wallet has SOL for gas
2. Check RPC endpoint is responsive
3. Verify program is deployed on correct cluster
4. Review transaction signatures in logs

## Going to Mainnet

When ready for production:

1. Deploy program to mainnet-beta
2. Update environment variables:
   ```env
   SOLANA_CLUSTER=mainnet-beta
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   LOTTO_PROGRAM_ID=<new_mainnet_program_id>
   ```
3. Ensure authority wallet has SOL
4. Test thoroughly with small amounts first
5. Monitor logs closely

## Security Best Practices

1. **Never commit secrets** to Git
2. **Use strong ADMIN_API_KEY** (32+ random characters)
3. **Rotate keys periodically**
4. **Monitor for unusual activity**
5. **Set up Railway alerts** for service health
6. **Keep RPC endpoints private** if possible
7. **Backup authority keypair** securely

## Cost Estimate

Railway free tier includes:
- $5 monthly credit
- ~512MB RAM
- PostgreSQL database

For production:
- Hobby plan: $5/month per service
- PostgreSQL: $5-10/month
- Total: ~$10-20/month

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Wealth Wars Issues: [GitHub repo]

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Configure environment variables
3. ✅ Run database migration
4. ✅ Switch bot to new backend
5. ✅ Create first round
6. ✅ Test full flow
7. Monitor and iterate!
