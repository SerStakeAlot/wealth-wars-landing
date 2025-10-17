# Wealth Wars Production Deployment

## Prerequisites
- Real $WEALTH token deployed on mainnet
- Domain: wealthwars.fun (already owned)
- Production database (PostgreSQL)
- Cloud hosting (Railway, Vercel, AWS, etc.)

## 1. Token Setup
```bash
# Update .env with real token address
WEALTH_MINT=your_real_wealth_token_address_here
SOLANA_CLUSTER=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## 2. Database Migration
```bash
# Set up production PostgreSQL database
# Update DATABASE_URL in .env
DATABASE_URL="postgresql://user:pass@host:5432/wealthwars_prod"
```

## 3. Deploy Backend
```bash
# Railway (recommended for Node.js)
npm install -g @railway/cli
railway login
railway init
railway up

# Or Vercel
npm install -g vercel
vercel --prod
```

## 4. Update Webhook
```bash
# Set production webhook URL
node scripts/setup-telegram-webhook.js https://your-production-domain.com
```

## 5. Domain Setup
- Point wealthwars.fun to your backend
- Set up SSL certificate
- Update SIGNING_BASE_URL=https://wealthwars.fun

## 6. Environment Variables
```
NODE_ENV=production
SIGNING_BASE_URL=https://wealthwars.fun
TELEGRAM_BOT_TOKEN=your_token
DATABASE_URL=production_db_url
```

## 7. Testing
- Test wallet linking with real $WEALTH
- Test lotto commands
- Verify signing page works
- Test on mainnet transactions