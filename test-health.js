#!/usr/bin/env node

/**
 * Health Check Test Script
 * 
 * This script tests both the backend and frontend health endpoints
 * to ensure they're working correctly.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WEB_URL = process.env.WEB_URL || 'http://localhost:3001';

async function testBackendHealth() {
  console.log('🔍 Testing Backend Health...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    
    console.log('✅ Backend Health Check Results:');
    console.log(`   Status: ${data.status}`);
    console.log(`   Version: ${data.version}`);
    console.log(`   Environment: ${data.environment}`);
    console.log(`   Response Time: ${data.responseTime}`);
    console.log('   Checks:');
    console.log(`     Database: ${data.checks.database.status}`);
    console.log(`     Storage: ${data.checks.storage.status}`);
    console.log(`     Durable Objects: ${data.checks.durableObjects.status}`);
    
    return data.status === 'healthy';
  } catch (error) {
    console.error('❌ Backend Health Check Failed:', error.message);
    return false;
  }
}

async function testFrontendHealth() {
  console.log('\n🔍 Testing Frontend Health...');
  
  try {
    // Test if the frontend is accessible
    const response = await fetch(`${WEB_URL}/health`);
    
    if (response.ok) {
      console.log('✅ Frontend Health Page Accessible');
      return true;
    } else {
      console.log(`❌ Frontend Health Page Failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Frontend Health Check Failed:', error.message);
    return false;
  }
}

async function testSimpleBackendHealth() {
  console.log('\n🔍 Testing Simple Backend Health...');
  
  try {
    const response = await fetch(`${BASE_URL}/`);
    const text = await response.text();
    
    if (text === 'OK') {
      console.log('✅ Simple Backend Health Check Passed');
      return true;
    } else {
      console.log(`❌ Simple Backend Health Check Failed: ${text}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Simple Backend Health Check Failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Health Check Tests...\n');
  
  const backendHealth = await testBackendHealth();
  const frontendHealth = await testFrontendHealth();
  const simpleBackendHealth = await testSimpleBackendHealth();
  
  console.log('\n📊 Test Results Summary:');
  console.log(`   Backend Health: ${backendHealth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Frontend Health: ${frontendHealth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Simple Backend: ${simpleBackendHealth ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = backendHealth && frontendHealth && simpleBackendHealth;
  
  if (allPassed) {
    console.log('\n🎉 All health checks passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some health checks failed!');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { testBackendHealth, testFrontendHealth, testSimpleBackendHealth }; 