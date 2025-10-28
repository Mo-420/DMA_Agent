#!/bin/bash

echo "🚀 DMA Discord Bot - Automated Deployment Script"
echo "================================================"
echo ""

# Check if user provided GitHub username
if [ -z "$1" ]; then
    echo "❌ Error: GitHub username required"
    echo ""
    echo "Usage: ./deploy.sh YOUR_GITHUB_USERNAME"
    echo ""
    echo "Steps:"
    echo "1. Create repository on GitHub: https://github.com/new"
    echo "2. Name it: DMA_Agent"
    echo "3. Run: ./deploy.sh YOUR_USERNAME"
    exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME="DMA_Agent"

echo "📦 Setting up repository for: $GITHUB_USERNAME"
echo ""

# Check if remote already exists
if git remote | grep -q "^origin$"; then
    echo "⚠️  Remote 'origin' already exists"
    echo "Removing existing remote..."
    git remote remove origin
fi

# Add GitHub remote
echo "🔗 Adding GitHub remote..."
git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git

# Rename branch to main if needed
git branch -M main

# Push to GitHub
echo ""
echo "📤 Pushing code to GitHub..."
echo ""

git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Code pushed successfully to GitHub!"
    echo ""
    echo "🌐 Next steps:"
    echo "1. Go to https://render.com"
    echo "2. Sign up with GitHub"
    echo "3. Click 'New' → 'Web Service'"
    echo "4. Select repository: $REPO_NAME"
    echo "5. Follow steps in RENDER_SETUP.md"
else
    echo ""
    echo "❌ Push failed!"
    echo ""
    echo "Make sure you:"
    echo "1. Created the repository on GitHub first: https://github.com/new"
    echo "2. Have GitHub CLI installed or authenticated with git"
fi
