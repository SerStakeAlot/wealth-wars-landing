# Telegram Bot Wallet Connection Fix

## Problem Diagnosis

The issue with the Telegram bot `/bet 100` command causing the page to go blank when connecting to Phantom wallet was due to several factors:

1. **Missing Environment Variables**: `VITE_ENABLE_WALLET` was not set, disabling wallet functionality
2. **Missing Polyfills**: The `sign.html` page lacked necessary polyfills (`Buffer`, `global`) required for Solana wallet connections
3. **Poor Error Handling**: Limited error reporting made debugging difficult
4. **Configuration Issues**: Backend `SIGNING_BASE_URL` not configured for local development

## Solutions Implemented

### 1. Environment Configuration

Created `.env.local` for frontend development:
```env
VITE_ENABLE_WALLET=true
VITE_SIGNING_BASE_URL=http://localhost:3000
VITE_SOLANA_NETWORK=mainnet
VITE_SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
```

Created `packages/backend/.env` for backend:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/wealthwars"
SIGNING_BASE_URL=http://localhost:3000
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
TELEGRAM_BOT_TOKEN=your_bot_token_here
PORT=8000
```

### 2. Fixed Polyfills in sign.html

Added necessary polyfills at the top of `public/sign.html`:
```html
<!-- Polyfills for Solana wallet connection -->
<script src="https://unpkg.com/buffer@6.0.3/index.js"></script>
<script>
  if (typeof global === 'undefined') {
    window.global = window;
  }
  if (typeof Buffer === 'undefined') {
    window.Buffer = buffer.Buffer;
  }
</script>
```

### 3. Enhanced Error Handling

Improved the wallet connection logic in `sign.html` with:
- Better wallet detection for mobile vs desktop
- More detailed error messages  
- Console logging for debugging
- Proper connection flow validation
- Graceful handling of user cancellation

### 4. Created Test Page

Added `public/test-wallet.html` for testing wallet connections independently.

## How to Test the Fix

1. **Start Development Server**:
   ```bash
   cd /workspaces/wealth-wars-landing
   python3 -m http.server 3000
   ```

2. **Test Wallet Connection**:
   - Open http://localhost:3000/public/test-wallet.html
   - Click "Connect Phantom" - should connect successfully
   - Click "Sign Test Message" - should sign and show base64 signature

3. **Test Sign Page**:
   - Open http://localhost:3000/public/sign.html?message=Test%20message
   - Should load without going blank
   - Wallet connection should work properly

4. **Backend Setup** (for full Telegram bot testing):
   ```bash
   cd packages/backend
   npm install
   # Add your actual TELEGRAM_BOT_TOKEN to .env
   npm run dev
   ```

## Key Changes Made

### Files Modified:
- `public/sign.html` - Added polyfills and improved error handling
- `.env.local` - Added frontend environment variables
- `packages/backend/.env` - Added backend configuration

### Files Created:
- `public/test-wallet.html` - Test page for wallet connection debugging

## Common Issues and Solutions

1. **"Phantom wallet not detected"**: 
   - Ensure Phantom extension is installed and enabled
   - For mobile: Use Phantom app's built-in browser

2. **Page goes blank**: 
   - Check browser console for errors
   - Ensure polyfills are loaded (Buffer, global)
   - Verify environment variables are set

3. **Signing fails**:
   - Check that message format is correct
   - Ensure user doesn't cancel the signing prompt
   - Verify wallet is properly connected first

## Next Steps

1. Update your actual Telegram bot token in `packages/backend/.env`
2. Test the complete flow: Telegram → Link → Sign → Paste back to Telegram
3. For production: Update `SIGNING_BASE_URL` to your production domain
4. Consider implementing proper error tracking/logging

The wallet connection should now work properly without the page going blank!