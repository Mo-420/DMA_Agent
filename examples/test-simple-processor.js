/**
 * Test script for the simple OpenAI processor service
 * Run with: node examples/test-simple-processor.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005/api/openai-processor';

async function testSimpleProcessor() {
    console.log('🤖 Testing Simple OpenAI Processor...\n');
    
    try {
        // 1. Test yacht description generation
        console.log('1️⃣ Testing yacht description generation...');
        const yachtResponse = await axios.post(`${BASE_URL}/process`, {
            instructions: 'You are a yacht charter expert. Generate compelling marketing descriptions for yacht listings. Be concise but engaging.',
            data: {
                yacht_name: 'Ocean Dream',
                length: '50 feet',
                capacity: '12 guests',
                year: '2020',
                location: 'Mediterranean'
            },
            callbackUrl: 'https://httpbin.org/post',
            callId: 'test_yacht_desc',
            model: 'gpt-4o-mini',
            options: {
                temperature: 0.8,
                max_tokens: 300
            }
        });
        
        console.log(`✅ Yacht request submitted: ${yachtResponse.data.callId}\n`);
        
        // 2. Test customer inquiry processing
        console.log('2️⃣ Testing customer inquiry processing...');
        const inquiryResponse = await axios.post(`${BASE_URL}/process`, {
            instructions: 'You are a yacht charter customer service expert. Analyze customer inquiries and provide helpful responses.',
            data: {
                customer_name: 'John Smith',
                inquiry: 'I am looking for a yacht for 8 people for a week in the Caribbean. What would you recommend?',
                budget: '$50,000',
                dates: 'March 2024'
            },
            callbackUrl: 'https://httpbin.org/post',
            callId: 'test_customer_inquiry',
            model: 'gpt-4o-mini',
            options: {
                temperature: 0.7,
                max_tokens: 400
            }
        });
        
        console.log(`✅ Inquiry request submitted: ${inquiryResponse.data.callId}\n`);
        
        // 3. Test SEO content generation
        console.log('3️⃣ Testing SEO content generation...');
        const seoResponse = await axios.post(`${BASE_URL}/process`, {
            instructions: 'You are an SEO content expert. Generate optimized content for yacht charter websites.',
            data: {
                topic: 'Luxury Yacht Charter in Monaco',
                keywords: ['yacht charter', 'Monaco', 'luxury', 'Mediterranean'],
                target_audience: 'affluent travelers',
                content_type: 'blog post'
            },
            callbackUrl: 'https://httpbin.org/post',
            callId: 'test_seo_content',
            model: 'gpt-4o-mini',
            options: {
                temperature: 0.6,
                max_tokens: 500
            }
        });
        
        console.log(`✅ SEO request submitted: ${seoResponse.data.callId}\n`);
        
        // 4. Check status of all requests
        console.log('4️⃣ Checking status of all requests...');
        const statusPromises = [
            axios.get(`${BASE_URL}/status/test_yacht_desc`),
            axios.get(`${BASE_URL}/status/test_customer_inquiry`),
            axios.get(`${BASE_URL}/status/test_seo_content`)
        ];
        
        const statuses = await Promise.all(statusPromises);
        statuses.forEach((status, index) => {
            const callIds = ['test_yacht_desc', 'test_customer_inquiry', 'test_seo_content'];
            console.log(`${callIds[index]}:`, status.data);
        });
        console.log('');
        
        // 5. Wait for processing
        console.log('5️⃣ Waiting for processing...');
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        // 6. List all pending requests
        console.log('6️⃣ Listing all pending requests...');
        const listResponse = await axios.get(`${BASE_URL}/list`);
        console.log('Pending requests:', listResponse.data);
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testSimpleProcessor();
