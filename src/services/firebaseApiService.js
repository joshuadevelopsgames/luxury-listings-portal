// Firebase API Service - Makes requests to a backend API that uses Firebase Admin SDK
// This bypasses the 2FA restrictions by using server-side admin access

class FirebaseApiService {
  constructor() {
    this.baseUrl = 'https://script.google.com/macros/s/AKfycbx4ugw4vME8hCeaE3Bieu7gsrNJqbGHxkNwZR97vKi0wVbaQNMgGFnG3W-lKrkwXzFkdQ/exec';
    console.log('🔧 FirebaseApiService initialized');
  }

  // Get approved users via API
  async getApprovedUsers() {
    try {
      console.log('🔍 API: Getting approved users...');
      
      // For now, return mock data directly since Google Apps Script needs to be redeployed
      const mockUsers = [
        {
          id: 'aamin@luxury-listings.com',
          email: 'aamin@luxury-listings.com',
          firstName: 'Aamin',
          lastName: 'Okhovat',
          role: 'content_director',
          primaryRole: 'content_director',
          isApproved: true,
          department: 'Content & Creative',
          displayName: 'Aamin Okhovat'
        },
        {
          id: 'alberta@luxury-listings.com',
          email: 'alberta@luxury-listings.com',
          firstName: 'Alberta',
          lastName: 'K',
          role: 'content_director',
          primaryRole: 'content_director',
          isApproved: true,
          department: 'Content & Creative',
          displayName: 'Alberta K'
        },
        {
          id: 'brooklynjoy11@gmail.com',
          email: 'brooklynjoy11@gmail.com',
          firstName: 'Brooklyn',
          lastName: 'Schroeder',
          role: 'content_director',
          primaryRole: 'content_director',
          isApproved: true,
          department: 'Content & Creative',
          displayName: 'Brooklyn Schroeder'
        },
        {
          id: 'joshua@luxury-listings.com',
          email: 'joshua@luxury-listings.com',
          firstName: 'Joshua',
          lastName: 'Schroeder',
          role: 'content_director',
          primaryRole: 'content_director',
          isApproved: true,
          department: 'Content & Creative',
          displayName: 'Joshua Schroeder'
        },
        {
          id: 'jrsschroeder@gmail.com',
          email: 'jrsschroeder@gmail.com',
          firstName: 'Joshua',
          lastName: 'Schroeder',
          role: 'admin',
          primaryRole: 'admin',
          isApproved: true,
          department: 'Administration',
          displayName: 'Joshua Schroeder (Josh)'
        },
        {
          id: 'matthew@luxury-listings.com',
          email: 'matthew@luxury-listings.com',
          firstName: 'Matthew',
          lastName: 'Kan',
          role: 'content_director',
          primaryRole: 'social_media_manager',
          isApproved: true,
          department: 'Content & Creative',
          displayName: 'Matthew Kan'
        },
        {
          id: 'michelle@luxury-listings.com',
          email: 'michelle@luxury-listings.com',
          firstName: 'Michelle',
          lastName: 'Zhang',
          role: 'sales_manager',
          primaryRole: 'social_media_manager',
          isApproved: true,
          department: 'Content & Creative',
          displayName: 'Michelle Zhang'
        }
      ];
      
      console.log(`✅ API: Found ${mockUsers.length} approved users (mock data)`);
      return mockUsers;
    } catch (error) {
      console.error('❌ API: Error getting approved users:', error);
      return [];
    }
  }

  // Get pending users via API
  async getPendingUsers() {
    try {
      console.log('🔍 API: Getting pending users...');
      
      // For now, return empty array since there are no pending users
      const mockUsers = [];
      
      console.log(`✅ API: Found ${mockUsers.length} pending users (mock data)`);
      return mockUsers;
    } catch (error) {
      console.error('❌ API: Error getting pending users:', error);
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

  // Get tasks via API
  async getTasks() {
    try {
      console.log('🔍 API: Getting tasks...');
      
      // For now, return mock data directly
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Review and update your ClickUp task status',
          description: 'Update progress on all assigned tasks in the project management system',
          category: 'Administrative',
          priority: 'low',
          due_date: '2025-08-15',
          estimated_time: 20,
          assigned_to: 'joshua@luxurylistings.com',
          status: 'pending',
          created_date: '2025-08-10T10:00:00.000Z'
        },
        {
          id: 'task-2',
          title: 'Create your first luxury post using the Luxe Post Kit',
          description: 'Design a high-quality post following the brand guidelines',
          category: 'Content Creation',
          priority: 'high',
          due_date: '2025-08-14',
          estimated_time: 90,
          assigned_to: 'joshua@luxurylistings.com',
          status: 'pending',
          created_date: '2025-08-10T10:00:00.000Z'
        },
        {
          id: 'task-3',
          title: 'Review last 10 posts on luxury accounts',
          description: 'Analyze competitor content and identify successful patterns',
          category: 'Research',
          priority: 'medium',
          due_date: '2025-08-13',
          estimated_time: 60,
          assigned_to: 'joshua@luxurylistings.com',
          status: 'in_progress',
          created_date: '2025-08-10T10:00:00.000Z'
        },
        {
          id: 'task-4',
          title: 'Schedule your first post using Later.com',
          description: 'Learn the scheduling platform and set up your first automated post',
          category: 'Training',
          priority: 'medium',
          due_date: '2025-08-14',
          estimated_time: 45,
          assigned_to: 'joshua@luxurylistings.com',
          status: 'pending',
          created_date: '2025-08-10T10:00:00.000Z'
        },
        {
          id: 'task-5',
          title: 'Check in with client list via Google Sheets',
          description: 'Review client status and identify follow-up opportunities',
          category: 'Client Relations',
          priority: 'high',
          due_date: '2025-08-19',
          estimated_time: 40,
          assigned_to: 'joshua@luxurylistings.com',
          status: 'pending',
          created_date: '2025-08-10T10:00:00.000Z'
        }
      ];
      
      console.log(`✅ API: Found ${mockTasks.length} tasks (mock data)`);
      return mockTasks;
    } catch (error) {
      console.error('❌ API: Error getting tasks:', error);
      return [];
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
