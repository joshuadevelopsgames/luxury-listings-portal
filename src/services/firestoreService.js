import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebase'; // Added missing import for auth
import { firebaseApiService } from './firebaseApiService';

class FirestoreService {
  constructor() {
    console.log('🔧 FirestoreService constructor called');
    console.log('🔧 Database instance:', db);
    console.log('🔧 Database app:', db.app);
    console.log('🔧 Database name:', db.name);
    console.log('🔧 Database type:', typeof db);
    console.log('🔧 Database app options:', db.app.options);
    
    // Test if we can access the database
    try {
      const testCollection = collection(db, 'test');
      console.log('🔧 Test collection created:', testCollection);
    } catch (error) {
      console.error('🔧 Error creating test collection:', error);
    }
  }

  // Collections
  collections = {
    USERS: 'users',
    PENDING_USERS: 'pending_users',
    APPROVED_USERS: 'approved_users',
    TASKS: 'tasks',
    ANALYTICS_CONFIG: 'analytics_config',
    SYSTEM_CONFIG: 'system_config'
  };

  // Test connection method
  async testConnection() {
    try {
      console.log('🧪 Testing Firestore connection...');
      console.log('🧪 Database instance in test:', db);
      console.log('🧪 Database app in test:', db.app);
      console.log('🧪 Database name in test:', db.name);
      
      // Try a simple one-time read operation
      const testCollection = collection(db, 'test');
      console.log('🧪 Test collection created:', testCollection);
      
      const querySnapshot = await getDocs(testCollection);
      console.log('🧪 Test collection read successful');
      console.log('🧪 Number of documents:', querySnapshot.size);
      
      console.log('✅ Firestore connection successful');
      
      return {
        success: true,
        message: 'Firestore connection successful',
        databaseName: db.name,
        appName: db.app.name,
        projectId: db.app.options.projectId,
        documentsCount: querySnapshot.size
      };
    } catch (error) {
      console.error('❌ Firestore connection failed:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      return {
        success: false,
        error: error.message,
        code: error.code,
        databaseName: db.name,
        appName: db.app.name,
        projectId: db.app.options.projectId
      };
    }
  }

  // ===== USER MANAGEMENT =====
  
  // Add a new pending user
  async addPendingUser(userData) {
    try {
      // Never persist an internal `id` field; Firestore will assign the document ID
      const { id: _ignoredInternalId, ...safeData } = userData || {};
      const docRef = await addDoc(collection(db, this.collections.PENDING_USERS), {
        ...safeData,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      console.log('✅ Pending user added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding pending user:', error);
      throw error;
    }
  }

  // Get all pending users
  async getPendingUsers() {
    try {
      console.log('🔍 DEBUG: getPendingUsers called');
      console.log('🔍 DEBUG: Stack trace:', new Error().stack);
      
      const querySnapshot = await getDocs(collection(db, this.collections.PENDING_USERS));
      const pendingUsers = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        // Never allow an internal `id` field to overwrite the Firestore document id
        const { id: _ignoredInternalId, ...rest } = data;
        pendingUsers.push({
          id: docSnap.id,
          ...rest
        });
      });
      
      console.log('🔍 DEBUG: getPendingUsers returning', pendingUsers.length, 'users');
      console.log('🔍 DEBUG: Pending users IDs:', pendingUsers.map(u => u.id));
      console.log('🔍 DEBUG: Pending users emails:', pendingUsers.map(u => u.email));
      
      return pendingUsers;
    } catch (error) {
      console.error('❌ Error getting pending users:', error);
      console.error('🔍 DEBUG: Error stack:', error.stack);
      console.warn('⚠️ Firestore permissions issue, trying admin service fallback...');
      
      try {
        // Fallback to API service
        const apiUsers = await firebaseApiService.getPendingUsers();
        console.log('✅ API service fallback successful:', apiUsers.length, 'users');
        return apiUsers;
      } catch (apiError) {
        console.error('❌ API service fallback also failed:', apiError);
        console.warn('⚠️ Returning empty pending users list');
        return [];
      }
    }
  }

  // Remove pending user (when approved or rejected)
  async removePendingUser(userId) {
    try {
      await deleteDoc(doc(db, this.collections.PENDING_USERS, userId));
      console.log('✅ Pending user removed:', userId);
    } catch (error) {
      console.error('❌ Error removing pending user:', error);
      throw error;
    }
  }

