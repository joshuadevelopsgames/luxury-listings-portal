// Test Firebase Admin SDK (works with 2FA)
// Run with: node test-firebase-admin.js

const admin = require('firebase-admin');

// You'll need to download a service account key from Firebase Console
// Go to: Project Settings > Service Accounts > Generate New Private Key

const serviceAccount = {
  // You'll need to replace this with your actual service account key
  // Download it from: https://console.firebase.google.com/project/luxury-listings-portal-e56de/settings/serviceaccounts/adminsdk
  "type": "service_account",
  "project_id": "luxury-listings-portal-e56de",
  // ... rest of the key will be added when you download it
};

async function testFirebaseAdmin() {
  try {
    console.log('🔍 Testing Firebase Admin SDK...');
    
    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'luxury-listings-portal-e56de'
    });

    const db = admin.firestore();

    // Test Firestore access
    console.log('📊 Testing Firestore collections...');
    
    const collections = ['approved_users', 'pending_users', 'users', 'tasks'];
    
    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).get();
        console.log(`✅ ${collectionName}: ${snapshot.size} documents`);
        
        if (snapshot.size > 0) {
          snapshot.forEach(doc => {
            console.log(`   - ${doc.id}: ${JSON.stringify(doc.data())}`);
          });
        }
      } catch (error) {
        console.log(`❌ ${collectionName}: ${error.message}`);
      }
    }

    console.log('🎉 Firebase Admin SDK test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 To fix this:');
    console.log('1. Go to: https://console.firebase.google.com/project/luxury-listings-portal-e56de/settings/serviceaccounts/adminsdk');
    console.log('2. Click "Generate new private key"');
    console.log('3. Download the JSON file');
    console.log('4. Replace the serviceAccount object in this file with the downloaded key');
  }
}

testFirebaseAdmin();
