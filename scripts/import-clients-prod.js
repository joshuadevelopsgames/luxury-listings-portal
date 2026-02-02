#!/usr/bin/env node
/**
 * Import clients directly to production Firestore
 * Run: node scripts/import-clients-prod.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with default credentials
// This uses GOOGLE_APPLICATION_CREDENTIALS env var or gcloud auth
admin.initializeApp({
  projectId: 'luxury-listings-portal-e56de'
});

const db = admin.firestore();

// Full client data from the spreadsheet
const CLIENTS_DATA = [
  // Dylan's clients
  {
    clientName: 'The Agency Corp',
    tier: 'A',
    instagramUsername: '@theagencyre',
    platforms: { instagram: true, linkedin: true, youtube: true, facebook: true, tiktok: false, x: false },
    assignedManagerName: 'Dylan',
    hasAds: true
  },
  {
    clientName: 'The Agency New York',
    tier: 'B',
    instagramUsername: '@theagencynewyork',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Dylan',
    hasAds: false
  },
  {
    clientName: 'The Agency SoCal',
    tier: 'B',
    instagramUsername: '@theagencysocal',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Dylan',
    hasAds: false
  },
  {
    clientName: 'The Agency NorthCal',
    tier: 'B',
    instagramUsername: '@theresopteam',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Dylan',
    hasAds: false
  },
  {
    clientName: 'The Agency Naples',
    tier: 'B',
    instagramUsername: '@theagencynaplesfl',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Dylan',
    hasAds: false
  },

  // Mikayla's clients
  {
    clientName: 'Heather Domi',
    tier: 'A',
    instagramUsername: '@heatherdomi.re',
    platforms: { instagram: true, linkedin: true, youtube: true, facebook: true, tiktok: false, x: false },
    assignedManagerName: 'Mikayla',
    hasAds: true
  },
  {
    clientName: 'Compass Sports and Entertainment',
    tier: 'A',
    instagramUsername: '@compass.se',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Mikayla',
    hasAds: false
  },
  {
    clientName: 'Blair Chang',
    tier: 'B',
    instagramUsername: '@blairchang_re',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Mikayla',
    hasAds: false
  },
  {
    clientName: 'Whitney McLaughlin',
    tier: 'B',
    instagramUsername: '@mclaughlinteam',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Mikayla',
    hasAds: false
  },
  {
    clientName: 'The Agency Austin',
    tier: 'B',
    instagramUsername: '@theagency.austin',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Mikayla',
    hasAds: false
  },
  {
    clientName: 'The Resop Team',
    tier: 'B',
    instagramUsername: '@theresopteam',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Mikayla',
    hasAds: false
  },
  {
    clientName: 'The Agency Florida Keys',
    tier: 'B',
    instagramUsername: '@theagencyfloridakeys',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Mikayla',
    hasAds: false
  },

  // Daniella's clients
  {
    clientName: 'Stockton Group',
    tier: 'A',
    instagramUsername: '@thestocktongroup_vail',
    platforms: { instagram: true, facebook: true, youtube: true, linkedin: false, tiktok: false, x: false },
    assignedManagerName: 'Daniella',
    hasAds: false
  },
  {
    clientName: 'Meg Garrido',
    tier: 'A',
    instagramUsername: '@makeitmegatlvail',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Daniella',
    hasAds: false
  },
  {
    clientName: 'Tye Stockton',
    tier: 'A',
    instagramUsername: '@tyestocktonvail',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Daniella',
    hasAds: false
  },
  {
    clientName: "The Agency Martha's Vineyard",
    tier: 'B',
    instagramUsername: '@theagencymarthasvineyard',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Daniella',
    hasAds: false
  },
  {
    clientName: 'Kirstin Stroh (Naples)',
    tier: 'B',
    instagramUsername: '@kristin_stroh',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Daniella',
    hasAds: false
  },
  {
    clientName: 'The Agency NWFL',
    tier: 'B',
    instagramUsername: '@theagency.nwfl',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Daniella',
    hasAds: false,
    notes: 'Ending Feb'
  },

  // Matthew's clients
  {
    clientName: 'HQ Residences Miami',
    tier: 'A',
    instagramUsername: '@hqresidences',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Matthew',
    hasAds: false
  },

  // Michelle's clients
  {
    clientName: 'The Agency Cayman',
    tier: 'A',
    instagramUsername: '@theagencyrecayman',
    platforms: { instagram: true, linkedin: true, youtube: true, facebook: true, tiktok: false, x: false },
    assignedManagerName: 'Michelle',
    hasAds: true
  },
  {
    clientName: 'Stefan Cohen',
    tier: 'B',
    instagramUsername: '@stefancohen',
    platforms: { instagram: true, linkedin: true, facebook: true, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Michelle',
    hasAds: false
  },
  {
    clientName: 'Heather Sinclair',
    tier: 'B',
    instagramUsername: '@aspenheather1',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Michelle',
    hasAds: false
  },
  {
    clientName: 'Kodiak Club',
    tier: 'B',
    instagramUsername: '@thekodiakclub',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Michelle',
    hasAds: false
  },

  // Tara's clients
  {
    clientName: 'Emil Hartoonian',
    tier: 'B',
    instagramUsername: '@emilhartoonian',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Tara',
    hasAds: false
  },
  {
    clientName: 'Resnick and Nash',
    tier: 'B',
    instagramUsername: '@resnickandnash',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Tara',
    hasAds: false
  },
  {
    clientName: 'Ann Newton Cane',
    tier: 'A',
    instagramUsername: '@annnewtoncane',
    platforms: { instagram: true, linkedin: true, facebook: true, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Tara',
    hasAds: false
  },
  {
    clientName: 'The Agency Aspen',
    tier: 'B',
    instagramUsername: '@agencyaspen',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Tara',
    hasAds: false
  },
  {
    clientName: 'The Agency Nashville',
    tier: 'B',
    instagramUsername: '@theagencynashville',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Tara',
    hasAds: false
  },

  // Luca's clients
  {
    clientName: 'Paul McClean',
    tier: 'A',
    instagramUsername: '@mccleandesign',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Luca',
    hasAds: false
  }
];

// Package sizes based on tier
const TIER_PACKAGES = {
  'A': { packageType: 'Premium', packageSize: 20 },
  'B': { packageType: 'Standard', packageSize: 10 }
};

async function findManagerEmail(managerName, approvedUsers) {
  if (!managerName) return null;
  const normalizedName = managerName.toLowerCase();
  const match = approvedUsers.find(u => 
    u.displayName?.toLowerCase().includes(normalizedName) ||
    u.firstName?.toLowerCase() === normalizedName ||
    u.email?.toLowerCase().includes(normalizedName)
  );
  return match?.email || null;
}

async function importClients() {
  console.log('🚀 Starting client import to production Firestore...');
  console.log(`📊 Total clients to import: ${CLIENTS_DATA.length}`);
  
  try {
    // Get existing clients
    const clientsSnapshot = await db.collection('clients').get();
    const existingClients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const existingNames = new Set(existingClients.map(c => c.clientName?.toLowerCase()).filter(Boolean));
    
    console.log(`📋 Found ${existingClients.length} existing clients`);
    
    // Get approved users for manager lookup
    const usersSnapshot = await db.collection('users').where('approvalStatus', '==', 'approved').get();
    const approvedUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`👥 Found ${approvedUsers.length} approved users`);
    
    // Build manager email map
    const managerEmails = {};
    const uniqueManagers = [...new Set(CLIENTS_DATA.map(c => c.assignedManagerName))];
    
    for (const managerName of uniqueManagers) {
      const email = await findManagerEmail(managerName, approvedUsers);
      managerEmails[managerName] = email;
      console.log(`  ${managerName}: ${email || '(not found)'}`);
    }
    
    let added = 0;
    let updated = 0;
    const errors = [];
    
    for (const clientData of CLIENTS_DATA) {
      const normalizedName = clientData.clientName.toLowerCase();
      
      // Check if already exists
      const existingClient = existingClients.find(c => 
        c.clientName?.toLowerCase() === normalizedName
      );
      
      try {
        const tierPackage = TIER_PACKAGES[clientData.tier] || TIER_PACKAGES['B'];
        
        const clientRecord = {
          clientName: clientData.clientName,
          instagramUsername: clientData.instagramUsername,
          tier: clientData.tier,
          platforms: clientData.platforms,
          packageType: tierPackage.packageType,
          packageSize: tierPackage.packageSize,
          postsUsed: 0,
          postsRemaining: tierPackage.packageSize,
          hasAds: clientData.hasAds,
          assignedManager: managerEmails[clientData.assignedManagerName] || null,
          assignedManagerName: clientData.assignedManagerName,
          paymentStatus: 'Pending',
          approvalStatus: 'Approved',
          status: 'active',
          notes: clientData.notes || `${clientData.tier === 'A' ? 'Premium' : 'Standard'} client - ${clientData.assignedManagerName}`,
          startDate: new Date().toISOString().split('T')[0],
          lastContact: new Date().toISOString().split('T')[0],
          postedOn: 'Luxury Listings',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (existingClient) {
          // Update existing - preserve posts used/remaining
          clientRecord.postsUsed = existingClient.postsUsed || 0;
          clientRecord.postsRemaining = existingClient.postsRemaining || tierPackage.packageSize;
          await db.collection('clients').doc(existingClient.id).update(clientRecord);
          console.log(`🔄 Updated: ${clientData.clientName}`);
          updated++;
        } else {
          // Add new
          clientRecord.createdAt = admin.firestore.FieldValue.serverTimestamp();
          await db.collection('clients').add(clientRecord);
          console.log(`✅ Added: ${clientData.clientName} → ${clientData.assignedManagerName}`);
          added++;
        }
        
      } catch (error) {
        console.error(`❌ Error with ${clientData.clientName}:`, error.message);
        errors.push({ clientName: clientData.clientName, error: error.message });
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`  ✅ Added: ${added}`);
    console.log(`  🔄 Updated: ${updated}`);
    console.log(`  ❌ Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(e => console.log(`  - ${e.clientName}: ${e.error}`));
    }
    
    console.log('\n✅ Import complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importClients();
