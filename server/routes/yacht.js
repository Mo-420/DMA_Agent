const express = require('express');
const router = express.Router();
const YachtService = require('../services/YachtService');

// Get yacht availability
router.get('/availability', async (req, res) => {
  try {
    const { startDate, endDate, location, yachtType } = req.query;
    const availability = await YachtService.getAvailability({
      startDate,
      endDate,
      location,
      yachtType
    });
    res.json(availability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get yacht details
router.get('/:id', async (req, res) => {
  try {
    const yacht = await YachtService.getYachtDetails(req.params.id);
    res.json(yacht);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search yachts
router.post('/search', async (req, res) => {
  try {
    const { criteria } = req.body;
    const results = await YachtService.searchYachts(criteria);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Book yacht
router.post('/book', async (req, res) => {
  try {
    const { yachtId, startDate, endDate, guestInfo } = req.body;
    const booking = await YachtService.createBooking({
      yachtId,
      startDate,
      endDate,
      guestInfo
    });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get booking status
router.get('/booking/:id', async (req, res) => {
  try {
    const booking = await YachtService.getBookingStatus(req.params.id);
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear cache
router.post('/cache/clear', async (_req, res) => {
  try {
    YachtService.clearCache();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status', async (_req, res) => {
  try {
    res.json({
      apiConfigured: Boolean(process.env.YACHT_API_KEY || process.env.YACHTSUMMARY_API_KEY),
      cacheTtlMs: Number(process.env.YACHT_CACHE_TTL_MS || 5 * 60 * 1000)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
