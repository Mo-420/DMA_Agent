const app = require('./app');
const DiscordBotService = require('./services/DiscordBotService');

const DEFAULT_PORT = 3004;
const PORT = Number(process.env.PORT || process.env.SERVER_PORT || DEFAULT_PORT);

// Initialize Discord bot
DiscordBotService.initialize().catch(error => {
  console.error('Failed to initialize Discord bot:', error);
});

app.listen(PORT, () => {
  console.log(`DMA Agent server running on port ${PORT}`);
});
