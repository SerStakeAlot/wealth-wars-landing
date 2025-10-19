#!/usr/bin/env bash
set -euo pipefail

# Lotto program verification helper
# Usage:
#   scripts/lotto.verify.sh <PROGRAM_ID> [RPC_URL]

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <PROGRAM_ID> [RPC_URL]" >&2
  exit 1
fi

PROGRAM_ID="$1"
RPC_URL="${2:-}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Error: '$1' is required"; exit 1; }; }
need solana

if [[ -n "$RPC_URL" ]]; then
  solana config set --url "$RPC_URL" >/dev/null
fi

echo "Checking program on: $(solana config get | awk '/RPC URL/ {print $3}')"
solana program show "$PROGRAM_ID" || {
  echo "Program not found. Ensure deployed to this cluster." >&2
  exit 2
}

echo
echo "If backend still shows 'Program not deployed':"
echo "- Confirm backend SOLANA_CLUSTER and SOLANA_RPC_URL match this cluster"
echo "- Confirm LOTTO_PROGRAM_ID=$PROGRAM_ID"
echo "- Ensure only one of LOTTO_IDL_JSON or LOTTO_IDL_BASE64 is set"
