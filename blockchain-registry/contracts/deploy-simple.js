/**
 * Simple deployment script for WeddingRegistry contract
 *
 * Usage:
 *   npm install ethers
 *   PRIVATE_KEY=0x... node deploy-simple.js
 */

const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
  // Check for private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY environment variable not set');
    console.error('Usage: PRIVATE_KEY=0x... node deploy-simple.js');
    process.exit(1);
  }

  console.log('🚀 Deploying WeddingRegistry to Base L2...\n');

  // Connect to Base
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('Deploying from:', wallet.address);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');

  if (balance === 0n) {
    console.error('\n❌ Error: No ETH balance on Base. Bridge some ETH first.');
    process.exit(1);
  }

  console.log('Network: Base Mainnet (Chain ID: 8453)');
  console.log('');

  // Read contract source
  const contractSource = fs.readFileSync('./WeddingRegistry.sol', 'utf8');

  // Compile contract (using solc)
  console.log('Compiling contract...');
  const solc = require('solc');

  const input = {
    language: 'Solidity',
    sources: {
      'WeddingRegistry.sol': {
        content: contractSource
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      },
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error('Compilation errors:');
      errors.forEach(err => console.error(err.formattedMessage));
      process.exit(1);
    }
  }

  const contract = output.contracts['WeddingRegistry.sol']['WeddingRegistry'];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log('✅ Compilation successful\n');

  // Deploy
  console.log('Deploying contract...');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  const deploymentTx = await factory.deploy();
  console.log('Transaction submitted:', deploymentTx.deploymentTransaction().hash);

  console.log('Waiting for confirmation...');
  await deploymentTx.waitForDeployment();

  const contractAddress = await deploymentTx.getAddress();

  console.log('\n🎉 Contract deployed successfully!\n');
  console.log('═══════════════════════════════════════');
  console.log('Contract Address:', contractAddress);
  console.log('Network: Base Mainnet');
  console.log('Chain ID: 8453');
  console.log('═══════════════════════════════════════');
  console.log('\nView on BaseScan:');
  console.log('https://basescan.org/address/' + contractAddress);
  console.log('\n⚠️  SAVE THIS ADDRESS - You\'ll need it for the Lambda relayer!\n');

  // Save to file
  const deployInfo = {
    contractAddress: contractAddress,
    network: 'Base Mainnet',
    chainId: 8453,
    deployedBy: wallet.address,
    deployedAt: new Date().toISOString(),
    basescanUrl: `https://basescan.org/address/${contractAddress}`
  };

  fs.writeFileSync('deployment.json', JSON.stringify(deployInfo, null, 2));
  console.log('Deployment info saved to deployment.json\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
