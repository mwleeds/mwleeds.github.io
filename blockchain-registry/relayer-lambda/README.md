# Wedding Registry Relayer - AWS Lambda

A gasless transaction relayer for the Wedding Registry smart contract on Base L2.

## Overview

This Lambda function allows guests to mark registry items as purchased without needing a crypto wallet or paying gas fees. You pay all gas fees from your relayer wallet.

## Architecture

```
Guest Browser → API Gateway → Lambda → Base L2 Smart Contract
```

**Flow:**
1. Guest clicks "Mark as Purchased" and enters their name
2. Frontend calls your API Gateway endpoint
3. Lambda encrypts the name with your public key
4. Lambda submits transaction to Base L2 (using relayer wallet)
5. Guest sees immediate confirmation

## Prerequisites

- AWS Account
- AWS CLI configured (`aws configure`)
- Node.js 18+ installed
- Deployed WeddingRegistry contract on Base L2
- Relayer wallet with some ETH on Base L2

## Setup

### 1. Install Dependencies

```bash
cd relayer-lambda
npm install
```

### 2. Get Your Ethereum Public Key

Your public key is derived from your main wallet address (not the relayer wallet - this is the wallet YOU will use to decrypt purchaser names later).

```bash
# Option A: Using cast (Foundry)
cast wallet address --private-key YOUR_MAIN_WALLET_PRIVATE_KEY

# Option B: Using Node.js
node -e "
const ethers = require('ethers');
const wallet = new ethers.Wallet('YOUR_MAIN_WALLET_PRIVATE_KEY');
console.log('Public Key:', wallet.publicKey);
"
```

Save this public key - you'll need it for the OWNER_PUBLIC_KEY environment variable.

### 3. Create Environment Variables

Create a `.env` file (for local testing):

```bash
RELAYER_PRIVATE_KEY=0x...your_relayer_wallet_private_key...
CONTRACT_ADDRESS=0x...deployed_contract_address...
OWNER_PUBLIC_KEY=0x...your_public_key_for_encryption...
BASE_RPC_URL=https://mainnet.base.org
```

**IMPORTANT:** Never commit `.env` to git!

## Deployment Options

### Option 1: AWS Console (Easiest)

1. **Package the function:**
   ```bash
   npm install
   npm run package
   # Creates function.zip
   ```

2. **Create Lambda function:**
   - Go to AWS Lambda Console
   - Click "Create function"
   - Name: `wedding-registry-relayer`
   - Runtime: Node.js 18.x
   - Click "Create function"

3. **Upload code:**
   - Under "Code source", click "Upload from" → ".zip file"
   - Upload `function.zip`

4. **Set environment variables:**
   - Go to "Configuration" → "Environment variables"
   - Add:
     - `RELAYER_PRIVATE_KEY`: Your relayer wallet private key
     - `CONTRACT_ADDRESS`: Your deployed contract address
     - `OWNER_PUBLIC_KEY`: Your public key for encryption
     - `BASE_RPC_URL`: `https://mainnet.base.org`

5. **Increase timeout:**
   - Go to "Configuration" → "General configuration"
   - Set timeout to 30 seconds (blockchain transactions can be slow)

