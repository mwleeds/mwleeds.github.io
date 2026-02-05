/**
 * Utility to extract your Ethereum public key from your private key
 *
 * Usage:
 *   node get-public-key.js YOUR_PRIVATE_KEY
 *
 * IMPORTANT: Use your MAIN wallet (not the relayer wallet)
 * This is the wallet you'll use to decrypt purchaser names later
 */

const { ethers } = require('ethers');

function getPublicKey(privateKey) {
  try {
    // Remove '0x' prefix if present
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;

    // Create wallet from private key
    const wallet = new ethers.Wallet(cleanPrivateKey);

    // In ethers v6, public key is accessed via signingKey
    const publicKey = wallet.signingKey.publicKey;

    console.log('Wallet Information:');
    console.log('===================\n');
    console.log('Address:', wallet.address);
    console.log('Public Key:', publicKey);
    console.log('\nUse the Public Key above for OWNER_PUBLIC_KEY environment variable');
    console.log('Keep your private key secure - you\'ll need it to decrypt purchaser names\n');

    return publicKey;
  } catch (error) {
    console.error('Error:', error.message);
    console.error('\nUsage: node get-public-key.js YOUR_PRIVATE_KEY');
    process.exit(1);
  }
}

// Get private key from command line argument
const privateKey = process.argv[2];

if (!privateKey) {
  console.error('Error: Private key is required');
  console.error('Usage: node get-public-key.js YOUR_PRIVATE_KEY');
  console.error('\nIMPORTANT: Use your MAIN wallet, not the relayer wallet');
  process.exit(1);
}

getPublicKey(privateKey);
