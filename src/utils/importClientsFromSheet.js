/**
 * Import clients from spreadsheet data
 * Run this from the browser console or a component
 * 
 * Usage: 
 *   import { importClients } from './utils/importClientsFromSheet';
 *   importClients();
 */

import { firestoreService } from '../services/firestoreService';

// Full client data from the spreadsheet
const CLIENTS_DATA = [
  // Dylan's clients
  {
    clientName: 'The Agency Corp',
    instagramUsername: '@theagencyre',
    platforms: { instagram: true, linkedin: true, youtube: true, facebook: true, tiktok: false, x: false },
    assignedManagerName: 'Dylan',
    hasAds: true
  },
  {
    clientName: 'The Agency New York',
    instagramUsername: '@theagencynewyork',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Dylan',
    hasAds: false
  },
  {
    clientName: 'The Agency SoCal',
    instagramUsername: '@theagencysocal',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Dylan',
    hasAds: false
  },
  {
    clientName: 'The Agency NorthCal',
    instagramUsername: '@theresopteam',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Dylan',
    hasAds: false
  },
  {
    clientName: 'The Agency Naples',
    instagramUsername: '@theagencynaplesfl',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Dylan',
    hasAds: false
  },

  // Mikayla's clients
  {
    clientName: 'Heather Domi',
    instagramUsername: '@heatherdomi.re',
    platforms: { instagram: true, linkedin: true, youtube: true, facebook: true, tiktok: false, x: false },
    assignedManagerName: 'Mikayla',
    hasAds: true
  },
  {
    clientName: 'Compass Sports and Entertainment',
    instagramUsername: '@compass.se',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Mikayla',
    hasAds: false
  },
  {
    clientName: 'Blair Chang',
    instagramUsername: '@blairchang_re',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Mikayla',
    hasAds: false
  },
  {
    clientName: 'Whitney McLaughlin',
    instagramUsername: '@mclaughlinteam',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Mikayla',
    hasAds: false
  },
  {
    clientName: 'The Agency Austin',
    instagramUsername: '@theagency.austin',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Mikayla',
    hasAds: false
  },
  {
    clientName: 'The Resop Team',
    instagramUsername: '@theresopteam',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Mikayla',
    hasAds: false
  },
  {
    clientName: 'The Agency Florida Keys',
    instagramUsername: '@theagencyfloridakeys',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Mikayla',
    hasAds: false
  },

  // Daniella's clients
  {
    clientName: 'Stockton Group',
    instagramUsername: '@thestocktongroup_vail',
    platforms: { instagram: true, facebook: true, youtube: true, linkedin: false, tiktok: false, x: false },
    assignedManagerName: 'Daniella',
    hasAds: false
  },
  {
    clientName: 'Meg Garrido',
    instagramUsername: '@makeitmegatlvail',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Daniella',
    hasAds: false
  },
  {
    clientName: 'Tye Stockton',
    instagramUsername: '@tyestocktonvail',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Daniella',
    hasAds: false
  },
  {
    clientName: "The Agency Martha's Vineyard",
    instagramUsername: '@theagencymarthasvineyard',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Daniella',
    hasAds: false
  },
  {
    clientName: 'Kirstin Stroh (Naples)',
    instagramUsername: '@kristin_stroh',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Daniella',
    hasAds: false
  },
  {
    clientName: 'The Agency NWFL',
    instagramUsername: '@theagency.nwfl',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Daniella',
    hasAds: false,
    notes: 'Ending Feb'
  },
  {
    clientName: 'HQ Residences Miami',
    instagramUsername: '@hqresidences',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Matthew',
    hasAds: false
  },

  // Michelle's clients
  {
    clientName: 'The Agency Cayman',
    instagramUsername: '@theagencyrecayman',
    platforms: { instagram: true, linkedin: true, youtube: true, facebook: true, tiktok: false, x: false },
    assignedManagerName: 'Michelle',
    hasAds: true
  },
  {
    clientName: 'Stefan Cohen',
    instagramUsername: '@stefancohen',
    platforms: { instagram: true, linkedin: true, facebook: true, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Michelle',
    hasAds: false
  },
  {
    clientName: 'Heather Sinclair',
    instagramUsername: '@aspenheather1',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Michelle',
    hasAds: false
  },
  {
    clientName: 'Kodiak Club',
    instagramUsername: '@thekodiakclub',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Michelle',
    hasAds: false
  },

  // Tara's clients
  {
    clientName: 'Emil Hartoonian',
    instagramUsername: '@emilhartoonian',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Tara',
    hasAds: false
  },
  {
    clientName: 'Resnick and Nash',
    instagramUsername: '@resnickandnash',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Tara',
    hasAds: false
  },
  {
    clientName: 'Ann Newton Cane',
    instagramUsername: '@annnewtoncane',
    platforms: { instagram: true, linkedin: true, facebook: true, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Tara',
    hasAds: false
  },
  {
    clientName: 'The Agency Aspen',
    instagramUsername: '@agencyaspen',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Tara',
    hasAds: false
  },
  {
    clientName: 'The Agency Nashville',
    instagramUsername: '@theagencynashville',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Tara',
    hasAds: false
  },

  // Luca's clients
  {
    clientName: 'Paul McClean',
    instagramUsername: '@mccleandesign',
    platforms: { instagram: true, facebook: true, linkedin: false, youtube: false, tiktok: false, x: false },
    assignedManagerName: 'Luca',
    hasAds: false
  }
];

// Default package settings
const DEFAULT_PACKAGE = { packageType: 'Standard', packageSize: 10 };

/**
 * Find manager email by name from approved users
 */
const findManagerEmail = (managerName, approvedUsers) => {
  if (!managerName) return null;
  
  const normalizedName = managerName.toLowerCase();
  
  const match = approvedUsers.find(u => 
    u.displayName?.toLowerCase().includes(normalizedName) ||
    u.firstName?.toLowerCase() === normalizedName ||
    u.email?.toLowerCase().includes(normalizedName)
  );
  
  return match?.email || null;
};

/**
 * Import all clients to Firestore
 */
export const importClients = async () => {
  console.log('🚀 Starting client import from spreadsheet...');
  console.log(`📊 Total clients to import: ${CLIENTS_DATA.length}`);
  
  try {
    // Get existing clients to avoid duplicates
    const existingClients = await firestoreService.getClients();
    const existingNames = new Set(
      existingClients.map(c => c.clientName?.toLowerCase()).filter(Boolean)
    );
    const existingUsernames = new Set(
      existingClients.map(c => c.instagramUsername?.toLowerCase()).filter(Boolean)
    );
    
    console.log(`📋 Found ${existingClients.length} existing clients`);
    
    // Get approved users to find manager emails
    const approvedUsers = await firestoreService.getApprovedUsers();
    console.log(`👥 Found ${approvedUsers.length} approved users for manager lookup`);
    
    // Build manager email map
    const managerEmails = {};
    const uniqueManagers = [...new Set(CLIENTS_DATA.map(c => c.assignedManagerName))];
    
    for (const managerName of uniqueManagers) {
      const email = findManagerEmail(managerName, approvedUsers);
      managerEmails[managerName] = email;
      console.log(`  ${managerName}: ${email || '(not found)'}`);
    }
    
    let added = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];
    
    for (const clientData of CLIENTS_DATA) {
      const normalizedName = clientData.clientName.toLowerCase();
      const normalizedUsername = clientData.instagramUsername?.toLowerCase();
      
      // Check if already exists
      const existingClient = existingClients.find(c => 
        c.clientName?.toLowerCase() === normalizedName ||
        (normalizedUsername && c.instagramUsername?.toLowerCase() === normalizedUsername)
      );
      
      try {
        // Build client record
        const clientRecord = {
          clientName: clientData.clientName,
          instagramUsername: clientData.instagramUsername,
          platforms: clientData.platforms,
          packageType: DEFAULT_PACKAGE.packageType,
          packageSize: DEFAULT_PACKAGE.packageSize,
          postsUsed: 0,
          postsRemaining: DEFAULT_PACKAGE.packageSize,
          hasAds: clientData.hasAds,
          assignedManager: managerEmails[clientData.assignedManagerName] || null,
          assignedManagerName: clientData.assignedManagerName,
          paymentStatus: 'Pending',
          approvalStatus: 'Approved',
          status: 'active',
          notes: clientData.notes || `Client - ${clientData.assignedManagerName}`,
          startDate: new Date().toISOString().split('T')[0],
          lastContact: new Date().toISOString().split('T')[0],
          postedOn: 'Luxury Listings'
        };
        
        if (existingClient) {
          // Update existing client with new data (preserve posts used/remaining)
          const updateData = {
            ...clientRecord,
            postsUsed: existingClient.postsUsed || 0,
            postsRemaining: existingClient.postsRemaining || DEFAULT_PACKAGE.packageSize
          };
          
          await firestoreService.updateClient(existingClient.id, updateData);
          console.log(`🔄 Updated: ${clientData.clientName}`);
          updated++;
        } else {
          // Add new client
          await firestoreService.addClient(clientRecord);
          console.log(`✅ Added: ${clientData.clientName} → ${clientData.assignedManagerName}`);
          added++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
        
      } catch (error) {
        console.error(`❌ Error with ${clientData.clientName}:`, error);
        errors.push({ clientName: clientData.clientName, error: error.message });
      }
    }
    
    // Summary
    console.log('\n📊 Import Summary:');
    console.log(`  ✅ Added: ${added}`);
    console.log(`  🔄 Updated: ${updated}`);
    console.log(`  ⏭️ Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(e => console.log(`  - ${e.clientName}: ${e.error}`));
    }
    
    return { added, updated, skipped, errors };
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
};

// Export the client data for reference
export { CLIENTS_DATA };
