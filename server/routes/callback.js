const express = require('express');
const router = express.Router();

// Store for pending callbacks
const pendingCallbacks = new Map();

/**
 * POST /api/callback/register
 * Register a callback for async processing
 * Body: { callbackUrl, data, timeout }
 */
router.post('/register', async (req, res) => {
  try {
    const { callbackUrl, data, timeout = 30000 } = req.body;
    
    if (!callbackUrl || !data) {
      return res.status(400).json({ 
        error: 'Missing required fields: callbackUrl, data' 
      });
    }

    // Generate unique callback ID
    const callbackId = `cb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store callback info
    pendingCallbacks.set(callbackId, {
      callbackUrl,
      data,
      timeout,
      createdAt: Date.now(),
      status: 'pending'
    });

    // Set timeout to clean up
    setTimeout(() => {
      if (pendingCallbacks.has(callbackId)) {
        pendingCallbacks.delete(callbackId);
      }
    }, timeout + 10000); // Extra 10s buffer

    console.log(`📝 Registered callback ${callbackId} for ${callbackUrl}`);
    
    res.json({
      callbackId,
      status: 'registered',
      message: 'Callback registered successfully'
    });

  } catch (error) {
    console.error('Error registering callback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/callback/complete/:callbackId
 * Complete a callback with result data
 * Body: { result, status }
 */
router.post('/complete/:callbackId', async (req, res) => {
  try {
    const { callbackId } = req.params;
    const { result, status = 'success' } = req.body;
    
    const callback = pendingCallbacks.get(callbackId);
    
    if (!callback) {
      return res.status(404).json({ 
        error: 'Callback not found or expired' 
      });
    }

    // Update callback status
    callback.status = status;
    callback.completedAt = Date.now();
    callback.result = result;

    // Send callback to WordPress
    try {
      const axios = require('axios');
      
      const response = await axios.post(callback.callbackUrl, {
        callbackId,
        status,
        result,
        completedAt: callback.completedAt,
        processingTime: callback.completedAt - callback.createdAt
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DMA-Callback-Service/1.0'
        }
      });

      console.log(`✅ Callback ${callbackId} completed successfully`);
      
      // Clean up
      pendingCallbacks.delete(callbackId);
      
      res.json({
        status: 'success',
        message: 'Callback completed and sent to WordPress',
        callbackId
      });

    } catch (callbackError) {
      console.error(`❌ Failed to send callback ${callbackId}:`, callbackError.message);
      
      res.status(500).json({
        error: 'Callback registered but failed to send to WordPress',
        callbackId,
        details: callbackError.message
      });
    }

  } catch (error) {
    console.error('Error completing callback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/callback/status/:callbackId
 * Check status of a callback
 */
router.get('/status/:callbackId', (req, res) => {
  try {
    const { callbackId } = req.params;
    const callback = pendingCallbacks.get(callbackId);
    
    if (!callback) {
      return res.status(404).json({ 
        error: 'Callback not found or expired' 
      });
    }

    res.json({
      callbackId,
      status: callback.status,
      createdAt: callback.createdAt,
      completedAt: callback.completedAt,
      processingTime: callback.completedAt ? 
        callback.completedAt - callback.createdAt : null
    });

  } catch (error) {
    console.error('Error checking callback status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/callback/list
 * List all pending callbacks (for debugging)
 */
router.get('/list', (req, res) => {
  try {
    const callbacks = Array.from(pendingCallbacks.entries()).map(([id, data]) => ({
      callbackId: id,
      status: data.status,
      createdAt: data.createdAt,
      callbackUrl: data.callbackUrl,
      timeout: data.timeout
    }));

    res.json({
      total: callbacks.length,
      callbacks
    });

  } catch (error) {
    console.error('Error listing callbacks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/callback/:callbackId
 * Cancel a pending callback
 */
router.delete('/:callbackId', (req, res) => {
  try {
    const { callbackId } = req.params;
    
    if (pendingCallbacks.has(callbackId)) {
      pendingCallbacks.delete(callbackId);
      console.log(`🗑️ Cancelled callback ${callbackId}`);
      
      res.json({
        status: 'success',
        message: 'Callback cancelled'
      });
    } else {
      res.status(404).json({
        error: 'Callback not found'
      });
    }

  } catch (error) {
    console.error('Error cancelling callback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
