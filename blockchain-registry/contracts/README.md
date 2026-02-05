# Wedding Registry Smart Contract

A decentralized wedding registry built on Base L2 (Ethereum Layer 2).

## Overview

This smart contract allows you to:
- Manage a wedding gift registry on-chain
- Guests can mark items as purchased (via a gasless relayer)
- Purchase status is public (prevents duplicate gifts)
- Purchaser names are encrypted and only visible to you

## Contract: WeddingRegistry.sol

### Key Features

**For Owner (You):**
- `addItem()` - Add new registry items
- `updateItem()` - Edit existing items
- `removeItem()` - Remove items from registry
- `resetItem()` - Mark purchased item as available again
- `transferOwnership()` - Transfer contract to new owner

**For Guests (via Relayer):**
- `markAsPurchased()` - Mark an item as purchased with encrypted name

**View Functions:**
- `getAllItems()` - Get all registry items
- `getAvailableItems()` - Get only unpurchased items
- `getPurchasedItems()` - Get purchased items (with encrypted names)
- `getItem(itemId)` - Get specific item by ID
- `getItemCount()` - Total number of items

### Data Structure

Each registry item contains:
```solidity
struct RegistryItem {
    string name;                      // "Coffee Maker"
    string description;               // "12-cup programmable"
    string url;                       // Product link
    string imageUrl;                  // Image URL
    bool isPurchased;                 // PUBLIC: true/false
    string encryptedPurchaserName;    // ENCRYPTED: only you can read
    uint256 purchasedAt;              // Timestamp
}
```

## Deployment

### Option 1: Using Remix IDE (Easiest)

1. Go to [remix.ethereum.org](https://remix.ethereum.org)
2. Create new file `WeddingRegistry.sol` and paste the contract code
3. Compile with Solidity 0.8.20+
4. Connect MetaMask to Base network
5. Deploy the contract
6. Save the deployed contract address

### Option 2: Using Foundry

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Initialize project
forge init wedding-registry
cd wedding-registry
cp ../WeddingRegistry.sol src/

# Create .env file with your private key
echo "PRIVATE_KEY=your_private_key_here" > .env
echo "BASE_RPC_URL=https://mainnet.base.org" >> .env

# Deploy to Base
forge create --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  src/WeddingRegistry.sol:WeddingRegistry \
  --verify
```

### Option 3: Using Hardhat

```bash
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Initialize Hardhat
npx hardhat init

# Copy contract to contracts/
# Create deployment script in scripts/deploy.js
npx hardhat run scripts/deploy.js --network base
```

## Base Network Configuration

**Base Mainnet:**
- RPC URL: `https://mainnet.base.org`
- Chain ID: 8453
- Block Explorer: https://basescan.org
- Native Token: ETH

**Base Sepolia Testnet (for testing):**
- RPC URL: `https://sepolia.base.org`
- Chain ID: 84532
- Block Explorer: https://sepolia.basescan.org
- Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

## Adding to MetaMask

1. Open MetaMask
2. Click network dropdown → "Add Network"
3. Enter Base network details above
4. Fund wallet with ETH (for deployment and gas)

## Encryption Details

Purchaser names are encrypted client-side using your Ethereum public key before being sent to the contract.

**Encryption:** ECIES (Elliptic Curve Integrated Encryption Scheme)
- Uses your Ethereum public key (derived from your wallet address)
- Only your private key can decrypt
- Implemented in the relayer backend

## Estimated Costs (Base L2)

- Deploy contract: ~$0.50
- Add item: ~$0.02 each
- Mark as purchased: ~$0.01 each
- **Total for 50 items with all purchases: ~$2.00**

Much cheaper than Ethereum mainnet!

## Next Steps

After deployment:
1. Deploy the contract to Base
2. Add your registry items using `addItem()`
3. Build the relayer backend (Cloudflare Worker)
4. Build the frontend UI
5. Test with Base Sepolia testnet first

## Security Notes

- Contract is simple and focused on the specific use case
- Owner-only functions protected by `onlyOwner` modifier
- Items can't be re-purchased once marked as purchased
- Owner can reset items if needed (for mistakes)
- No funds are held in the contract (it's just a database)

## Support

For issues with the smart contract or deployment, check:
- [Base Documentation](https://docs.base.org)
- [Solidity Docs](https://docs.soliditylang.org)
