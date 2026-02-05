/**
 * Add an item to the WeddingRegistry contract
 *
 * Usage:
 *   PRIVATE_KEY=0x... node add-item.js
 */

const { ethers } = require('ethers');

const CONTRACT_ADDRESS = '0x46FDB6d70c5584F0fa359ad24F405d76b4DE52A3';
const BASE_RPC_URL = 'https://mainnet.base.org';

// Contract ABI - only the functions we need
const CONTRACT_ABI = [
  'function addItem(string name, string description, string url, string imageUrl)',
  'function getItemCount() view returns (uint256)',
  'function getAllItems() view returns (tuple(string name, string description, string url, string imageUrl, bool isPurchased, bool isDeleted, string encryptedPurchaserName, uint256 purchasedAt)[])',
  'function owner() view returns (address)'
];

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY environment variable not set');
    console.error('Usage: PRIVATE_KEY=0x... node add-item.js');
    process.exit(1);
  }

  console.log('📝 Adding item to WeddingRegistry on Base L2\n');

  // Connect to Base
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

  console.log('Contract:', CONTRACT_ADDRESS);
  console.log('From:', wallet.address);

  // Check if we're the owner
  const owner = await contract.owner();
  console.log('Owner:', owner);

  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.error('\n❌ Error: You are not the contract owner!');
    console.error('Only the owner can add items.');
    process.exit(1);
  }

  console.log('✅ Confirmed: You are the owner\n');

  // Check current item count
  const currentCount = await contract.getItemCount();
  console.log('Current item count:', currentCount.toString());

  // Add a test item
  console.log('\nAdding test item...');

  const testItem = {
    name: 'Coffee Maker',
    description: '12-cup programmable coffee maker with thermal carafe',
    url: 'https://www.example.com/coffee-maker',
    imageUrl: 'https://www.example.com/images/coffee-maker.jpg'
  };

  console.log('Item details:');
  console.log('  Name:', testItem.name);
  console.log('  Description:', testItem.description);
  console.log('  URL:', testItem.url);
  console.log('  Image:', testItem.imageUrl);

  try {
    const tx = await contract.addItem(
      testItem.name,
      testItem.description,
      testItem.url,
      testItem.imageUrl
    );

    console.log('\nTransaction submitted:', tx.hash);
    console.log('Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed!\n');

    // Verify item was added
    const newCount = await contract.getItemCount();
    console.log('New item count:', newCount.toString());

    if (newCount > currentCount) {
      console.log('\n🎉 Item added successfully!\n');

      // Fetch all items
      const items = await contract.getAllItems();
      console.log('All items in registry:');
      items.forEach((item, index) => {
        console.log(`\nItem #${index}:`);
        console.log(`  Name: ${item.name}`);
        console.log(`  Description: ${item.description}`);
        console.log(`  Status: ${item.isPurchased ? '✓ Purchased' : '○ Available'}`);
      });
    }

    console.log('\n═══════════════════════════════════════');
    console.log('Next steps:');
    console.log('1. Add more items (run this script again)');
    console.log('2. Deploy Lambda relayer');
    console.log('3. Build frontend');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error adding item:', error.message);
    if (error.reason) {
      console.error('Reason:', error.reason);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
