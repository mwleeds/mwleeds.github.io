/**
 * Example scripts for interacting with the deployed WeddingRegistry contract
 *
 * Prerequisites:
 *   npm install ethers
 *
 * Usage:
 *   node interact-example.js
 */

const { ethers } = require('ethers');

// Configuration
const CONTRACT_ADDRESS = 'YOUR_DEPLOYED_CONTRACT_ADDRESS';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BASE_RPC_URL = 'https://mainnet.base.org';

// Contract ABI (only the functions we need)
const ABI = [
  'function addItem(string name, string description, string url, string imageUrl)',
  'function updateItem(uint256 itemId, string name, string description, string url, string imageUrl)',
  'function removeItem(uint256 itemId)',
  'function markAsPurchased(uint256 itemId, string encryptedPurchaserName)',
  'function resetItem(uint256 itemId)',
  'function getAllItems() view returns (tuple(string name, string description, string url, string imageUrl, bool isPurchased, string encryptedPurchaserName, uint256 purchasedAt)[])',
  'function getAvailableItems() view returns (tuple(string name, string description, string url, string imageUrl, bool isPurchased, string encryptedPurchaserName, uint256 purchasedAt)[])',
  'function getPurchasedItems() view returns (tuple(string name, string description, string url, string imageUrl, bool isPurchased, string encryptedPurchaserName, uint256 purchasedAt)[])',
  'function getItemCount() view returns (uint256)',
  'event ItemAdded(uint256 indexed itemId, string name)',
  'event ItemPurchased(uint256 indexed itemId, uint256 timestamp)'
];

async function main() {
  // Connect to Base
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  console.log('Connected to WeddingRegistry at:', CONTRACT_ADDRESS);
  console.log('Owner address:', wallet.address);
  console.log('');

  // Example 1: Add items to the registry
  await addSampleItems(contract);

  // Example 2: View all items
  await viewAllItems(contract);

  // Example 3: Listen for purchase events
  // listenForPurchases(contract);
}

async function addSampleItems(contract) {
  console.log('📝 Adding sample items...\n');

  const items = [
    {
      name: 'Coffee Maker',
      description: 'Programmable 12-cup coffee maker with thermal carafe',
      url: 'https://www.example.com/coffee-maker',
      imageUrl: 'https://www.example.com/images/coffee-maker.jpg'
    },
    {
      name: 'Blender',
      description: 'High-speed blender for smoothies and soups',
      url: 'https://www.example.com/blender',
      imageUrl: 'https://www.example.com/images/blender.jpg'
    },
    {
      name: 'Dinner Plates Set',
      description: 'Service for 8 - white porcelain',
      url: 'https://www.example.com/plates',
      imageUrl: 'https://www.example.com/images/plates.jpg'
    }
  ];

  for (const item of items) {
    try {
      console.log(`Adding: ${item.name}...`);
      const tx = await contract.addItem(
        item.name,
        item.description,
        item.url,
        item.imageUrl
      );
      await tx.wait();
      console.log(`✅ Added: ${item.name}`);
      console.log(`   Gas used: ${(await tx.wait()).gasUsed.toString()}`);
      console.log('');
    } catch (error) {
      console.error(`❌ Error adding ${item.name}:`, error.message);
    }
  }
}

async function viewAllItems(contract) {
  console.log('👀 Fetching all registry items...\n');

  try {
    const count = await contract.getItemCount();
    console.log(`Total items: ${count}\n`);

    const items = await contract.getAllItems();

    items.forEach((item, index) => {
      console.log(`Item #${index}:`);
      console.log(`  Name: ${item.name}`);
      console.log(`  Description: ${item.description}`);
      console.log(`  URL: ${item.url}`);
      console.log(`  Image: ${item.imageUrl}`);
      console.log(`  Status: ${item.isPurchased ? '✓ PURCHASED' : '○ Available'}`);
      if (item.isPurchased) {
        console.log(`  Encrypted Purchaser: ${item.encryptedPurchaserName}`);
        console.log(`  Purchased At: ${new Date(Number(item.purchasedAt) * 1000).toLocaleString()}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error fetching items:', error.message);
  }
}

async function viewAvailableOnly(contract) {
  console.log('🎁 Available items:\n');

  const items = await contract.getAvailableItems();
  items.forEach((item, index) => {
    console.log(`${index + 1}. ${item.name} - ${item.description}`);
  });
}

async function viewPurchasedOnly(contract) {
  console.log('✅ Purchased items:\n');

  const items = await contract.getPurchasedItems();
  items.forEach((item, index) => {
    console.log(`${index + 1}. ${item.name}`);
    console.log(`   Encrypted name: ${item.encryptedPurchaserName}`);
    console.log(`   Date: ${new Date(Number(item.purchasedAt) * 1000).toLocaleString()}`);
    console.log('');
  });
}

function listenForPurchases(contract) {
  console.log('👂 Listening for purchases...\n');

  contract.on('ItemPurchased', (itemId, timestamp) => {
    console.log(`🎉 Item #${itemId} was just purchased!`);
    console.log(`   Timestamp: ${new Date(Number(timestamp) * 1000).toLocaleString()}`);
    console.log('');
  });

  // Keep the script running
  console.log('Press Ctrl+C to stop listening\n');
}

// Encryption helper (for the relayer to use)
async function encryptPurchaserName(publicKey, name) {
  // This is a placeholder - actual implementation would use ECIES
  // The relayer backend will implement this properly
  const crypto = require('crypto');
  // In practice, use eccrypto or eth-crypto library
  console.log('Note: Use proper ECIES encryption in production');
  return `encrypted_${name}`;
}

// Run the script
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  addSampleItems,
  viewAllItems,
  viewAvailableOnly,
  viewPurchasedOnly,
  listenForPurchases
};
