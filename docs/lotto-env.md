# Lotto Program Environment Variables

Anchor and the Solana CLI pick up a handful of environment variables during builds, local testing, and deployments. These values should be exported (or set in a `.env` file that the invoking shell sources) before running `anchor build`, `anchor test`, or any deployment scripts.

| Variable | Description | Local Default |
| --- | --- | --- |
| `ANCHOR_WALLET` | Absolute path to the keypair that signs Anchor deployments and tests. | `~/.config/solana/id.json`
| `ANCHOR_PROVIDER_URL` | RPC endpoint Anchor uses for builds/tests. | `http://127.0.0.1:8899` (local validator) |
| `SOLANA_CONFIG_DIR` | Directory containing CLI config files and keypairs. Ensures the CLI reads the same keys Anchor uses. | `~/.config/solana` |
| `SOLANA_URL` | RPC URL used by the Solana CLI; mirrors `ANCHOR_PROVIDER_URL` when developing locally. | `http://127.0.0.1:8899` |
| `SOLANA_PROGRAM_ID` | Program ID used by backend/frontend clients when interacting with the deployed program. Update after each redeploy. | Output of `solana address -k target/deploy/lotto-keypair.json` |

## Usage

```bash
export ANCHOR_WALLET="$HOME/.config/solana/id.json"
export ANCHOR_PROVIDER_URL="http://127.0.0.1:8899"
export SOLANA_CONFIG_DIR="$HOME/.config/solana"
export SOLANA_URL="http://127.0.0.1:8899"
# Set after deploying or when pointing at devnet
export SOLANA_PROGRAM_ID="DfJJWgdxk5qw8ujuyZQ6FmNVz8Xi6cZStXhbsGrK2LQj"
```

Keep production credentials out of source control. Use your secret manager of choice (Railway, Render, GitHub Actions, etc.) to inject the appropriate values when deploying.
