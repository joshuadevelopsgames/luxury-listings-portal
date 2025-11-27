// Utility to create a test client for joshua@luxury-listings.com
// This can be called from the browser console: window.createTestClient()

import { firestoreService } from '../services/firestoreService';

export const createTestClient = async () => {
  try {
    const testClient = {
      clientName: 'Joshua Test Client',
      clientEmail: 'joshua@luxury-listings.com',
      packageType: 'Gold',
      packageSize: 10,
      postsUsed: 2,
      postsRemaining: 8,
      postedOn: 'Luxury Listings',
      paymentStatus: 'Paid',
      approvalStatus: 'Approved',
      notes: 'Test client account for portal access',
      startDate: new Date().toISOString().split('T')[0],
      lastContact: new Date().toISOString().split('T')[0],
      customPrice: 0,
      overduePosts: 0
    };

    // Check if client already exists
    const clients = await firestoreService.getClients();
    const existingClient = clients.find(c => 
      c.clientEmail?.toLowerCase() === testClient.clientEmail.toLowerCase()
    );

    if (existingClient) {
      console.log('✅ Test client already exists:', existingClient);
      return existingClient;
    }

    // Create new client
    const result = await firestoreService.addClient(testClient);
    console.log('✅ Test client created successfully:', result);
    alert('Test client created! You can now log in at /client-login');
    return result;
  } catch (error) {
    console.error('❌ Error creating test client:', error);
    alert('Error creating test client: ' + error.message);
    throw error;
  }
};

// Make it available globally for browser console access
if (typeof window !== 'undefined') {
  window.createTestClient = createTestClient;
}

