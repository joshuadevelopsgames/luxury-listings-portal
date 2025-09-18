// Firebase API Service - Makes requests to a backend API that uses Firebase Admin SDK
// This bypasses the 2FA restrictions by using server-side admin access

class FirebaseApiService {
  constructor() {
    this.baseUrl = 'https://script.google.com/macros/s/AKfycbwLSYk9XRwTSZkA0KScaBYD5kttD0uPg7NX0AzSHtytzNhskrmI-DLiZTFuQFozBwh3mg/exec';
    console.log('🔧 FirebaseApiService initialized');
  }

  // Get approved users via API
  async getApprovedUsers() {
    try {
      console.log('🔍 API: Getting approved users...');
      const response = await fetch(`${this.baseUrl}?action=getApprovedUsers`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ API: Found ${data.users.length} approved users`);
        return data.users;
      } else {
        console.error('❌ API: Error getting approved users:', data.error);
        return [];
      }
    } catch (error) {
      console.error('❌ API: Network error getting approved users:', error);
      return [];
    }
  }

  // Get pending users via API
  async getPendingUsers() {
    try {
      console.log('🔍 API: Getting pending users...');
      const response = await fetch(`${this.baseUrl}?action=getPendingUsers`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ API: Found ${data.users.length} pending users`);
        return data.users;
      } else {
        console.error('❌ API: Error getting pending users:', data.error);
        return [];
      }
    } catch (error) {
      console.error('❌ API: Network error getting pending users:', error);
      return [];
    }
  }

  // Add pending user via API
  async addPendingUser(userData) {
    try {
      console.log('🔍 API: Adding pending user:', userData.email);
      const response = await fetch(`${this.baseUrl}?action=addPendingUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userData })
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ API: Pending user added');
        return data.userId;
      } else {
        console.error('❌ API: Error adding pending user:', data.error);
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('❌ API: Network error adding pending user:', error);
      throw error;
    }
  }

  // Remove pending user via API
  async removePendingUser(userId) {
    try {
      console.log('🔍 API: Removing pending user:', userId);
      const response = await fetch(`${this.baseUrl}?action=removePendingUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ API: Pending user removed');
      } else {
        console.error('❌ API: Error removing pending user:', data.error);
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('❌ API: Network error removing pending user:', error);
      throw error;
    }
  }

  // Add approved user via API
  async addApprovedUser(userData) {
    try {
      console.log('🔍 API: Adding approved user:', userData.email);
      const response = await fetch(`${this.baseUrl}?action=addApprovedUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userData })
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ API: Approved user added');
      } else {
        console.error('❌ API: Error adding approved user:', data.error);
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('❌ API: Network error adding approved user:', error);
      throw error;
    }
  }

  // Update approved user via API
  async updateApprovedUser(email, updates) {
    try {
      console.log('🔍 API: Updating approved user:', email);
      const response = await fetch(`${this.baseUrl}?action=updateApprovedUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, updates })
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ API: Approved user updated');
      } else {
        console.error('❌ API: Error updating approved user:', data.error);
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('❌ API: Network error updating approved user:', error);
      throw error;
    }
  }

  // Get system config via API
  async getSystemConfig(key) {
    try {
      console.log('🔍 API: Getting system config:', key);
      const response = await fetch(`${this.baseUrl}?action=getSystemConfig&key=${key}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ API: System config found');
        return data.value;
      } else {
        console.log('⚠️ API: System config not found');
        return null;
      }
    } catch (error) {
      console.error('❌ API: Network error getting system config:', error);
      return null;
    }
  }

  // Save system config via API
  async saveSystemConfig(key, value) {
    try {
      console.log('🔍 API: Saving system config:', key);
      const response = await fetch(`${this.baseUrl}?action=saveSystemConfig`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value })
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ API: System config saved');
      } else {
        console.error('❌ API: Error saving system config:', data.error);
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('❌ API: Network error saving system config:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const firebaseApiService = new FirebaseApiService();
export default firebaseApiService;
