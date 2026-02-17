/**
 * AWS Lambda function for Wedding Registry relayer
 *
 * This function acts as a gasless relayer that:
 * 1. Accepts purchase requests from guests
 * 2. Encrypts purchaser names with owner's public key
 * 3. Submits transactions to Base L2 on behalf of guests
 *
 * Environment variables required:
 *   - RELAYER_PRIVATE_KEY: Private key of the wallet that pays gas
 *   - CONTRACT_ADDRESS: Deployed WeddingRegistry contract address
 *   - OWNER_PUBLIC_KEY: Owner's Ethereum public key for encryption
 *   - BASE_RPC_URL: Base L2 RPC endpoint (default: https://mainnet.base.org)
 *   - REGISTRY_PASSWORD: Password shared with wedding guests
 */

const { ethers } = require('ethers');
const eccrypto = require('eccrypto');
const https = require('https');

// Contract ABI - only the functions we need
// IMPORTANT: Must use named tuple fields for proper decoding
const CONTRACT_ABI = [
  'function markAsPurchased(uint256 itemId, string encryptedPurchaserName)',
  'function getItem(uint256 itemId) view returns (string name, string description, string url, string imageUrl, bool isPurchased, bool isDeleted, string encryptedPurchaserName, uint256 purchasedAt)',
  'function items(uint256) view returns (string name, string description, string url, string imageUrl, bool isPurchased, bool isDeleted, string encryptedPurchaserName, uint256 purchasedAt)',
  'function getAllItems() view returns (tuple(string name, string description, string url, string imageUrl, bool isPurchased, bool isDeleted, string encryptedPurchaserName, uint256 purchasedAt)[])'
];

// Initialize provider and contract (reused across invocations)
let provider;
let contract;
let relayerWallet;

function initializeContract() {
  if (!provider) {
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    provider = new ethers.JsonRpcProvider(rpcUrl);

    relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);

    contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      CONTRACT_ABI,
      relayerWallet
    );
  }
  return contract;
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit =
        error.code === 'CALL_EXCEPTION' ||
        error.message?.includes('rate limit') ||
        error.message?.includes('429');

      const isLastAttempt = attempt === maxRetries - 1;

      if (isRateLimit && !isLastAttempt) {
        const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Rate limit hit, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delayMs);
        continue;
      }

      // If not a rate limit error, or last attempt, throw
      throw error;
    }
  }
}

/**
 * Encrypt purchaser name using owner's public key (ECIES)
 */
async function encryptPurchaserName(publicKey, name) {
  try {
    console.log('Encrypting with public key:', publicKey.substring(0, 20) + '...');

    // eccrypto expects public key as Buffer with 0x04 prefix (uncompressed)
    let cleanPublicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;

    // Ensure it starts with 04 (uncompressed key indicator)
    if (!cleanPublicKey.startsWith('04')) {
      cleanPublicKey = '04' + cleanPublicKey;
    }

    const publicKeyBuffer = Buffer.from(cleanPublicKey, 'hex');
    const messageBuffer = Buffer.from(name, 'utf8');

    console.log('Public key buffer length:', publicKeyBuffer.length);

    // Encrypt using eccrypto (ECIES with secp256k1)
    const encrypted = await eccrypto.encrypt(publicKeyBuffer, messageBuffer);

    console.log('Encryption successful');

    // Convert encrypted structure to JSON string
    // eccrypto returns {iv, ephemPublicKey, ciphertext, mac} as Buffers
    const encryptedData = {
      iv: encrypted.iv.toString('hex'),
      ephemPublicKey: encrypted.ephemPublicKey.toString('hex'),
      ciphertext: encrypted.ciphertext.toString('hex'),
      mac: encrypted.mac.toString('hex')
    };

    return JSON.stringify(encryptedData);
  } catch (error) {
    console.error('Encryption error:', error);
    console.error('Public key that failed:', publicKey);
    throw new Error('Failed to encrypt purchaser name');
  }
}

/**
 * Submit purchase notification to Formspree
 */
