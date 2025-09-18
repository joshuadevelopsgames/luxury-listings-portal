// Firebase Project Status Checker
// Run this with: node check-firebase.js

const https = require('https');

const projectId = 'luxury-listings-portal-e56de';
const apiKey = 'AIzaSyCNTi85Mc9Bpxiz_B9YKmQHsbkmkpaJzLQ';

console.log('🔍 Checking Firebase Project Status...');
console.log(`Project ID: ${projectId}`);
console.log(`API Key: ${apiKey.substring(0, 10)}...`);
console.log('');

// Check if the project exists and is accessible
function checkProjectStatus() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'firebase.googleapis.com',
            port: 443,
            path: `/v1beta1/projects/${projectId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
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

// Check Firestore API
function checkFirestoreAPI() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'firestore.googleapis.com',
            port: 443,
            path: `/v1/projects/${projectId}/databases/(default)/documents`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
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

async function runDiagnostics() {
    try {
        console.log('1. Checking Firebase Project Status...');
        const projectStatus = await checkProjectStatus();
        
        if (projectStatus.status === 200) {
            console.log('✅ Firebase project is accessible');
            console.log(`   Project Name: ${projectStatus.data.displayName || 'N/A'}`);
            console.log(`   Project Number: ${projectStatus.data.projectNumber || 'N/A'}`);
        } else {
            console.log(`❌ Firebase project check failed: ${projectStatus.status}`);
            console.log(`   Response: ${JSON.stringify(projectStatus.data, null, 2)}`);
        }
        
        console.log('');
        console.log('2. Checking Firestore API Access...');
        const firestoreStatus = await checkFirestoreAPI();
        
        if (firestoreStatus.status === 200) {
            console.log('✅ Firestore API is accessible');
            console.log(`   Documents found: ${firestoreStatus.data.documents ? firestoreStatus.data.documents.length : 0}`);
        } else if (firestoreStatus.status === 403) {
            console.log('❌ Firestore API access denied (403 Forbidden)');
            console.log('   This suggests a permissions issue with your API key or project configuration');
        } else if (firestoreStatus.status === 404) {
            console.log('❌ Firestore database not found (404 Not Found)');
            console.log('   This suggests the Firestore database may not be initialized');
        } else {
            console.log(`❌ Firestore API check failed: ${firestoreStatus.status}`);
            console.log(`   Response: ${JSON.stringify(firestoreStatus.data, null, 2)}`);
        }
        
        console.log('');
        console.log('3. Recommendations:');
        
        if (projectStatus.status === 200 && firestoreStatus.status === 403) {
            console.log('   - Your Firebase project exists but Firestore access is denied');
            console.log('   - Check your API key permissions in the Firebase Console');
            console.log('   - Ensure Firestore is enabled for your project');
            console.log('   - Verify the API key has the correct scopes');
        } else if (projectStatus.status === 200 && firestoreStatus.status === 404) {
            console.log('   - Your Firebase project exists but Firestore is not initialized');
            console.log('   - Go to the Firebase Console and enable Firestore');
            console.log('   - Create a Firestore database in production mode');
        } else if (projectStatus.status !== 200) {
            console.log('   - There may be an issue with your Firebase project configuration');
            console.log('   - Verify the project ID and API key are correct');
            console.log('   - Check if the project is still active');
        }
        
    } catch (error) {
        console.error('❌ Error running diagnostics:', error.message);
    }
}

runDiagnostics();
