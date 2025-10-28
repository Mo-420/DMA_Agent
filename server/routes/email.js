const router = require('express').Router();
const EmailDraftService = require('../services/EmailDraftService');

router.post('/draft', async (req, res) => {
  try {
    const draft = await EmailDraftService.createDraft(req.body || {});
    res.json(draft);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;




