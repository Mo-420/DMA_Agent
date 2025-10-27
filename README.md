# DMA Agent

An AI-powered agent for document management and yacht availability, built with React, Node.js, and OpenAI's GPT models.

## Features

- **Document Management**: Upload, search, and analyze documents (PDF, DOCX, HTML, TXT)
- **Yacht Availability**: Check yacht availability, get details, and assist with bookings
- **AI Chat Interface**: Natural language interaction with the agent
- **MCP Integration**: Model Context Protocol for enhanced document access
- **Semantic Search**: AI-powered document search using embeddings
- **Discord Bot**: Discord bot that answers questions about the DMA manual using Google Drive integration

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key
- Google Drive API credentials (for MCP integration)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd /Users/mo/DMA_Agent
   npm run install:all
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your API keys
   ```

3. **Start the development server:**
   ```bash
   npm run dev          # defaults to port 3004
   ```

4. **Start the React client (in a new terminal):**
   ```bash
   cd client
   npm start            # proxies to port 3004
   ```

The application will be available at:
- Backend API: http://localhost:3004 (override via `PORT` or `SERVER_PORT`)
- Frontend: http://localhost:3001

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Google Drive Integration (for MCP)
GOOGLE_DRIVE_API_KEY=your_google_drive_api_key_here
GOOGLE_DRIVE_CLIENT_ID=your_google_drive_client_id_here
GOOGLE_DRIVE_CLIENT_SECRET=your_google_drive_client_secret_here
DRIVE_TOKEN_PATH=./tokens

# Yacht Availability API
YACHT_API_BASE_URL=https://api.yacht-availability.com
YACHT_API_KEY=your_yacht_api_key_here
YACHT_API_TIMEOUT=8000
YACHT_CACHE_TTL_MS=300000

# Yachtsummary Integration
YACHTSUMMARY_API_BASE_URL=https://api.yachtsummary.com
YACHTSUMMARY_API_KEY=your_yachtsummary_api_key_here
YACHTSUMMARY_API_TIMEOUT=8000

# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_GUILD_ID=your_dma_yachting_server_id_here
DMA_MANUAL_GOOGLE_DOC_ID=your_google_doc_id_here

# MoGPT Comparison (for testing)
MOGPT_MODEL=gpt-4o

# Server Configuration
PORT=3004
NODE_ENV=development
```

### MCP (Model Context Protocol) Setup

1. **Install MCP servers:**
   ```bash
   npm install -g @modelcontextprotocol/server-google-drive
   npm install -g @modelcontextprotocol/server-filesystem
   ```

2. **Configure MCP in your OpenAI agent builder:**
   - Use the `mcp-config.json` file as reference
   - Set up Google Drive integration for document access
   - Configure filesystem access for local documents

## Usage

### Document Management

1. **Upload Documents**: Use the document management interface to upload PDF, DOCX, HTML, or TXT files
2. **Search Documents**: Use natural language to search through your documents
3. **AI Analysis**: Ask the agent to analyze or summarize document content

### Yacht Availability

1. **Check Availability**: Ask about yacht availability for specific dates and locations
2. **Get Details**: Request detailed information about specific yachts
3. **Booking Assistance**: Get help with the booking process

### Chat Interface

The chat interface supports natural language interaction. Try these example queries:

- "Search for information about yacht maintenance in the manual"
- "What yachts are available next weekend in Monaco?"
- "Summarize the safety procedures from the DMA manual"
- "Help me book a yacht for 8 people"

## API Endpoints

### Chat API
- `POST /api/chat/message` - Send message to agent
- `GET /api/chat/history/:userId` - Get chat history
- `DELETE /api/chat/history/:userId` - Clear chat history
- `GET /api/chat/capabilities` - Get agent capabilities

### Document API
- `GET /api/documents` - Get all documents
- `GET /api/documents/:id` - Get specific document
- `POST /api/documents/search` - Search documents
- `POST /api/documents/upload` - Upload document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

### Yacht API
- `GET /api/yacht/availability` - Get yacht availability
- `GET /api/yacht/:id` - Get yacht details
- `POST /api/yacht/search` - Search yachts
- `POST /api/yacht/book` - Book yacht
- `GET /api/yacht/booking/:id` - Get booking status

### Discord API
- `GET /api/discord/health` - Check Discord bot status
- `GET /api/discord/stats` - Get Discord bot statistics
- `POST /api/discord/test-query` - Test bot query manually

## Discord Bot Setup

The Discord bot connects to your DMA Yachting Discord server and answers questions about the DMA manual from Google Drive.

### Setup Instructions

1. **Create Discord Application:**
   - Go to https://discord.com/developers/applications
   - Create a new application
   - Go to "Bot" section and create a bot
   - Copy the bot token and Client ID

2. **Configure Environment Variables:**
   - Set `DISCORD_BOT_TOKEN` with your bot token
   - Set `DISCORD_CLIENT_ID` with your application client ID
   - Set `DMA_MANUAL_GOOGLE_DOC_ID` with the Google Doc ID of your manual

3. **Add Bot to Server:**
   - Go to OAuth2 > URL Generator
   - Select "bot" scope and "Send Messages", "Read Message History", "Use Slash Commands" permissions
   - Use the generated URL to add bot to your server

4. **Slash Commands:**
   - `/ask` - Ask a question about the DMA manual
   - `/manual-search` - Search for specific information
   - `/help` - Get help with bot commands

### Quality Testing

Run quality comparison tests against MoGPT:
```bash
npm run test:discord-quality
```

This generates a detailed report comparing bot responses to MoGPT responses with similarity metrics.

## Development

### Project Structure

```
DMA_Agent/
├── server/                 # Backend API
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── middleware/        # Authentication, etc.
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   └── services/      # API client
├── documents/             # Document storage
├── mcp-config.json       # MCP configuration
└── package.json          # Dependencies
```

### Adding New Features

1. **New API endpoints**: Add routes in `server/routes/`
2. **New services**: Add business logic in `server/services/`
3. **New UI components**: Add React components in `client/src/components/`
4. **New MCP tools**: Update `mcp-config.json` and add corresponding API endpoints

## Deployment

### Production Build

1. **Build the client:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure all API keys are correctly set in `.env`
2. **MCP Connection Issues**: Check MCP server configuration and network access
3. **Document Upload Issues**: Verify file permissions and storage directory
4. **Chat Not Working**: Check OpenAI API key and rate limits

### Logs

Check server logs for detailed error information:
```bash
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
