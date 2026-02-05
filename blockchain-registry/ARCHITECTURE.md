# Wedding Registry Architecture

A decentralized wedding gift registry with password protection and encrypted purchaser information.

## Overview

This system allows guests to claim wedding gifts without needing a crypto wallet or paying gas fees. Purchase status is public (to prevent duplicates), but purchaser names are encrypted and only visible to you.

## System Components

```
┌─────────────────┐
│  Guest Browser  │
│   (Frontend)    │
└────────┬────────┘
         │ HTTPS
         │ POST /purchase
         │ {password, itemId, name}
         │
         ▼
┌─────────────────┐
│  AWS Lambda     │
│   (Relayer)     │
│                 │
│ 1. Validate pwd │
│ 2. Encrypt name │
│ 3. Submit tx    │
└────────┬────────┘
         │ RPC
         │ markAsPurchased(itemId, encryptedName)
         │
         ▼
┌─────────────────┐
│   Base L2       │
│ Smart Contract  │
│                 │
│ Store items &   │
│ purchase status │
└─────────────────┘
```

## Component Responsibilities

### 1. Smart Contract (Base L2)

**Purpose:** On-chain data storage and state management

**What it does:**
- Stores registry items (name, description, URL, image)
- Tracks purchase status (public - anyone can read)
- Stores encrypted purchaser names (only owner can decrypt)
- Provides owner-only functions to manage registry

**What it does NOT do:**
- No password validation (relayer handles this)
- No encryption (relayer handles this)
- No payment handling (relayer pays gas)

**Key Functions:**
```solidity
// Owner only
addItem(name, description, url, imageUrl)
updateItem(itemId, ...)
removeItem(itemId)
resetItem(itemId)  // Mark as unpurchased

// Anyone can call (via relayer)
markAsPurchased(itemId, encryptedPurchaserName)

// Read-only (anyone)
getAllItems()
getAvailableItems()
getPurchasedItems()
```

**Data Structure:**
```solidity
struct RegistryItem {
    string name;                    // "Coffee Maker"
    string description;             // "12-cup programmable"
    string url;                     // Product link
    string imageUrl;                // Image URL
    bool isPurchased;               // PUBLIC: visible to everyone
    string encryptedPurchaserName;  // ENCRYPTED: only owner can decrypt
    uint256 purchasedAt;            // Timestamp
}
```

### 2. Relayer Backend (AWS Lambda)

**Purpose:** Gasless transaction relay with access control

**What it does:**
- Validates password from guest
- Encrypts purchaser name with owner's public key (ECIES)
- Submits transaction to Base L2 (pays gas from relayer wallet)
- Rate limiting / abuse prevention

**What it does NOT do:**
- No decryption (only owner can decrypt)
- No direct data storage (everything stored on-chain)

**API Endpoints:**

#### `POST /purchase`
Mark an item as purchased

**Request:**
```json
{
  "password": "your_wedding_password",
  "itemId": 0,
  "purchaserName": "John Smith"
}
```

**Process:**
1. Validate password matches configured password
2. Check item exists and is not purchased
3. Encrypt `purchaserName` with owner's public key
4. Submit transaction: `contract.markAsPurchased(itemId, encryptedName)`
5. Wait for confirmation
6. Return success

**Response:**
```json
{
  "success": true,
  "itemId": 0,
  "transactionHash": "0x...",
  "message": "Item marked as purchased successfully"
}
```

**Errors:**
- `401 Unauthorized` - Invalid password
- `400 Bad Request` - Missing fields
- `404 Not Found` - Item doesn't exist
- `409 Conflict` - Item already purchased
- `500 Internal Server Error` - Transaction failed

#### `GET /items`
Fetch all registry items (reads directly from blockchain)

**Response:**
```json
{
  "items": [
    {
      "id": 0,
      "name": "Coffee Maker",
      "description": "12-cup programmable",
      "url": "https://...",
      "imageUrl": "https://...",
      "isPurchased": false,
      "purchasedAt": null
    }
  ],
  "count": 1
}
```

