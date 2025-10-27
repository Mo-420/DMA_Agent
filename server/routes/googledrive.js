const express = require('express');
const router = express.Router();
const GoogleDriveService = require('../services/GoogleDriveService');

router.get('/status', async (_req, res) => {
  try {
    const tokens = await require('../utils/TokenStore').getToken('google-drive');
    res.json({
      ready: GoogleDriveService.isReady,
      hasTokens: Boolean(tokens),
      expiresAt: tokens?.expiry_date || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/auth/url', (req, res) => {
  try {
    const url = GoogleDriveService.getAuthUrl();
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search files in Google Drive
router.post('/search', async (req, res) => {
  try {
    const { query, mimeType } = req.body;
    const results = await GoogleDriveService.searchFiles(query, mimeType);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get file content
router.get('/files/:fileId/content', async (req, res) => {
  try {
    const { fileId } = req.params;
    const result = await GoogleDriveService.getFileContent(fileId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get file metadata
router.get('/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await GoogleDriveService.getFileById(fileId);
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List recent files
router.get('/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const files = await GoogleDriveService.listRecentFiles(parseInt(limit));
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search documents specifically
router.post('/documents/search', async (req, res) => {
  try {
    const { query } = req.body;
    const results = await GoogleDriveService.searchDocuments(query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mock endpoints for development
router.get('/mock/files', async (req, res) => {
  try {
    const files = GoogleDriveService.getMockDriveFiles();
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/mock/files/:fileId/content', async (req, res) => {
  try {
    const { fileId } = req.params;
    const content = GoogleDriveService.getMockFileContent(fileId);
    if (!content) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
