const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Store for pending OpenAI requests
const pendingRequests = new Map();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/openai-callback/chat
 * Process OpenAI chat completion and callback with results
 * Body: { 
 *   callbackUrl, 
 *   messages, 
 *   model, 
 *   options,
 *   requestId (optional)
 * }
 */
router.post('/chat', async (req, res) => {
  try {
    const { 
      callbackUrl, 
      messages, 
      model = 'gpt-4o-mini',
      options = {},
      requestId 
    } = req.body;
    
    if (!callbackUrl || !messages) {
      return res.status(400).json({ 
        error: 'Missing required fields: callbackUrl, messages' 
      });
    }

    // Generate unique request ID if not provided
    const requestId_final = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store request info
    pendingRequests.set(requestId_final, {
      callbackUrl,
      messages,
      model,
      options,
      createdAt: Date.now(),
      status: 'processing'
    });

    console.log(`🤖 Processing OpenAI request ${requestId_final} with model ${model}`);

    // Process OpenAI request asynchronously
    processOpenAIRequest(requestId_final);

    res.json({
      requestId: requestId_final,
      status: 'processing',
      message: 'OpenAI request submitted for processing'
    });

  } catch (error) {
    console.error('Error submitting OpenAI request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Process OpenAI request and send callback
 */
async function processOpenAIRequest(requestId) {
  try {
    const request = pendingRequests.get(requestId);
    if (!request) {
      console.error(`Request ${requestId} not found`);
      return;
    }

    const { callbackUrl, messages, model, options } = request;
    
    // Default options
    const defaultOptions = {
      temperature: 0.7,
      max_tokens: 1000,
      presence_penalty: 0,
      frequency_penalty: 0
    };
    
    const finalOptions = { ...defaultOptions, ...options };

    console.log(`🔄 Calling OpenAI API for request ${requestId}...`);
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model,
      messages,
      ...finalOptions
    });

    const result = {
      requestId,
      model,
      response: completion.choices[0].message.content,
      usage: completion.usage,
      finishReason: completion.choices[0].finish_reason,
      processedAt: Date.now(),
      processingTime: Date.now() - request.createdAt
    };

    console.log(`✅ OpenAI request ${requestId} completed successfully`);

    // Send callback to WordPress
    await sendCallback(callbackUrl, requestId, 'success', result);

    // Clean up
    pendingRequests.delete(requestId);

  } catch (error) {
    console.error(`❌ OpenAI request ${requestId} failed:`, error.message);
    
    const errorResult = {
      requestId,
      error: error.message,
      errorType: error.constructor.name,
      processedAt: Date.now(),
      processingTime: Date.now() - (pendingRequests.get(requestId)?.createdAt || Date.now())
    };

    // Send error callback
    await sendCallback(request.callbackUrl, requestId, 'error', errorResult);
    
    // Clean up
    pendingRequests.delete(requestId);
  }
}

/**
 * Send callback to WordPress
 */
async function sendCallback(callbackUrl, requestId, status, result) {
  try {
    const axios = require('axios');
    
    const payload = {
      requestId,
      status,
      result,
      timestamp: new Date().toISOString()
    };

    console.log(`📤 Sending callback for request ${requestId} to ${callbackUrl}`);
    
    const response = await axios.post(callbackUrl, payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DMA-OpenAI-Callback-Service/1.0'
      }
    });

    console.log(`✅ Callback sent successfully for request ${requestId}`);
    
  } catch (callbackError) {
    console.error(`❌ Failed to send callback for request ${requestId}:`, callbackError.message);
  }
}

/**
 * GET /api/openai-callback/status/:requestId
 * Check status of an OpenAI request
 */
router.get('/status/:requestId', (req, res) => {
  try {
    const { requestId } = req.params;
    const request = pendingRequests.get(requestId);
    
    if (!request) {
      return res.status(404).json({ 
        error: 'Request not found or completed' 
      });
    }

    res.json({
      requestId,
      status: request.status,
      createdAt: request.createdAt,
      model: request.model,
      processingTime: Date.now() - request.createdAt
    });

  } catch (error) {
    console.error('Error checking request status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/openai-callback/list
 * List all pending requests
 */
router.get('/list', (req, res) => {
  try {
    const requests = Array.from(pendingRequests.entries()).map(([id, data]) => ({
      requestId: id,
      status: data.status,
      createdAt: data.createdAt,
      model: data.model,
      callbackUrl: data.callbackUrl
    }));

    res.json({
      total: requests.length,
      requests
    });

  } catch (error) {
    console.error('Error listing requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/openai-callback/batch
 * Process multiple OpenAI requests in batch
 * Body: { 
 *   callbackUrl, 
 *   requests: [{ messages, model, options, requestId }]
 * }
 */
router.post('/batch', async (req, res) => {
  try {
    const { callbackUrl, requests } = req.body;
    
    if (!callbackUrl || !requests || !Array.isArray(requests)) {
      return res.status(400).json({ 
        error: 'Missing required fields: callbackUrl, requests (array)' 
      });
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const requestIds = [];

    console.log(`📦 Processing batch ${batchId} with ${requests.length} requests`);

    // Process each request
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      const requestId = request.requestId || `${batchId}_${i}`;
      
      // Store request info
      pendingRequests.set(requestId, {
        callbackUrl,
        messages: request.messages,
        model: request.model || 'gpt-4o-mini',
        options: request.options || {},
        createdAt: Date.now(),
        status: 'processing',
        batchId
      });

      requestIds.push(requestId);
      
      // Process asynchronously
      processOpenAIRequest(requestId);
    }

    res.json({
      batchId,
      requestIds,
      status: 'processing',
      message: `Batch of ${requests.length} requests submitted for processing`
    });

  } catch (error) {
    console.error('Error submitting batch request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
