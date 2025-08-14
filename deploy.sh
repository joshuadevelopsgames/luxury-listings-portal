#!/bin/bash

# Luxury Listings Portal Deployment Script
# This script builds, commits, and deploys your application

set -e  # Exit on any error

echo "🚀 Starting deployment process..."

# Check if we have uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo "📝 Committing changes..."
    git add .
    git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S') - Auto-deployment"
    echo "✅ Changes committed"
else
    echo "📝 No changes to commit"
fi

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
npx vercel --prod

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    
    # Get the deployment URL
    DEPLOYMENT_URL=$(npx vercel --prod --json | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    echo "🌐 Your app is live at: $DEPLOYMENT_URL"
    
    # Create a deployment tag
    TAG_NAME="deploy-$(date '+%Y%m%d-%H%M%S')"
    git tag "$TAG_NAME"
    echo "🏷️  Created deployment tag: $TAG_NAME"
    
    echo "🎉 Deployment complete!"
else
    echo "❌ Deployment failed"
    exit 1
fi
