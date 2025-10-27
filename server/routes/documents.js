const express = require('express');
const router = express.Router();
const DocumentService = require('../services/DocumentService');
const { authenticateRequest } = require('../middleware/auth');

// Get all documents
router.get('/', async (req, res) => {
  try {
    const documents = await DocumentService.getAllDocuments();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific document
router.get('/:id', async (req, res) => {
  try {
    const document = await DocumentService.getDocument(req.params.id);
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search documents
router.post('/search', async (req, res) => {
  try {
    const { query, filters } = req.body;
    const results = await DocumentService.searchDocuments(query, filters);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload document
router.post('/upload', authenticateRequest, async (req, res) => {
  try {
    const { file, metadata } = req.body;
    const document = await DocumentService.uploadDocument(file, metadata);
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update document metadata
router.put('/:id', authenticateRequest, async (req, res) => {
  try {
    const document = await DocumentService.updateDocument(req.params.id, req.body);
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete document
router.delete('/:id', authenticateRequest, async (req, res) => {
  try {
    await DocumentService.deleteDocument(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

