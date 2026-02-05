/**
 * Admin script to view purchased items and decrypt purchaser names
 *
 * Usage:
 *   ADMIN_PRIVATE_KEY=0x... node admin-view.js
 *
 * This script:
 *   1. Fetches all purchased items from the contract
 *   2. Decrypts purchaser names using your private key
 *   3. Displays who purchased what
 */

const { ethers } = require('ethers');
const { decrypt } = require('@metamask/eth-sig-util');

// Contract configuration
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

// Contract ABI
const CONTRACT_ABI = [
  'function getPurchasedItems() view returns (tuple(string name, string description, string url, string imageUrl, bool isPurchased, string encryptedPurchaserName, uint256 purchasedAt)[])',
  'function getAllItems() view returns (tuple(string name, string description, string url, string imageUrl, bool isPurchased, string encryptedPurchaserName, uint256 purchasedAt)[])'
];

/**
 * Decrypt purchaser name using admin's private key
 */
function decryptPurchaserName(encryptedData, privateKey) {
  try {
    // Parse encrypted data
    const encrypted = JSON.parse(encryptedData);

    // Remove '0x' prefix from private key
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

    // Decrypt
    const decrypted = decrypt({
      encryptedData: encrypted,
      privateKey: cleanPrivateKey
    });

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    return '[Decryption failed]';
  }
}

async function viewPurchasedItems() {
  // Validate environment variables
  if (!CONTRACT_ADDRESS) {
    console.error('Error: CONTRACT_ADDRESS environment variable not set');
    process.exit(1);
  }

  if (!ADMIN_PRIVATE_KEY) {
    console.error('Error: ADMIN_PRIVATE_KEY environment variable not set');
    console.error('Usage: ADMIN_PRIVATE_KEY=0x... node admin-view.js');
    process.exit(1);
  }

  console.log('🎁 Wedding Registry Admin View\n');
  console.log('Contract:', CONTRACT_ADDRESS);
  console.log('Network: Base L2\n');

  try {
    // Connect to Base L2
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    // Fetch all items
    console.log('Fetching registry items...\n');
    const allItems = await contract.getAllItems();

    // Separate purchased and available
    const purchased = [];
    const available = [];

    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      if (item.isPurchased) {
        purchased.push({ id: i, ...item });
      } else {
        available.push({ id: i, ...item });
      }
    }

    // Display summary
    console.log('📊 Summary');
    console.log('==========');
    console.log(`Total Items: ${allItems.length}`);
    console.log(`Purchased: ${purchased.length}`);
    console.log(`Available: ${available.length}`);
    console.log('');

    // Display purchased items with decrypted names
    if (purchased.length > 0) {
      console.log('✅ Purchased Items');
      console.log('==================\n');

      for (const item of purchased) {
        const decryptedName = decryptPurchaserName(
          item.encryptedPurchaserName,
          ADMIN_PRIVATE_KEY
        );

        const purchaseDate = new Date(Number(item.purchasedAt) * 1000);

        console.log(`Item #${item.id}: ${item.name}`);
        console.log(`  Purchased by: ${decryptedName}`);
        console.log(`  Date: ${purchaseDate.toLocaleString()}`);
        console.log(`  Description: ${item.description}`);
        if (item.url) {
          console.log(`  URL: ${item.url}`);
        }
        console.log('');
      }
    } else {
      console.log('No items have been purchased yet.\n');
    }

    // Display available items
    if (available.length > 0) {
      console.log('○ Available Items');
      console.log('=================\n');

      for (const item of available) {
        console.log(`Item #${item.id}: ${item.name}`);
        console.log(`  ${item.description}`);
        console.log('');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
viewPurchasedItems();
