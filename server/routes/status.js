const router = require('express').Router();
const GoogleDriveService = require('../services/GoogleDriveService');

router.get('/integrations', async (_req, res) => {
  try {
    const driveTokens = await require('../utils/TokenStore').getToken('google-drive');
    res.json({
      driveReady: Boolean(GoogleDriveService.isReady && driveTokens),
      driveExpiresAt: driveTokens?.expiry_date || null,
      yachtApiReady: Boolean(process.env.YACHT_API_KEY || process.env.YACHTSUMMARY_API_KEY),
      clientApiReady: Boolean(process.env.YACHTSUMMARY_API_KEY)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