6. **Create API Gateway:**
   - Go to "Configuration" → "Function URL"
   - Click "Create function URL"
   - Auth type: NONE (we'll add rate limiting later)
   - Click "Save"
   - Copy the Function URL (e.g., `https://abc123.lambda-url.us-east-1.on.aws/`)

7. **Test the endpoint:**
   ```bash
   # Health check
   curl https://YOUR_FUNCTION_URL/health

   # Get items
   curl https://YOUR_FUNCTION_URL/items
   ```

### Option 2: AWS CLI

```bash
# Package
npm install
npm run package

# Create function
aws lambda create-function \
  --function-name wedding-registry-relayer \
  --runtime nodejs18.x \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --timeout 30 \
  --environment Variables="{
    RELAYER_PRIVATE_KEY=0x...,
    CONTRACT_ADDRESS=0x...,
    OWNER_PUBLIC_KEY=0x...,
    BASE_RPC_URL=https://mainnet.base.org
  }"

# Create function URL
aws lambda create-function-url-config \
  --function-name wedding-registry-relayer \
  --auth-type NONE \
  --cors AllowOrigins="*",AllowMethods="GET,POST,OPTIONS"
```

### Option 3: AWS SAM (Infrastructure as Code)

See `template.yaml` for SAM deployment.

```bash
sam build
sam deploy --guided
```

## API Endpoints

Once deployed, your Lambda will expose these endpoints:

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "relayerAddress": "0x...",
  "contractAddress": "0x..."
}
```

### GET /items
Fetch all registry items

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

### POST /purchase
Mark an item as purchased

**Request:**
```json
{
  "itemId": 0,
  "purchaserName": "John Smith"
}
```

**Response:**
```json
{
  "success": true,
  "itemId": 0,
  "transactionHash": "0x...",
  "message": "Item marked as purchased successfully"
}
```

**Error responses:**
- `400` - Missing required fields
- `404` - Item not found
- `409` - Item already purchased
- `500` - Transaction failed

## Testing

### Local Testing

```bash
# Test with sample event
node test.js
```

### Test with curl

```bash
# Health check
curl https://YOUR_FUNCTION_URL/health

# Get items
curl https://YOUR_FUNCTION_URL/items

# Purchase item
curl -X POST https://YOUR_FUNCTION_URL/purchase \
  -H "Content-Type: application/json" \
  -d '{"itemId": 0, "purchaserName": "John Smith"}'
```

## Security Considerations

### Rate Limiting

Add AWS WAF or API Gateway throttling to prevent abuse:

```bash
# Using API Gateway (if using API Gateway instead of Function URL)
aws apigateway update-usage-plan \
  --usage-plan-id YOUR_PLAN_ID \
  --patch-operations \
    op=replace,path=/throttle/rateLimit,value=10 \
    op=replace,path=/throttle/burstLimit,value=20
```

### Secrets Management

For production, use AWS Secrets Manager instead of environment variables:

```bash
# Store private key in Secrets Manager
aws secretsmanager create-secret \
  --name wedding-registry-relayer-key \
  --secret-string '{"privateKey":"0x..."}'

# Update Lambda to fetch from Secrets Manager
# (requires additional IAM permissions and code changes)
```

### Monitoring

Enable CloudWatch Logs and set up alarms:

- Transaction failures
- High error rates
- Unusual spending (monitor relayer wallet balance)

## Cost Estimates

**AWS Lambda:**
- Free tier: 1M requests/month, 400,000 GB-seconds
- After free tier: ~$0.20 per 1M requests
- Your wedding registry will likely stay in free tier

**Base L2 Gas:**
- ~$0.01 per purchase transaction
- 50 purchases = ~$0.50 in gas fees

**Total estimated cost: <$1 for the entire wedding**

## Troubleshooting

### "Transaction failed" errors

- Check relayer wallet has enough ETH
- Verify contract address is correct
- Check Base L2 RPC is responding

### "Item already purchased" errors

- This is normal - another guest beat them to it
- Frontend should handle gracefully

### Timeout errors

- Increase Lambda timeout (Configuration → General)
- Base L2 can sometimes be slow during high traffic

## Decrypting Purchaser Names

To see who purchased each item, you'll need to decrypt the encrypted names using your MAIN wallet's private key (not the relayer wallet).

See `decrypt-admin-view.js` for an example admin panel.

## Next Steps

After deployment:
1. Test all endpoints
2. Build the frontend UI
3. Add rate limiting
4. Set up monitoring
5. Test the full flow end-to-end

## Support

For issues:
- Check CloudWatch Logs for Lambda errors
- Verify environment variables are set correctly
- Ensure relayer wallet has ETH
- Check BaseScan for transaction status
