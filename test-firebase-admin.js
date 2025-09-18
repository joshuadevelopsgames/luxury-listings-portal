// Test Firebase Admin SDK (works with 2FA)
// Run with: node test-firebase-admin.js

const admin = require('firebase-admin');

// You'll need to download a service account key from Firebase Console
// Go to: Project Settings > Service Accounts > Generate New Private Key

const serviceAccount = {
  "type": "service_account",
  "project_id": "luxury-listings-portal-e56de",
  "private_key_id": "7be97c16911834ac052865d568d6153d4a3c82f4",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCzQeqslebB+opF\nKD5IQ6qaXaDkpvZ0QJseD+hTACUBfqIk8CnOTZtPil93saFmPLxFNAy/77egbycx\nzAusPtMHmDjhHHYrUJP7pCPSIM+Z583FqYg1KhRHI4vnXX8jAysGQCbq472dnbMy\nPIPhlEBg2amkJ/rBk4BdW4pKKxOPyXWZq/zHckBCi9Qr212MudYUObBCo40vqFY+\n9Y1OsdiPJELM1MhYdAJr3f/lyXGoIJjGUscTZZSJseOyA9OcxCp+zwiwluvdpTUN\n9kiT2JF64U7MdK5AfWhqzfJW/jnI6aDUg9iiVY77FJeXcct3zpmyXoYvYf2sgZ4k\n9N9llUwnAgMBAAECggEAJuuxfe6AL27sFa7ysvMKOEEK/Ypo6X3bkC/pBBh8cHIj\n13xTv2jnR2JmbxEg15dpU2dFO2lbh9iKfIvunuP3IueAthPdbnMs5k7Rvj6EhMip\nS3kPS2fLBlUn+8C3qYz3CwDj0k1HbtD+RvKPuetb/QtVg4BwuBYEIYEOKiNnOGkq\n+na9d1ES9t92fSUZIXgNmTOZDSTpWY2FDT5Yl09WFqzlzLxKiTv+AgOgVt4RHqAn\naV0DO8O8l4jlHisYhlqoLLdI5mivfxv9/GqXDE6Ng9HCzStKugDONkEuOWmZfGVv\nbsDep2QliMwza34gBf3t7ktWSRqqRCQxIi6QvHt1HQKBgQDXK7nl7RVwmy6/q1nS\ncPAc9hi02fbAtYinWHFtrlWZ5VkZhbDhdlg2WNQ3dRjicjbhaAZOmSS0kawjwuxF\nxJVO1o7DaoNpgtY7BSa/hs8oDOXuNK4K+5MjoVx+j1AzSGMKIwFi4tuaWeVN/RGK\n5jmt0FlCKoj6lpbX51Gwz6++WwKBgQDVRaRxOD8s3XH6l+ItDS0YE9fz8Dfiu3f6\n6nLtZK+pMg5dxcs2HT5qhOiVZoIyhw41vo9QTJNIxz/pRpGCnDCA8OFwZOkwA7lp\nu14xqZmOqfMEtxQG7IRLArgDNb3b75fjzrrvSgAGOcKqB7tygAFs33O6TOtyKgyu\nnLTJlZirJQKBgAv5S/QGmH3WtOhHocz7KfGCpGdUBc49i+g8HLvMysiwoZ+w9+Hk\nEw6bLNwVMRhQ4Mr0Xf17ujYuMRUgYMOVJ/XmLLWlNMDnXgKUy842s0p4RUdXOSQ1\nUb/W1+3XDdB8w74pqocVNsFFJWSMo7BGFYmdoYn0EgFX5fcH0Vz0gcQnAoGADeBC\nGru2II0n5U4MgTHiRTbFTjHK8Q2ReNnYMGnko/WFycQcvKCadwO+vjm1LuRqoESN\nvoO88XdFSUA2J3FSFpGVmWJ3aZBUd/Sg5EpMm2OjVCM1Ql4RHXBH2K2edLjaARBq\nSTdfWQhZCgcGwyRg81x2gyCOERd7S8EWYidBj6ECgYEAgaMZ+w4dC/pWSAkGZubI\nJY75UIzulsbEBMWHQEP1KBuUzdOfj7V4Bxg1u9H82er6a2Vb/bCxQ1XC6XUoFThW\nTzEV7wrTBfBw8Gva5qIVfQt+1BRGJYFr3NFgVXsTuJ/EGNb693NZOTiJxHyzJrYW\ncmpwQeh1Ql/lHqBOOZdpsQQ=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@luxury-listings-portal-e56de.iam.gserviceaccount.com",
  "client_id": "116671210810225533214",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40luxury-listings-portal-e56de.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
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
