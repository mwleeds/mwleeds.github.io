# Wedding Registry Quick Start Guide

Get your blockchain-powered wedding registry up and running.

## Architecture Overview

```
Guest → Frontend → Lambda Relayer → Base L2 Contract
                    (validates pwd,
                     encrypts name,
                     pays gas)
```

**Key principle:** The relayer handles authentication (password), encryption, and gas payment. The contract just stores data on-chain.

## What You Need

- [ ] Main wallet (for contract management and decryption)
- [ ] Relayer wallet (dedicated, minimal funds)
- [ ] AWS account
- [ ] ~$20 ETH on Base L2
- [ ] Password to share with guests

## Step-by-Step Setup

### 1. Deploy Smart Contract

```bash
cd contracts

# Review the contract
cat WeddingRegistry.sol

# Deploy using Remix (easiest):
# 1. Go to remix.ethereum.org
# 2. Create WeddingRegistry.sol, paste code
# 3. Compile with Solidity 0.8.20
# 4. Connect MetaMask to Base network
# 5. Deploy
# 6. Save contract address
```

**Cost:** ~$0.50

### 2. Add Registry Items

```bash
# Option A: Using interact-example.js
node interact-example.js

# Option B: Using Remix
# Call addItem() for each gift
# Example:
#   name: "Coffee Maker"
#   description: "12-cup programmable"
#   url: "https://example.com/product"
#   imageUrl: "https://example.com/image.jpg"
```

**Cost:** ~$0.02 per item

### 3. Set Up Relayer Wallet

Create a NEW dedicated wallet for gas payment:

```bash
cd ../relayer-lambda

# Generate new wallet
node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address, '\nPrivate Key:', w.privateKey)"

# Fund with ~$10-20 ETH on Base L2
# Bridge ETH to Base: https://bridge.base.org
```

### 4. Get Your Main Wallet Public Key

This is for encrypting purchaser names:

```bash
npm install
node get-public-key.js YOUR_MAIN_WALLET_PRIVATE_KEY

# Save the output - you'll use it for OWNER_PUBLIC_KEY
```

### 5. Deploy Lambda Relayer

```bash
# Create environment variables
cp .env.example .env

# Edit .env with your values:
# - RELAYER_PRIVATE_KEY (from step 3)
# - CONTRACT_ADDRESS (from step 1)
# - OWNER_PUBLIC_KEY (from step 4)
# - BASE_RPC_URL: https://mainnet.base.org
# - REGISTRY_PASSWORD: your_chosen_password

# Test locally (optional)
npm test

# Package for AWS
npm install --production
npm run package
```

**Deploy to AWS Lambda:**

1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda)
2. Create function: `wedding-registry-relayer`
3. Runtime: Node.js 18.x
4. Upload `function.zip`
5. Configuration → General → Set timeout to 30 seconds
6. Configuration → Environment variables → Add all variables from .env
7. Configuration → Function URL → Create (Auth: NONE, CORS: enabled)
8. Save the Function URL

**Cost:** Free (Lambda free tier)

### 6. Test the Setup

```bash
# Replace YOUR_FUNCTION_URL with your actual URL

# Health check
curl https://YOUR_FUNCTION_URL/health

# Get items
curl https://YOUR_FUNCTION_URL/items

# Test purchase (use your actual password)
curl -X POST https://YOUR_FUNCTION_URL/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "password": "your_password",
    "itemId": 0,
    "purchaserName": "Test User"
  }'
```

### 7. Build Frontend (Next Phase)

Now that backend is ready, build the UI:
- Display items from GET /items
- Form for password + name
- Call POST /purchase
- Show real-time purchase status

### 8. Share with Guests

Once frontend is live:
- Share registry URL
- Share password (email, invitation, etc.)
- Monitor CloudWatch logs for activity

### 9. View Purchaser Names (Admin)

```bash
# View who purchased what (decrypts names)
cd relayer-lambda
ADMIN_PRIVATE_KEY=0xYOUR_MAIN_WALLET_KEY \
CONTRACT_ADDRESS=0xYOUR_CONTRACT \
node admin-view.js
```

## File Structure

