/**
 * Test script for the OpenAI callback service
 * Run with: node examples/test-openai-callback.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005/api/openai-callback';

async function testOpenAICallbackService() {
    console.log('🤖 Testing OpenAI Callback Service...\n');
    
    try {
        // 1. Send a single chat request
        console.log('1️⃣ Sending OpenAI chat request...');
        const chatResponse = await axios.post(`${BASE_URL}/chat`, {
            callbackUrl: 'https://httpbin.org/post', // Test endpoint
            messages: [
                {
                    role: 'system',
                    content: 'You are a yacht charter expert. Be concise and helpful.'
                },
                {
                    role: 'user',
                    content: 'What are the key features to highlight when marketing a luxury yacht charter?'
                }
            ],
            model: 'gpt-4o-mini',
            options: {
                temperature: 0.7,
                max_tokens: 300
            },
            requestId: 'test_yacht_marketing'
        });
        
        const requestId = chatResponse.data.requestId;
        console.log(`✅ Chat request submitted: ${requestId}\n`);
        
        // 2. Check status
        console.log('2️⃣ Checking request status...');
        const statusResponse = await axios.get(`${BASE_URL}/status/${requestId}`);
        console.log('Status:', statusResponse.data);
        console.log('');
        
        // 3. Wait a moment for processing
        console.log('3️⃣ Waiting for processing...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 4. Check status again
        console.log('4️⃣ Checking status after processing...');
        try {
            const finalStatusResponse = await axios.get(`${BASE_URL}/status/${requestId}`);
            console.log('Final Status:', finalStatusResponse.data);
        } catch (error) {
            console.log('Request completed and removed from pending list');
        }
        console.log('');
        
        // 5. Test batch request
        console.log('5️⃣ Testing batch request...');
        const batchResponse = await axios.post(`${BASE_URL}/batch`, {
            callbackUrl: 'https://httpbin.org/post',
            requests: [
                {
                    requestId: 'batch_test_1',
                    messages: [
                        { role: 'user', content: 'What is yacht chartering?' }
                    ],
                    model: 'gpt-4o-mini',
                    options: { max_tokens: 100 }
                },
                {
                    requestId: 'batch_test_2',
                    messages: [
                        { role: 'user', content: 'What are yacht charter costs?' }
                    ],
                    model: 'gpt-4o-mini',
                    options: { max_tokens: 100 }
                }
            ]
        });
        
        console.log('✅ Batch request submitted:', batchResponse.data);
        console.log('');
        
        // 6. List all pending requests
        console.log('6️⃣ Listing all pending requests...');
        const listResponse = await axios.get(`${BASE_URL}/list`);
        console.log('Pending requests:', listResponse.data);
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testOpenAICallbackService();
