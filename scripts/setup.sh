#!/bin/bash

# DMA Agent Setup Script

echo "🚀 Setting up DMA Agent..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p documents
mkdir -p uploads
mkdir -p logs

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your API keys"
fi

# Install MCP servers globally
echo "🔧 Installing MCP servers..."
npm install -g @modelcontextprotocol/server-google-drive
npm install -g @modelcontextprotocol/server-filesystem

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys"
echo "2. Run 'npm run dev' to start the server"
echo "3. In another terminal, run 'cd client && npm start' to start the frontend"
echo ""
echo "The application will be available at:"
echo "- Backend: http://localhost:3000"
echo "- Frontend: http://localhost:3001"


