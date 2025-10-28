/**
 * Test script for the callback service
 * Run with: node examples/test-callback.js
 */

const axios = require('axios');

const BASE_URL = 'http://78.46.232.79:3004/api/callback';

async function testCallbackService() {
    console.log('🧪 Testing Callback Service...\n');
    
    try {
        // 1. Register a callback
        console.log('1️⃣ Registering callback...');
        const registerResponse = await axios.post(`${BASE_URL}/register`, {
            callbackUrl: 'https://httpbin.org/post', // Test endpoint
            data: {
                action: 'test_processing',
                message: 'Hello from WordPress!',
                timestamp: new Date().toISOString()
            },
            timeout: 30000
        });
        
        const callbackId = registerResponse.data.callbackId;
        console.log(`✅ Callback registered: ${callbackId}\n`);
        
        // 2. Check status
        console.log('2️⃣ Checking status...');
        const statusResponse = await axios.get(`${BASE_URL}/status/${callbackId}`);
        console.log('Status:', statusResponse.data);
        console.log('');
        
        // 3. Complete the callback
        console.log('3️⃣ Completing callback...');
        const completeResponse = await axios.post(`${BASE_URL}/complete/${callbackId}`, {
            result: {
                processed: true,
                message: 'Processing completed successfully!',
                data: {
                    yacht_id: 123,
                    status: 'available',
                    price: 50000
                }
            },
            status: 'success'
        });
        
        console.log('✅ Callback completed:', completeResponse.data);
        console.log('');
        
        // 4. List all callbacks
        console.log('4️⃣ Listing all callbacks...');
        const listResponse = await axios.get(`${BASE_URL}/list`);
        console.log('Active callbacks:', listResponse.data);
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testCallbackService();
