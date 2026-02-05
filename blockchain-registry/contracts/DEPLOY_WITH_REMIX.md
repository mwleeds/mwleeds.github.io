# Deploy WeddingRegistry Contract Using Remix + MetaMask

## Prerequisites

- [ ] MetaMask installed
- [ ] Base network added to MetaMask (see BASE_NETWORK_CONFIG.md)
- [ ] At least $0.50 worth of ETH on Base L2

## Step-by-Step Deployment

### 1. Open Remix IDE

Go to: **https://remix.ethereum.org**

### 2. Create the Contract File

1. In the left sidebar, click the "File Explorer" icon (📁)
2. Click the "+" icon to create a new file
3. Name it: `WeddingRegistry.sol`
4. Copy the entire contract code from `contracts/WeddingRegistry.sol`
5. Paste it into the Remix editor

### 3. Compile the Contract

1. Click the "Solidity Compiler" icon in the left sidebar (looks like "S" with lines)
2. Select compiler version: **0.8.20** or higher (0.8.21, 0.8.22, etc.)
3. Click the blue "Compile WeddingRegistry.sol" button
4. Wait for green checkmark ✅ (means compilation successful)

**If you see warnings:** That's OK, you can proceed as long as there are no errors (red).

### 4. Connect MetaMask to Base

1. Open MetaMask extension
2. Click the network dropdown (top left)
3. Select **"Base Mainnet"** (or "Base" depending on how you named it)
4. Verify you see your ETH balance on Base

### 5. Deploy the Contract

1. In Remix, click the "Deploy & Run Transactions" icon (looks like Ethereum logo with arrow)
2. Under "Environment" dropdown, select: **"Injected Provider - MetaMask"**
3. MetaMask should pop up asking to connect - click "Connect"
4. Verify the account shown in Remix matches your MetaMask account
5. Verify "Chain ID: 8453" appears (this is Base)
6. Under "Contract" dropdown, ensure **"WeddingRegistry"** is selected
7. Click the orange **"Deploy"** button
8. MetaMask will pop up asking you to confirm the transaction
   - Review the gas fee (should be ~$0.50 or less)
   - Click "Confirm"
9. Wait for the transaction to complete (10-30 seconds)

### 6. Verify Deployment

Once deployed, you'll see:
- A green checkmark in the Remix console at the bottom
- A new contract instance under "Deployed Contracts" section
- You can expand it to see all the contract functions

### 7. Save Your Contract Address

**IMPORTANT:** Copy and save the contract address!

1. Under "Deployed Contracts", you'll see something like:
   `WEDDINGREGISTRY AT 0x1234...5678 (CHAIN: 8453)`
2. Click the copy icon next to the address
3. Save this address - you'll need it for:
   - Lambda relayer configuration (CONTRACT_ADDRESS)
   - Frontend integration
   - Adding items to the registry

**Save it somewhere safe right now!**

```
Contract Address: 0x_______________________________________________
Deployed On: Base Mainnet (Chain ID: 8453)
Date: _______________
Transaction Hash: 0x___________________________________________ (optional)
```

### 8. Verify on BaseScan (Optional but Recommended)

1. Go to: https://basescan.org
2. Paste your contract address in the search bar
3. You should see:
   - Contract creation transaction
   - Balance (0 ETH - that's normal)
   - Contract code (will show as bytecode unless verified)

**Optional:** Verify the source code on BaseScan (makes it public and transparent)
- In BaseScan, click "Contract" tab
- Click "Verify and Publish"
- Follow the wizard (select compiler version 0.8.20, paste code, etc.)

### 9. Test Basic Functions in Remix

Before leaving Remix, let's test the contract works:

1. In the "Deployed Contracts" section, expand your contract
2. You should see all the functions (orange = write, blue = read)

**Test reading:**
- Click the blue "getItemCount" button
- Should return: `uint256: 0` (no items yet)

**Test writing (add an item):**
- Find the orange "addItem" function
- Click the dropdown arrow to expand it
- Fill in the fields:
  ```
  name: "Test Item"
  description: "Testing deployment"
  url: "https://example.com"
  imageUrl: "https://example.com/test.jpg"
  ```
- Click "transact"
- Confirm in MetaMask (~$0.02 gas)
- Wait for confirmation

**Verify it worked:**
- Click "getItemCount" again
- Should now return: `uint256: 1` ✅
- Click "getAllItems" to see your test item

### 10. Save Your Deployment Info

Create a file or note with:
```
=== Wedding Registry Contract Deployment ===

Contract Address: 0x...
Network: Base Mainnet (8453)
Deployed From: 0x... (your wallet address)
Date: [today's date]
BaseScan URL: https://basescan.org/address/0x...

Status: ✅ Deployed and tested
```

## Troubleshooting

### MetaMask doesn't connect
- Refresh Remix page
- Make sure MetaMask is unlocked
- Try "WalletConnect" as alternative to "Injected Provider"

### Wrong network shown
- Switch MetaMask to Base network
- Refresh Remix page
- Reconnect

### "Gas estimation failed" error
- Make sure you have enough ETH on Base (~$1 to be safe)
- Try increasing gas limit manually in MetaMask

### Can't find deployed contract
- Check BaseScan with your wallet address
- Look under "Internal Transactions" tab
- Contract address should be listed there

### Compilation errors
- Make sure you copied the complete contract code
- Check you're using Solidity 0.8.20 or higher
- Look for any red error messages and fix them

## Next Steps

After successful deployment:

1. ✅ Save contract address somewhere safe
2. ✅ Add your actual registry items (or wait for frontend)
3. ✅ Configure Lambda relayer with contract address
4. ✅ Test the full flow

## Cost Breakdown

- Deploy contract: ~$0.50
- Add test item: ~$0.02
- Each additional item: ~$0.02

Total for deployment + testing: ~$0.50-1.00

## You're Done! 🎉

Your wedding registry smart contract is now live on Base L2!

Next, you'll:
1. Deploy the Lambda relayer (using this contract address)
2. Build the frontend
3. Add your real registry items
4. Share with guests
