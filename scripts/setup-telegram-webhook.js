#!/usr/bin/env node

/**
 * Telegram Bot Setup Script
 *
 * This script helps set up the Telegram bot webhook for local development.
 *
 * Prerequisites:
 * 1. Create a Telegram bot with @BotFather
 * 2. Get your bot token
 * 3. Set TELEGRAM_BOT_TOKEN in .env
 * 4. For local development, use ngrok to expose your local server
 *
 * Usage:
 * 1. Start your backend server
 * 2. Run: npm install -g ngrok
 * 3. Run: ngrok http 8787
 * 4. Copy the ngrok URL (e.g., https://abc123.ngrok.io)
 * 5. Run: node scripts/setup-telegram-webhook.js https://abc123.ngrok.io
 */

import https from 'https';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', 'packages', 'backend', '.env');

try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (value) {
        process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    }
  });
} catch (error) {
  console.error('❌ Could not load .env file:', error.message);
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.argv[2];

if (!BOT_TOKEN || BOT_TOKEN === 'your_bot_token_here') {
  console.error('❌ Please set TELEGRAM_BOT_TOKEN in your .env file');
  console.error('   Get a token from @BotFather on Telegram');
  process.exit(1);
}

if (!WEBHOOK_URL) {
  console.error('❌ Please provide the webhook URL as an argument');
  console.error('   Example: node scripts/setup-telegram-webhook.js https://abc123.ngrok.io');
  console.error('');
  console.error('   For local development:');
  console.error('   1. npm install -g ngrok');
  console.error('   2. ngrok http 8787');
  console.error('   3. Use the ngrok URL as the webhook URL');
  process.exit(1);
}

const webhookUrl = `${WEBHOOK_URL}/api/tg/webhook`;

console.log('🤖 Setting up Telegram webhook...');
console.log(`   Bot Token: ${BOT_TOKEN.substring(0, 10)}...`);
console.log(`   Webhook URL: ${webhookUrl}`);

// Set webhook
const options = {
  hostname: 'api.telegram.org',
  path: `/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`,
  method: 'GET'
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.ok) {
        console.log('✅ Telegram webhook set successfully!');
        console.log('   Your bot is now active and will receive messages.');
        console.log('');
        console.log('   Test your bot by sending: /start');
      } else {
        console.error('❌ Failed to set webhook:', response.description);
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.end();