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
    TASK_TEMPLATES: 'task_templates',
    SMART_FILTERS: 'smart_filters',
    ANALYTICS_CONFIG: 'analytics_config',
    SYSTEM_CONFIG: 'system_config',
    EMPLOYEES: 'employees',
    LEAVE_REQUESTS: 'leave_requests',
    CLIENTS: 'clients',
    SUPPORT_TICKETS: 'support_tickets',
    TICKET_COMMENTS: 'ticket_comments',
    NOTIFICATIONS: 'notifications',
    TASK_REQUESTS: 'task_requests',
    CLIENT_MESSAGES: 'client_messages',
    CLIENT_REPORTS: 'client_reports',
    PENDING_CLIENTS: 'pending_clients',
    CLIENT_CONTRACTS: 'client_contracts'
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

  // Add approved user
  async addApprovedUser(userData) {
    try {
      await setDoc(doc(db, this.collections.APPROVED_USERS, userData.email), {
        ...userData,
        createdAt: serverTimestamp(),
        isApproved: true
      });
      console.log('✅ Approved user added:', userData.email);
    } catch (error) {
      console.error('❌ Error adding approved user:', error);
      throw error;
    }
  }

  // Remove approved user
  async removeApprovedUser(email) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      await deleteDoc(doc(db, this.collections.APPROVED_USERS, normalizedEmail));
      console.log('✅ Approved user removed:', normalizedEmail);
    } catch (error) {
      console.error('❌ Error removing approved user:', error);
      throw error;
    }
  }

  // Update approved user
  async updateApprovedUser(email, updates) {
    try {
      // Remove undefined values - Firestore doesn't allow undefined
      const cleanedUpdates = {};
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          cleanedUpdates[key] = updates[key];
        }
      });
      
      // If no valid updates, return early
      if (Object.keys(cleanedUpdates).length === 0) {
        console.log('⚠️ No valid updates to apply (all values were undefined)');
        return;
      }
      
      await updateDoc(doc(db, this.collections.APPROVED_USERS, email), {
        ...cleanedUpdates,
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
    // Filter out undefined values - Firestore doesn't allow undefined
    // Also convert empty strings to null for date fields
    const cleanUpdates = {};
    
    for (const [key, value] of Object.entries(updates)) {
      // Skip undefined values completely
      if (value === undefined) {
        continue;
      }
      
      // For date fields, convert empty strings to null
      if ((key === 'due_date' || key === 'due_time') && value === '') {
        cleanUpdates[key] = null;
      } else {
        cleanUpdates[key] = value;
      }
    }
    
    try {
      await updateDoc(doc(db, this.collections.TASKS, taskId), {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Task updated:', taskId);
    } catch (error) {
      console.error('❌ Error updating task:', error);
      console.error('❌ Updates object:', updates);
      console.error('❌ Clean updates:', cleanUpdates);
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
    try {
      return onSnapshot(
        collection(db, this.collections.PENDING_USERS), 
        (snapshot) => {
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
        },
        (error) => {
          console.warn('⚠️ Firestore listener error (pending users):', error.message);
          callback([]);
        }
      );
    } catch (error) {
      console.warn('⚠️ Error setting up pending users listener:', error.message);
      return () => {};
    }
  }

  // Listen to approved users changes
  onApprovedUsersChange(callback) {
    try {
      return onSnapshot(
        collection(db, this.collections.APPROVED_USERS), 
        (snapshot) => {
          const approvedUsers = [];
          snapshot.forEach((doc) => {
            approvedUsers.push({
              id: doc.id,
              ...doc.data()
            });
          });
          callback(approvedUsers);
        },
        (error) => {
          console.warn('⚠️ Firestore listener error (approved users):', error.message);
          callback([]);
        }
      );
    } catch (error) {
      console.warn('⚠️ Error setting up approved users listener:', error.message);
      return () => {};
    }
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

  // ===== EMPLOYEE MANAGEMENT =====

  // Get all employees
  async getEmployees() {
    try {
      const snapshot = await getDocs(collection(db, this.collections.EMPLOYEES));
      const employees = [];
      snapshot.forEach((doc) => {
        employees.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log('✅ Fetched employees:', employees.length);
      return employees;
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      throw error;
    }
  }

  // Get employee by email
  async getEmployeeByEmail(email) {
    try {
      const q = query(
        collection(db, this.collections.EMPLOYEES),
        where('email', '==', email)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('❌ Error fetching employee:', error);
      throw error;
    }
  }

  // Update employee information
  async updateEmployee(employeeId, employeeData) {
    try {
      const docRef = doc(db, this.collections.EMPLOYEES, employeeId);
      await updateDoc(docRef, {
        ...employeeData,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Employee updated:', employeeId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      throw error;
    }
  }

  // Add new employee
  async addEmployee(employeeData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.EMPLOYEES), {
        ...employeeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Employee added:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error adding employee:', error);
      throw error;
    }
  }

  // ===== LEAVE REQUEST MANAGEMENT =====

  // Get leave requests for a user
  async getLeaveRequestsByUser(userEmail) {
    try {
      const q = query(
        collection(db, this.collections.LEAVE_REQUESTS),
        where('employeeEmail', '==', userEmail),
        orderBy('submittedDate', 'desc')
      );
      const snapshot = await getDocs(q);
      const requests = [];
      snapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log('✅ Fetched leave requests:', requests.length);
      return requests;
    } catch (error) {
      console.error('❌ Error fetching leave requests:', error);
      throw error;
    }
  }

  // Get all leave requests (for HR)
  async getAllLeaveRequests() {
    try {
      const snapshot = await getDocs(collection(db, this.collections.LEAVE_REQUESTS));
      const requests = [];
      snapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log('✅ Fetched all leave requests:', requests.length);
      return requests;
    } catch (error) {
      console.error('❌ Error fetching leave requests:', error);
      throw error;
    }
  }

  // Submit a leave request
  async submitLeaveRequest(requestData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.LEAVE_REQUESTS), {
        ...requestData,
        status: 'pending',
        submittedDate: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      console.log('✅ Leave request submitted:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error submitting leave request:', error);
      throw error;
    }
  }

  // Update leave request status (for HR approval/rejection)
  async updateLeaveRequestStatus(requestId, status, reviewedBy) {
    try {
      const docRef = doc(db, this.collections.LEAVE_REQUESTS, requestId);
      await updateDoc(docRef, {
        status,
        reviewedBy,
        reviewedDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Leave request status updated:', requestId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating leave request:', error);
      throw error;
    }
  }

  // Listen to leave requests changes
  onLeaveRequestsChange(callback, userEmail = null) {
    let q;
    try {
      if (userEmail) {
        q = query(
          collection(db, this.collections.LEAVE_REQUESTS),
          where('employeeEmail', '==', userEmail),
          orderBy('submittedDate', 'desc')
        );
      } else {
        q = query(
          collection(db, this.collections.LEAVE_REQUESTS),
          orderBy('submittedDate', 'desc')
        );
      }
    } catch (error) {
      console.error('❌ Error creating query:', error);
      // Return a cleanup function that does nothing
      return () => {};
    }
    
    return onSnapshot(
      q,
      (snapshot) => {
        const requests = [];
        snapshot.forEach((doc) => {
          requests.push({
            id: doc.id,
            ...doc.data()
          });
        });
        callback(requests);
      },
      (error) => {
        console.error('❌ Error in leave requests snapshot:', error);
        // Call callback with empty array on error so UI doesn't break
        callback([]);
      }
    );
  }

  // ===== CLIENT MANAGEMENT =====

  // Get all clients
  async getClients() {
    try {
      const snapshot = await getDocs(collection(db, this.collections.CLIENTS));
      const clients = [];
      snapshot.forEach((doc) => {
        clients.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log('✅ Fetched clients:', clients.length);
      return clients;
    } catch (error) {
      console.error('❌ Error fetching clients:', error);
      throw error;
    }
  }

  // Add new client
  async addClient(clientData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.CLIENTS), {
        ...clientData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Client added:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error adding client:', error);
      throw error;
    }
  }

  // Update client information
  async updateClient(clientId, clientData) {
    try {
      const docRef = doc(db, this.collections.CLIENTS, clientId);
      await updateDoc(docRef, {
        ...clientData,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Client updated:', clientId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating client:', error);
      throw error;
    }
  }

  // Delete client
  async deleteClient(clientId) {
    try {
      await deleteDoc(doc(db, this.collections.CLIENTS, clientId));
      console.log('✅ Client deleted:', clientId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting client:', error);
      throw error;
    }
  }

  // Listen to clients changes
  onClientsChange(callback) {
    return onSnapshot(collection(db, this.collections.CLIENTS), (snapshot) => {
      const clients = [];
      snapshot.forEach((doc) => {
        clients.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(clients);
    });
  }

  // ===== IT SUPPORT TICKET MANAGEMENT =====

  // Get support tickets for a user
  async getSupportTicketsByUser(userEmail) {
    try {
      const q = query(
        collection(db, this.collections.SUPPORT_TICKETS),
        where('requesterEmail', '==', userEmail),
        orderBy('submittedDate', 'desc')
      );
      const snapshot = await getDocs(q);
      const tickets = [];
      snapshot.forEach((doc) => {
        tickets.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log('✅ Fetched support tickets:', tickets.length);
      return tickets;
    } catch (error) {
      console.error('❌ Error fetching support tickets:', error);
      throw error;
    }
  }

  // Get all support tickets (for IT Support/Admin)
  async getAllSupportTickets() {
    try {
      const snapshot = await getDocs(collection(db, this.collections.SUPPORT_TICKETS));
      const tickets = [];
      snapshot.forEach((doc) => {
        tickets.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log('✅ Fetched all support tickets:', tickets.length);
      return tickets;
    } catch (error) {
      console.error('❌ Error fetching support tickets:', error);
      throw error;
    }
  }

  // Submit a support ticket
  async submitSupportTicket(ticketData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.SUPPORT_TICKETS), {
        ...ticketData,
        status: 'pending',
        submittedDate: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      console.log('✅ Support ticket submitted:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error submitting support ticket:', error);
      throw error;
    }
  }

  // Update support ticket status (for IT Support)
  async updateSupportTicketStatus(ticketId, status, resolvedBy, notes = '') {
    try {
      const docRef = doc(db, this.collections.SUPPORT_TICKETS, ticketId);
      
      // Get ticket data first to notify the requester
      const ticketSnap = await getDoc(docRef);
      const ticketData = ticketSnap.data();
      
      const updateData = {
        status,
        updatedAt: serverTimestamp()
      };
      
      if (status === 'resolved' || status === 'closed') {
        updateData.resolvedBy = resolvedBy;
        updateData.resolvedDate = serverTimestamp();
      }
      
      if (notes) {
        updateData.notes = notes;
      }
      
      await updateDoc(docRef, updateData);
      console.log('✅ Support ticket status updated:', ticketId);

      // Create notification for ticket requester
      if (ticketData && ticketData.requesterEmail) {
        const statusMessages = {
          'in_progress': 'IT Support is working on your ticket',
          'resolved': 'Your support ticket has been resolved',
          'closed': notes ? `Your support ticket has been closed. Reason: ${notes}` : 'Your support ticket has been closed'
        };

        await this.createNotification({
          userEmail: ticketData.requesterEmail,
          type: 'ticket_status',
          title: 'Ticket status updated',
          message: statusMessages[status] || `Your ticket status changed to ${status}`,
          link: '/it-support',
          ticketId: ticketId,
          read: false
        });
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error updating support ticket:', error);
      throw error;
    }
  }

  // Listen to support tickets changes
  onSupportTicketsChange(callback, userEmail = null) {
    let q;
    if (userEmail) {
      // Don't use orderBy with where to avoid requiring composite index
      // We'll sort in the app instead
      q = query(
        collection(db, this.collections.SUPPORT_TICKETS),
        where('requesterEmail', '==', userEmail)
      );
    } else {
      q = query(
        collection(db, this.collections.SUPPORT_TICKETS),
        orderBy('submittedDate', 'desc')
      );
    }
    
    return onSnapshot(q, (snapshot) => {
      const tickets = [];
      snapshot.forEach((doc) => {
        tickets.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(tickets);
    });
  }

  // ===== TICKET COMMENTS =====

  // Add comment to a ticket
  async addTicketComment(ticketId, commentData) {
    try {
      const comment = {
        ticketId,
        authorEmail: commentData.authorEmail,
        authorName: commentData.authorName,
        comment: commentData.comment,
        isITSupport: commentData.isITSupport || false,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.collections.TICKET_COMMENTS), comment);
      console.log('✅ Comment added to ticket:', ticketId);

      // Create notification for the ticket owner
      if (commentData.notifyUserEmail && commentData.notifyUserEmail !== commentData.authorEmail) {
        await this.createNotification({
          userEmail: commentData.notifyUserEmail,
          type: 'ticket_comment',
          title: 'New comment on your ticket',
          message: `${commentData.authorName} commented on your support ticket`,
          link: `/it-support`,
          ticketId: ticketId,
          read: false
        });
      }

      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error adding comment:', error);
      throw error;
    }
  }

  // Get comments for a ticket
  onTicketCommentsChange(ticketId, callback) {
    // Don't use orderBy with where to avoid requiring composite index
    // We'll sort in the app instead
    const q = query(
      collection(db, this.collections.TICKET_COMMENTS),
      where('ticketId', '==', ticketId)
    );
    
    return onSnapshot(q, (snapshot) => {
      const comments = [];
      snapshot.forEach((doc) => {
        comments.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by createdAt ascending (oldest first) in the app
      const sortedComments = comments.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateA - dateB;
      });
      
      callback(sortedComments);
    });
  }

  // ===== NOTIFICATIONS =====

  // Create notification
  async createNotification(notificationData) {
    try {
      const notification = {
        ...notificationData,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.collections.NOTIFICATIONS), notification);
      console.log('✅ Notification created:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  // Get notifications for user
  onNotificationsChange(userEmail, callback) {
    // Don't use orderBy with where to avoid requiring composite index
    // We'll sort in the app instead
    const q = query(
      collection(db, this.collections.NOTIFICATIONS),
      where('userEmail', '==', userEmail)
    );
    
    return onSnapshot(q, (snapshot) => {
      const notifications = [];
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by createdAt descending (newest first) in the app
      const sortedNotifications = notifications.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      callback(sortedNotifications);
    });
  }

  // Mark notification as read
  async markNotificationRead(notificationId) {
    try {
      await updateDoc(doc(db, this.collections.NOTIFICATIONS, notificationId), {
        read: true,
        readAt: serverTimestamp()
      });
      console.log('✅ Notification marked as read:', notificationId);
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for user
  async markAllNotificationsRead(userEmail) {
    try {
      const q = query(
        collection(db, this.collections.NOTIFICATIONS),
        where('userEmail', '==', userEmail),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const promises = [];
      
      snapshot.forEach((docSnap) => {
        promises.push(
          updateDoc(doc(db, this.collections.NOTIFICATIONS, docSnap.id), {
            read: true,
            readAt: serverTimestamp()
          })
        );
      });

      await Promise.all(promises);
      console.log('✅ All notifications marked as read');
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      await deleteDoc(doc(db, this.collections.NOTIFICATIONS, notificationId));
      console.log('✅ Notification deleted:', notificationId);
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      throw error;
    }
  }

  // ===== TASK REQUESTS / DELEGATION =====

  // Create task request
  async createTaskRequest(requestData) {
    try {
      const taskRequest = {
        fromUserEmail: requestData.fromUserEmail,
        fromUserName: requestData.fromUserName,
        toUserEmail: requestData.toUserEmail,
        toUserName: requestData.toUserName,
        taskTitle: requestData.taskTitle,
        taskDescription: requestData.taskDescription,
        taskPriority: requestData.taskPriority || 'medium',
        taskDueDate: requestData.taskDueDate || null,
        status: 'pending', // pending, accepted, rejected
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.collections.TASK_REQUESTS), taskRequest);
      console.log('✅ Task request created:', docRef.id);

      // Create notification for recipient
      await this.createNotification({
        userEmail: requestData.toUserEmail,
        type: 'task_request',
        title: 'New task request',
        message: `${requestData.fromUserName} requested you to do: ${requestData.taskTitle}`,
        link: '/tasks',
        taskRequestId: docRef.id,
        read: false
      });

      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error creating task request:', error);
      throw error;
    }
  }

  // Get task requests for user (received requests)
  onTaskRequestsChange(userEmail, callback) {
    const q = query(
      collection(db, this.collections.TASK_REQUESTS),
      where('toUserEmail', '==', userEmail)
    );
    
    return onSnapshot(q, (snapshot) => {
      const requests = [];
      snapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by createdAt descending (newest first)
      const sortedRequests = requests.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      callback(sortedRequests);
    });
  }

  // Accept task request
  async acceptTaskRequest(requestId, requestData) {
    try {
      // Update request status
      await updateDoc(doc(db, this.collections.TASK_REQUESTS, requestId), {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      // Create the actual task
      const newTask = {
        title: requestData.taskTitle,
        description: requestData.taskDescription,
        status: 'pending',
        priority: requestData.taskPriority || 'medium',
        assigned_to: requestData.toUserEmail,
        assigned_by: requestData.fromUserEmail,
        due_date: requestData.taskDueDate || null,
        createdAt: serverTimestamp(),
        task_type: 'delegated'
      };

      const taskRef = await addDoc(collection(db, this.collections.TASKS), newTask);
      console.log('✅ Task created from request:', taskRef.id);

      // Notify the requester that their request was accepted
      await this.createNotification({
        userEmail: requestData.fromUserEmail,
        type: 'task_accepted',
        title: 'Task request accepted',
        message: `${requestData.toUserName} accepted your task request: ${requestData.taskTitle}`,
        link: '/tasks',
        read: false
      });

      return { success: true, taskId: taskRef.id };
    } catch (error) {
      console.error('❌ Error accepting task request:', error);
      throw error;
    }
  }

  // Reject task request
  async rejectTaskRequest(requestId, requestData, rejectionReason = '') {
    try {
      // Update request status
      await updateDoc(doc(db, this.collections.TASK_REQUESTS, requestId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectionReason: rejectionReason
      });

      // Notify the requester that their request was rejected
      await this.createNotification({
        userEmail: requestData.fromUserEmail,
        type: 'task_rejected',
        title: 'Task request declined',
        message: rejectionReason 
          ? `${requestData.toUserName} declined your task request: ${rejectionReason}`
          : `${requestData.toUserName} declined your task request`,
        link: '/tasks',
        read: false
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error rejecting task request:', error);
      throw error;
    }
  }

  // Get sent task requests (requests you sent to others)
  onSentTaskRequestsChange(userEmail, callback) {
    const q = query(
      collection(db, this.collections.TASK_REQUESTS),
      where('fromUserEmail', '==', userEmail)
    );
    
    return onSnapshot(q, (snapshot) => {
      const requests = [];
      snapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by createdAt descending (newest first)
      const sortedRequests = requests.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      callback(sortedRequests);
    });
  }

  // ===== TASK TEMPLATES MANAGEMENT =====

  // Get all task templates
  async getTaskTemplates() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.TASK_TEMPLATES));
      const templates = [];
      querySnapshot.forEach((doc) => {
        templates.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log('✅ Retrieved task templates:', templates.length);
      return templates;
    } catch (error) {
      console.error('❌ Error getting task templates:', error);
      throw error;
    }
  }

  // Get a single task template
  async getTaskTemplate(templateId) {
    try {
      const docRef = doc(db, this.collections.TASK_TEMPLATES, templateId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        console.log('❌ Template not found:', templateId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting task template:', error);
      throw error;
    }
  }

  // Create a new task template
  async createTaskTemplate(templateData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.TASK_TEMPLATES), {
        ...templateData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Task template created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating task template:', error);
      throw error;
    }
  }

  // Update a task template
  async updateTaskTemplate(templateId, updates) {
    try {
      const docRef = doc(db, this.collections.TASK_TEMPLATES, templateId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Task template updated:', templateId);
    } catch (error) {
      console.error('❌ Error updating task template:', error);
      throw error;
    }
  }

  // Delete a task template
  async deleteTaskTemplate(templateId) {
    try {
      const docRef = doc(db, this.collections.TASK_TEMPLATES, templateId);
      await deleteDoc(docRef);
      console.log('✅ Task template deleted:', templateId);
    } catch (error) {
      console.error('❌ Error deleting task template:', error);
      throw error;
    }
  }

  // Listen to template changes in real-time
  onTaskTemplatesChange(callback) {
    const q = query(
      collection(db, this.collections.TASK_TEMPLATES),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const templates = [];
      snapshot.forEach((doc) => {
        templates.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(templates);
    });
  }

  // Initialize default templates if none exist
  async initializeDefaultTemplates(defaultTemplates) {
    try {
      const existingTemplates = await this.getTaskTemplates();
      
      if (existingTemplates.length === 0) {
        console.log('📝 Initializing default task templates...');
        
        const promises = Object.values(defaultTemplates).map(template => {
          return this.createTaskTemplate(template);
        });
        
        await Promise.all(promises);
        console.log('✅ Default templates initialized');
      }
    } catch (error) {
      console.error('❌ Error initializing default templates:', error);
      throw error;
    }
  }

  // ===== SMART FILTERS MANAGEMENT =====

  // Get user's smart filters
  async getSmartFilters(userEmail) {
    try {
      const q = query(
        collection(db, this.collections.SMART_FILTERS),
        where('userEmail', '==', userEmail)
      );
      const querySnapshot = await getDocs(q);
      const filters = [];
      querySnapshot.forEach((doc) => {
        filters.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return filters;
    } catch (error) {
      console.error('❌ Error getting smart filters:', error);
      throw error;
    }
  }

  // Create a smart filter
  async createSmartFilter(filterData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.SMART_FILTERS), {
        ...filterData,
        createdAt: serverTimestamp()
      });
      console.log('✅ Smart filter created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating smart filter:', error);
      throw error;
    }
  }

  // Update a smart filter
  async updateSmartFilter(filterId, updates) {
    try {
      const docRef = doc(db, this.collections.SMART_FILTERS, filterId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Smart filter updated:', filterId);
    } catch (error) {
      console.error('❌ Error updating smart filter:', error);
      throw error;
    }
  }

  // Delete a smart filter
  async deleteSmartFilter(filterId) {
    try {
      const docRef = doc(db, this.collections.SMART_FILTERS, filterId);
      await deleteDoc(docRef);
      console.log('✅ Smart filter deleted:', filterId);
    } catch (error) {
      console.error('❌ Error deleting smart filter:', error);
      throw error;
    }
  }

  // ===== CLIENT MESSAGING =====

  // Create a message
  async createMessage(messageData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.CLIENT_MESSAGES), {
        ...messageData,
        createdAt: serverTimestamp()
      });
      console.log('✅ Message created:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error creating message:', error);
      throw error;
    }
  }

  // Get messages by client
  async getMessagesByClient(clientId) {
    try {
      const q = query(
        collection(db, this.collections.CLIENT_MESSAGES),
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return messages.reverse(); // Reverse to show oldest first
    } catch (error) {
      console.error('❌ Error getting messages:', error);
      return [];
    }
  }

  // Listen to messages changes
  onMessagesChange(clientId, callback) {
    const q = query(
      collection(db, this.collections.CLIENT_MESSAGES),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(messages);
    });
  }

  // ===== CLIENT REPORTS =====

  // Get reports by client
  async getReportsByClient(clientId) {
    try {
      const q = query(
        collection(db, this.collections.CLIENT_REPORTS),
        where('clientId', '==', clientId),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const reports = [];
      snapshot.forEach((doc) => {
        reports.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return reports;
    } catch (error) {
      console.error('❌ Error getting reports:', error);
      return [];
    }
  }

  // Create a monthly report
  async createMonthlyReport(reportData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.CLIENT_REPORTS), {
        ...reportData,
        createdAt: serverTimestamp()
      });
      console.log('✅ Monthly report created:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error creating report:', error);
      throw error;
    }
  }

  // ===== PENDING CLIENTS =====

  // Add a pending client (when client signs up but doesn't exist)
  async addPendingClient(clientData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.PENDING_CLIENTS), {
        ...clientData,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      console.log('✅ Pending client added:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error adding pending client:', error);
      throw error;
    }
  }

  // Get all pending clients
  async getPendingClients() {
    try {
      const q = query(
        collection(db, this.collections.PENDING_CLIENTS),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const clients = [];
      snapshot.forEach((doc) => {
        clients.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return clients;
    } catch (error) {
      console.error('❌ Error getting pending clients:', error);
      return [];
    }
  }

  // Remove a pending client (after approval or rejection)
  async removePendingClient(clientId) {
    try {
      const docRef = doc(db, this.collections.PENDING_CLIENTS, clientId);
      await deleteDoc(docRef);
      console.log('✅ Pending client removed:', clientId);
    } catch (error) {
      console.error('❌ Error removing pending client:', error);
      throw error;
    }
  }

  // Listen to pending clients changes
  onPendingClientsChange(callback) {
    const q = query(
      collection(db, this.collections.PENDING_CLIENTS),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const clients = [];
      snapshot.forEach((doc) => {
        clients.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(clients);
    });
  }

  // ===== CLIENT CONTRACTS =====

  // Get contracts by client
  async getContractsByClient(clientId) {
    try {
      const q = query(
        collection(db, this.collections.CLIENT_CONTRACTS),
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const contracts = [];
      snapshot.forEach((doc) => {
        contracts.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return contracts;
    } catch (error) {
      console.error('❌ Error getting contracts:', error);
      return [];
    }
  }

  // Get contract by ID
  async getContractById(contractId) {
    try {
      const docRef = doc(db, this.collections.CLIENT_CONTRACTS, contractId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting contract:', error);
      throw error;
    }
  }

  // Add contract document
  async addContract(contractData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.CLIENT_CONTRACTS), {
        ...contractData,
        createdAt: serverTimestamp()
      });
      console.log('✅ Contract added:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding contract:', error);
      throw error;
    }
  }

  // Update contract
  async updateContract(contractId, updates) {
    try {
      const docRef = doc(db, this.collections.CLIENT_CONTRACTS, contractId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Contract updated:', contractId);
    } catch (error) {
      console.error('❌ Error updating contract:', error);
      throw error;
    }
  }

  // Delete contract
  async deleteContract(contractId) {
    try {
      const docRef = doc(db, this.collections.CLIENT_CONTRACTS, contractId);
      await deleteDoc(docRef);
      console.log('✅ Contract deleted:', contractId);
    } catch (error) {
      console.error('❌ Error deleting contract:', error);
      throw error;
    }
  }

  // ===== PAGE PERMISSIONS MANAGEMENT =====

  // Get user's page permissions
  async getUserPagePermissions(userEmail) {
    try {
      // Normalize email (Firestore document IDs are case-sensitive)
      const normalizedEmail = userEmail.toLowerCase().trim();
      const userRef = doc(db, this.collections.APPROVED_USERS, normalizedEmail);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        return userData.pagePermissions || [];
      }
      
      // If document doesn't exist with normalized email, try original email
      if (normalizedEmail !== userEmail) {
        const altRef = doc(db, this.collections.APPROVED_USERS, userEmail);
        const altSnap = await getDoc(altRef);
        if (altSnap.exists()) {
          const userData = altSnap.data();
          return userData.pagePermissions || [];
        }
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error getting user page permissions:', error);
      console.error('❌ Email used:', userEmail);
      console.error('❌ Error code:', error.code);
      throw error;
    }
  }

  // Set user's page permissions
  async setUserPagePermissions(userEmail, pageIds) {
    try {
      const userRef = doc(db, this.collections.APPROVED_USERS, userEmail);
      
      // Check if document exists first
      const userSnap = await getDoc(userRef);
      
      console.log('📝 Setting permissions for user:', userEmail);
      console.log('📝 Document exists:', userSnap.exists());
      console.log('📝 New permissions:', pageIds);

      if (!userSnap.exists()) {
        console.warn('⚠️ User document does not exist, creating with permissions...');
        // Create document if it doesn't exist
        await setDoc(userRef, {
          email: userEmail,
          pagePermissions: pageIds,
          permissionsUpdatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true });
      } else {
        // Update existing document
        await updateDoc(userRef, {
          pagePermissions: pageIds,
          permissionsUpdatedAt: serverTimestamp()
        });
      }
      
      console.log('✅ Page permissions saved for:', userEmail);
      
      // Verify the update
      const verifySnap = await getDoc(userRef);
      if (verifySnap.exists()) {
        const savedPermissions = verifySnap.data().pagePermissions || [];
        console.log('✅ Verified saved permissions:', savedPermissions);
        if (JSON.stringify(savedPermissions) !== JSON.stringify(pageIds)) {
          console.warn('⚠️ Saved permissions do not match requested permissions!');
        }
      } else {
        console.error('❌ Document does not exist after save!');
      }
    } catch (error) {
      console.error('❌ Error setting user page permissions:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  }

  // Listen to user's page permissions in real-time
  onUserPagePermissionsChange(userEmail, callback) {
    try {
      const userRef = doc(db, this.collections.APPROVED_USERS, userEmail);
      return onSnapshot(
        userRef, 
        (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            callback(userData.pagePermissions || []);
          } else {
            callback([]);
          }
        },
        (error) => {
          // Handle Firestore listener errors gracefully
          console.warn('⚠️ Firestore listener error (permissions):', error.message);
          callback([]);
        }
      );
    } catch (error) {
      console.warn('⚠️ Error setting up permissions listener:', error.message);
      return () => {}; // Return empty cleanup function
    }
  }
}

// Export singleton instance
export const firestoreService = new FirestoreService();
export default firestoreService;
