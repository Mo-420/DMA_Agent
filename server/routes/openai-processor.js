const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Store for pending requests
const pendingRequests = new Map();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/openai-processor/process
 * Process data with OpenAI based on instructions and callback with results
 * Body: { 
 *   instructions,    // System prompt/instructions for OpenAI
 *   data,           // Data to process (can be string, object, array, etc.)
 *   callbackUrl,    // URL to call back with results
 *   callId,         // Optional custom call ID
 *   model,          // Optional OpenAI model (default: gpt-5)
 *   options         // Optional OpenAI options
 * }
 */
router.post('/process', async (req, res) => {
  try {
    const { 
      instructions,
      data,
      callbackUrl,
      callId,
      model = 'gpt-5',
      options = {}
    } = req.body;
    
    if (!instructions || !data || !callbackUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields: instructions, data, callbackUrl' 
      });
    }

    // Generate unique call ID if not provided
    const finalCallId = callId || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store request info
    pendingRequests.set(finalCallId, {
      instructions,
      data,
      callbackUrl,
      model,
      options,
      createdAt: Date.now(),
      status: 'processing'
    });

    console.log(`🤖 Processing OpenAI request ${finalCallId} with model ${model}`);

    // Process OpenAI request asynchronously
    processOpenAIRequest(finalCallId);

    res.json({
      callId: finalCallId,
      status: 'processing',
      message: 'Request submitted for OpenAI processing'
    });

  } catch (error) {
    console.error('Error submitting OpenAI request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Process OpenAI request and send callback
 */
async function processOpenAIRequest(callId) {
  try {
    const request = pendingRequests.get(callId);
    if (!request) {
      console.error(`Request ${callId} not found`);
      return;
    }

    const { instructions, data, callbackUrl, model, options } = request;
    
    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: instructions
      },
      {
        role: 'user',
        content: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      }
    ];
    
    // Default options
    const defaultOptions = {
      temperature: 0.7,
      max_tokens: 1000,
      presence_penalty: 0,
      frequency_penalty: 0
    };
    
    const finalOptions = { ...defaultOptions, ...options };

    console.log(`🔄 Calling OpenAI API for request ${callId}...`);
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model,
      messages,
      ...finalOptions
    });

    const response = {
      callId,
      status: 'success',
      response: completion.choices[0].message.content,
      usage: completion.usage,
      finishReason: completion.choices[0].finish_reason,
      processedAt: Date.now(),
      processingTime: Date.now() - request.createdAt,
      model,
      instructions,
      originalData: data
    };

    console.log(`✅ OpenAI request ${callId} completed successfully`);

    // Send callback to WordPress
    await sendCallback(callbackUrl, response);

    // Clean up
    pendingRequests.delete(callId);

  } catch (error) {
    console.error(`❌ OpenAI request ${callId} failed:`, error.message);
    
    const errorResponse = {
      callId,
      status: 'error',
      error: error.message,
      errorType: error.constructor.name,
      processedAt: Date.now(),
      processingTime: Date.now() - (pendingRequests.get(callId)?.createdAt || Date.now()),
      model: request.model,
      instructions: request.instructions,
      originalData: request.data
    };

    // Send error callback
    await sendCallback(request.callbackUrl, errorResponse);
    
    // Clean up
    pendingRequests.delete(callId);
  }
}

/**
 * Send callback to WordPress
 */
async function sendCallback(callbackUrl, response) {
  try {
    const axios = require('axios');
    
    console.log(`📤 Sending callback for call ${response.callId} to ${callbackUrl}`);
    
    const result = await axios.post(callbackUrl, response, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DMA-OpenAI-Processor/1.0'
      }
    });

    console.log(`✅ Callback sent successfully for call ${response.callId}`);
    
  } catch (callbackError) {
    console.error(`❌ Failed to send callback for call ${response.callId}:`, callbackError.message);
  }
}

/**
 * GET /api/openai-processor/status/:callId
 * Check status of a request
 */
router.get('/status/:callId', (req, res) => {
  try {
    const { callId } = req.params;
    const request = pendingRequests.get(callId);
    
    if (!request) {
      return res.status(404).json({ 
        error: 'Request not found or completed' 
      });
    }

    res.json({
      callId,
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
 * GET /api/openai-processor/list
 * List all pending requests
 */
router.get('/list', (req, res) => {
  try {
    const requests = Array.from(pendingRequests.entries()).map(([id, data]) => ({
      callId: id,
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

module.exports = router;
