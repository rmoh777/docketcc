// Simple test script for subscription flow
const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:5177';

function testAPI(url) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔍 Testing: ${url}`);
    
    const request = http.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`📊 Status: ${response.statusCode}`);
          console.log(`📄 Response:`, JSON.stringify(jsonData, null, 2));
          resolve({ success: response.statusCode < 400, data: jsonData, status: response.statusCode });
        } catch (error) {
          console.log(`📊 Status: ${response.statusCode}`);
          console.log(`📄 Raw Response:`, data);
          resolve({ success: response.statusCode < 400, data: data, status: response.statusCode });
        }
      });
    });
    
    request.on('error', (error) => {
      console.error(`❌ Error testing ${url}:`, error.message);
      resolve({ success: false, error: error.message });
    });
  });
}

async function runTests() {
  console.log('🚀 Starting subscription flow tests...\n');

  // Test 1: Health check
  await testAPI(`${BASE_URL}/api/health`);

  // Test 2: Search dockets
  await testAPI(`${BASE_URL}/api/dockets?q=lifeline`);

  // Test 3: Test hardcoded dockets
  await testAPI(`${BASE_URL}/api/test-hardcoded-dockets`);

  // Test 4: Test database connection
  await testAPI(`${BASE_URL}/api/test-db`);

  // Test 5: Test subscriptions in dev mode
  await testAPI(`${BASE_URL}/api/subscriptions?dev=true`);

  // Test 6: Debug subscription data
  await testAPI(`${BASE_URL}/api/debug-subscription`);

  console.log('\n✅ Test script completed');
}

runTests().catch(console.error); 