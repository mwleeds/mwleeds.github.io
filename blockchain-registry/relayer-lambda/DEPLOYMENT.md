# Deployment Checklist

Follow these steps to deploy your Wedding Registry relayer to AWS Lambda.

## Prerequisites

- [ ] Smart contract deployed to Base L2 (from `contracts/` folder)
- [ ] Contract address saved
- [ ] Relayer wallet created with private key accessible
- [ ] Relayer wallet funded with ~$10-20 ETH on Base L2
- [ ] AWS account created
- [ ] AWS CLI installed and configured (optional, for CLI deployment)

## Step 1: Get Your Public Key

You need your **main wallet's** public key (not the relayer wallet) for encryption.

```bash
cd relayer-lambda
npm install
node get-public-key.js YOUR_MAIN_WALLET_PRIVATE_KEY
```

Save the public key output - you'll need it for `OWNER_PUBLIC_KEY`.

## Step 2: Test Locally (Optional)

Create `.env` file:

```bash
cp .env.example .env
# Edit .env with your values
```

Run local tests:

```bash
npm test
```

## Step 3: Deploy to AWS Lambda

### Method A: AWS Console (Recommended for First Time)

1. **Package the function:**
   ```bash
   npm install --production
   npm run package
   ```
   This creates `function.zip`.

2. **Create Lambda function:**
   - Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda)
   - Click "Create function"
   - Choose "Author from scratch"
   - Function name: `wedding-registry-relayer`
   - Runtime: **Node.js 18.x**
   - Click "Create function"

3. **Upload code:**
   - Scroll to "Code source" section
   - Click "Upload from" → ".zip file"
   - Upload `function.zip`
   - Click "Save"

4. **Configure settings:**
   - Go to "Configuration" tab → "General configuration"
   - Click "Edit"
   - Set **Timeout: 30 seconds**
   - Set **Memory: 256 MB**
   - Click "Save"

5. **Set environment variables:**
   - Go to "Configuration" tab → "Environment variables"
   - Click "Edit" → "Add environment variable"
   - Add these variables:

   | Key | Value |
   |-----|-------|
   | `RELAYER_PRIVATE_KEY` | Your relayer wallet private key (0x...) |
   | `CONTRACT_ADDRESS` | Your deployed contract address (0x...) |
   | `OWNER_PUBLIC_KEY` | Your public key from Step 1 (0x...) |
   | `BASE_RPC_URL` | `https://mainnet.base.org` |

   - Click "Save"

6. **Create Function URL:**
   - Go to "Configuration" tab → "Function URL"
   - Click "Create function URL"
   - Auth type: **NONE**
   - Configure CORS:
     - Allow origin: `*`
     - Allow methods: `GET, POST, OPTIONS`
     - Allow headers: `Content-Type`
   - Click "Save"
   - **Copy the Function URL** (e.g., `https://abc123.lambda-url.us-east-1.on.aws/`)

### Method B: AWS SAM (Infrastructure as Code)

```bash
# Install SAM CLI first: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

sam build
sam deploy --guided
# Follow the prompts and enter your values
```

## Step 4: Test the Deployment

Test each endpoint:

```bash
# Replace YOUR_FUNCTION_URL with your actual URL from Step 3.6

# Health check
curl https://YOUR_FUNCTION_URL/health

# Get items (should return empty array if no items added yet)
curl https://YOUR_FUNCTION_URL/items

# Test purchase (only if you have items in the registry)
curl -X POST https://YOUR_FUNCTION_URL/purchase \
  -H "Content-Type: application/json" \
  -d '{"itemId": 0, "purchaserName": "Test User"}'
```

Expected responses:

- Health check: `{"status":"healthy","relayerAddress":"0x...","contractAddress":"0x..."}`
- Get items: `{"items":[],"count":0}` (or your items if you added them)
- Purchase: `{"success":true,"itemId":0,"transactionHash":"0x...","message":"..."}`

## Step 5: Add Registry Items

You can add items in two ways:

### Option A: Using the interact script

```bash
cd ../contracts
node interact-example.js
```

### Option B: Using Remix or cast

Use the `addItem()` function on your contract:
- name: "Coffee Maker"
- description: "12-cup programmable"
- url: "https://example.com/product"
- imageUrl: "https://example.com/image.jpg"

## Step 6: Verify Items Are Showing

```bash
curl https://YOUR_FUNCTION_URL/items
```

You should see your items in the response.

## Step 7: Set Up Monitoring

1. **CloudWatch Logs:**
   - Go to Lambda → Monitor → Logs
   - View logs to see requests and any errors

2. **Set up alarms (optional):**
   - Monitor for errors
   - Alert on high invocation counts (abuse detection)

3. **Monitor relayer wallet:**
   - Check balance regularly
   - Set up alerts if balance gets low

## Step 8: Save Your Configuration

Document these values somewhere safe:

- [ ] Lambda Function URL: `_______________`
- [ ] Contract Address: `_______________`
- [ ] Relayer Wallet Address: `_______________`
- [ ] Main Wallet Address (for decryption): `_______________`

## Step 9: View Purchased Items (Admin View)

To see who purchased what:

```bash
cd relayer-lambda
ADMIN_PRIVATE_KEY=0xYOUR_MAIN_WALLET_KEY \
CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS \
node admin-view.js
```

This will decrypt and display purchaser names.

## Troubleshooting

### "Cannot find module" errors
- Run `npm install` again
- Make sure to package with `npm run package` before uploading

### "Transaction failed" errors
- Check relayer wallet has ETH on Base L2
- Verify contract address is correct
- Check Base L2 is responding: `curl https://mainnet.base.org`

### "Timeout" errors
- Increase Lambda timeout to 30+ seconds
- Base L2 can be slow during high traffic

### Items not showing
- Verify contract has items (check on BaseScan)
- Check CloudWatch logs for errors
- Test contract directly with read-only functions

### Decryption fails
- Verify you're using the MAIN wallet's private key (not relayer)
- Check OWNER_PUBLIC_KEY matches your main wallet
- Ensure encryption worked (check logs during purchase)

## Security Checklist

- [ ] Relayer private key stored only in Lambda environment variables (not in code/git)
- [ ] Function URL is HTTPS only
- [ ] Relayer wallet funded with minimal amount (<$20)
- [ ] CloudWatch logging enabled
- [ ] Consider adding AWS WAF for rate limiting
- [ ] Monitor wallet balance regularly

## Next Steps

After successful deployment:
1. ✅ Build the frontend UI (next phase)
2. ✅ Integrate frontend with Lambda API
3. ✅ Test full guest flow end-to-end
4. ✅ Add rate limiting if needed
5. ✅ Share registry URL with guests!

## Cost Monitoring

Monitor your costs:
- Lambda: Should stay in free tier (<$1/month)
- Base L2 gas: ~$0.01 per purchase
- Total expected: <$5 for entire wedding

Check costs at:
- AWS: [AWS Cost Explorer](https://console.aws.amazon.com/cost-management/home)
- Base gas: Check relayer wallet on [BaseScan](https://basescan.org)

## Support

If you run into issues:
1. Check CloudWatch Logs for errors
2. Verify all environment variables are set correctly
3. Test contract directly on BaseScan
4. Check relayer wallet balance on BaseScan