  // Update pending user
  async updatePendingUser(userId, updates) {
    try {
      // Prevent `id` from being written into the document
      const { id: _ignoredInternalId, ...safeUpdates } = updates || {};
      await updateDoc(doc(db, this.collections.PENDING_USERS, userId), {
        ...safeUpdates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Pending user updated:', userId);
    } catch (error) {
      console.error('❌ Error updating pending user:', error);
      throw error;
    }
  }

  // Approve a user (move from pending to approved)
  async approveUser(userId, userData) {
    try {
      // Add to approved users
      await setDoc(doc(db, this.collections.APPROVED_USERS, userData.email), {
        ...userData,
        approvedAt: serverTimestamp(),
        isApproved: true
      });
      
      // Remove from pending users
      await this.removePendingUser(userId);
      
      console.log('✅ User approved:', userData.email);
    } catch (error) {
      console.error('❌ Error approving user:', error);
      throw error;
    }
  }

  // Get all approved users
  async getApprovedUsers() {
    try {
      console.log('🔍 DEBUG: getApprovedUsers called');
      console.log('🔍 DEBUG: Stack trace:', new Error().stack);
      
      const querySnapshot = await getDocs(collection(db, this.collections.APPROVED_USERS));
      const approvedUsers = [];
      querySnapshot.forEach((doc) => {
        approvedUsers.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('🔍 DEBUG: getApprovedUsers returning', approvedUsers.length, 'users');
      console.log('🔍 DEBUG: Approved users IDs:', approvedUsers.map(u => u.id));
      console.log('🔍 DEBUG: Approved users emails:', approvedUsers.map(u => u.email));
      
      return approvedUsers;
    } catch (error) {
      console.error('❌ Error getting approved users:', error);
      console.error('🔍 DEBUG: Error stack:', error.stack);
      console.warn('⚠️ Firestore permissions issue, trying admin service fallback...');
      
      try {
        // Fallback to API service
        const apiUsers = await firebaseApiService.getApprovedUsers();
        console.log('✅ API service fallback successful:', apiUsers.length, 'users');
        return apiUsers;
      } catch (apiError) {
        console.error('❌ API service fallback also failed:', apiError);
        console.warn('⚠️ Returning empty approved users list');
        return [];
      }
    }
  }

  // Update approved user
  async updateApprovedUser(email, updates) {
    try {
      await updateDoc(doc(db, this.collections.APPROVED_USERS, email), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Approved user updated:', email);
    } catch (error) {
      console.error('❌ Error updating approved user:', error);
      throw error;
    }
  }

  // Delete approved user
  async deleteApprovedUser(email) {
    try {
      await deleteDoc(doc(db, this.collections.APPROVED_USERS, email));
      console.log('✅ Approved user deleted:', email);
    } catch (error) {
      console.error('❌ Error deleting approved user:', error);
      throw error;
    }
  }

  // ===== TASK MANAGEMENT =====

  // Add a new task
  async addTask(taskData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.TASKS), {
        ...taskData,
        createdAt: serverTimestamp()
      });
      console.log('✅ Task added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding task:', error);
      throw error;
    }
  }

  // Get all tasks
  async getTasks() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.TASKS));
      const tasks = [];
      querySnapshot.forEach((doc) => {
        tasks.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return tasks;
    } catch (error) {
      console.error('❌ Error getting tasks:', error);
      console.warn('⚠️ Firestore permissions issue, trying API service fallback...');
      
      try {
        // Fallback to API service
        const apiTasks = await firebaseApiService.getTasks();
        console.log('✅ API service fallback successful:', apiTasks.length, 'tasks');
        return apiTasks;
      } catch (apiError) {
        console.error('❌ API service fallback also failed:', apiError);
        console.warn('⚠️ Returning empty tasks list');
        return [];
      }
    }
  }

