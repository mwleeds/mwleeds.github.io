#!/bin/bash

# Wedding Registry Deployment Script for Base L2
#
# Prerequisites:
# 1. Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup
# 2. Set environment variables (or create .env file):
#    - PRIVATE_KEY: Your wallet private key
#    - BASE_RPC_URL: Base RPC endpoint (default: https://mainnet.base.org)

set -e

echo "🎊 Deploying Wedding Registry to Base L2..."

# Check if private key is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable not set"
    echo "Usage: PRIVATE_KEY=0x... ./deploy.sh"
    exit 1
fi

# Default to Base mainnet if not specified
RPC_URL=${BASE_RPC_URL:-"https://mainnet.base.org"}

echo "Network: $RPC_URL"
echo ""

# Deploy the contract
forge create \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    WeddingRegistry.sol:WeddingRegistry \
    --legacy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Save the contract address above"
echo "2. Verify on BaseScan (optional): https://basescan.org"
echo "3. Add items to your registry using addItem()"
echo "4. Build the relayer backend"
