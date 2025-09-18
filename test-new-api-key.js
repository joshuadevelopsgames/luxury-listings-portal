// Test New API Key
// Run this with: node test-new-api-key.js NEW_API_KEY_HERE

const https = require('https');

const projectId = 'luxury-listings-portal-e56de';
const newApiKey = process.argv[2];

if (!newApiKey) {
    console.log('❌ Please provide the new API key as an argument');
    console.log('Usage: node test-new-api-key.js YOUR_NEW_API_KEY');
    process.exit(1);
}

console.log('🔍 Testing New API Key...');
console.log(`Project ID: ${projectId}`);
console.log(`New API Key: ${newApiKey.substring(0, 10)}...`);
console.log('');

// Test Firestore API with new key
function testFirestoreWithNewKey() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'firestore.googleapis.com',
            port: 443,
            path: `/v1/projects/${projectId}/databases/(default)/documents?key=${newApiKey}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve({ status: res.statusCode, data: response });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function testNewKey() {
    try {
        console.log('Testing Firestore API with new key...');
        const result = await testFirestoreWithNewKey();
        
        if (result.status === 200) {
            console.log('✅ SUCCESS! New API key works');
            console.log(`   Documents found: ${result.data.documents ? result.data.documents.length : 0}`);
            
            if (result.data.documents && result.data.documents.length > 0) {
                console.log('🎉 Your user data is still there!');
                console.log('   Collections found:');
                const collections = new Set();
                result.data.documents.forEach(doc => {
                    const pathParts = doc.name.split('/');
                    if (pathParts.length >= 4) {
                        collections.add(pathParts[3]);
                    }
                });
                collections.forEach(collection => {
                    console.log(`   - ${collection}`);
                });
            } else {
                console.log('⚠️  No documents found - database may be empty');
            }
        } else if (result.status === 403) {
            console.log('❌ New API key still has permission issues');
            console.log('   You may need to enable additional APIs or check permissions');
        } else if (result.status === 404) {
            console.log('❌ Firestore database not found');
            console.log('   You may need to create the Firestore database first');
        } else {
            console.log(`❌ Unexpected response: ${result.status}`);
            console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
        }
        
    } catch (error) {
        console.error('❌ Error testing new key:', error.message);
    }
}

testNewKey();