  // Get tasks by assigned user
  async getTasksByUser(userEmail) {
    try {
      const q = query(
        collection(db, this.collections.TASKS),
        where('assigned_to', '==', userEmail),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const tasks = [];
      querySnapshot.forEach((doc) => {
        tasks.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return tasks;
    } catch (error) {
      console.error('❌ Error getting user tasks:', error);
      throw error;
    }
  }

  // Update task
  async updateTask(taskId, updates) {
    try {
      await updateDoc(doc(db, this.collections.TASKS, taskId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Task updated:', taskId);
    } catch (error) {
      console.error('❌ Error updating task:', error);
      throw error;
    }
  }

  // Delete task
  async deleteTask(taskId) {
    try {
      await deleteDoc(doc(db, this.collections.TASKS, taskId));
      console.log('✅ Task deleted:', taskId);
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      throw error;
    }
  }

  // ===== ANALYTICS CONFIGURATION =====

  // Save analytics credentials
  async saveAnalyticsConfig(propertyId, serviceAccountJson) {
    try {
      await setDoc(doc(db, this.collections.ANALYTICS_CONFIG, 'credentials'), {
        propertyId,
        serviceAccountJson,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Analytics config saved');
    } catch (error) {
      console.error('❌ Error saving analytics config:', error);
      throw error;
    }
  }

  // Get analytics credentials
  async getAnalyticsConfig() {
    try {
      const docRef = doc(db, this.collections.ANALYTICS_CONFIG, 'credentials');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting analytics config:', error);
      throw error;
    }
  }

  // ===== SYSTEM CONFIGURATION =====

  // Save system config (like current role)
  async saveSystemConfig(key, value) {
    try {
      await setDoc(doc(db, this.collections.SYSTEM_CONFIG, key), {
        value,
        updatedAt: serverTimestamp()
      });
      console.log('✅ System config saved:', key);
    } catch (error) {
      console.error('❌ Error saving system config:', error);
      throw error;
    }
  }

  // Convenience: save system uptime
  async saveSystemUptime(value) {
    return this.saveSystemConfig('systemUptime', value);
  }

  // Get system config
  async getSystemConfig(key) {
    try {
      const docRef = doc(db, this.collections.SYSTEM_CONFIG, key);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data().value;
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting system config:', error);
      throw error;
    }
  }

  // Listen to a system config key in real-time
  onSystemConfigChange(key, callback) {
    const docRef = doc(db, this.collections.SYSTEM_CONFIG, key);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().value);
      } else {
        callback(null);
      }
    });
  }

  // ===== MIGRATION HELPERS =====

  // Migrate localStorage data to Firestore
  async migrateFromLocalStorage() {
    try {
      console.log('🔄 Starting localStorage migration...');
      
      // Migrate approved users
      const approvedUsers = JSON.parse(localStorage.getItem('luxury-listings-approved-users') || '[]');
      for (const user of approvedUsers) {
        await this.approveUser(`migrated-${Date.now()}`, user);
      }
      
      // Migrate pending users
      const pendingUsers = JSON.parse(localStorage.getItem('luxury-listings-pending-users') || '[]');
      for (const user of pendingUsers) {
        await this.addPendingUser(user);
      }
      
      // Migrate tasks
      const tasks = JSON.parse(localStorage.getItem('luxury-listings-tasks') || '[]');
      for (const task of tasks) {
        await this.addTask(task);
      }
      
      // Migrate analytics config
      const propertyId = localStorage.getItem('ga-property-id');
      const serviceAccountJson = localStorage.getItem('ga-service-account');
      if (propertyId && serviceAccountJson) {
        await this.saveAnalyticsConfig(propertyId, serviceAccountJson);
      }
      
      // Migrate system config
      const currentRole = localStorage.getItem('luxury-listings-role');
      if (currentRole) {
        await this.saveSystemConfig('currentRole', currentRole);
      }
      
      console.log('✅ localStorage migration completed!');
      
      // Clear localStorage after successful migration
      this.clearLocalStorage();
      
    } catch (error) {
      console.error('❌ Error during migration:', error);
      throw error;
    }
  }

  // Clear localStorage after migration
  clearLocalStorage() {
    const keysToRemove = [
      'luxury-listings-approved-users',
      'luxury-listings-pending-users',
      'luxury-listings-tasks',
      'ga-property-id',
      'ga-service-account',
      'luxury-listings-role'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('🧹 localStorage cleared');
  }

  // ===== REAL-TIME LISTENERS =====

  // Listen to pending users changes
  onPendingUsersChange(callback) {
    return onSnapshot(collection(db, this.collections.PENDING_USERS), (snapshot) => {
      const pendingUsers = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        // Never allow an internal `id` field to overwrite the Firestore document id
        const { id: _ignoredInternalId, ...rest } = data;
        pendingUsers.push({
          id: docSnap.id,
          ...rest
        });
      });
      callback(pendingUsers);
    });
  }

  // Listen to approved users changes
  onApprovedUsersChange(callback) {
    return onSnapshot(collection(db, this.collections.APPROVED_USERS), (snapshot) => {
      const approvedUsers = [];
      snapshot.forEach((doc) => {
        approvedUsers.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(approvedUsers);
    });
  }

  // Listen to tasks changes for a specific user
  onUserTasksChange(userEmail, callback) {
    const q = query(
      collection(db, this.collections.TASKS),
      where('assigned_to', '==', userEmail),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const tasks = [];
      snapshot.forEach((doc) => {
        tasks.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(tasks);
    });
  }
}

// Export singleton instance
export const firestoreService = new FirestoreService();
export default firestoreService;
