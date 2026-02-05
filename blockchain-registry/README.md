# Blockchain Wedding Registry

A decentralized, gasless wedding gift registry built on Base L2.

## Overview

This directory contains all the code for the blockchain-powered wedding registry:
- Smart contract on Base L2
- AWS Lambda relayer backend
- Documentation and deployment guides

## Quick Links

- **[QUICKSTART.md](./QUICKSTART.md)** - Get up and running fast
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete system design and architecture

## Directory Structure

```
blockchain-registry/
├── contracts/              # Smart contract
│   ├── WeddingRegistry.sol        # Main contract
│   ├── WeddingRegistry.test.sol   # Tests
│   ├── DEPLOY_WITH_REMIX.md       # Deployment guide
│   └── ...
│
├── relayer-lambda/        # AWS Lambda backend
│   ├── index.js                   # Lambda function
│   ├── admin-view.js              # Decrypt purchaser names
│   ├── DEPLOYMENT.md              # Lambda deployment guide
│   └── ...
│
├── ARCHITECTURE.md        # System architecture
└── QUICKSTART.md         # Setup guide
```

## What Does This Do?

Allows wedding guests to:
- Browse your gift registry online
- Mark items as "purchased" without needing a crypto wallet
- Keep their identity private (names encrypted on-chain)

**You benefit:**
- No platform fees (Amazon, Target, etc.)
- Complete privacy control
- ~$2 total cost for the entire wedding
- Decentralized and transparent

## How It Works

```
Guest → Frontend → Lambda Relayer → Base L2 Contract
                    (validates pwd,     (stores data)
                     encrypts name,
                     pays gas)
```

1. **Smart Contract** (Base L2): Stores registry items and purchase status on-chain
2. **Lambda Relayer**: Validates password, encrypts names, pays gas fees
3. **Frontend** (to be built): User interface for guests

## Getting Started

### 1. Deploy Smart Contract

```bash
cd contracts
# Follow DEPLOY_WITH_REMIX.md to deploy via MetaMask
```

Cost: ~$0.50

### 2. Deploy Lambda Relayer

```bash
cd relayer-lambda
# Follow DEPLOYMENT.md to deploy to AWS
```

Cost: Free (Lambda free tier)

### 3. Build Frontend

Connect your frontend to:
- Lambda API for purchases
- Contract for reading items

### 4. Share with Guests

Give them:
- Registry URL
- Password (to mark items purchased)

## Key Features

- **Password Protected**: Only guests with password can mark items purchased
- **Encrypted Names**: Purchaser names encrypted with your public key
- **Gasless**: Guests don't need crypto wallets or pay any fees
- **Public Status**: Everyone can see if items are taken (prevents duplicates)
- **Stable Indices**: Item IDs never change (safe to reference)

## Cost Breakdown

| Item | Cost |
|------|------|
| Deploy contract | $0.50 |
| Add 50 items | $1.00 |
| 50 purchases | $0.50 |
| AWS Lambda | $0.00 |
| **Total** | **~$2.00** |

## Tech Stack

- **Blockchain**: Base L2 (Ethereum Layer 2)
- **Smart Contract**: Solidity 0.8.20
- **Backend**: AWS Lambda (Node.js 18)
- **Encryption**: ECIES (Elliptic Curve Integrated Encryption Scheme)
- **Libraries**: ethers.js, @metamask/eth-sig-util

## Security

- Password prevents random people from marking items
- Names encrypted on-chain (only you can decrypt)
- Relayer wallet holds minimal funds (~$20 max)
- All code auditable and transparent

## Documentation

- **contracts/README.md** - Smart contract details
- **relayer-lambda/README.md** - Lambda backend details
- **ARCHITECTURE.md** - Full system architecture
- **QUICKSTART.md** - Step-by-step setup guide

## Support

For questions or issues:
- Check the documentation in this directory
- Review CloudWatch logs (for Lambda issues)
- Check BaseScan (for contract issues)
- Base docs: https://docs.base.org

## License

Personal use - feel free to adapt for your own wedding!
