const express = require('express');
const router = express.Router();
const ClientProfileService = require('../services/ClientProfileService');

router.get('/:clientId', async (req, res) => {
  try {
    const profile = await ClientProfileService.getClientProfile(req.params.clientId);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:clientId/chats', async (req, res) => {
  try {
    const chats = await ClientProfileService.getClientChats(req.params.clientId);
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const results = await ClientProfileService.searchClients(q);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;




