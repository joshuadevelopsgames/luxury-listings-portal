#!/bin/bash

# Deploy Firestore Security Rules
# This script deploys the appropriate Firestore rules based on environment

set -e

echo "🔥 Deploying Firestore Security Rules..."

# Check if Firebase CLI is installed locally
if [ ! -f "./node_modules/.bin/firebase" ]; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install firebase-tools --save-dev"
    exit 1
fi

# Use local Firebase CLI
FIREBASE_CLI="./node_modules/.bin/firebase"

# Check if user is logged in
if ! $FIREBASE_CLI projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run:"
    echo "$FIREBASE_CLI login"
    exit 1
fi

# Deploy the production rules (which require authentication)
echo "📋 Deploying production Firestore rules..."
$FIREBASE_CLI deploy --only firestore:rules --project luxury-listings-portal-e56de

if [ $? -eq 0 ]; then
    echo "✅ Firestore rules deployed successfully!"
    echo "🔐 Rules now require authentication for all operations"
    echo "📝 Make sure users are properly logged in before accessing Firestore"
else
    echo "❌ Failed to deploy Firestore rules"
    exit 1
fi

echo "🎉 Firestore rules deployment complete!"
