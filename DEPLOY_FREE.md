# 🆓 Deploy Discord Bot for FREE

## Option 1: Oracle Cloud (BEST - Truly Free Forever)

### Setup Steps:
1. Create account at: https://cloud.oracle.com/
2. Create VM:
   - Image: Ubuntu 22.04
   - Shape: VM.Standard.A1.Flex (ARM64)
   - OCPUs: 2 (FREE)
   - RAM: 12 GB (FREE)
   - Storage: 200 GB (FREE)
3. SSH into VM and run:
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone your repo
git clone YOUR_REPO_URL
cd DMA_Agent

# Install dependencies
npm install

# Setup PM2 (keeps bot running)
sudo npm install -g pm2

# Start bot
pm2 start server/index.js --name dma-bot
pm2 save
pm2 startup
```

## Option 2: Fly.io (FREE tier: 3 VMs)

```bash
# Install fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
fly launch

# Deploy
fly deploy
```

## Option 3: Render.com (FREE tier available)

1. Go to: https://render.com
2. Connect GitHub repo
3. Create "Web Service"
4. Add environment variables
5. Deploy!

---

**RECOMMENDED: Oracle Cloud** - Most resources, truly free forever

Want me to create a deployment script for Oracle Cloud?

