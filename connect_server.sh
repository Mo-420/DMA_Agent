#!/bin/bash

echo "🔐 Connecting to Hetzner server..."

# Try to connect and run commands
ssh -o StrictHostKeyChecking=no -o PasswordAuthentication=yes root@78.46.232.79 << 'REMOTE_COMMANDS'
echo "✓ Connected to server!"
echo "Starting deployment..."

apt-get update -y
echo "✓ System updated"

curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
echo "✓ Node.js repository added"

apt-get install -y nodejs
echo "✓ Node.js installed"

npm install -g pm2
echo "✓ PM2 installed"

git clone https://github.com/Mo-420/DMA_Agent.git
echo "✓ Repository cloned"

cd DMA_Agent
npm install
echo "✓ Dependencies installed"

cp env.example .env
echo "✓ Environment file created"

echo "🎉 Deployment complete!"
echo "Next: Edit .env file and start bot with PM2"
REMOTE_COMMANDS

echo "✅ Deployment script completed!"
