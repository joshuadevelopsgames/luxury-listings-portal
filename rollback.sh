#!/bin/bash

# Luxury Listings Portal Rollback Script
# This script allows you to rollback to any previous deployment

set -e  # Exit on any error

echo "🔄 Rollback Utility for Luxury Listings Portal"
echo "=============================================="

# Show available deployment tags
echo "📋 Available deployments:"
git tag --sort=-version:refname | head -20 | nl

echo ""
echo "Enter the number of the deployment you want to rollback to:"
read -p "Deployment number: " DEPLOYMENT_NUM

# Get the tag name from the number
TAG_NAME=$(git tag --sort=-version:refname | head -20 | sed -n "${DEPLOYMENT_NUM}p")

if [ -z "$TAG_NAME" ]; then
    echo "❌ Invalid deployment number"
    exit 1
fi

echo ""
echo "🔄 Rolling back to: $TAG_NAME"
echo "⚠️  This will reset your code to this exact state"
echo "Are you sure? (y/N)"
read -p "Confirm rollback: " CONFIRM

if [[ $CONFIRM =~ ^[Yy]$ ]]; then
    echo "🔄 Starting rollback..."
    
    # Stash any current changes
    git stash push -m "Stashing changes before rollback to $TAG_NAME"
    
    # Reset to the selected tag
    git reset --hard "$TAG_NAME"
    
    echo "✅ Rollback complete!"
    echo "📝 Current commit: $(git log --oneline -1)"
    
    # Ask if user wants to deploy the rollback
    echo ""
    echo "🚀 Deploy this rollback to production? (y/N)"
    read -p "Deploy rollback: " DEPLOY_CONFIRM
    
    if [[ $DEPLOY_CONFIRM =~ ^[Yy]$ ]]; then
        echo "🚀 Deploying rollback..."
        ./deploy.sh
    else
        echo "📝 Rollback complete. Run './deploy.sh' when ready to deploy."
    fi
else
    echo "❌ Rollback cancelled"
fi
