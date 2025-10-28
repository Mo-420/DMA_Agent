const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Store for pending requests
const pendingRequests = new Map();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Your custom DMA Manual GPT Assistant ID
const DMA_ASSISTANT_ID = process.env.CUSTOM_GPT_ASSISTANT_ID || 'asst_cIa617hpcjmQIQKiqYsaZIZH';

/**
 * POST /api/openai-processor/process
 * Process data with OpenAI based on instructions and callback with results
 * Uses your custom DMA Manual GPT instead of regular GPT
 */
router.post('/process', async (req, res) => {
  try {
    const { 
      instructions,
      data,
      callbackUrl,
      callId,
      model = 'dma-manual-gpt', // Default to your custom GPT
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

    console.log(`🤖 Processing request ${finalCallId} with DMA Manual GPT`);

    // Process OpenAI request asynchronously
    processOpenAIRequest(finalCallId);

    res.json({
      callId: finalCallId,
      status: 'processing',
      message: 'Request submitted for DMA Manual GPT processing'
    });

  } catch (error) {
    console.error('Error submitting OpenAI request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Process OpenAI request using your custom DMA Manual GPT
 */
async function processOpenAIRequest(callId) {
  try {
    const request = pendingRequests.get(callId);
    if (!request) {
      console.error(`Request ${callId} not found`);
      return;
    }

    const { instructions, data, callbackUrl, model, options } = request;
    
    console.log(`🔄 Calling DMA Manual GPT for request ${callId}...`);
    
    // Use Assistants API with your custom GPT
    const assistant = await openai.beta.assistants.retrieve(DMA_ASSISTANT_ID);
    
    // Create a thread
    const thread = await openai.beta.threads.create();
    
    // Prepare the message content
    const messageContent = `Instructions: ${instructions}\n\nData to process: ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`;
    
    // Add message to thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: messageContent
    });
    
    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: DMA_ASSISTANT_ID
    });
    
    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
      if (runStatus.status === 'failed') {
        throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }
    
    // Get messages
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = messages.data[0].content[0].text.value;

    const result = {
      callId,
      status: 'success',
      response: response.trim(),
      model: 'dma-manual-gpt',
      assistantId: DMA_ASSISTANT_ID,
      processedAt: Date.now(),
      processingTime: Date.now() - request.createdAt,
      instructions,
      originalData: data,
      usage: {
        // Assistants API doesn't provide detailed usage stats
        model: 'dma-manual-gpt',
        assistant_id: DMA_ASSISTANT_ID
      }
    };

    console.log(`✅ DMA Manual GPT request ${callId} completed successfully`);

    // Send callback to WordPress
    await sendCallback(callbackUrl, result);

    // Clean up
    pendingRequests.delete(callId);

  } catch (error) {
    console.error(`❌ DMA Manual GPT request ${callId} failed:`, error.message);
    
    const errorResult = {
      callId,
      status: 'error',
      error: error.message,
      errorType: error.constructor.name,
      processedAt: Date.now(),
      processingTime: Date.now() - (pendingRequests.get(callId)?.createdAt || Date.now()),
      model: 'dma-manual-gpt',
      instructions: request.instructions,
      originalData: request.data
    };

    // Send error callback
    await sendCallback(request.callbackUrl, errorResult);
    
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
        'User-Agent': 'DMA-Manual-GPT-Processor/1.0'
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
