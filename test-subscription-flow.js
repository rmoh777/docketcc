// Test script to validate subscription flow
const BASE_URL = 'http://localhost:5177';

async function testAPI(url, options = {}) {
  try {
    console.log(`\n🔍 Testing: ${url}`);
    const response = await fetch(url, options);
    const data = await response.json();
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(data, null, 2));
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.error(`❌ Error testing ${url}:`, error.message);
    return { success: false, error: error.message };
  }
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

// Run if called directly
if (import.meta.main) {
  runTests().catch(console.error);
}

export { runTests }; 