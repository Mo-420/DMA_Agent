const router = require('express').Router();
const ChatService = require('../services/ChatService');

// Send message to agent
router.post('/message', async (req, res) => {
  try {
    const { message, context, userId } = req.body;
    const response = await ChatService.processMessage(message, context, userId);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get chat history
router.get('/history/:userId', async (req, res) => {
  try {
    const history = await ChatService.getChatHistory(req.params.userId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear chat history
router.delete('/history/:userId', async (req, res) => {
  try {
    await ChatService.clearChatHistory(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent capabilities
router.get('/capabilities', async (req, res) => {
  try {
    const capabilities = await ChatService.getAgentCapabilities();
    res.json(capabilities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/insights', async (req, res) => {
  try {
    const data = await ChatService.getAgentInsights(req.query.userId || 'default');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