async function submitPurchaseNotification(itemId, itemName, purchaserName, transactionHash) {
  try {
    const formspreeEndpoint = process.env.FORMSPREE_ENDPOINT;
    if (!formspreeEndpoint) {
      console.log('FORMSPREE_ENDPOINT not configured, skipping notification');
      return;
    }

    const data = JSON.stringify({
      name: purchaserName,
      item_name: itemName,
      item_id: itemId,
      transaction_hash: transactionHash,
      timestamp: new Date().toLocaleString()
    });

    const url = new URL(formspreeEndpoint);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Purchase notification submitted to Formspree');
            resolve();
          } else {
            reject(new Error(`Formspree responded with status ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  } catch (error) {
    console.error('Error submitting purchase notification:', error);
    // Don't fail the purchase if notification fails
  }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Response headers (CORS handled by Lambda Function URL configuration)
  const headers = {
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  const method = event.requestContext?.http?.method || event.httpMethod || '';
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Lambda Function URLs use requestContext.http.path
    const path = event.requestContext?.http?.path || event.rawPath || event.path || '';
    const method = event.requestContext?.http?.method || event.httpMethod || '';

    console.log('Path:', path, 'Method:', method);

    // Route: GET /items - Fetch all registry items
    if (method === 'GET' && path.endsWith('/items')) {
      return await handleGetItems(headers);
    }

    // Route: POST /purchase - Mark item as purchased
    if (method === 'POST' && path.endsWith('/purchase')) {
      return await handlePurchase(event, headers);
    }

    // Route: GET /health - Health check
    if (method === 'GET' && path.endsWith('/health')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'healthy',
          relayerAddress: relayerWallet ? relayerWallet.address : 'not initialized',
          contractAddress: process.env.CONTRACT_ADDRESS
        })
      };
    }

    // Unknown route
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

/**
 * Handle GET /items - Fetch all registry items
 * Returns ALL items including deleted ones with original contract indices preserved
 * Frontend filters out deleted items for display
 */
async function handleGetItems(headers) {
  try {
    initializeContract();

    // Create a read-only contract instance (no signer needed for view functions)
    const readOnlyContract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider // Use provider directly, not wallet
    );

    const formattedItems = [];

    // Iterate through potential item indices
    // We'll try up to 1024 items as a safety limit; code breaks early when it detects end of array
    for (let index = 0; index < 1024; index++) {
      try {
        const item = await retryWithBackoff(() => readOnlyContract.items(index));

        // Include ALL items (even deleted ones) to preserve indices
        formattedItems.push({
          id: index, // Preserve original contract index
          name: item.name,
          description: item.description,
          url: item.url,
          imageUrl: item.imageUrl,
          isPurchased: item.isPurchased,
          isDeleted: item.isDeleted, // Frontend will filter these out
          purchasedAt: item.purchasedAt ? Number(item.purchasedAt) : null
        });

        // Add delay to respect rate limits (25 req/sec for Alchemy free tier)
        // 50ms delay = 20 req/sec, safely under the limit
        await sleep(50);
      } catch (error) {
        // Log full error details for debugging
        console.log(`Error at index ${index}:`, {
          message: error.message,
          code: error.code,
          reason: error.reason,
          data: error.data
        });

        // Check if this is an "end of array" error
        // Specifically check for "missing revert data" which indicates no item at this index
        const isEndOfArray =
          error.message?.includes('missing revert data') ||
          (error.code === 'CALL_EXCEPTION' && error.data === null && error.reason === null);

        if (isEndOfArray) {
          // Reached the end of items array
          console.log(`Reached end of items at index ${index}`);
          break;
        }

        // For other errors (like overflow/decoding errors), log and skip this index
        // This handles corrupted or problematic items gracefully
        console.warn(`Error loading item at index ${index}:`, error.message);

        // Add a placeholder for this broken item so indices stay stable
        formattedItems.push({
          id: index,
          name: `[Error loading item ${index}]`,
          description: 'This item could not be loaded',
          url: '',
          imageUrl: '',
          isPurchased: false,
          isDeleted: true, // Mark as deleted so frontend hides it
          purchasedAt: null
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        items: formattedItems,
        count: formattedItems.length
      })
    };

  } catch (error) {
    console.error('Error fetching items:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch items',
        message: error.message
      })
    };
  }
}

/**
 * Handle POST /purchase - Mark item as purchased
 */
async function handlePurchase(event, headers) {
  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { password, itemId, purchaserName } = body;

    // Validate password
    const expectedPassword = process.env.REGISTRY_PASSWORD;
    if (!expectedPassword) {
      console.error('REGISTRY_PASSWORD environment variable not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    if (!password || password !== expectedPassword) {
      console.log('Invalid password attempt');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid password' })
      };
    }

    // Validate input
    if (itemId === undefined || itemId === null) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'itemId is required' })
      };
    }

    if (!purchaserName || purchaserName.trim() === '') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'purchaserName is required' })
      };
    }

    // Initialize contract
    initializeContract();

    // Check if item exists and is not already purchased
    // Use contract.items() instead of getItem() - it's the auto-generated public state variable getter
    // and ethers.js handles it more reliably than the custom getItem() function
    const item = await contract.items(itemId);

    console.log(`Item ${itemId} raw data:`, {
      name: item.name,
      isPurchased: item.isPurchased,
      isPurchasedType: typeof item.isPurchased,
      isDeleted: item.isDeleted,
      encryptedName: item.encryptedPurchaserName ? item.encryptedPurchaserName.substring(0, 50) : 'empty'
    });

    if (item.isPurchased) {
      console.warn(`Item ${itemId} is already purchased, rejecting request`);
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'Item already purchased',
          itemId
        })
      };
    }

    // Encrypt purchaser name
    const encryptedName = await encryptPurchaserName(
      process.env.OWNER_PUBLIC_KEY,
      purchaserName.trim()
    );

    console.log(`Marking item ${itemId} as purchased by ${purchaserName}`);

    // Submit transaction
    const tx = await contract.markAsPurchased(itemId, encryptedName);
    console.log('Transaction submitted:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);

    // Submit purchase notification to Formspree (non-blocking)
    submitPurchaseNotification(itemId, item.name, purchaserName, receipt.hash).catch(err => {
      console.error('Failed to submit purchase notification:', err);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        itemId,
        transactionHash: receipt.hash,
        message: 'Item marked as purchased successfully'
      })
    };

  } catch (error) {
    console.error('Error processing purchase:', error);

    // Handle specific errors
    if (error.message.includes('already purchased')) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'Item already purchased'
        })
      };
    }

    if (error.message.includes('Invalid item ID')) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Item not found'
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process purchase',
        message: error.message
      })
    };
  }
}
