const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/documents', require('./routes/documents'));
app.use('/api/yacht', require('./routes/yacht'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/googledrive', require('./routes/googledrive'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/status', require('./routes/status'));
app.use('/api/email', require('./routes/email'));
app.use('/api/discord', require('./routes/discord'));

// Auth routes for Google Drive
app.get('/auth/google', async (req, res) => {
  try {
    const url = require('./services/GoogleDriveService').getAuthUrl();
    res.redirect(url);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Missing authorization code');
    }
    await require('./services/GoogleDriveService').handleOAuthCallback(code);
    res.send('Google Drive authorized successfully. You can close this window.');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'DMA Agent API is running' });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

module.exports = app;




// Callback API routes
app.use('/api/callback', require('./routes/callback'));


// OpenAI Callback API routes
app.use('/api/openai-callback', require('./routes/openai-callback'));


// OpenAI Processor API routes
app.use('/api/openai-processor', require('./routes/openai-processor'));

