const express = require('express');
const router = express.Router();
const DiscordBotService = require('../services/DiscordBotService');

// Health check endpoint
router.get('/health', async (_req, res) => {
  try {
    const stats = await DiscordBotService.getStats();
    res.json({
      status: 'ok',
      bot: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stats endpoint
router.get('/stats', async (_req, res) => {
  try {
    const stats = await DiscordBotService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual trigger endpoint for testing
router.post('/test-query', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const response = await DiscordBotService.generateResponse(question);
    const stats = await DiscordBotService.getStats();
    
    res.json({
      question,
      response,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
