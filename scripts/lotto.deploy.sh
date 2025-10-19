#!/usr/bin/env bash
set -euo pipefail

# Lotto program deploy helper
# Usage:
#   scripts/lotto.deploy.sh [mainnet|devnet]
# Env (optional):
#   SOLANA_RPC_URL    Override RPC URL, otherwise uses standard cluster RPC

CLUSTER="${1:-mainnet}"

PROGRAM_SO="target/deploy/lotto.so"
PROGRAM_KEYPAIR="target/deploy/lotto-keypair.json"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Error: '$1' is required but not found in PATH"; exit 1; }; }
need solana
need awk

if ! command -v anchor >/dev/null 2>&1; then
  echo "Warning: 'anchor' not found. Skipping build; expecting artifacts to exist."
fi

if [[ -n "${SOLANA_RPC_URL:-}" ]]; then
  solana config set --url "$SOLANA_RPC_URL" >/dev/null
else
  if [[ "$CLUSTER" == "mainnet" ]]; then
    solana config set --url https://api.mainnet-beta.solana.com >/dev/null
  else
    solana config set --url https://api.devnet.solana.com >/dev/null
  fi
fi

RPC_URL=$(solana config get | awk '/RPC URL/ {print $3}')
echo "Cluster: $CLUSTER"
echo "RPC URL: $RPC_URL"

if [[ ! -f "$PROGRAM_SO" || ! -f "$PROGRAM_KEYPAIR" ]]; then
  if command -v anchor >/dev/null 2>&1; then
    echo "Building program with Anchor..."
    anchor build
  else
    echo "Error: Program artifacts missing and 'anchor' not available to build." >&2
    echo "Expected: $PROGRAM_SO and $PROGRAM_KEYPAIR" >&2
    exit 1
  fi
fi

PROGRAM_ID=$(solana-keygen pubkey "$PROGRAM_KEYPAIR")
echo "Program ID (from keypair): $PROGRAM_ID"

echo "Payer: $(solana address)"
solana balance || true

echo "Deploying program..."
solana program deploy "$PROGRAM_SO" --program-id "$PROGRAM_KEYPAIR"

echo "Verifying on-chain program..."
solana program show "$PROGRAM_ID"

echo
echo "Backend env values (copy/paste):"
echo "LOTTO_PROGRAM_ID=$PROGRAM_ID"
echo "SOLANA_CLUSTER=$CLUSTER"
echo "SOLANA_RPC_URL=$RPC_URL"
echo "Use ONE of:"
echo "  LOTTO_IDL_JSON = contents of scripts/lotto.idl.min.json (single line)"
echo "  LOTTO_IDL_BASE64 = contents of scripts/lotto.idl.base64.txt (single line)"
