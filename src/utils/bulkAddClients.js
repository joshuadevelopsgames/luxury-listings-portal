// Bulk add clients with their assigned account managers
// This can be run from the browser console or imported

import { firestoreService } from '../services/firestoreService';
import { toast } from 'react-hot-toast';

const CLIENTS_BY_MANAGER = {
  'Daniella': [
    'Agency NWFL',
    'Resnick & Nash',
    'Agency Aspen',
    'Kirstin Stroh',
    'Emil Hartoonian',
    'Ty Stockton',
    'Meg Stockton',
    'Stockton Group',
    'The Agency Nashville'
  ],
  'Mikayla': [
    'Heather Domi',
    'Tim Allen',
    'Blair Chang',
    'Compass Sports and Entertainment',
    'The McLaughlin Team',
    'Latitude Keys',
    'The Agency Austin',
    'The Resop Team'
  ],
  'Dylan': [
    'Agency RE',
    'Agency New York',
    'Agency So Cal',
    'Agency Arizona',
    'Agency North Cal',
    'Agency Naples'
  ],
  'Luca': [
    'McClean Designs',
    'Brian Milton',
    'Ann Newton Cane'
  ],
  'Michelle': [
    'Heather Sinclair',
    'Agency Cayman',
    'Stef & Fleur'
  ]
};

// Map manager names to email addresses
// This will be populated from approved users when the function runs
let MANAGER_EMAILS = {
  'Daniella': null, // Will be looked up
  'Mikayla': null,   // Will be looked up
  'Dylan': null,     // Will be looked up
  'Luca': null,      // Will be looked up
  'Michelle': null   // Will be looked up
};

// Helper to find manager email by name
const findManagerEmail = (managerName, approvedUsers) => {
  // Try exact match first
  const exactMatch = approvedUsers.find(u => 
    u.displayName?.toLowerCase().includes(managerName.toLowerCase()) ||
    u.firstName?.toLowerCase() === managerName.toLowerCase() ||
    u.email?.toLowerCase().includes(managerName.toLowerCase())
  );
  
  if (exactMatch) {
    return exactMatch.email;
  }
  
  // Return null if not found - will be handled in the import
  return null;
};

export const bulkAddClients = async () => {
  try {
    console.log('🚀 Starting bulk client import...');
    
    // Get approved users to find manager emails
    const approvedUsers = await firestoreService.getApprovedUsers();
    console.log('📋 Found approved users:', approvedUsers.length);
    
    // Find manager emails
    const managerEmailMap = {};
    for (const managerName of Object.keys(CLIENTS_BY_MANAGER)) {
      const email = findManagerEmail(managerName, approvedUsers);
      managerEmailMap[managerName] = email;
      if (email) {
        console.log(`✅ Found manager ${managerName}: ${email}`);
      } else {
        console.warn(`⚠️ Could not find email for manager: ${managerName}`);
      }
    }
    
    // First, get all existing clients to avoid duplicates
    const existingClients = await firestoreService.getClients();
    const existingEmails = new Set(
      existingClients.map(c => c.clientEmail?.toLowerCase()).filter(Boolean)
    );
    const existingNames = new Set(
      existingClients.map(c => c.clientName?.toLowerCase()).filter(Boolean)
    );
    
    let added = 0;
    let skipped = 0;
    const errors = [];
    const warnings = [];
    
    // Process each manager's clients
    for (const [managerName, clientNames] of Object.entries(CLIENTS_BY_MANAGER)) {
      const managerEmail = managerEmailMap[managerName];
      
      if (!managerEmail) {
        warnings.push(`No email found for manager: ${managerName} - clients will be added without assignment`);
      }
      
      for (const clientName of clientNames) {
        // Check if client already exists
        const normalizedName = clientName.toLowerCase();
        const normalizedEmail = `${clientName.toLowerCase().replace(/\s+/g, '.')}@client.example`.toLowerCase();
        
        if (existingNames.has(normalizedName) || existingEmails.has(normalizedEmail)) {
          console.log(`⏭️ Skipping existing client: ${clientName}`);
          skipped++;
          continue;
        }
        
        try {
          // Create client data
          const clientData = {
            clientName: clientName,
            clientEmail: normalizedEmail, // Placeholder email - can be updated later
            packageType: 'Standard',
            packageSize: 12,
            postsUsed: 0,
            postsRemaining: 10,
            postedOn: 'Luxury Listings',
            paymentStatus: 'Paid',
            approvalStatus: 'Approved',
            assignedManager: managerEmail || null, // Assign manager if found
            notes: managerEmail 
              ? `Assigned to ${managerName} (LL Account Manager)` 
              : `Client - Manager assignment pending`,
            startDate: new Date().toISOString().split('T')[0],
            lastContact: new Date().toISOString().split('T')[0],
            customPrice: 0,
            overduePosts: 0
          };
          
          await firestoreService.addClient(clientData);
          console.log(`✅ Added: ${clientName} → ${managerName}`);
          added++;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ Error adding ${clientName}:`, error);
          errors.push({ clientName, error: error.message });
        }
      }
    }
    
    const summary = {
      added,
      skipped,
      errors: errors.length,
      warnings: warnings.length,
      errorDetails: errors,
      warningDetails: warnings
    };
    
    console.log('📊 Import Summary:', summary);
    
    let message = `✅ Successfully added ${added} clients!`;
    if (skipped > 0) message += ` (${skipped} skipped)`;
    if (warnings.length > 0) message += ` ⚠️ ${warnings.length} warnings`;
    if (errors.length > 0) message += ` ❌ ${errors.length} errors`;
    
    if (errors.length > 0) {
      console.error('❌ Errors occurred:', errors);
      toast.error(message);
    } else if (warnings.length > 0) {
      toast.success(message);
      console.warn('⚠️ Warnings:', warnings);
    } else {
      toast.success(message);
    }
    
    return summary;
  } catch (error) {
    console.error('❌ Bulk import failed:', error);
    toast.error('Bulk import failed: ' + error.message);
    throw error;
  }
};

// Make it available globally for browser console access
if (typeof window !== 'undefined') {
  window.bulkAddClients = bulkAddClients;
}