Note: Encrypted purchaser names are NOT returned (guests don't need to see them).

#### `GET /health`
Health check

**Response:**
```json
{
  "status": "healthy",
  "relayerAddress": "0x...",
  "contractAddress": "0x..."
}
```

**Environment Variables:**
```bash
RELAYER_PRIVATE_KEY=0x...     # Wallet that pays gas
CONTRACT_ADDRESS=0x...         # Deployed contract
OWNER_PUBLIC_KEY=0x...         # For encrypting names
BASE_RPC_URL=https://mainnet.base.org
REGISTRY_PASSWORD=your_password  # Shared with guests
```

### 3. Frontend (Static Website)

**Purpose:** User interface for guests and owner

**What it does:**
- Displays registry items
- Shows real-time purchase status (reads from blockchain)
- Collects password + purchaser name from guest
- Calls relayer API to mark items purchased
- Owner admin view to decrypt and see purchaser names

**Guest Flow:**
1. Browse registry (read directly from contract or via relayer)
2. Click "Mark as Purchased" on available item
3. Enter password (shared by you)
4. Enter their name
5. Submit → relayer validates and submits transaction
6. Item immediately shows as "Purchased" for all guests

**Owner Admin Flow:**
1. Connect wallet or enter private key
2. Sign message to prove ownership
3. Fetch purchased items from contract
4. Decrypt purchaser names client-side using private key
5. Display "Item X purchased by Person Y on Date Z"

**Technologies:**
- HTML/CSS/JavaScript
- ethers.js (for blockchain reads and admin decryption)
- @metamask/eth-sig-util (for ECIES decryption)

### 4. Owner Wallet

**Purpose:** Your main wallet for managing registry and decrypting data

**What it controls:**
- Contract ownership (add/edit/remove items)
- Decryption of purchaser names (using private key)
- Can transfer ownership, reset items, etc.

**Security:**
- Use hardware wallet or secure wallet
- Private key NEVER exposed to relayer or contract
- Only used for:
  - Deploying contract
  - Managing registry items
  - Decrypting purchaser names (offline/client-side)

### 5. Relayer Wallet

**Purpose:** Dedicated wallet that pays gas fees

**What it controls:**
- Nothing! It only submits transactions
- Cannot manage registry items
- Cannot decrypt purchaser names

**Security:**
- Use dedicated wallet with minimal funds ($10-20)
- Private key stored in Lambda environment variables (encrypted by AWS)
- Monitor balance regularly
- If compromised: worst case is draining the small balance

## Data Flow

### Guest Marks Item as Purchased

```
1. Guest enters password + name in frontend
   ↓
2. Frontend calls POST /purchase
   {password: "wedding2026", itemId: 0, purchaserName: "Jane Doe"}
   ↓
3. Relayer validates password
   ↓
4. Relayer encrypts "Jane Doe" with owner's public key
   encryptedName = encrypt(ownerPublicKey, "Jane Doe")
   ↓
5. Relayer submits transaction to Base L2
   contract.markAsPurchased(0, encryptedName)
   Using relayer wallet (pays gas: ~$0.01)
   ↓
6. Contract stores:
   items[0].isPurchased = true
   items[0].encryptedPurchaserName = encryptedName
   items[0].purchasedAt = block.timestamp
   ↓
7. Transaction confirms on blockchain
   ↓
8. Relayer returns success to frontend
   ↓
9. Frontend refreshes, shows item as "Purchased"
```

### Owner Views Purchaser Names

```
1. Owner opens admin view in browser
   ↓
2. Enter main wallet private key (or sign with wallet)
   ↓
3. Frontend fetches purchased items from contract
   items = contract.getPurchasedItems()
   ↓
4. For each item, decrypt purchaser name CLIENT-SIDE
   name = decrypt(ownerPrivateKey, item.encryptedPurchaserName)
   ↓
5. Display: "Item X purchased by [name] on [date]"
```

## Security Model

### Password Protection

**Purpose:** Prevent random people from marking items purchased

**How it works:**
- You share password with wedding guests (email, invitation, word of mouth)
- Relayer validates password before submitting transactions
- Without password, cannot mark items purchased

**Strength:**
- Prevents casual abuse
- Not cryptographically secure (shared with many people)
- Good enough for wedding registry use case

**If password leaks:**
- Someone could mark all items as purchased
- You can reset items using owner wallet
- Monitor activity and reset if abused

### Encryption

**Purpose:** Only you can see who purchased what

**How it works:**
- Relayer encrypts purchaser names with your public key (ECIES)
- Encryption happens BEFORE data goes on-chain
- Only your private key can decrypt

**Security properties:**
- Relayer cannot decrypt (only has public key)
- Contract cannot decrypt (doesn't have private key)
- Other guests cannot decrypt
- Even if blockchain is public, names are encrypted

**Trust assumptions:**
- You trust the relayer to actually encrypt (you run it)
- You trust the relayer not to log unencrypted names (you run it)

### Gas Payment

**Purpose:** You pay all gas fees, guests don't need crypto

**How it works:**
- Relayer wallet holds ETH on Base L2
- Every transaction uses relayer wallet to pay gas
- Guests never touch blockchain directly

**Security:**
- Relayer wallet only needs $10-20
- If compromised, attacker can only drain that balance
- Cannot steal contract ownership
- Cannot decrypt purchaser names

### Access Control

**Contract level:**
- Only owner can: add/edit/remove/reset items
- Anyone can: read items (via blockchain or relayer)
- Only relayer can: mark items purchased (in practice)

**Relayer level:**
- Only requests with correct password can mark items purchased
- Rate limiting prevents abuse
- No authentication for reads

**Admin level:**
- Only owner with private key can decrypt purchaser names
- Frontend admin view requires wallet signature

## Cost Breakdown

### One-Time Costs

| Item | Cost |
|------|------|
| Deploy smart contract | ~$0.50 |
| Add 50 registry items | ~$1.00 |
| **Total one-time** | **~$1.50** |

### Per-Transaction Costs

| Item | Cost |
|------|------|
| Mark item purchased | ~$0.01 |
| 50 guests purchase | ~$0.50 |
| **Total for wedding** | **~$0.50** |

### Ongoing Costs

| Service | Cost |
|---------|------|
| AWS Lambda | Free tier (likely $0) |
| Base L2 RPC | Free |
| Contract storage | Paid upfront |
| **Total monthly** | **~$0** |

### Total Estimated Cost: **~$2 for entire wedding**

## Privacy Model

### Public Information

- Registry items (name, description, URL, image)
- Purchase status (available vs. purchased)
- Timestamp of purchase
- Contract owner address
- Transaction hashes

Anyone can see this by reading the blockchain directly.

### Private Information

- Purchaser names (encrypted, only owner can decrypt)
- Password (never stored on-chain, only in relayer)

### Semi-Private Information

- Relayer wallet address (public on-chain, but not linked to you unless shared)
- Contract address (public, but not linked to you unless shared)

## Failure Modes & Mitigations

### Relayer Goes Down

**Problem:** Guests can't mark items purchased

**Mitigation:**
- Deploy multiple relayers (different regions)
- Or: Deploy new Lambda function with same contract
- Or: Temporarily allow owner to mark items purchased on behalf of guests

### Relayer Wallet Runs Out of ETH

**Problem:** Transactions fail

**Mitigation:**
- Monitor wallet balance (CloudWatch alarm)
- Top up when low
- Set up automatic funding from main wallet (advanced)

### Password Leaks Publicly

**Problem:** Anyone can mark items purchased

**Mitigation:**
- Change password (redeploy relayer with new password)
- Reset abused items using owner wallet
- Enable rate limiting on relayer

### Someone Marks All Items Purchased

**Problem:** Registry appears fully claimed

**Mitigation:**
- Owner can call `resetItem(itemId)` to mark as available
- Check encrypted names to see if abuse (empty or garbage)
- Ban IP addresses in Lambda/API Gateway

### Contract Bug Discovered

**Problem:** Cannot fix deployed contract

**Mitigation:**
- Test thoroughly on Base Sepolia testnet first
- Keep contract simple (less attack surface)
- Owner can deploy new contract and migrate data if needed

### Owner Loses Private Key

**Problem:** Cannot decrypt purchaser names

**Mitigation:**
- Back up private key securely (multiple locations)
- Use hardware wallet + seed phrase backup
- Consider multi-sig or recovery mechanism (advanced)

### Relayer Private Key Compromised

**Problem:** Attacker can drain relayer wallet

**Impact:** Limited to ~$20 in relayer wallet

**Mitigation:**
- Generate new relayer wallet
- Update Lambda environment variables
- Fund new wallet
- Old wallet: drain remaining ETH

## Deployment Checklist

- [ ] Deploy smart contract to Base L2
- [ ] Verify contract on BaseScan (optional but recommended)
- [ ] Add registry items to contract
- [ ] Create relayer wallet, fund with ETH
- [ ] Deploy Lambda function with environment variables
- [ ] Test Lambda endpoints (health, items, purchase)
- [ ] Choose and set registry password
- [ ] Build frontend UI
- [ ] Test full flow end-to-end
- [ ] Set up monitoring (CloudWatch, wallet balance)
- [ ] Share registry URL and password with guests

## Future Enhancements

### Possible Improvements

1. **Email notifications:** Lambda sends you email when item purchased
2. **Guest comments:** Allow guests to add message with purchase
3. **Contribution amounts:** Track if item has target price
4. **Image uploads:** Let owner upload images to IPFS
5. **Multi-signature:** Require both partners to approve changes
6. **Gift pooling:** Multiple guests contribute to expensive items
7. **Thank you tracking:** Mark when you've thanked each guest

### Advanced Security

1. **Hardware Security Module:** Store relayer key in AWS KMS
2. **Rate limiting:** Implement per-IP or per-session limits
3. **CAPTCHA:** Add to purchase flow
4. **Signed requests:** Require cryptographic signatures from frontend
5. **Time-lock:** Disable purchases after wedding date

## Testing Strategy

### Contract Testing

```bash
cd contracts
forge test -vv
```

Tests all contract functions, access control, and edge cases.

### Relayer Testing

```bash
cd relayer-lambda
npm test
```

Tests password validation, encryption, transaction submission.

### Integration Testing

1. Deploy contract to Base Sepolia (testnet)
2. Deploy Lambda to AWS (test environment)
3. Build minimal frontend
4. Test full guest flow
5. Test admin decryption flow
6. Test error cases (wrong password, already purchased, etc.)

### Production Testing

1. Test on Base mainnet with real ETH (small amounts)
2. Monitor CloudWatch logs
3. Check BaseScan for transaction confirmations
4. Verify encryption/decryption works
5. Share with trusted friend first

## Questions & Answers

**Q: Can guests see who purchased each item?**
A: No. They can only see if an item is purchased or available. Names are encrypted.

**Q: What if two guests try to purchase the same item simultaneously?**
A: Second transaction will fail with "already purchased" error. Frontend shows this gracefully.

**Q: Can I change the password after deployment?**
A: Yes, update Lambda environment variable `REGISTRY_PASSWORD` and redeploy.

**Q: What if I want to add items after the wedding starts?**
A: Use your owner wallet to call `addItem()` anytime.

**Q: Can I remove items?**
A: Yes, use `removeItem(itemId)` from owner wallet.

**Q: What if someone marks an item by mistake?**
A: Use `resetItem(itemId)` to mark as available again.

**Q: Do I need to verify the contract on BaseScan?**
A: Not required, but recommended for transparency.

**Q: Can I use this for other events?**
A: Yes! Works for any gift registry (baby shower, housewarming, etc.)

**Q: What if Base L2 shuts down?**
A: Unlikely, but your data is on blockchain and can be read from any archive node.

**Q: Can I export the purchaser list?**
A: Yes, use the admin-view.js script to decrypt and export to CSV/JSON.

## Support & Resources

**Smart Contract:**
- Solidity docs: https://docs.soliditylang.org
- Base docs: https://docs.base.org
- BaseScan: https://basescan.org

**AWS Lambda:**
- Lambda docs: https://docs.aws.amazon.com/lambda
- CloudWatch logs: https://console.aws.amazon.com/cloudwatch

**Blockchain Interaction:**
- ethers.js: https://docs.ethers.org
- Base RPC: https://mainnet.base.org

**Encryption:**
- eth-sig-util: https://github.com/MetaMask/eth-sig-util
- ECIES: Elliptic Curve Integrated Encryption Scheme

## License

This architecture and code is provided as-is for personal use. Feel free to adapt for your own wedding registry!