```
mwleeds.github.io/
├── ARCHITECTURE.md          ← Read this for full system design
├── QUICKSTART.md           ← This file
│
├── contracts/
│   ├── WeddingRegistry.sol      ← Smart contract
│   ├── WeddingRegistry.test.sol ← Tests
│   ├── deploy.sh               ← Deployment script
│   ├── interact-example.js     ← Manage items
│   └── README.md               ← Contract docs
│
├── relayer-lambda/
│   ├── index.js                ← Lambda function
│   ├── package.json            ← Dependencies
│   ├── get-public-key.js       ← Extract public key
│   ├── admin-view.js           ← Decrypt purchaser names
│   ├── test.js                 ← Local testing
│   ├── template.yaml           ← AWS SAM template
│   ├── DEPLOYMENT.md           ← Detailed deploy guide
│   └── README.md               ← Lambda docs
│
└── (frontend - to be built)
```

## Key Concepts

### Password Protection

- **Purpose:** Prevent random people from claiming items
- **Location:** Validated by Lambda relayer
- **Shared with:** Wedding guests (email, invitation)
- **Security:** Prevents casual abuse, not cryptographically secure

### Encryption

- **What's encrypted:** Purchaser names
- **Encrypted by:** Lambda relayer (before sending to blockchain)
- **Encrypted with:** Your main wallet's public key (ECIES)
- **Decrypted by:** Only you, using your private key
- **Result:** Public blockchain, but names are private

### Gas Payment

- **Who pays:** Your relayer wallet
- **Cost per purchase:** ~$0.01
- **Guest experience:** Zero crypto knowledge needed
- **Risk:** Limited to relayer wallet balance (~$20 max)

### Roles

| Wallet | Purpose | Keys Where | Can Do |
|--------|---------|------------|--------|
| Main Wallet | Your personal wallet | Hardware wallet / secure | Deploy contract, manage items, decrypt names |
| Relayer Wallet | Gas payment only | Lambda environment vars | Pay gas, nothing else |

## Common Tasks

### Add More Items

```javascript
// Using contracts/interact-example.js
await contract.addItem(
  "New Item",
  "Description",
  "https://url",
  "https://image.jpg"
);
```

### Reset a Purchased Item

```javascript
// If someone marked wrong item
await contract.resetItem(itemId);
```

### Change Password

```bash
# Update Lambda environment variable
aws lambda update-function-configuration \
  --function-name wedding-registry-relayer \
  --environment Variables={...,REGISTRY_PASSWORD=new_password}
```

### Monitor Costs

- **Lambda logs:** CloudWatch Logs
- **Gas spending:** Check relayer wallet on [BaseScan](https://basescan.org)
- **Expected total:** < $5 for entire wedding

## Security Checklist

- [ ] Relayer private key only in Lambda (never in git)
- [ ] Main wallet backed up securely
- [ ] Relayer wallet funded with minimal amount
- [ ] Password shared only with guests
- [ ] CloudWatch logging enabled
- [ ] Monitor relayer wallet balance

## Troubleshooting

**"Invalid password" error**
- Check REGISTRY_PASSWORD matches in Lambda and request

**"Item already purchased"**
- Someone else claimed it first (race condition)
- Frontend should handle gracefully

**"Transaction failed"**
- Check relayer wallet has ETH
- Check Base L2 RPC is responding
- View CloudWatch logs

**Items not showing**
- Verify contract has items (check BaseScan)
- Test GET /items endpoint directly
- Check Lambda logs

**Decryption fails**
- Verify using MAIN wallet private key (not relayer)
- Check OWNER_PUBLIC_KEY matches your main wallet

## Next Steps

1. ✅ Follow this quickstart to deploy
2. ✅ Read ARCHITECTURE.md for deep dive
3. ✅ Build frontend UI
4. ✅ Test with friends/family
5. ✅ Share with wedding guests
6. ✅ Monitor and enjoy!

## Cost Summary

| Item | Amount |
|------|--------|
| Deploy contract | $0.50 |
| Add 50 items | $1.00 |
| 50 guest purchases | $0.50 |
| AWS Lambda | $0.00 (free tier) |
| **Total** | **~$2.00** |

## Questions?

- **Full architecture:** See ARCHITECTURE.md
- **Contract details:** See contracts/README.md
- **Lambda deployment:** See relayer-lambda/DEPLOYMENT.md
- **Base L2 docs:** https://docs.base.org
- **ethers.js docs:** https://docs.ethers.org

## Support

If you get stuck:
1. Check CloudWatch Logs for errors
2. Verify all environment variables set correctly
3. Test contract directly on BaseScan
4. Check relayer wallet balance

Happy wedding registry building! 🎊
