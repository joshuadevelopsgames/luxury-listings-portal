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
  serverTimestamp,
  arrayUnion,
  limit as firestoreLimit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApiService } from './firebaseApiService';

let ensureEmailLowerClaimFn = null;
async function ensureEmailLowerClaimBeforeTemplates() {
  if (!auth.currentUser?.email) return;
  try {
    if (!ensureEmailLowerClaimFn) ensureEmailLowerClaimFn = httpsCallable(getFunctions(), 'ensureEmailLowerClaim');
    await ensureEmailLowerClaimFn();
    await auth.currentUser.getIdToken(true);
  } catch (_) { /* ignore */ }
}

class FirestoreService {
  constructor() {
    // FirestoreService initialized silently
  }

  // Collections
  collections = {
    USERS: 'users',
    PENDING_USERS: 'pending_users',
    APPROVED_USERS: 'approved_users',
    TASKS: 'tasks',
    TASK_TEMPLATES: 'task_templates',
    SMART_FILTERS: 'smart_filters',
    SYSTEM_CONFIG: 'system_config',
    EMPLOYEES: 'employees',
    LEAVE_REQUESTS: 'leave_requests',
    CLIENTS: 'clients',
    CRM: 'crm',
    SUPPORT_TICKETS: 'support_tickets',
    TICKET_COMMENTS: 'ticket_comments',
    NOTIFICATIONS: 'notifications',
    TASK_REQUESTS: 'task_requests',
    USER_TASK_ARCHIVES: 'user_task_archives',
    CLIENT_MESSAGES: 'client_messages',
    CLIENT_REPORTS: 'client_reports',
    PENDING_CLIENTS: 'pending_clients',
    CLIENT_CONTRACTS: 'client_contracts',
    INSTAGRAM_REPORTS: 'instagram_reports',
    CLIENT_MOVEMENTS: 'client_movements',
    CLIENT_HEALTH_SNAPSHOTS: 'client_health_snapshots',
    ERROR_REPORTS: 'error_reports',
    USER_DASHBOARD_PREFERENCES: 'user_dashboard_preferences',
    GRAPHIC_PROJECTS: 'graphic_projects',
    PROJECT_REQUESTS: 'project_requests',
    FEEDBACK: 'feedback',
    FEEDBACK_CHATS: 'feedback_chats',
    CUSTOM_ROLES: 'custom_roles',
    SYSTEM: 'system',
    POST_LOG_MONTHLY: 'post_log_monthly',
    USAGE_EVENTS: 'usage_events',
    CONTENT_CALENDARS: 'content_calendars',
    CONTENT_ITEMS: 'content_items',
    CANVASES: 'canvases',
    CANVAS_FORM_RESPONSES: 'canvas_form_responses'
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

  // Get all pending users (pending users feature disabled; returns [] for UI, still used internally by approveUser)
  async getPendingUsers() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.PENDING_USERS));
      const pendingUsers = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const { id: _ignoredInternalId, ...rest } = data;
        pendingUsers.push({
          id: docSnap.id,
          ...rest
        });
      });
      return pendingUsers;
    } catch (error) {
      try {
        const apiUsers = await firebaseApiService.getPendingUsers();
        return apiUsers;
      } catch {
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

  // Approve a user (move from pending to approved). Doc id = lowercase email for consistent lookup.
  // Removes all pending docs for this email so duplicate pending entries don't remain.
  async approveUser(userId, userData) {
    try {
      const emailKey = (userData.email || '').trim().toLowerCase();
      await setDoc(doc(db, this.collections.APPROVED_USERS, emailKey), {
        ...userData,
        email: userData.email?.trim() || emailKey,
        approvedAt: serverTimestamp(),
        isApproved: true
      });

      const pending = await this.getPendingUsers();
      const toRemove = pending.filter((u) => (u.email || '').toLowerCase() === emailKey);
      for (const u of toRemove) {
        await this.removePendingUser(u.id).catch(() => {});
      }

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
        const data = doc.data();
        const canonicalEmail = ((data.email ?? doc.id) || '').toString().toLowerCase().trim();
        approvedUsers.push({
          id: doc.id,
          ...data,
          // Canonical email so Permissions UI and login lookup use the same key (source of truth)
          email: canonicalEmail || doc.id
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

  // Get one approved user by email. Uses lowercase first (canonical form for Google sign-in and addApprovedUser); then case-insensitive scan.
  async getApprovedUserByEmail(email) {
    if (!email) return null;
    try {
      const trimmed = (email || '').trim();
      const lower = trimmed.toLowerCase();
      // Try lowercase first (Firebase/Google typically use lowercase; addApprovedUser stores lowercase)
      let docSnap = await getDoc(doc(db, this.collections.APPROVED_USERS, lower));
      if (!docSnap.exists() && lower !== trimmed)
        docSnap = await getDoc(doc(db, this.collections.APPROVED_USERS, trimmed));
      if (docSnap?.exists())
        return { id: docSnap.id, ...docSnap.data() };
      const snapshot = await getDocs(collection(db, this.collections.APPROVED_USERS));
      const found = snapshot.docs.find(d => (d.id || '').toLowerCase() === lower);
      return found ? { id: found.id, ...found.data() } : null;
    } catch (error) {
      console.error('Error getting approved user:', error);
      return null;
    }
  }

  // Add approved user (doc id = lowercase email so sign-in lookup always finds them)
  async addApprovedUser(userData) {
    try {
      const emailKey = (userData.email || '').trim().toLowerCase();
      await setDoc(doc(db, this.collections.APPROVED_USERS, emailKey), {
        ...userData,
        email: userData.email?.trim() || emailKey,
        createdAt: serverTimestamp(),
        isApproved: true
      });
      console.log('✅ Approved user added:', userData.email);
    } catch (error) {
      console.error('❌ Error adding approved user:', error);
      throw error;
    }
  }

  // Update approved user
  async updateApprovedUser(userId, updates) {
    try {
      // Prevent `id` from being written into the document
      const { id: _ignoredInternalId, ...safeUpdates } = updates || {};
      await updateDoc(doc(db, this.collections.APPROVED_USERS, userId), {
        ...safeUpdates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Approved user updated:', userId);
    } catch (error) {
      console.error('❌ Error updating approved user:', error);
      throw error;
    }
  }

  // Delete approved user
  async deleteApprovedUser(userId) {
    try {
      await deleteDoc(doc(db, this.collections.APPROVED_USERS, userId));
      console.log('✅ Approved user deleted:', userId);
    } catch (error) {
      console.error('❌ Error deleting approved user:', error);
      throw error;
    }
  }

  // ===== CLIENT MANAGEMENT =====

  // Add a new client
  async addClient(clientData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.CLIENTS), {
        ...clientData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Client added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding client:', error);
      throw error;
    }
  }

  // Get all clients
  async getClients() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.CLIENTS));
      const clients = [];
      querySnapshot.forEach((doc) => {
        clients.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return clients;
    } catch (error) {
      console.error('❌ Error getting clients:', error);
      throw error;
    }
  }

  // Get a single client by ID
  async getClient(clientId) {
    try {
      const docRef = doc(db, this.collections.CLIENTS, clientId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        console.log('❌ No such client!');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting client:', error);
      throw error;
    }
  }

  // Update client information
  async updateClient(clientId, updates) {
    try {
      const docRef = doc(db, this.collections.CLIENTS, clientId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Client updated:', clientId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating client:', error);
      throw error;
    }
  }

  // Delete a client
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
    const q = query(collection(db, this.collections.CLIENTS), orderBy('clientName'));
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

  // ===== CRM MANAGEMENT =====

  // Add a new CRM entry
  async addCRMEntry(entryData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.CRM), {
        ...entryData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ CRM entry added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding CRM entry:', error);
      throw error;
    }
  }

  // Get all CRM entries
  async getCRMEntries() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.CRM));
      const entries = [];
      querySnapshot.forEach((doc) => {
        entries.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return entries;
    } catch (error) {
      console.error('❌ Error getting CRM entries:', error);
      throw error;
    }
  }

  // Get a single CRM entry by ID
  async getCRMEntry(entryId) {
    try {
      const docRef = doc(db, this.collections.CRM, entryId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        console.log('❌ No such CRM entry!');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting CRM entry:', error);
      throw error;
    }
  }

  // Update CRM entry information
  async updateCRMEntry(entryId, updates) {
    try {
      const docRef = doc(db, this.collections.CRM, entryId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ CRM entry updated:', entryId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating CRM entry:', error);
      throw error;
    }
  }

  // Delete a CRM entry
  async deleteCRMEntry(entryId) {
    try {
      await deleteDoc(doc(db, this.collections.CRM, entryId));
      console.log('✅ CRM entry deleted:', entryId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting CRM entry:', error);
      throw error;
    }
  }

  // Listen to CRM entries changes
  onCRMEntriesChange(callback) {
    const q = query(collection(db, this.collections.CRM), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const entries = [];
      snapshot.forEach((doc) => {
        entries.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(entries);
    });
  }

  // ===== EMPLOYEE MANAGEMENT =====

  // Add a new employee
  async addEmployee(employeeData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.EMPLOYEES), {
        ...employeeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Employee added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding employee:', error);
      throw error;
    }
  }

  // Get all employees
  async getEmployees() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.EMPLOYEES));
      const employees = [];
      querySnapshot.forEach((doc) => {
        employees.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return employees;
    } catch (error) {
      console.error('❌ Error getting employees:', error);
      throw error;
    }
  }

  // Get a single employee by ID
  async getEmployee(employeeId) {
    try {
      const docRef = doc(db, this.collections.EMPLOYEES, employeeId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        console.log('❌ No such employee!');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting employee:', error);
      throw error;
    }
  }

  // Update employee information
  async updateEmployee(employeeId, updates) {
    try {
      const docRef = doc(db, this.collections.EMPLOYEES, employeeId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Employee updated:', employeeId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      throw error;
    }
  }

  // Delete an employee
  async deleteEmployee(employeeId) {
    try {
      await deleteDoc(doc(db, this.collections.EMPLOYEES, employeeId));
      console.log('✅ Employee deleted:', employeeId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting employee:', error);
      throw error;
    }
  }

  // Listen to employees changes
  onEmployeesChange(callback) {
    const q = query(collection(db, this.collections.EMPLOYEES), orderBy('firstName'));
    return onSnapshot(q, (snapshot) => {
      const employees = [];
      snapshot.forEach((doc) => {
        employees.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(employees);
    });
  }

  // ===== TASK MANAGEMENT =====

  // Add a new task
  async addTask(taskData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.TASKS), {
        ...taskData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
      throw error;
    }
  }

  // Get a single task by ID
  async getTask(taskId) {
    try {
      const docRef = doc(db, this.collections.TASKS, taskId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        console.log('❌ No such task!');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting task:', error);
      throw error;
    }
  }

  // Update task information
  async updateTask(taskId, updates) {
    try {
      const docRef = doc(db, this.collections.TASKS, taskId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Task updated:', taskId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating task:', error);
      throw error;
    }
  }

  // Delete a task
  async deleteTask(taskId) {
    try {
      await deleteDoc(doc(db, this.collections.TASKS, taskId));
      console.log('✅ Task deleted:', taskId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      throw error;
    }
  }

  // Listen to tasks changes
  onTasksChange(callback, userId = null) {
    let q;
    if (userId) {
      q = query(collection(db, this.collections.TASKS), where('assignedTo', '==', userId), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, this.collections.TASKS), orderBy('createdAt', 'desc'));
    }
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

  // ===== TASK TEMPLATES MANAGEMENT =====

  // Add a new task template
  async addTaskTemplate(templateData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.TASK_TEMPLATES), {
        ...templateData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Task template added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding task template:', error);
      throw error;
    }
  }

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
      return templates;
    } catch (error) {
      console.error('❌ Error getting task templates:', error);
      throw error;
    }
  }

  // Get a single task template by ID
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
        console.log('❌ No such task template!');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting task template:', error);
      throw error;
    }
  }

  // Update task template information
  async updateTaskTemplate(templateId, updates) {
    try {
      const docRef = doc(db, this.collections.TASK_TEMPLATES, templateId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Task template updated:', templateId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating task template:', error);
      throw error;
    }
  }

  // Delete a task template
  async deleteTaskTemplate(templateId) {
    try {
      await deleteDoc(doc(db, this.collections.TASK_TEMPLATES, templateId));
      console.log('✅ Task template deleted:', templateId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting task template:', error);
      throw error;
    }
  }

  // Listen to task templates changes
  onTaskTemplatesChange(callback) {
    const q = query(collection(db, this.collections.TASK_TEMPLATES), orderBy('createdAt', 'desc'));
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

  // ===== INSTAGRAM REPORTS MANAGEMENT =====

  // Add a new Instagram report
  async addInstagramReport(reportData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.INSTAGRAM_REPORTS), {
        ...reportData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Instagram report added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding Instagram report:', error);
      throw error;
    }
  }

  // Get all Instagram reports
  async getInstagramReports() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.INSTAGRAM_REPORTS));
      const reports = [];
      querySnapshot.forEach((doc) => {
        reports.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return reports;
    } catch (error) {
      console.error('❌ Error getting Instagram reports:', error);
      throw error;
    }
  }

  // Get a single Instagram report by ID
  async getInstagramReport(reportId) {
    try {
      const docRef = doc(db, this.collections.INSTAGRAM_REPORTS, reportId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        console.log('❌ No such Instagram report!');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting Instagram report:', error);
      throw error;
    }
  }

  // Update Instagram report. Fails if report does not belong to current user (unless admin).
  async updateInstagramReport(reportId, updates) {
    try {
      const uid = auth.currentUser?.uid;
      const email = auth.currentUser?.email;
      if (!uid) throw new Error('You must be signed in to update a report');
      
      // System admins or users with view_all_reports can edit any report
      const SYSTEM_ADMINS = ['jrsschroeder@gmail.com'];
      let isAdmin = SYSTEM_ADMINS.includes(email?.toLowerCase());
      if (!isAdmin && email) {
        try {
          const perms = await this.getUserPermissions(email);
          isAdmin = (perms?.features || []).includes('view_all_reports');
        } catch (_) {}
      }
      
      const docRef = doc(db, this.collections.INSTAGRAM_REPORTS, reportId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Report not found');
      }
      
      const reportData = docSnap.data();
      const isOwner = reportData.userId === uid;
      const isLegacyReport = !reportData.userId; // Reports created before userId was added
      
      // Allow update if: owner, admin, or legacy report (claim ownership)
      if (!isOwner && !isAdmin && !isLegacyReport) {
        throw new Error('You do not have permission to update this report');
      }
      
      // If legacy report, claim ownership by setting userId
      if (isLegacyReport) {
        updates.userId = uid;
        console.log('📝 Claiming ownership of legacy report:', reportId);
      }
      
      // Convert date strings/objects to Firestore Timestamps if provided
      const processedUpdates = { ...updates };
      
      if ('startDate' in updates && updates.startDate !== undefined) {
        if (updates.startDate === null) {
          processedUpdates.startDate = null;
          processedUpdates.year = null;
          processedUpdates.month = null;
        } else {
          const startDate = updates.startDate instanceof Date 
            ? updates.startDate 
            : new Date(updates.startDate);
          if (!isNaN(startDate.getTime())) {
            processedUpdates.startDate = Timestamp.fromDate(startDate);
            processedUpdates.year = startDate.getFullYear();
            processedUpdates.month = startDate.getMonth() + 1;
          }
        }
      }
      
      if ('endDate' in updates && updates.endDate !== undefined) {
        if (updates.endDate === null) {
          processedUpdates.endDate = null;
        } else {
          const endDate = updates.endDate instanceof Date 
            ? updates.endDate 
            : new Date(updates.endDate);
          if (!isNaN(endDate.getTime())) {
            processedUpdates.endDate = Timestamp.fromDate(endDate);
          }
        }
      }
      
      await updateDoc(docRef, {
        ...processedUpdates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Instagram report updated:', reportId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating Instagram report:', error);
      throw error;
    }
  }

  // "Delete" Instagram report: soft-delete (archive). Report is hidden from main list and moved to system admin Archive tab.
  async deleteInstagramReport(reportId) {
    try {
      const uid = auth.currentUser?.uid;
      const email = auth.currentUser?.email;
      if (!uid) throw new Error('You must be signed in to delete a report');
      
      // System admins or users with view_all_reports can delete any report
      const SYSTEM_ADMINS = ['jrsschroeder@gmail.com'];
      let isAdmin = SYSTEM_ADMINS.includes(email?.toLowerCase());
      if (!isAdmin && email) {
        try {
          const perms = await this.getUserPermissions(email);
          isAdmin = (perms?.features || []).includes('view_all_reports');
        } catch (_) {}
      }
      
      const docRef = doc(db, this.collections.INSTAGRAM_REPORTS, reportId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Report not found');
      }
      
      const reportData = docSnap.data();
      const isOwner = reportData.userId === uid;
      const isLegacyReport = !reportData.userId;
      
      if (!isOwner && !isAdmin && !isLegacyReport) {
        throw new Error('You do not have permission to delete this report');
      }
      
      await updateDoc(docRef, {
        archived: true,
        archivedAt: serverTimestamp(),
        archivedBy: email || uid,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Instagram report archived:', reportId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error archiving Instagram report:', error);
      throw error;
    }
  }

  // Listen to Instagram reports changes. If loadAll=true (for admins), loads all reports.
  // archived=true: load only archived reports (for system admin Archive tab). Otherwise exclude archived.
  // Pass userId when "View As" is active so reports for that user are loaded.
  onInstagramReportsChange(callback, { loadAll = false, userId = null, clientIds = [], archived = false } = {}) {
    const uid = userId || auth.currentUser?.uid;
    if (!uid && !archived) {
      callback([]);
      return () => {};
    }

    if (archived) {
      const q = query(
        collection(db, this.collections.INSTAGRAM_REPORTS),
        where('archived', '==', true),
        orderBy('archivedAt', 'desc')
      );
      return onSnapshot(q, (snapshot) => {
        const reports = [];
        snapshot.forEach((doc) => {
          reports.push({ id: doc.id, ...doc.data() });
        });
        console.log(`📊 Instagram archived reports loaded: ${reports.length}`);
        callback(reports);
      }, (error) => {
        console.error('❌ Error loading archived Instagram reports:', error);
        callback([]);
      });
    }

    // If loadAll is true, get all reports. Otherwise, get reports where:
    // - userId matches current user, OR
    // - clientId is in the list of assigned clients
    let q;
    if (loadAll) {
      // Fetch all non-archived reports
      q = query(
        collection(db, this.collections.INSTAGRAM_REPORTS),
        where('archived', '==', false),
        orderBy('createdAt', 'desc')
      );
    } else if (clientIds && clientIds.length > 0) {
      // Get reports created by user OR for assigned clients (need to fetch all non-archived and filter client-side)
      q = query(
        collection(db, this.collections.INSTAGRAM_REPORTS),
        where('archived', '!=', true),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Only get reports created by user
      q = query(
        collection(db, this.collections.INSTAGRAM_REPORTS),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      const reports = [];
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };

        // If not loadAll and clientIds provided, filter to only include reports created by user or for assigned clients
        if (!loadAll && clientIds && clientIds.length > 0) {
          if (data.userId !== uid && !clientIds.includes(data.clientId)) {
            return; // Skip reports not created by user and not for assigned clients
          }
        }
        // If loadAll is true, we already filtered by archived: false in the query, so no need for client-side filter here.

        reports.push(data);
      });
      console.log(`📊 Instagram reports loaded: ${reports.length} reports (loadAll=${loadAll}, clientIds=${clientIds?.length || 0})`);
      callback(reports);
    }, (error) => {
      console.error('❌ Error loading Instagram reports:', error);
      callback([]);
    });
  }

  // ===== DASHBOARD PREFERENCES (widget order, etc.) =====

  async getDashboardPreferences(uid) {
    if (!uid) return null;
    try {
      const ref = doc(db, this.collections.USER_DASHBOARD_PREFERENCES, uid);
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      console.error('Error getting dashboard preferences:', error);
      return null;
    }
  }

  async setDashboardPreferences(uid, prefs) {
    if (!uid) return;
    try {
      const ref = doc(db, this.collections.USER_DASHBOARD_PREFERENCES, uid);
      await setDoc(ref, { ...prefs, updatedAt: serverTimestamp() }, { merge: true });
    } catch (error) {
      console.error('Error setting dashboard preferences:', error);
      throw error;
    }
  }

  // ===== PAGE PERMISSIONS MANAGEMENT =====

  // Normalize doc data to { pages, features, adminPermissions }. Features are only from doc (no admin bundle).
  _mapPermissionsFromDoc(userData) {
    if (!userData) return { pages: [], features: [], adminPermissions: false };
    return {
      pages: userData.pagePermissions || [],
      features: userData.featurePermissions || [],
      adminPermissions: false
    };
  }

  /**
   * Get user permissions (single source of truth for both one-shot and live).
   * - getUserPermissions(email) → Promise<{ pages, features, adminPermissions }>
   * - getUserPermissions(email, { subscribe: true, onUpdate }) → { unsubscribe } for real-time updates.
   * Resolution: canonical key → alt key → collection scan (case-insensitive). Same behavior for "View as" and logged-in user.
   */
  getUserPermissions(userEmail, options = {}) {
    const { subscribe: wantSubscribe, onUpdate } = options;
    const normalizedEmail = (userEmail || '').toLowerCase().trim();
    const key = normalizedEmail;

    const pushResult = (result) => {
      if (typeof onUpdate === 'function') {
        onUpdate({ pages: result?.pages ?? [], features: result?.features ?? [] });
      }
    };

    const oneShot = async () => {
      try {
        let userSnap = await getDoc(doc(db, this.collections.APPROVED_USERS, key));
        if (userSnap.exists()) return this._mapPermissionsFromDoc(userSnap.data());
        if (normalizedEmail !== userEmail) {
          userSnap = await getDoc(doc(db, this.collections.APPROVED_USERS, userEmail));
          if (userSnap.exists()) return this._mapPermissionsFromDoc(userSnap.data());
        }
        const allSnap = await getDocs(collection(db, this.collections.APPROVED_USERS));
        for (const d of allSnap.docs) {
          const data = d.data();
          const docEmail = (data.email || d.id || '').toString().toLowerCase().trim();
          if (docEmail === normalizedEmail) return this._mapPermissionsFromDoc(data);
        }
        return this._mapPermissionsFromDoc(null);
      } catch (error) {
        console.error('❌ Error getting user permissions:', error);
        throw error;
      }
    };

    if (wantSubscribe && typeof onUpdate === 'function') {
      const userRef = doc(db, this.collections.APPROVED_USERS, key);
      const unsub = onSnapshot(
        userRef,
        (docSnap) => {
          if (docSnap.exists()) {
            pushResult(this._mapPermissionsFromDoc(docSnap.data()));
          } else {
            oneShot().then(pushResult).catch(() => pushResult({ pages: [], features: [] }));
          }
        },
        (error) => {
          console.warn('⚠️ Firestore listener error (user permissions):', error.message);
          pushResult({ pages: [], features: [] });
        }
      );
      return { unsubscribe: () => unsub() };
    }

    return oneShot();
  }

  // Canonical key for approved_users: login lookups use lowercase email
  _approvedUserKey(email) {
    return (email || '').toLowerCase().trim();
  }

  // Set user's page permissions (uses normalized email as doc ID so login lookup finds the doc)
  async setUserPagePermissions(userEmail, pageIds) {
    try {
      const key = this._approvedUserKey(userEmail);
      const userRef = doc(db, this.collections.APPROVED_USERS, key);
      const legacyRef = key !== userEmail ? doc(db, this.collections.APPROVED_USERS, userEmail) : null;
      const userSnap = await getDoc(userRef);
      const legacySnap = legacyRef ? await getDoc(legacyRef) : null;

      console.log('📝 Setting permissions for user:', userEmail);
      console.log('📝 Canonical key:', key);
      console.log('📝 New permissions:', pageIds);

      if (userSnap.exists()) {
        await updateDoc(userRef, {
          pagePermissions: pageIds,
          permissionsUpdatedAt: serverTimestamp()
        });
      } else if (legacySnap?.exists()) {
        const existing = legacySnap.data();
        await setDoc(userRef, {
          ...existing,
          email: key,
          pagePermissions: pageIds,
          permissionsUpdatedAt: serverTimestamp()
        }, { merge: true });
        await deleteDoc(legacyRef);
        console.log('✅ Migrated permissions doc to canonical key:', key);
      } else {
        await setDoc(userRef, {
          email: key,
          pagePermissions: pageIds,
          permissionsUpdatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true });
      }

      console.log('✅ Page permissions saved for:', userEmail);

      const verifySnap = await getDoc(userRef);
      if (verifySnap.exists()) {
        const savedPermissions = verifySnap.data().pagePermissions || [];
        if (JSON.stringify(savedPermissions) !== JSON.stringify(pageIds)) {
          console.warn('⚠️ Saved permissions do not match requested permissions!');
        }
      }
    } catch (error) {
      console.error('❌ Error setting user page permissions:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  }

  // Set user's feature permissions (granular access within pages)
  async setUserFeaturePermissions(userEmail, featureIds) {
    try {
      const key = this._approvedUserKey(userEmail);
      const userRef = doc(db, this.collections.APPROVED_USERS, key);
      const legacyRef = key !== userEmail ? doc(db, this.collections.APPROVED_USERS, userEmail) : null;
      const userSnap = await getDoc(userRef);
      const legacySnap = legacyRef ? await getDoc(legacyRef) : null;

      if (userSnap.exists()) {
        await updateDoc(userRef, {
          featurePermissions: featureIds,
          permissionsUpdatedAt: serverTimestamp()
        });
      } else if (legacySnap?.exists()) {
        const existing = legacySnap.data();
        await setDoc(userRef, {
          ...existing,
          email: key,
          featurePermissions: featureIds,
          permissionsUpdatedAt: serverTimestamp()
        }, { merge: true });
        await deleteDoc(legacyRef);
        console.log('✅ Migrated permissions doc to canonical key:', key);
      } else {
        await setDoc(userRef, {
          email: key,
          featurePermissions: featureIds,
          permissionsUpdatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true });
      }

      console.log('✅ Feature permissions saved for:', userEmail);

      const verifySnap = await getDoc(userRef);
      if (verifySnap.exists()) {
        const savedPermissions = verifySnap.data().featurePermissions || [];
        if (JSON.stringify(savedPermissions) !== JSON.stringify(featureIds)) {
          console.warn('⚠️ Saved feature permissions do not match requested permissions!');
        }
      }
    } catch (error) {
      console.error('❌ Error setting user feature permissions:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  }

  // Get system config (e.g., system admins list)
  async getSystemConfig() {
    try {
      const docRef = doc(db, this.collections.SYSTEM, 'config');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        return {};
      }
    } catch (error) {
      console.error('❌ Error getting system config:', error);
      throw error;
    }
  }

  // Set system config
  async setSystemConfig(config) {
    try {
      const docRef = doc(db, this.collections.SYSTEM, 'config');
      await setDoc(docRef, config, { merge: true });
      console.log('✅ System config updated');
    } catch (error) {
      console.error('❌ Error setting system config:', error);
      throw error;
    }
  }

  // ===== POST LOG MONTHLY MANAGEMENT =====

  // Add a new post log monthly entry
  async addPostLogMonthly(logData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.POST_LOG_MONTHLY), {
        ...logData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Post log monthly entry added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding post log monthly entry:', error);
      throw error;
    }
  }

  // Get all post log monthly entries
  async getPostLogMonthly() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.POST_LOG_MONTHLY));
      const entries = [];
      querySnapshot.forEach((doc) => {
        entries.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return entries;
    } catch (error) {
      console.error('❌ Error getting post log monthly entries:', error);
      throw error;
    }
  }

  // Get a single post log monthly entry by ID
  async getPostLogMonthlyEntry(entryId) {
    try {
      const docRef = doc(db, this.collections.POST_LOG_MONTHLY, entryId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        console.log('❌ No such post log monthly entry!');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting post log monthly entry:', error);
      throw error;
    }
  }

  // Update post log monthly entry information
  async updatePostLogMonthly(entryId, updates) {
    try {
      const docRef = doc(db, this.collections.POST_LOG_MONTHLY, entryId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Post log monthly entry updated:', entryId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating post log monthly entry:', error);
      throw error;
    }
  }

  // Delete a post log monthly entry
  async deletePostLogMonthly(entryId) {
    try {
      await deleteDoc(doc(db, this.collections.POST_LOG_MONTHLY, entryId));
      console.log('✅ Post log monthly entry deleted:', entryId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting post log monthly entry:', error);
      throw error;
    }
  }

  // Listen to post log monthly entries changes
  onPostLogMonthlyChange(callback) {
    const q = query(collection(db, this.collections.POST_LOG_MONTHLY), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const entries = [];
      snapshot.forEach((doc) => {
        entries.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(entries);
    });
  }

  // ===== USAGE EVENTS MANAGEMENT =====

  // Add a new usage event
  async addUsageEvent(eventData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.USAGE_EVENTS), {
        ...eventData,
        createdAt: serverTimestamp()
      });
      console.log('✅ Usage event added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding usage event:', error);
      throw error;
    }
  }

  // Get all usage events
  async getUsageEvents() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.USAGE_EVENTS));
      const events = [];
      querySnapshot.forEach((doc) => {
        events.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return events;
    } catch (error) {
      console.error('❌ Error getting usage events:', error);
      throw error;
    }
  }

  // Get a single usage event by ID
  async getUsageEvent(eventId) {
    try {
      const docRef = doc(db, this.collections.USAGE_EVENTS, eventId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        console.log('❌ No such usage event!');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting usage event:', error);
      throw error;
    }
  }

  // Update usage event information
  async updateUsageEvent(eventId, updates) {
    try {
      const docRef = doc(db, this.collections.USAGE_EVENTS, eventId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Usage event updated:', eventId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating usage event:', error);
      throw error;
    }
  }

  // Delete a usage event
  async deleteUsageEvent(eventId) {
    try {
      await deleteDoc(doc(db, this.collections.USAGE_EVENTS, eventId));
      console.log('✅ Usage event deleted:', eventId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting usage event:', error);
      throw error;
    }
  }

  // Listen to usage events changes
  onUsageEventsChange(callback) {
    const q = query(collection(db, this.collections.USAGE_EVENTS), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const events = [];
      snapshot.forEach((doc) => {
        events.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(events);
    });
  }

  // ===== CONTENT CALENDARS MANAGEMENT =====

  // Add a new content calendar
  async addContentCalendar(calendarData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.CONTENT_CALENDARS), {
        ...calendarData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Content calendar added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding content calendar:', error);
      throw error;
    }
  }

  // Get all content calendars
  async getContentCalendars() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.CONTENT_CALENDARS));
      const calendars = [];
      querySnapshot.forEach((doc) => {
        calendars.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return calendars;
    } catch (error) {
      console.error('❌ Error getting content calendars:', error);
      throw error;
    }
  }

  // Get a single content calendar by ID
  async getContentCalendar(calendarId) {
    try {
      const docRef = doc(db, this.collections.CONTENT_CALENDARS, calendarId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        console.log('❌ No such content calendar!');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting content calendar:', error);
      throw error;
    }
  }

  // Update content calendar information
  async updateContentCalendar(calendarId, updates) {
    try {
      const docRef = doc(db, this.collections.CONTENT_CALENDARS, calendarId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Content calendar updated:', calendarId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating content calendar:', error);
      throw error;
    }
  }

  // Delete a content calendar
  async deleteContentCalendar(calendarId) {
    try {
      await deleteDoc(doc(db, this.collections.CONTENT_CALENDARS, calendarId));
      console.log('✅ Content calendar deleted:', calendarId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting content calendar:', error);
      throw error;
    }
  }

  // Listen to content calendars changes
  onContentCalendarsChange(callback) {
    const q = query(collection(db, this.collections.CONTENT_CALENDARS), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const calendars = [];
      snapshot.forEach((doc) => {
        calendars.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(calendars);
    });
  }

  // ===== CONTENT ITEMS MANAGEMENT =====

  // Add a new content item
  async addContentItem(itemData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.CONTENT_ITEMS), {
        ...itemData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Content item added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding content item:', error);
      throw error;
    }
  }

  // Get all content items
  async getContentItems() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.CONTENT_ITEMS));
      const items = [];
      querySnapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return items;
    } catch (error) {
      console.error('❌ Error getting content items:', error);
      throw error;
    }
  }

  // Get a single content item by ID
  async getContentItem(itemId) {
    try {
      const docRef = doc(db, this.collections.CONTENT_ITEMS, itemId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        console.log('❌ No such content item!');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting content item:', error);
      throw error;
    }
  }

  // Update content item information
  async updateContentItem(itemId, updates) {
    try {
      const docRef = doc(db, this.collections.CONTENT_ITEMS, itemId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Content item updated:', itemId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating content item:', error);
      throw error;
    }
  }

  // Delete a content item
  async deleteContentItem(itemId) {
    try {
      await deleteDoc(doc(db, this.collections.CONTENT_ITEMS, itemId));
      console.log('✅ Content item deleted:', itemId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting content item:', error);
      throw error;
    }
  }

  // Listen to content items changes
  onContentItemsChange(callback) {
    const q = query(collection(db, this.collections.CONTENT_ITEMS), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(items);
    });
  }

  // ===== CANVASES MANAGEMENT =====

  // Add a new canvas
  async addCanvas(canvasData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.CANVASES), {
        ...canvasData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Canvas added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding canvas:', error);
      throw error;
    }
  }

  // Get all canvases
  async getCanvases() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.CANVASES));
      const canvases = [];
      querySnapshot.forEach((doc) => {
        canvases.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return canvases;
    } catch (error) {
      console.error('❌ Error getting canvases:', error);
      throw error;
    }
  }

  // Get a single canvas by ID
  async getCanvas(canvasId) {
    try {
      const docRef = doc(db, this.collections.CANVASES, canvasId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        console.log('❌ No such canvas!');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting canvas:', error);
      throw error;
    }
  }

  // Update canvas information
  async updateCanvas(canvasId, updates) {
    try {
      const docRef = doc(db, this.collections.CANVASES, canvasId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Canvas updated:', canvasId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating canvas:', error);
      throw error;
    }
  }

  // Delete a canvas
  async deleteCanvas(canvasId) {
    try {
      await deleteDoc(doc(db, this.collections.CANVASES, canvasId));
      console.log('✅ Canvas deleted:', canvasId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting canvas:', error);
      throw error;
    }
  }

  // Listen to canvases changes
  onCanvasesChange(callback) {
    const q = query(collection(db, this.collections.CANVASES), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const canvases = [];
      snapshot.forEach((doc) => {
        canvases.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(canvases);
    });
  }

  // ===== CANVAS FORM RESPONSES MANAGEMENT =====

  // Add a new canvas form response
  async addCanvasFormResponse(responseData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.CANVAS_FORM_RESPONSES), {
        ...responseData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Canvas form response added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding canvas form response:', error);
      throw error;
    }
  }

  // Get all canvas form responses
  async getCanvasFormResponses() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.CANVAS_FORM_RESPONSES));
      const responses = [];
      querySnapshot.forEach((doc) => {
        responses.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return responses;
    } catch (error) {
      console.error('❌ Error getting canvas form responses:', error);
      throw error;
    }
  }

  // Get a single canvas form response by ID
  async getCanvasFormResponse(responseId) {
    try {
      const docRef = doc(db, this.collections.CANVAS_FORM_RESPONSES, responseId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        console.log('❌ No such canvas form response!');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting canvas form response:', error);
      throw error;
    }
  }

  // Update canvas form response information
  async updateCanvasFormResponse(responseId, updates) {
    try {
      const docRef = doc(db, this.collections.CANVAS_FORM_RESPONSES, responseId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Canvas form response updated:', responseId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating canvas form response:', error);
      throw error;
    }
  }

  // Delete a canvas form response
  async deleteCanvasFormResponse(responseId) {
    try {
      await deleteDoc(doc(db, this.collections.CANVAS_FORM_RESPONSES, responseId));
      console.log('✅ Canvas form response deleted:', responseId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting canvas form response:', error);
      throw error;
    }
  }

  // Listen to canvas form responses changes
  onCanvasFormResponsesChange(callback) {
    const q = query(collection(db, this.collections.CANVAS_FORM_RESPONSES), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const responses = [];
      snapshot.forEach((doc) => {
        responses.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(responses);
    });
  }

}

export const firestoreService = new FirestoreService();
