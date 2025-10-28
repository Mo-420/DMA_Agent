#!/bin/bash

echo "🚀 DMA Discord Bot - Hetzner Server Deployment"
echo "=============================================="
echo ""

SERVER_IP="78.46.232.79"
SERVER_USER="root"
SERVER_PASS="weQh4Cff8sHEU?y2i1K8FWMMWy1syz/StGMItGYZBW70paHY3Q3SudTOE"

echo "📡 Connecting to Hetzner server..."
echo ""

# Install sshpass if not available
if ! command -v sshpass &> /dev/null; then
    echo "Installing sshpass..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass
    else
        sudo apt-get install -y sshpass
    fi
fi

echo "🔧 Setting up server..."

# Run deployment commands on the server
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'REMOTE_SCRIPT'
    echo "Updating system..."
    apt-get update -y
    
    echo "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    echo "Installing PM2..."
    npm install -g pm2
    
    echo "Cloning repository..."
    if [ -d "DMA_Agent" ]; then
        cd DMA_Agent
        git pull
    else
        git clone https://github.com/Mo-420/DMA_Agent.git
        cd DMA_Agent
    fi
    
    echo "Installing dependencies..."
    npm install
    
    echo "Setting up environment..."
    if [ ! -f ".env" ]; then
        cp env.example .env
        echo "⚠️  Please edit .env file with your actual values!"
    fi
    
    echo "Starting bot with PM2..."
    pm2 stop dma-bot 2>/dev/null || true
    pm2 delete dma-bot 2>/dev/null || true
    pm2 start server/index.js --name dma-bot
    pm2 save
    pm2 startup
    
    echo "✅ Bot deployed successfully!"
    echo ""
    echo "📊 Bot status:"
    pm2 status
REMOTE_SCRIPT

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. SSH to server: ssh root@78.46.232.79"
echo "2. Edit environment: cd DMA_Agent && nano .env"
echo "3. Restart bot: pm2 restart dma-bot"
echo "4. Check logs: pm2 logs dma-bot"
echo ""
echo "🌐 Your bot is now running 24/7!"

