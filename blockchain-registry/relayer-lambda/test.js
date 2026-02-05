/**
 * Simple test script for the Lambda function
 *
 * Usage:
 *   1. Create .env file with required variables
 *   2. Run: node test.js
 */

require('dotenv').config();
const handler = require('./index').handler;

// Mock event for GET /items
const getItemsEvent = {
  httpMethod: 'GET',
  path: '/items',
  headers: {},
  body: null
};

// Mock event for GET /health
const healthCheckEvent = {
  httpMethod: 'GET',
  path: '/health',
  headers: {},
  body: null
};

// Mock event for POST /purchase
const purchaseEvent = {
  httpMethod: 'POST',
  path: '/purchase',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    password: process.env.REGISTRY_PASSWORD || 'test_password',
    itemId: 0,
    purchaserName: 'Test User'
  })
};

async function runTests() {
  console.log('🧪 Running Lambda function tests...\n');

  // Verify environment variables
  console.log('Checking environment variables...');
  const requiredVars = [
    'RELAYER_PRIVATE_KEY',
    'CONTRACT_ADDRESS',
    'OWNER_PUBLIC_KEY',
    'REGISTRY_PASSWORD'
  ];

  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.error('Create a .env file with these variables');
    process.exit(1);
  }
  console.log('✅ All required environment variables present\n');

  // Test 1: Health check
  console.log('Test 1: Health Check');
  console.log('-------------------');
  try {
    const response = await handler(healthCheckEvent);
    console.log('Status:', response.statusCode);
    console.log('Body:', JSON.parse(response.body));
    console.log(response.statusCode === 200 ? '✅ PASS\n' : '❌ FAIL\n');
  } catch (error) {
    console.error('❌ FAIL:', error.message, '\n');
  }

  // Test 2: Get items
  console.log('Test 2: Get Items');
  console.log('-----------------');
  try {
    const response = await handler(getItemsEvent);
    console.log('Status:', response.statusCode);
    const body = JSON.parse(response.body);
    console.log('Items count:', body.count);
    if (body.items && body.items.length > 0) {
      console.log('First item:', body.items[0].name);
    }
    console.log(response.statusCode === 200 ? '✅ PASS\n' : '❌ FAIL\n');
  } catch (error) {
    console.error('❌ FAIL:', error.message, '\n');
  }

  // Test 3: Purchase item (optional - only if you want to test)
  console.log('Test 3: Purchase Item (SKIPPED)');
  console.log('--------------------------------');
  console.log('To test purchasing, uncomment the code below');
  console.log('WARNING: This will submit a real transaction!\n');

  /*
  try {
    const response = await handler(purchaseEvent);
    console.log('Status:', response.statusCode);
    console.log('Body:', JSON.parse(response.body));
    console.log(response.statusCode === 200 ? '✅ PASS\n' : '❌ FAIL\n');
  } catch (error) {
    console.error('❌ FAIL:', error.message, '\n');
  }
  */

  console.log('Tests complete! 🎉');
}

// Run tests
runTests().catch(console.error);
