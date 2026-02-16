/**
 * Reset an item to unpurchased state (owner only)
 *
 * Usage:
 *   PRIVATE_KEY=0x... node reset-item.js <itemId>
 */

const { ethers } = require('ethers');

const CONTRACT_ADDRESS = '0x46FDB6d70c5584F0fa359ad24F405d76b4DE52A3';
const BASE_RPC_URL = 'https://mainnet.base.org';

// Contract ABI
const CONTRACT_ABI = [
  'function resetItem(uint256 itemId)',
  'function getItem(uint256 itemId) view returns (tuple(string name, string description, string url, string imageUrl, bool isPurchased, bool isDeleted, string encryptedPurchaserName, uint256 purchasedAt))',
  'function owner() view returns (address)'
];

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY environment variable not set');
    console.error('Usage: PRIVATE_KEY=0x... node reset-item.js <itemId>');
    process.exit(1);
  }

  const itemId = process.argv[2];
  if (itemId === undefined) {
    console.error('Error: itemId not provided');
    console.error('Usage: PRIVATE_KEY=0x... node reset-item.js <itemId>');
    process.exit(1);
  }

  console.log('🔄 Resetting item on Base L2\n');

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
    console.error('Only the owner can reset items.');
    process.exit(1);
  }

  console.log('✅ Confirmed: You are the owner\n');

  // Get current item state
  try {
    const item = await contract.getItem(itemId);
    console.log(`Item #${itemId}: ${item.name}`);
    console.log(`Current status: ${item.isPurchased ? 'PURCHASED' : 'Available'}`);

    if (item.isDeleted) {
      console.error('\n❌ Error: This item is deleted');
      process.exit(1);
    }

    if (!item.isPurchased) {
      console.log('\n⚠️  Note: This item is already marked as available');
      console.log('No action needed.');
      process.exit(0);
    }

    console.log('\nResetting to unpurchased state...');

    const tx = await contract.resetItem(itemId);

    console.log('Transaction submitted:', tx.hash);
    console.log('Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed!\n');

    // Verify item was reset
    const updatedItem = await contract.getItem(itemId);
    console.log(`Item #${itemId}: ${updatedItem.name}`);
    console.log(`New status: ${updatedItem.isPurchased ? 'PURCHASED' : 'AVAILABLE'}`);

    if (!updatedItem.isPurchased) {
      console.log('\n🎉 Item successfully reset to available!\n');
      console.log(`View transaction: https://basescan.org/tx/${tx.hash}`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
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
