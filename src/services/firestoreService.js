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

  // Approve a user (move from pending to approved). Doc id = lowercase email for consistent lookup.
  async approveUser(userId, userData) {
    try {
      const emailKey = (userData.email || '').trim().toLowerCase();
      await setDoc(doc(db, this.collections.APPROVED_USERS, emailKey), {
        ...userData,
        email: userData.email?.trim() || emailKey,
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
        const data = doc.data();
        approvedUsers.push({
          id: doc.id,
          ...data,
          // Ensure email is always set (doc id is email); prevents users disappearing in UI when field is missing
          email: data.email ?? doc.id
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

  // Get one approved user by email. Tries exact id, then lowercase; if still not found, finds by case-insensitive match (handles admin-added docs with different casing).
  async getApprovedUserByEmail(email) {
    if (!email) return null;
    try {
      const trimmed = (email || '').trim();
      const lower = trimmed.toLowerCase();
      let docSnap = await getDoc(doc(db, this.collections.APPROVED_USERS, trimmed));
      if (!docSnap.exists() && lower !== trimmed)
        docSnap = await getDoc(doc(db, this.collections.APPROVED_USERS, lower));
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

  // Update approved user (merge: true so system admins can create a profile doc if they don't have one).
  // Use email as-is for doc path so request.auth.token.email == userEmail in rules.
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

      const emailKey = (email || '').trim();
      const docRef = doc(db, this.collections.APPROVED_USERS, emailKey);
      await setDoc(docRef, {
        ...cleanedUpdates,
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log('✅ Approved user updated:', emailKey);
    } catch (error) {
      console.error('❌ Error updating approved user:', error);
      throw error;
    }
  }

  // Update current user's last-seen timestamp (for presence / "last online"). Call on load and periodically while app is open.
  async updateLastSeen(userEmail) {
    if (!userEmail) return;
    try {
      const emailKey = String(userEmail).trim().toLowerCase();
      const docRef = doc(db, this.collections.APPROVED_USERS, emailKey);
      await setDoc(docRef, { lastSeenAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      // Non-fatal; avoid spamming console
    }
  }

  // Listen for changes to a specific approved user's profile. Use email as-is so we listen to doc at token path.
  onApprovedUserChange(email, callback) {
    if (!email) {
      return () => {}; // Return empty unsubscribe
    }
    const emailKey = (email || '').trim();
    const userDocRef = doc(db, this.collections.APPROVED_USERS, emailKey);
    
    return onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({
          id: docSnap.id,
          ...docSnap.data()
        });
      }
    }, (error) => {
      console.error('❌ Error listening to user profile:', error);
    });
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

  // Get post_log tasks for a client (for history). Uses clientId on task; newer logs have it set.
  async getPostLogTasksByClient(clientId, options = {}) {
    const { limit: max = 200 } = options;
    try {
      if (!clientId) return [];
      const q = query(
        collection(db, this.collections.TASKS),
        where('task_type', '==', 'post_log'),
        where('clientId', '==', clientId),
        orderBy('completed_date', 'desc'),
        firestoreLimit(max)
      );
      const snapshot = await getDocs(q);
      const tasks = [];
      snapshot.forEach((docSnap) => {
        tasks.push({ id: docSnap.id, ...docSnap.data() });
      });
      return tasks;
    } catch (error) {
      // Index may not exist yet; fallback: no history
      console.warn('getPostLogTasksByClient:', error?.message || error);
      return [];
    }
  }

  // Get monthly post log history for a client (snapshots saved at each runMonthlyPostsReset). Returns entries newest first.
  async getPostLogMonthlyHistory(clientId, options = {}) {
    const { limit: max = 24 } = options;
    try {
      if (!clientId) return [];
      const q = query(
        collection(db, this.collections.POST_LOG_MONTHLY),
        where('clientId', '==', clientId),
        orderBy('yearMonth', 'desc'),
        firestoreLimit(max)
      );
      const snapshot = await getDocs(q);
      const out = [];
      snapshot.forEach((docSnap) => {
        out.push({ id: docSnap.id, ...docSnap.data() });
      });
      return out;
    } catch (e) {
      console.warn('getPostLogMonthlyHistory:', e?.message || e);
      return [];
    }
  }

  // Last month we ran the monthly posts reset (year-month string e.g. "2025-02")
  async getLastPostsResetMonth() {
    try {
      const ref = doc(db, this.collections.SYSTEM, 'posts_reset');
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data().lastYearMonth || null) : null;
    } catch (e) {
      console.warn('getLastPostsResetMonth:', e?.message);
      return null;
    }
  }

  // Run monthly posts reset: set all clients to postsUsed 0, postsRemaining = packageSize. Before reset, snapshot each client's postsUsed (and postsUsedByPlatform if set) into post_log_monthly for the month just ended. History is also in post_log tasks.
  async runMonthlyPostsReset() {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const last = await this.getLastPostsResetMonth();
    if (last && last >= currentYearMonth) return { didReset: false, reason: 'already reset this month' };
    const clients = await this.getClients();
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const previousYearMonth = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
    const col = this.collections.POST_LOG_MONTHLY;
    for (const c of clients) {
      const packageSize = Math.max(0, Number(c.packageSize) ?? 0);
      const postsLogged = Math.max(0, Number(c.postsUsed) ?? 0);
      const snapshotData = {
        clientId: c.id,
        yearMonth: previousYearMonth,
        postsLogged,
        clientName: c.clientName || null
      };
      if (c.postsUsedByPlatform && typeof c.postsUsedByPlatform === 'object') {
        snapshotData.postsByPlatform = { ...c.postsUsedByPlatform };
      }
      const snapId = `${c.id}_${previousYearMonth}`;
      await setDoc(doc(db, col, snapId), snapshotData, { merge: true });
      const platforms = c.platforms && typeof c.platforms === 'object' ? c.platforms : {};
      const enabled = Object.keys(platforms).filter((k) => platforms[k]);
      if (enabled.length > 0) {
        const perPlatform = Math.floor(packageSize / enabled.length);
        let remainder = packageSize - perPlatform * enabled.length;
        const postsRemainingByPlatform = {};
        const postsUsedByPlatform = {};
        enabled.forEach((key) => {
          const add = remainder > 0 ? 1 : 0;
          remainder -= add;
          postsRemainingByPlatform[key] = perPlatform + add;
          postsUsedByPlatform[key] = 0;
        });
        await this.updateClient(c.id, { postsUsed: 0, postsRemaining: packageSize, postsRemainingByPlatform, postsUsedByPlatform });
      } else {
        await this.updateClient(c.id, { postsUsed: 0, postsRemaining: packageSize });
      }
    }
    const ref = doc(db, this.collections.SYSTEM, 'posts_reset');
    await setDoc(ref, { lastYearMonth: currentYearMonth, updatedAt: serverTimestamp() }, { merge: true });
    console.log(`✅ Monthly posts reset: ${clients.length} clients renewed for ${currentYearMonth}; snapshots saved for ${previousYearMonth}`);
    return { didReset: true, clientCount: clients.length, yearMonth: currentYearMonth, snapshotMonth: previousYearMonth };
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
      // If marking as completed, notify requester for delegated tasks
      if (updates.status === 'completed') {
        const taskRef = doc(db, this.collections.TASKS, taskId);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) {
          const taskData = taskSnap.data();
          const assignedBy = taskData.assigned_by;
          if (assignedBy && typeof assignedBy === 'string') {
            const taskRequestId = taskData.taskRequestId || null;
            const link = taskRequestId ? `/tasks?tab=outbox&requestId=${taskRequestId}` : '/tasks?tab=outbox';
            await this.createNotification({
              userEmail: assignedBy,
              type: 'task_completed',
              title: 'Task completed',
              message: `A task you requested was completed: ${taskData.title || 'Task'}`,
              link,
              taskRequestId,
              read: false
            });
          }
        }
      }

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

  // Get a single task by ID
  async getTaskById(taskId) {
    try {
      const taskRef = doc(db, this.collections.TASKS, taskId);
      const taskSnap = await getDoc(taskRef);
      if (!taskSnap.exists()) return null;
      return { id: taskSnap.id, ...taskSnap.data() };
    } catch (error) {
      console.error('❌ Error getting task:', error);
      return null;
    }
  }

  // Get sent task requests (outbox: requests you sent to others)
  async getSentTaskRequests(userEmail) {
    try {
      const q = query(
        collection(db, this.collections.TASK_REQUESTS),
        where('fromUserEmail', '==', userEmail)
      );
      const snapshot = await getDocs(q);
      const requests = [];
      snapshot.forEach((docSnap) => {
        requests.push({ id: docSnap.id, ...docSnap.data() });
      });
      return requests.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('❌ Error getting sent task requests:', error);
      return [];
    }
  }

  // ----- Per-user task/request archives (local only, not shared) -----
  _archiveDocId(userEmail, refType, refId) {
    const safe = (s) => String(s).replace(/[@./]/g, '_').slice(0, 200);
    return `${safe(userEmail)}__${refType}__${safe(refId)}`;
  }

  async archiveTaskForUser(userEmail, taskId) {
    try {
      const docId = this._archiveDocId(userEmail, 'task', taskId);
      await setDoc(doc(db, this.collections.USER_TASK_ARCHIVES, docId), {
        userEmail,
        refType: 'task',
        refId: taskId,
        archivedAt: serverTimestamp()
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('❌ Error archiving task for user:', error);
      throw error;
    }
  }

  async archiveRequestForUser(userEmail, taskRequestId) {
    try {
      const docId = this._archiveDocId(userEmail, 'request', taskRequestId);
      await setDoc(doc(db, this.collections.USER_TASK_ARCHIVES, docId), {
        userEmail,
        refType: 'request',
        refId: taskRequestId,
        archivedAt: serverTimestamp()
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('❌ Error archiving request for user:', error);
      throw error;
    }
  }

  async unarchiveTaskForUser(userEmail, taskId) {
    try {
      const docId = this._archiveDocId(userEmail, 'task', taskId);
      await deleteDoc(doc(db, this.collections.USER_TASK_ARCHIVES, docId));
      return { success: true };
    } catch (error) {
      console.error('❌ Error unarchiving task:', error);
      throw error;
    }
  }

  async unarchiveRequestForUser(userEmail, taskRequestId) {
    try {
      const docId = this._archiveDocId(userEmail, 'request', taskRequestId);
      await deleteDoc(doc(db, this.collections.USER_TASK_ARCHIVES, docId));
      return { success: true };
    } catch (error) {
      console.error('❌ Error unarchiving request:', error);
      throw error;
    }
  }

  async getArchivedTaskIds(userEmail) {
    try {
      const q = query(
        collection(db, this.collections.USER_TASK_ARCHIVES),
        where('userEmail', '==', userEmail),
        where('refType', '==', 'task')
      );
      const snapshot = await getDocs(q);
      const ids = [];
      snapshot.forEach((d) => { ids.push(d.data().refId); });
      return ids;
    } catch (error) {
      console.error('❌ Error getting archived task ids:', error);
      return [];
    }
  }

  async getArchivedRequestIds(userEmail) {
    try {
      const q = query(
        collection(db, this.collections.USER_TASK_ARCHIVES),
        where('userEmail', '==', userEmail),
        where('refType', '==', 'request')
      );
      const snapshot = await getDocs(q);
      const ids = [];
      snapshot.forEach((d) => { ids.push(d.data().refId); });
      return ids;
    } catch (error) {
      console.error('❌ Error getting archived request ids:', error);
      return [];
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

  // ===== SYSTEM CONFIGURATION =====

  // Save system config (like current role)
  async saveSystemConfig(key, value) {
    try {
      await setDoc(doc(db, this.collections.SYSTEM_CONFIG, key), {
        value,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      throw error;
    }
  }

  // Convenience: save system uptime
  async saveSystemUptime(value) {
    return this.saveSystemConfig('systemUptime', value);
  }

  /**
   * Bootstrap the system_config/admins document if it doesn't exist.
   * Called once by the initial system admin to seed the admins list.
   * Safe to call multiple times - only creates if missing.
   */
  async bootstrapSystemAdmins(bootstrapEmail) {
    try {
      const adminDocRef = doc(db, this.collections.SYSTEM_CONFIG, 'admins');
      const adminSnap = await getDoc(adminDocRef);
      if (!adminSnap.exists()) {
        await setDoc(adminDocRef, {
          emails: [bootstrapEmail.toLowerCase()],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ system_config/admins bootstrapped with:', bootstrapEmail);
      }
    } catch (error) {
      console.warn('⚠️ Could not bootstrap system admins:', error.message);
    }
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

  // Get employee by email. Tries exact match then lowercase so we find existing docs regardless of casing.
  async getEmployeeByEmail(email) {
    try {
      const trimmed = (email || '').trim();
      let q = query(collection(db, this.collections.EMPLOYEES), where('email', '==', trimmed));
      let snapshot = await getDocs(q);
      if (snapshot.empty && trimmed !== trimmed.toLowerCase()) {
        q = query(collection(db, this.collections.EMPLOYEES), where('email', '==', trimmed.toLowerCase()));
        snapshot = await getDocs(q);
      }
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('❌ Error fetching employee:', error);
      throw error;
    }
  }

  // Update employee information
  async updateEmployee(employeeId, employeeData) {
    try {
      const docRef = doc(db, this.collections.EMPLOYEES, employeeId);
      const sanitized = Object.fromEntries(
        Object.entries({ ...employeeData, updatedAt: serverTimestamp() }).filter(([, v]) => v !== undefined)
      );
      await updateDoc(docRef, sanitized);
      console.log('✅ Employee updated:', employeeId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      throw error;
    }
  }

  // Add new employee. Keep email as provided so Firestore rule (resource.data.email == request.auth.token.email) passes.
  async addEmployee(employeeData) {
    try {
      const normalized = { ...employeeData };
      if (normalized.email != null) normalized.email = String(normalized.email).trim();
      const sanitized = Object.fromEntries(
        Object.entries({ ...normalized, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }).filter(([, v]) => v !== undefined)
      );
      const docRef = await addDoc(collection(db, this.collections.EMPLOYEES), sanitized);
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

  // Get leave requests (one-time fetch, no listener for performance)
  async getLeaveRequests(userEmail = null) {
    try {
      let q;
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
      
      const snapshot = await getDocs(q);
      const requests = [];
      snapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return requests;
    } catch (error) {
      console.error('❌ Error getting leave requests:', error);
      return [];
    }
  }

  /**
   * Get team members with overlapping leave requests for given date range.
   * Used to warn users about potential scheduling conflicts before submitting leave.
   *
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @param {string} excludeEmail - Email of user to exclude (the one making the request)
   * @returns {Promise<Array>} - Array of { employeeName, employeeEmail, startDate, endDate, type, status }
   */
  async getTeamLeaveConflicts(startDate, endDate, excludeEmail = null) {
    try {
      // Query for approved and pending requests
      const q = query(
        collection(db, this.collections.LEAVE_REQUESTS),
        where('status', 'in', ['approved', 'pending']),
        orderBy('startDate', 'asc')
      );

      const snapshot = await getDocs(q);
      const conflicts = [];

      snapshot.forEach((doc) => {
        const request = doc.data();

        // Skip the requesting user's own requests
        if (excludeEmail && request.employeeEmail === excludeEmail) {
          return;
        }

        // Check for date overlap
        // Overlap occurs if: requestStart <= queryEnd AND requestEnd >= queryStart
        const requestStart = request.startDate;
        const requestEnd = request.endDate;

        if (requestStart && requestEnd) {
          const hasOverlap = requestStart <= endDate && requestEnd >= startDate;

          if (hasOverlap) {
            conflicts.push({
              id: doc.id,
              employeeName: request.employeeName || request.employeeEmail?.split('@')[0] || 'Unknown',
              employeeEmail: request.employeeEmail,
              startDate: requestStart,
              endDate: requestEnd,
              type: request.type || 'vacation',
              status: request.status,
              days: request.days || 1
            });
          }
        }
      });

      console.log(`📅 Found ${conflicts.length} leave conflicts for ${startDate} to ${endDate}`);
      return conflicts;
    } catch (error) {
      console.error('❌ Error getting team leave conflicts:', error);
      return [];
    }
  }

  // Listen to leave requests changes (real-time listener - kept for backwards compatibility)
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

  // ===== LEAVE REQUEST - ENHANCED METHODS =====

  // Normalize leave balance so it always has total, used, remaining (single source of truth shape)
  _normalizeLeaveBalances(raw) {
    const def = (val, fallback) => (val !== undefined && val !== null && val !== '') ? Number(val) : fallback;
    const vac = raw?.vacation || {};
    const sick = raw?.sick || {};
    const remote = raw?.remote || {};
    const vTotal = def(vac.total, 15);
    const vUsed = def(vac.used, 0);
    const sTotal = def(sick.total, 3);
    const sUsed = def(sick.used, 0);
    const rTotal = def(remote.total, 0);
    const rUsed = def(remote.used, 0);
    return {
      vacation: { total: vTotal, used: vUsed, remaining: Math.max(0, vTotal - vUsed) },
      sick: { total: sTotal, used: sUsed, remaining: Math.max(0, sTotal - sUsed) },
      remote: { total: rTotal, used: rUsed, remaining: Math.max(0, rTotal - rUsed) }
    };
  }

  // Get user's leave balances from their user document (APPROVED_USERS). Single source of truth.
  async getUserLeaveBalances(userEmail) {
    if (!userEmail || typeof userEmail !== 'string') {
      console.warn('⚠️ getUserLeaveBalances called with invalid email:', userEmail);
      return this._normalizeLeaveBalances(null);
    }
    try {
      const userDoc = await getDoc(doc(db, this.collections.APPROVED_USERS, userEmail));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return this._normalizeLeaveBalances(data.leaveBalances);
      }
      return this._normalizeLeaveBalances(null);
    } catch (error) {
      console.error('❌ Error getting leave balances:', error);
      return this._normalizeLeaveBalances(null);
    }
  }

  // Update user's leave balances (admin function). Writes to APPROVED_USERS so My Time Off and Team Management stay in sync.
  async updateUserLeaveBalances(userEmail, balances) {
    if (!userEmail || typeof userEmail !== 'string') {
      console.warn('⚠️ updateUserLeaveBalances called with invalid email:', userEmail);
      return { success: false, error: 'Invalid user email' };
    }
    const toStore = {
      vacation: { total: Number(balances.vacation?.total) ?? 0, used: Number(balances.vacation?.used) ?? 0 },
      sick: { total: Number(balances.sick?.total) ?? 0, used: Number(balances.sick?.used) ?? 0 },
      remote: { total: Number(balances.remote?.total) ?? 0, used: Number(balances.remote?.used) ?? 0 }
    };
    try {
      const userRef = doc(db, this.collections.APPROVED_USERS, userEmail);
      await updateDoc(userRef, {
        leaveBalances: toStore,
        leaveBalancesUpdatedAt: serverTimestamp()
      });
      console.log('✅ Leave balances updated for:', userEmail);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating leave balances:', error);
      throw error;
    }
  }

  // Get all users with their leave balances (for admin view)
  async getAllUsersWithLeaveBalances() {
    try {
      const users = await this.getApprovedUsers();
      const usersWithBalances = await Promise.all(
        users.map(async (user) => {
          const balances = await this.getUserLeaveBalances(user.email);
          return { ...user, leaveBalances: balances };
        })
      );
      return usersWithBalances;
    } catch (error) {
      console.error('❌ Error getting users with balances:', error);
      return [];
    }
  }

  // Get all time off admins
  async getTimeOffAdmins() {
    try {
      const q = query(
        collection(db, this.collections.APPROVED_USERS),
        where('isTimeOffAdmin', '==', true)
      );
      const snapshot = await getDocs(q);
      const admins = [];
      snapshot.forEach((doc) => {
        admins.push({ id: doc.id, ...doc.data() });
      });
      console.log('✅ Found time off admins:', admins.length);
      return admins;
    } catch (error) {
      console.error('❌ Error getting time off admins:', error);
      return [];
    }
  }

  // Set user as time off admin
  async setTimeOffAdmin(userEmail, isAdmin) {
    try {
      const userRef = doc(db, this.collections.APPROVED_USERS, userEmail);
      await updateDoc(userRef, {
        isTimeOffAdmin: isAdmin,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Time off admin status updated:', userEmail, isAdmin);
      return { success: true };
    } catch (error) {
      console.error('❌ Error setting time off admin:', error);
      throw error;
    }
  }

  // Check if user is time off admin
  async isTimeOffAdmin(userEmail) {
    try {
      const userDoc = await getDoc(doc(db, this.collections.APPROVED_USERS, userEmail));
      if (userDoc.exists()) {
        return userDoc.data().isTimeOffAdmin === true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error checking time off admin:', error);
      return false;
    }
  }

  // Cancel leave request
  async cancelLeaveRequest(requestId, cancelledBy, reason = null) {
    try {
      const docRef = doc(db, this.collections.LEAVE_REQUESTS, requestId);
      const historyEntry = {
        action: 'cancelled',
        by: cancelledBy,
        timestamp: new Date().toISOString(),
        notes: reason
      };
      
      await updateDoc(docRef, {
        status: 'cancelled',
        cancelledBy,
        cancelReason: reason,
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        history: arrayUnion(historyEntry)
      });
      console.log('✅ Leave request cancelled:', requestId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error cancelling leave request:', error);
      throw error;
    }
  }

  // Archive leave request (soft delete - keeps record but hides from active list)
  async archiveLeaveRequest(requestId, archivedBy) {
    try {
      const docRef = doc(db, this.collections.LEAVE_REQUESTS, requestId);
      const historyEntry = {
        action: 'archived',
        by: archivedBy,
        timestamp: new Date().toISOString(),
        notes: null
      };
      
      await updateDoc(docRef, {
        archived: true,
        archivedBy,
        archivedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        history: arrayUnion(historyEntry)
      });
      console.log('✅ Leave request archived:', requestId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error archiving leave request:', error);
      throw error;
    }
  }

  // Unarchive leave request
  async unarchiveLeaveRequest(requestId, unarchivedBy) {
    try {
      const docRef = doc(db, this.collections.LEAVE_REQUESTS, requestId);
      const historyEntry = {
        action: 'unarchived',
        by: unarchivedBy,
        timestamp: new Date().toISOString(),
        notes: null
      };
      
      await updateDoc(docRef, {
        archived: false,
        archivedBy: null,
        archivedAt: null,
        updatedAt: serverTimestamp(),
        history: arrayUnion(historyEntry)
      });
      console.log('✅ Leave request unarchived:', requestId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error unarchiving leave request:', error);
      throw error;
    }
  }

  // Permanently delete leave request (admin only)
  async deleteLeaveRequest(requestId) {
    try {
      const docRef = doc(db, this.collections.LEAVE_REQUESTS, requestId);
      await deleteDoc(docRef);
      console.log('✅ Leave request permanently deleted:', requestId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting leave request:', error);
      throw error;
    }
  }

  // Check for overlapping leave requests
  async hasOverlappingRequest(userEmail, startDate, endDate, excludeRequestId = null) {
    try {
      const requests = await this.getLeaveRequests(userEmail);
      return requests.some(req => {
        // Skip the request we're editing
        if (excludeRequestId && req.id === excludeRequestId) return false;
        // Skip cancelled/rejected requests
        if (req.status === 'cancelled' || req.status === 'rejected') return false;
        
        // Check date overlap
        const reqStart = new Date(req.startDate);
        const reqEnd = new Date(req.endDate);
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);
        
        return (newStart <= reqEnd && newEnd >= reqStart);
      });
    } catch (error) {
      console.error('❌ Error checking overlap:', error);
      return false;
    }
  }

  // Add entry to request history
  async addToRequestHistory(requestId, action, byEmail, notes = null) {
    try {
      const historyEntry = {
        action,
        by: byEmail,
        timestamp: new Date().toISOString(),
        notes
      };
      
      const docRef = doc(db, this.collections.LEAVE_REQUESTS, requestId);
      await updateDoc(docRef, {
        history: arrayUnion(historyEntry),
        updatedAt: serverTimestamp()
      });
      console.log('✅ History entry added:', requestId, action);
      return { success: true };
    } catch (error) {
      console.error('❌ Error adding history entry:', error);
      throw error;
    }
  }

  // Submit leave request with history and travel fields
  async submitLeaveRequestEnhanced(requestData) {
    try {
      const historyEntry = {
        action: 'created',
        by: requestData.employeeEmail,
        timestamp: new Date().toISOString(),
        notes: null
      };

      const docRef = await addDoc(collection(db, this.collections.LEAVE_REQUESTS), {
        ...requestData,
        status: 'pending',
        submittedDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        history: [historyEntry],
        // Travel fields (optional)
        isTravel: requestData.isTravel || false,
        destination: requestData.destination || '',
        travelPurpose: requestData.travelPurpose || '',
        estimatedExpenses: requestData.estimatedExpenses || 0,
        // Manager notes (for rejection feedback)
        managerNotes: ''
      });
      console.log('✅ Enhanced leave request submitted:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error submitting enhanced leave request:', error);
      throw error;
    }
  }

  // Update leave request status with history tracking
  async updateLeaveRequestStatusEnhanced(requestId, status, reviewedBy, notes = null) {
    try {
      const historyEntry = {
        action: status === 'approved' ? 'approved' : 'rejected',
        by: reviewedBy,
        timestamp: new Date().toISOString(),
        notes
      };

      const docRef = doc(db, this.collections.LEAVE_REQUESTS, requestId);
      await updateDoc(docRef, {
        status,
        reviewedBy,
        reviewedDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
        managerNotes: notes || '',
        history: arrayUnion(historyEntry)
      });
      console.log('✅ Leave request status updated with history:', requestId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating leave request:', error);
      throw error;
    }
  }

  /**
   * Update an approved leave request (any time-off admin). Notifies requester (in-app + email via trigger).
   */
  async updateLeaveRequestApproved(requestId, updates, editedBy) {
    try {
      const docRef = doc(db, this.collections.LEAVE_REQUESTS, requestId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Leave request not found');
      const data = snap.data();
      if (data.status !== 'approved') throw new Error('Only approved requests can be edited');

      const historyEntry = {
        action: 'edited',
        by: editedBy,
        timestamp: new Date().toISOString(),
        notes: 'Admin updated request details'
      };

      const allowed = ['startDate', 'endDate', 'days', 'type', 'reason', 'notes', 'managerNotes', 'otherSubType', 'otherCustomLabel'];
      const toUpdate = {};
      allowed.forEach((k) => {
        if (updates[k] !== undefined) toUpdate[k] = updates[k];
      });
      toUpdate.updatedAt = serverTimestamp();
      toUpdate.history = arrayUnion(historyEntry);

      await updateDoc(docRef, toUpdate);
      console.log('✅ Leave request edited:', requestId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error editing leave request:', error);
      throw error;
    }
  }

  /** Store requester's Google Calendar event ID so we don't create duplicate events. */
  async setLeaveRequestRequesterCalendarEventId(requestId, eventId) {
    try {
      const docRef = doc(db, this.collections.LEAVE_REQUESTS, requestId);
      await updateDoc(docRef, {
        requesterCalendarEventId: eventId,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Error setting requester calendar event id:', error);
      throw error;
    }
  }

  /** Store calendar event ID for a given email (Michelle/Matthew when they approve). Used to update event when leave is edited. */
  async setLeaveRequestCalendarEventIdForEmail(requestId, email, eventId) {
    try {
      const docRef = doc(db, this.collections.LEAVE_REQUESTS, requestId);
      const snap = await getDoc(docRef);
      const existing = (snap.exists() && snap.data().calendarEventIdsByEmail) || {};
      await updateDoc(docRef, {
        calendarEventIdsByEmail: { ...existing, [email]: eventId },
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Error setting calendar event id for email:', error);
      throw error;
    }
  }

  // Deduct from user's leave balance after approval
  async deductLeaveBalance(userEmail, leaveType, days, requestId) {
    // Validate inputs
    if (!userEmail || typeof userEmail !== 'string') {
      console.warn('⚠️ deductLeaveBalance called with invalid email:', userEmail);
      return { success: false, error: 'Invalid user email' };
    }
    
    if (!leaveType || !['vacation', 'sick', 'remote'].includes(leaveType)) {
      console.warn('⚠️ deductLeaveBalance called with invalid leave type:', leaveType);
      return { success: false, error: 'Invalid leave type' };
    }
    
    try {
      const balances = await this.getUserLeaveBalances(userEmail);
      if (balances[leaveType]) {
        balances[leaveType].used += days;
        balances[leaveType].remaining = balances[leaveType].total - balances[leaveType].used;
        await this.updateUserLeaveBalances(userEmail, balances);
        
        // Add history entry to the request
        await this.addToRequestHistory(requestId, 'balance_deducted', 'system', `${days} ${leaveType} days deducted`);
        
        console.log('✅ Leave balance deducted:', userEmail, leaveType, days);
        return { success: true };
      }
      return { success: false, error: 'Invalid leave type' };
    } catch (error) {
      console.error('❌ Error deducting leave balance:', error);
      throw error;
    }
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

  // Get a single client by ID
  async getClientById(clientId) {
    try {
      const docRef = doc(db, this.collections.CLIENTS, clientId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching client:', error);
      throw error;
    }
  }

  // Generate next client number (CLT-001, CLT-002, etc.)
  async generateClientNumber() {
    try {
      const clients = await this.getClients();
      // Find highest existing client number
      let maxNum = 0;
      clients.forEach(client => {
        const num = client.clientNumber;
        if (num && typeof num === 'string') {
          const match = num.match(/CLT-(\d+)/);
          if (match) {
            const n = parseInt(match[1], 10);
            if (n > maxNum) maxNum = n;
          }
        }
      });
      const nextNum = (maxNum + 1).toString().padStart(3, '0');
      return `CLT-${nextNum}`;
    } catch (error) {
      console.error('❌ Error generating client number:', error);
      // Fallback to timestamp-based ID
      return `CLT-${Date.now().toString(36).toUpperCase()}`;
    }
  }

  // Assign client numbers to all clients that don't have one
  async assignMissingClientNumbers() {
    try {
      const clients = await this.getClients();
      const clientsWithoutNumber = clients.filter(c => !c.clientNumber);
      
      if (clientsWithoutNumber.length === 0) {
        console.log('✅ All clients already have client numbers');
        return { updated: 0 };
      }

      // Find highest existing number
      let maxNum = 0;
      clients.forEach(client => {
        const num = client.clientNumber;
        if (num && typeof num === 'string') {
          const match = num.match(/CLT-(\d+)/);
          if (match) {
            const n = parseInt(match[1], 10);
            if (n > maxNum) maxNum = n;
          }
        }
      });

      // Assign numbers to clients without one
      let nextNum = maxNum + 1;
      for (const client of clientsWithoutNumber) {
        const clientNumber = `CLT-${nextNum.toString().padStart(3, '0')}`;
        await this.updateClient(client.id, { clientNumber });
        console.log(`✅ Assigned ${clientNumber} to ${client.clientName || client.id}`);
        nextNum++;
      }

      console.log(`✅ Assigned client numbers to ${clientsWithoutNumber.length} clients`);
      return { updated: clientsWithoutNumber.length };
    } catch (error) {
      console.error('❌ Error assigning client numbers:', error);
      throw error;
    }
  }

  // Assign profile photos to known clients based on their names
  // This migrates hardcoded logos to stored profilePhoto field
  async assignKnownClientPhotos() {
    try {
      const clients = await this.getClients();
      const photoMappings = [
        { match: (name) => name?.toLowerCase().includes('agency'), photo: '/agency-logo.png' },
        { match: (name) => name?.toLowerCase().includes('paul mcclean') || name?.toLowerCase().includes('mcclean design'), photo: '/mcclean-design-logo.png' },
        { match: (name) => name?.toLowerCase().includes('resop'), photo: '/resop-team-photo.png' },
        { match: (name) => name?.toLowerCase().includes('kodiak'), photo: '/kodiak-club-logo.png' },
      ];

      let updated = 0;
      for (const client of clients) {
        // Skip if already has a profile photo
        if (client.profilePhoto) continue;

        const clientName = client.clientName || client.name;
        const mapping = photoMappings.find(m => m.match(clientName));
        
        if (mapping) {
          await this.updateClient(client.id, { profilePhoto: mapping.photo });
          console.log(`✅ Assigned profile photo to ${clientName}: ${mapping.photo}`);
          updated++;
        }
      }

      console.log(`✅ Assigned profile photos to ${updated} clients`);
      return { updated };
    } catch (error) {
      console.error('❌ Error assigning client photos:', error);
      throw error;
    }
  }

  // Add new client (auto-generates clientNumber). Logs client_added for HR analytics.
  async addClient(clientData) {
    try {
      // Generate client number if not provided
      const clientNumber = clientData.clientNumber || await this.generateClientNumber();
      
      const docRef = await addDoc(collection(db, this.collections.CLIENTS), {
        ...clientData,
        clientNumber,
        isInternal: clientData.isInternal === true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Client added:', docRef.id, 'with number:', clientNumber);

      await this.logClientAdded(docRef.id, clientData.clientName || clientData.name || 'Unknown', clientData.assignedManager || null, auth.currentUser?.email || auth.currentUser?.uid || null);

      return { success: true, id: docRef.id, clientNumber };
    } catch (error) {
      console.error('❌ Error adding client:', error);
      throw error;
    }
  }

  /**
   * Sanitize payload for Firestore: omit undefined, ensure keys are strings, keep primitives and plain objects safe.
   */
  _sanitizeClientUpdateData(data) {
    if (data == null) return {};
    const out = {};
    for (const key of Object.keys(data)) {
      const k = String(key);
      const v = data[key];
      if (v === undefined) continue;
      if (v != null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && typeof v.toDate !== 'function') {
        out[k] = this._sanitizeClientUpdateData(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  // Update client information
  async updateClient(clientId, clientData) {
    try {
      const id = clientId != null ? String(clientId) : '';
      const docRef = doc(db, this.collections.CLIENTS, id);
      const sanitized = this._sanitizeClientUpdateData(clientData);
      await updateDoc(docRef, {
        ...sanitized,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Client updated:', clientId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating client:', error);
      throw error;
    }
  }

  // Delete client (logs movement for HR before delete)
  async deleteClient(clientId) {
    try {
      const client = await this.getClientById(clientId);
      if (client) {
        await this.logClientMovement({
          type: 'client_deleted',
          clientId,
          clientName: client.clientName || client.name || 'Unknown',
          previousAssignedManager: client.assignedManager || null,
          performedBy: auth.currentUser?.email || auth.currentUser?.uid || null,
          timestamp: new Date()
        });
      }
      await deleteDoc(doc(db, this.collections.CLIENTS, clientId));
      console.log('✅ Client deleted:', clientId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting client:', error);
      throw error;
    }
  }

  /**
   * Merge mergeFromId into keepId: combine profile data (keep wins, fill blanks from mergeFrom),
   * reassign all references (tasks, messages, reports, contracts, instagram_reports) to keepId,
   * then delete mergeFrom client. Use for fixing duplicate clients.
   * @param {string} keepId - Client to keep
   * @param {string} mergeFromId - Client to merge in and then delete
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async mergeClientInto(keepId, mergeFromId) {
    if (keepId === mergeFromId) {
      return { success: false, error: 'Cannot merge a client into itself' };
    }
    try {
      const [keep, mergeFrom] = await Promise.all([
        this.getClientById(keepId),
        this.getClientById(mergeFromId)
      ]);
      if (!keep) return { success: false, error: 'Keep client not found' };
      if (!mergeFrom) return { success: false, error: 'Merge-from client not found' };

      const mergeFields = [
        'clientName', 'clientEmail', 'clientType', 'phone', 'notes', 'website', 'instagramHandle',
        'packageType', 'packageSize', 'postsUsed', 'postsRemaining', 'paymentStatus', 'approvalStatus',
        'status', 'postedOn', 'profilePhoto', 'brokerage', 'platforms', 'startDate', 'lastContact',
        'customPrice', 'overduePosts', 'assignedManager', 'signupScreenshotUrl', 'signupScreenshotUploadedAt'
      ];
      const merged = { ...keep };
      for (const key of mergeFields) {
        const keepVal = keep[key];
        const fromVal = mergeFrom[key];
        if (keepVal !== undefined && keepVal !== null && keepVal !== '') continue;
        if (fromVal !== undefined && fromVal !== null) merged[key] = fromVal;
      }
      if (Array.isArray(mergeFrom.additionalScreenshots) && mergeFrom.additionalScreenshots.length > 0) {
        const existing = Array.isArray(merged.additionalScreenshots) ? merged.additionalScreenshots : [];
        merged.additionalScreenshots = [...existing, ...mergeFrom.additionalScreenshots];
      }

      await this.updateClient(keepId, merged);

      const collectionsWithClientId = [
        this.collections.TASKS,
        this.collections.CLIENT_MESSAGES,
        this.collections.CLIENT_REPORTS,
        this.collections.CLIENT_CONTRACTS,
        this.collections.INSTAGRAM_REPORTS
      ];
      for (const colName of collectionsWithClientId) {
        const q = query(
          collection(db, colName),
          where('clientId', '==', mergeFromId)
        );
        const snapshot = await getDocs(q);
        for (const docSnap of snapshot.docs) {
          await updateDoc(doc(db, colName, docSnap.id), { clientId: keepId });
        }
      }

      await this.logClientMovement({
        type: 'client_merged',
        clientId: keepId,
        clientName: keep.clientName || keep.name || 'Unknown',
        details: { mergedFromId, mergedFromName: mergeFrom.clientName || mergeFrom.name || 'Unknown' },
        performedBy: auth.currentUser?.email || auth.currentUser?.uid || null,
        timestamp: new Date()
      });

      await deleteDoc(doc(db, this.collections.CLIENTS, mergeFromId));
      console.log('✅ Merged client', mergeFromId, 'into', keepId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error merging client:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log a client movement event for HR analytics (deletion, reassignment, etc.)
   */
  async logClientMovement(event) {
    try {
      const col = collection(db, this.collections.CLIENT_MOVEMENTS);
      const base = {
        type: event.type,
        clientId: event.clientId || null,
        clientName: event.clientName || null,
        previousAssignedManager: event.previousAssignedManager ?? null,
        newAssignedManager: event.newAssignedManager ?? null,
        performedBy: event.performedBy ?? null,
        timestamp: event.timestamp ? (event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp) : new Date().toISOString()
      };
      if (event.valuePrevious != null) base.valuePrevious = event.valuePrevious;
      if (event.valueNew != null) base.valueNew = event.valueNew;
      if (event.details != null) base.details = event.details;
      await addDoc(col, base);
    } catch (error) {
      console.warn('⚠️ Failed to log client movement:', error);
    }
  }

  /** Log new client added (for HR analytics). */
  async logClientAdded(clientId, clientName, assignedManager, performedBy) {
    await this.logClientMovement({
      type: 'client_added',
      clientId,
      clientName: clientName || 'Unknown',
      previousAssignedManager: null,
      newAssignedManager: assignedManager || null,
      performedBy: performedBy || auth.currentUser?.email || auth.currentUser?.uid || null,
      timestamp: new Date()
    });
  }

  /** Log contract value increase (call when contract value feature is implemented). */
  async logContractValueIncrease(clientId, clientName, previousValue, newValue, performedBy) {
    await this.logClientMovement({
      type: 'contract_value_increased',
      clientId,
      clientName: clientName || 'Unknown',
      valuePrevious: previousValue,
      valueNew: newValue,
      performedBy: performedBy || auth.currentUser?.email || auth.currentUser?.uid || null,
      timestamp: new Date()
    });
  }

  /** Log social/media accounts added to client (growth signal). Gated: only logs from April 1, 2026. */
  async logSocialAccountsAdded(clientId, clientName, details, performedBy) {
    const now = new Date();
    const trackFrom = new Date('2026-04-01');
    if (now < trackFrom) return;
    await this.logClientMovement({
      type: 'social_accounts_added',
      clientId,
      clientName: clientName || 'Unknown',
      details: details || null,
      performedBy: performedBy || auth.currentUser?.email || auth.currentUser?.uid || null,
      timestamp: now
    });
  }

  /**
   * Log client reassignment (from one manager to another or unassigned). Call after updateClient(..., { assignedManager }).
   */
  async logClientReassignment(clientId, clientName, previousManager, newManager, performedBy) {
    await this.logClientMovement({
      type: 'client_reassigned',
      clientId,
      clientName: clientName || 'Unknown',
      previousAssignedManager: previousManager || null,
      newAssignedManager: newManager || null,
      performedBy: performedBy || auth.currentUser?.email || auth.currentUser?.uid || null,
      timestamp: new Date()
    });
  }

  /**
   * Get client movement events for HR analytics. Optional filters: type, managerEmail (previous or new), limit.
   */
  async getClientMovements(options = {}) {
    try {
      const { type, managerEmail, limitCount = 100 } = options;
      const q = query(
        collection(db, this.collections.CLIENT_MOVEMENTS),
        orderBy('timestamp', 'desc'),
        firestoreLimit(limitCount)
      );
      const snapshot = await getDocs(q);
      const events = [];
      const emailFilter = managerEmail ? managerEmail.toLowerCase() : null;
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (type && d.type !== type) return;
        if (emailFilter) {
          const prev = (d.previousAssignedManager || '').toLowerCase();
          const next = (d.newAssignedManager || '').toLowerCase();
          if (prev !== emailFilter && next !== emailFilter) return;
        }
        events.push({ id: docSnap.id, ...d });
      });
      return events;
    } catch (error) {
      console.error('Error fetching client movements:', error);
      return [];
    }
  }

  /**
   * Get all client health snapshots (from monthly AI run). For admin/HR overview. Returns map clientId -> snapshot.
   */
  async getClientHealthSnapshots() {
    try {
      const snapshot = await getDocs(collection(db, this.collections.CLIENT_HEALTH_SNAPSHOTS));
      const map = {};
      snapshot.forEach((docSnap) => {
        map[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      return map;
    } catch (error) {
      console.error('Error fetching client health snapshots:', error);
      return {};
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

  // ===== SHARED CRM DATA (leads visible to all users) =====
  static CRM_DATA_DOC_ID = 'data';

  async getCrmData() {
    try {
      const ref = doc(db, this.collections.CRM, FirestoreService.CRM_DATA_DOC_ID);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      return {
        warmLeads: Array.isArray(data.warmLeads) ? data.warmLeads : [],
        contactedClients: Array.isArray(data.contactedClients) ? data.contactedClients : [],
        coldLeads: Array.isArray(data.coldLeads) ? data.coldLeads : []
      };
    } catch (err) {
      console.error('getCrmData error:', err);
      return { warmLeads: [], contactedClients: [], coldLeads: [] };
    }
  }

  async setCrmData(payload) {
    const ref = doc(db, this.collections.CRM, FirestoreService.CRM_DATA_DOC_ID);
    await setDoc(ref, {
      warmLeads: payload.warmLeads ?? [],
      contactedClients: payload.contactedClients ?? [],
      coldLeads: payload.coldLeads ?? [],
      lastSyncTime: new Date().toISOString()
    }, { merge: true });
  }

  onCrmDataChange(callback) {
    const ref = doc(db, this.collections.CRM, FirestoreService.CRM_DATA_DOC_ID);
    return onSnapshot(ref, (snap) => {
      const data = snap.exists() ? snap.data() : {};
      callback({
        warmLeads: Array.isArray(data.warmLeads) ? data.warmLeads : [],
        contactedClients: Array.isArray(data.contactedClients) ? data.contactedClients : [],
        coldLeads: Array.isArray(data.coldLeads) ? data.coldLeads : []
      });
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

  // Create notification. Same-type unread notifications for the same user are stacked (count incremented, updatedAt set) so they appear as one with a count.
  async createNotification(notificationData) {
    if (!notificationData?.userEmail || typeof notificationData.userEmail !== 'string') {
      console.warn('⚠️ createNotification called with invalid userEmail:', notificationData?.userEmail);
      return { success: false, error: 'Invalid user email for notification' };
    }
    const type = notificationData.type;
    const userEmail = notificationData.userEmail;

    try {
      const cleanedData = {};
      for (const [key, value] of Object.entries(notificationData)) {
        if (value !== undefined) cleanedData[key] = value;
      }

      const existingList = await this.getNotifications(userEmail);
      const existing = existingList.find((n) => n.type === type && !n.read);
      if (existing) {
        const count = (existing.count || 1) + 1;
        await updateDoc(doc(db, this.collections.NOTIFICATIONS, existing.id), {
          count,
          title: cleanedData.title ?? existing.title,
          message: cleanedData.message ?? existing.message,
          link: cleanedData.link !== undefined ? cleanedData.link : existing.link,
          updatedAt: serverTimestamp(),
        });
        console.log('✅ Notification stacked:', existing.id, 'count=', count);
        return { success: true, id: existing.id };
      }

      const notification = {
        ...cleanedData,
        createdAt: serverTimestamp(),
        count: 1,
      };
      const docRef = await addDoc(collection(db, this.collections.NOTIFICATIONS), notification);
      console.log('✅ Notification created:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  // Get notifications for user (one-time fetch, no listener for performance)
  async getNotifications(userEmail) {
    try {
      const q = query(
        collection(db, this.collections.NOTIFICATIONS),
        where('userEmail', '==', userEmail)
      );
      
      const snapshot = await getDocs(q);
      const notifications = [];
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by updatedAt or createdAt descending (stacked notifications use updatedAt so they appear newest first)
      return notifications.sort((a, b) => {
        const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0));
        const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0));
        return dateB - dateA;
      });
    } catch (error) {
      console.error('❌ Error getting notifications:', error);
      return [];
    }
  }

  // Get notifications for user (real-time listener - kept for backwards compatibility)
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
      
      const sortedNotifications = notifications.sort((a, b) => {
        const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0));
        const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0));
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
    if (!userEmail || typeof userEmail !== 'string') {
      console.warn('⚠️ markAllNotificationsRead: invalid userEmail');
      return;
    }
    try {
      const q = query(
        collection(db, this.collections.NOTIFICATIONS),
        where('userEmail', '==', userEmail)
      );
      const snapshot = await getDocs(q);
      const promises = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.read === true) return;
        promises.push(
          updateDoc(doc(db, this.collections.NOTIFICATIONS, docSnap.id), {
            read: true,
            readAt: serverTimestamp()
          })
        );
      });
      if (promises.length) await Promise.all(promises);
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

  /** Delete workspace_mention notifications for a user for a given workspace (e.g. when mention is removed) */
  async deleteWorkspaceMentionNotifications(userEmail, workspaceId) {
    if (!userEmail || !workspaceId) return;
    try {
      const list = await this.getNotifications(userEmail);
      const toDelete = list.filter(
        (n) => n.type === 'workspace_mention' && (n.link || '').includes(workspaceId)
      );
      for (const n of toDelete) {
        await this.deleteNotification(n.id);
      }
    } catch (error) {
      console.error('Error deleting workspace mention notifications:', error);
    }
  }

  // ===== CONTENT CALENDAR =====

  /** Normalize content item from Firestore: media array, legacy imageUrl/videoUrl, dates */
  _normalizeContentItem(docSnap) {
    const data = docSnap.data();
    let media = Array.isArray(data.media) ? data.media : [];
    if (media.length === 0 && (data.imageUrl || data.videoUrl)) {
      if (data.imageUrl) media = [{ type: 'image', url: data.imageUrl }];
      else if (data.videoUrl) media = [{ type: 'video', url: data.videoUrl }];
    }
    const scheduledDate = data.scheduledDate;
    const scheduledDateDate = typeof scheduledDate === 'string'
      ? new Date(scheduledDate + 'T12:00:00')
      : (scheduledDate?.toDate ? scheduledDate.toDate() : new Date(scheduledDate));
    return {
      id: docSnap.id,
      userEmail: data.userEmail,
      calendarId: data.calendarId,
      title: data.title || '',
      description: data.description || '',
      platform: data.platform || 'instagram',
      contentType: data.contentType || 'image',
      scheduledDate: scheduledDateDate,
      status: data.status || 'draft',
      tags: Array.isArray(data.tags) ? data.tags : [],
      media,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
    };
  }

  async getContentCalendars(userEmail) {
    if (!userEmail) return [];
    try {
      const q = query(
        collection(db, this.collections.CONTENT_CALENDARS),
        where('userEmail', '==', userEmail)
      );
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          userEmail: d.userEmail,
          name: d.name || 'Calendar',
          description: d.description,
          color: d.color,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null)
        });
      });
      return list;
    } catch (error) {
      console.error('❌ Error getting content calendars:', error);
      return [];
    }
  }

  async getContentItems(userEmail, options = {}) {
    if (!userEmail) return [];
    try {
      let q = query(
        collection(db, this.collections.CONTENT_ITEMS),
        where('userEmail', '==', userEmail),
        orderBy('scheduledDate', 'asc')
      );
      if (options.calendarId) {
        q = query(q, where('calendarId', '==', options.calendarId));
      }
      if (options.status) {
        q = query(q, where('status', '==', options.status));
      }
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach((docSnap) => list.push(this._normalizeContentItem(docSnap)));
      return list;
    } catch (error) {
      console.error('❌ Error getting content items:', error);
      return [];
    }
  }

  async getContentItem(id) {
    if (!id) return null;
    try {
      const docSnap = await getDoc(doc(db, this.collections.CONTENT_ITEMS, id));
      if (!docSnap.exists()) return null;
      return this._normalizeContentItem(docSnap);
    } catch (error) {
      console.error('❌ Error getting content item:', error);
      return null;
    }
  }

  async createContentCalendar(data) {
    try {
      const payload = {
        userEmail: data.userEmail,
        name: data.name || 'Calendar',
        description: data.description || null,
        color: data.color || null,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, this.collections.CONTENT_CALENDARS), payload);
      return { id: docRef.id };
    } catch (error) {
      console.error('❌ Error creating content calendar:', error);
      throw error;
    }
  }

  async updateContentCalendar(id, data) {
    try {
      const payload = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.description !== undefined) payload.description = data.description;
      if (data.color !== undefined) payload.color = data.color;
      if (Object.keys(payload).length === 0) return;
      await updateDoc(doc(db, this.collections.CONTENT_CALENDARS, id), payload);
    } catch (error) {
      console.error('❌ Error updating content calendar:', error);
      throw error;
    }
  }

  async deleteContentCalendar(id) {
    try {
      await deleteDoc(doc(db, this.collections.CONTENT_CALENDARS, id));
    } catch (error) {
      console.error('❌ Error deleting content calendar:', error);
      throw error;
    }
  }

  /** scheduledDate stored as ISO date string YYYY-MM-DD for "due today" queries */
  _toScheduledDateString(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  async createContentItem(data) {
    try {
      const media = Array.isArray(data.media) ? data.media.slice(0, 15) : [];
      const payload = {
        userEmail: data.userEmail,
        calendarId: data.calendarId || 'default',
        title: data.title || '',
        description: data.description || '',
        platform: data.platform || 'instagram',
        contentType: data.contentType || 'image',
        scheduledDate: this._toScheduledDateString(data.scheduledDate),
        status: data.status || 'draft',
        tags: Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
        media,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, this.collections.CONTENT_ITEMS), payload);
      return { id: docRef.id };
    } catch (error) {
      console.error('❌ Error creating content item:', error);
      throw error;
    }
  }

  async updateContentItem(id, data) {
    try {
      const payload = {};
      if (data.calendarId !== undefined) payload.calendarId = data.calendarId;
      if (data.title !== undefined) payload.title = data.title;
      if (data.description !== undefined) payload.description = data.description;
      if (data.platform !== undefined) payload.platform = data.platform;
      if (data.contentType !== undefined) payload.contentType = data.contentType;
      if (data.scheduledDate !== undefined) payload.scheduledDate = this._toScheduledDateString(data.scheduledDate);
      if (data.status !== undefined) payload.status = data.status;
      if (data.tags !== undefined) payload.tags = Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : []);
      if (data.media !== undefined) payload.media = Array.isArray(data.media) ? data.media.slice(0, 15) : [];
      if (Object.keys(payload).length === 0) return;
      await updateDoc(doc(db, this.collections.CONTENT_ITEMS, id), payload);
    } catch (error) {
      console.error('❌ Error updating content item:', error);
      throw error;
    }
  }

  async deleteContentItem(id) {
    try {
      await deleteDoc(doc(db, this.collections.CONTENT_ITEMS, id));
    } catch (error) {
      console.error('❌ Error deleting content item:', error);
      throw error;
    }
  }

  /** One-time: migrate from localStorage (run in browser). Call after getContentItems returns empty if desired. */
  async migrateContentCalendarFromLocalStorage(userEmail, localStorageItems, localStorageCalendars) {
    if (!userEmail || !localStorageCalendars?.length) return { calendarsCreated: 0, itemsCreated: 0 };
    const nameToId = {};
    let calendarsCreated = 0;
    for (const cal of localStorageCalendars) {
      const existing = await this.getContentCalendars(userEmail);
      const byName = existing.find(c => c.name === cal.name);
      if (byName) {
        nameToId[cal.id] = byName.id;
      } else {
        const res = await this.createContentCalendar({ userEmail, name: cal.name, description: cal.description, color: cal.color });
        nameToId[cal.id] = res.id;
        calendarsCreated++;
      }
    }
    if (!localStorageItems?.length) return { calendarsCreated, itemsCreated: 0 };
    let itemsCreated = 0;
    for (const item of localStorageItems) {
      const media = [];
      if (item.imageUrl) media.push({ type: 'image', url: item.imageUrl });
      if (item.videoUrl) media.push({ type: 'video', url: item.videoUrl });
      const scheduledDate = item.scheduledDate instanceof Date ? item.scheduledDate : new Date(item.scheduledDate);
      await this.createContentItem({
        userEmail,
        calendarId: nameToId[item.calendarId] || item.calendarId || 'default',
        title: item.title || '',
        description: item.description || '',
        platform: item.platform || 'instagram',
        contentType: item.contentType || 'image',
        scheduledDate,
        status: item.status || 'draft',
        tags: Array.isArray(item.tags) ? item.tags : [],
        media
      });
      itemsCreated++;
    }
    return { calendarsCreated, itemsCreated };
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

      // Create notification for recipient (link opens Tasks and shows this request)
      await this.createNotification({
        userEmail: requestData.toUserEmail,
        type: 'task_request',
        title: 'New task request',
        message: `${requestData.fromUserName} requested you to do: ${requestData.taskTitle}`,
        link: `/tasks?requestId=${docRef.id}`,
        taskRequestId: docRef.id,
        read: false
      });

      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error creating task request:', error);
      throw error;
    }
  }

  // Get task requests for user (one-time fetch, no listener for performance)
  async getTaskRequests(userEmail) {
    try {
      const q = query(
        collection(db, this.collections.TASK_REQUESTS),
        where('toUserEmail', '==', userEmail)
      );
      
      const snapshot = await getDocs(q);
      const requests = [];
      snapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by createdAt descending (newest first)
      return requests.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('❌ Error getting task requests:', error);
      return [];
    }
  }

  // Get task requests for user (real-time listener - kept for backwards compatibility)
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
      // Create the actual task first (include taskRequestId for outbox linking)
      const newTask = {
        title: requestData.taskTitle,
        description: requestData.taskDescription,
        status: 'pending',
        priority: requestData.taskPriority || 'medium',
        assigned_to: requestData.toUserEmail,
        assigned_by: requestData.fromUserEmail,
        due_date: requestData.taskDueDate || null,
        createdAt: serverTimestamp(),
        task_type: 'delegated',
        taskRequestId: requestId
      };

      const taskRef = await addDoc(collection(db, this.collections.TASKS), newTask);
      console.log('✅ Task created from request:', taskRef.id);

      // Update request status and link taskId for outbox
      await updateDoc(doc(db, this.collections.TASK_REQUESTS, requestId), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        taskId: taskRef.id
      });

      // Notify the requester that their request was accepted
      const requesterEmail = requestData.fromUserEmail;
      const accepterName = requestData.toUserName || requestData.toUserEmail || 'Someone';
      const taskTitle = requestData.taskTitle || 'Your task request';
      if (requesterEmail) {
        const acceptLink = `/tasks?tab=outbox&requestId=${requestId}`;
        await this.createNotification({
          userEmail: requesterEmail,
          type: 'task_accepted',
          title: 'Task request accepted',
          message: `${accepterName} accepted your task request: ${taskTitle}`,
          link: acceptLink,
          taskRequestId: requestId,
          read: false
        });
      }

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
      const requesterEmail = requestData.fromUserEmail;
      if (requesterEmail) {
        const declinerName = requestData.toUserName || requestData.toUserEmail || 'Someone';
        await this.createNotification({
          userEmail: requesterEmail,
          type: 'task_rejected',
          title: 'Task request declined',
          message: rejectionReason
            ? `${declinerName} declined your task request: ${rejectionReason}`
            : `${declinerName} declined your task request`,
          link: '/tasks?tab=outbox',
          taskRequestId: requestId,
          read: false
        });
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error rejecting task request:', error);
      throw error;
    }
  }

  // Delete a task request (sender only - removes from outbox; assignee keeps the task if already accepted)
  async deleteTaskRequest(requestId) {
    try {
      await deleteDoc(doc(db, this.collections.TASK_REQUESTS, requestId));
      console.log('✅ Task request deleted:', requestId);
    } catch (error) {
      console.error('❌ Error deleting task request:', error);
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

  // Get task templates owned by or shared with the user (ownerEmail + sharedWith).
  // Uses exact auth email for owner; sharedWith is stored lowercase so query by both for shared.
  async getTaskTemplates(userEmail) {
    const emailExact = (auth.currentUser?.email || userEmail || '').trim();
    if (!emailExact) return [];
    await ensureEmailLowerClaimBeforeTemplates();
    try {
      const col = collection(db, this.collections.TASK_TEMPLATES);
      const emailLower = emailExact.toLowerCase();
      const sharedQueries = [getDocs(query(col, where('sharedWith', 'array-contains', emailExact)))];
      if (emailLower !== emailExact) sharedQueries.push(getDocs(query(col, where('sharedWith', 'array-contains', emailLower))));
      const [ownedSnap, ...sharedSnaps] = await Promise.all([
        getDocs(query(col, where('ownerEmail', '==', emailExact))),
        ...sharedQueries
      ]);
      const byId = new Map();
      ownedSnap.forEach((d) => byId.set(d.id, { id: d.id, ...d.data(), isOwner: true }));
      sharedSnaps.forEach((snap) => snap.forEach((d) => {
        if (!byId.has(d.id)) byId.set(d.id, { id: d.id, ...d.data(), isOwner: false });
      }));
      const templates = Array.from(byId.values());
      console.log('✅ Retrieved task templates:', templates.length, '(owner + shared)');
      return templates;
    } catch (error) {
      console.error('❌ Error getting task templates:', error);
      throw error;
    }
  }

  // Get a single task template (caller must own or be in sharedWith - enforced by rules)
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

  // Create a new task template (ownerEmail must match request.auth.token.email for rules)
  async createTaskTemplate(templateData) {
    try {
      const ownerEmail = (auth.currentUser?.email || templateData.ownerEmail || '').trim();
      const payload = { ...templateData, ownerEmail, sharedWith: templateData.sharedWith || [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      const docRef = await addDoc(collection(db, this.collections.TASK_TEMPLATES), payload);
      console.log('✅ Task template created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating task template:', error);
      throw error;
    }
  }

  // Update a task template (only owner can update)
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

  // Listen to template changes for one user (owned + shared)
  onTaskTemplatesChange(userEmail, callback) {
    const emailExact = (auth.currentUser?.email || userEmail || '').trim();
    if (!emailExact) {
      callback([]);
      return () => {};
    }
    const col = collection(db, this.collections.TASK_TEMPLATES);
    const emailLower = emailExact.toLowerCase();
    const unsubOwned = onSnapshot(query(col, where('ownerEmail', '==', emailExact)), () => {});
    const unsubShared1 = onSnapshot(query(col, where('sharedWith', 'array-contains', emailExact)), () => {});
    const unsubShared2 = emailLower !== emailExact
      ? onSnapshot(query(col, where('sharedWith', 'array-contains', emailLower)), () => {})
      : () => {};
    const refresh = () => this.getTaskTemplates(emailExact).then(callback);
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => {
      unsubOwned();
      unsubShared1();
      unsubShared2();
      clearInterval(interval);
    };
  }

  // Initialize default templates for this user if they have none
  async initializeDefaultTemplates(defaultTemplates, userEmail) {
    const emailForQuery = (auth.currentUser?.email || userEmail || '').trim();
    if (!emailForQuery) return;
    await ensureEmailLowerClaimBeforeTemplates();
    try {
      const existingTemplates = await this.getTaskTemplates(emailForQuery);
      if (existingTemplates.length === 0) {
        console.log('📝 Initializing default task templates for user...');
        const promises = Object.values(defaultTemplates).map((template) =>
          this.createTaskTemplate({ ...template, ownerEmail: emailForQuery })
        );
        await Promise.all(promises);
        console.log('✅ Default templates initialized');
      }
    } catch (error) {
      console.error('❌ Error initializing default templates:', error);
      throw error;
    }
  }

  // Share a task template with another user (owner only). Sends notification to recipient.
  async shareTaskTemplateWith(templateId, sharedWithEmail, ownerEmail) {
    const toEmail = (sharedWithEmail || '').toLowerCase().trim();
    const fromEmail = (ownerEmail || '').toLowerCase().trim();
    if (!toEmail || !fromEmail) throw new Error('Email required');
    if (toEmail === fromEmail) throw new Error('Cannot share with yourself');
    const docRef = doc(db, this.collections.TASK_TEMPLATES, templateId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Template not found');
    const data = snap.data();
    if ((data.ownerEmail || '').toLowerCase() !== fromEmail) throw new Error('Only the owner can share this template');
    const sharedWith = (data.sharedWith || []).map((e) => (e || '').toLowerCase().trim());
    if (sharedWith.includes(toEmail)) return; // already shared
    await updateDoc(docRef, {
      sharedWith: arrayUnion(toEmail),
      updatedAt: serverTimestamp()
    });
    await this.createNotification({
      userEmail: toEmail,
      type: 'task_template_shared',
      title: 'Task template shared with you',
      message: `${fromEmail} shared a task template "${data.name || 'Untitled'}" with you.`,
      link: '/tasks',
      read: false,
      metadata: { templateId, sharedBy: fromEmail }
    });
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

  // ===== INSTAGRAM REPORTS =====

  // Generate a unique public link ID
  generatePublicLinkId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Create an Instagram report. Screenshots are never stored (OCR-only in the app); we always write screenshots: [].
  // Reports are scoped per user via userId and optionally linked to a client via clientId.
  async createInstagramReport(reportData) {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        throw new Error('You must be signed in to create an Instagram report');
      }
      
      // Convert date strings/objects to Firestore Timestamps if provided
      let startDateTimestamp = null;
      let endDateTimestamp = null;
      
      let reportYear = null;
      let reportMonth = null; // 1-12
      if (reportData.startDate) {
        const startDate = reportData.startDate instanceof Date 
          ? reportData.startDate 
          : new Date(reportData.startDate);
        if (!isNaN(startDate.getTime())) {
          startDateTimestamp = Timestamp.fromDate(startDate);
          reportYear = startDate.getFullYear();
          reportMonth = startDate.getMonth() + 1;
        }
      }
      
      if (reportData.endDate) {
        const endDate = reportData.endDate instanceof Date 
          ? reportData.endDate 
          : new Date(reportData.endDate);
        if (!isNaN(endDate.getTime())) {
          endDateTimestamp = Timestamp.fromDate(endDate);
        }
      }
      
      // Use only these fields; never pass through reportData.screenshots (may contain File objects).
      const sanitized = JSON.parse(JSON.stringify({
        clientId: reportData.clientId ?? null,  // Link to clients collection
        clientName: reportData.clientName ?? '',
        title: reportData.title ?? '',
        dateRange: reportData.dateRange ?? '',
        notes: reportData.notes ?? '',
        postLinks: Array.isArray(reportData.postLinks) ? reportData.postLinks.map((l) => ({ url: String(l?.url ?? ''), label: String(l?.label ?? ''), comment: String(l?.comment ?? '') })) : [],
        metrics: reportData.metrics ?? null,
        screenshots: [], // always empty; screenshots are used for OCR only, not attached to report
        reportType: reportData.reportType ?? null,           // 'monthly' | 'quarterly' | 'yearly'
        sourceReportIds: Array.isArray(reportData.sourceReportIds) ? reportData.sourceReportIds : null,
        quarterlyBreakdown: Array.isArray(reportData.quarterlyBreakdown) ? reportData.quarterlyBreakdown : null
      }));
      
      const publicLinkId = this.generatePublicLinkId();
      const docRef = await addDoc(collection(db, this.collections.INSTAGRAM_REPORTS), {
        ...sanitized,
        startDate: startDateTimestamp,  // Structured date for queries
        endDate: endDateTimestamp,      // Structured date for queries
        year: reportYear,               // From report date (user input) for filtering/grouping
        month: reportMonth,             // 1-12 from report date (user input)
        userId: uid,
        publicLinkId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Instagram report created:', docRef.id);
      return { success: true, id: docRef.id, publicLinkId };
    } catch (error) {
      console.error('❌ Error creating Instagram report:', error);
      throw error;
    }
  }

  // Get Instagram reports for the current user only.
  async getInstagramReports() {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return [];
      const q = query(
        collection(db, this.collections.INSTAGRAM_REPORTS),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const reports = [];
      snapshot.forEach((docSnap) => {
        reports.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      console.log('✅ Fetched Instagram reports:', reports.length);
      return reports;
    } catch (error) {
      console.error('❌ Error fetching Instagram reports:', error);
      return [];
    }
  }

  // Get Instagram reports for a specific client, ordered by startDate descending.
  // If startDate is not set, falls back to createdAt ordering.
  async getInstagramReportsByClient(clientId) {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return [];
      if (!clientId) {
        console.warn('⚠️ getInstagramReportsByClient called without clientId');
        return [];
      }
      
      const q = query(
        collection(db, this.collections.INSTAGRAM_REPORTS),
        where('userId', '==', uid),
        where('clientId', '==', clientId),
        orderBy('startDate', 'desc')
      );
      const snapshot = await getDocs(q);
      const reports = [];
      snapshot.forEach((docSnap) => {
        reports.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      console.log(`✅ Fetched ${reports.length} Instagram reports for client ${clientId}`);
      return reports;
    } catch (error) {
      console.error('❌ Error fetching Instagram reports by client:', error);
      return [];
    }
  }

  // Get the last N Instagram reports for a client for trend comparison.
  async getClientInstagramReportHistory(clientId, maxReports = 6) {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return [];
      if (!clientId) {
        console.warn('⚠️ getClientInstagramReportHistory called without clientId');
        return [];
      }
      
      const q = query(
        collection(db, this.collections.INSTAGRAM_REPORTS),
        where('userId', '==', uid),
        where('clientId', '==', clientId),
        orderBy('startDate', 'desc'),
        firestoreLimit(maxReports)
      );
      const snapshot = await getDocs(q);
      const reports = [];
      snapshot.forEach((docSnap) => {
        reports.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      console.log(`✅ Fetched ${reports.length} report history for client ${clientId}`);
      return reports;
    } catch (error) {
      console.error('❌ Error fetching client Instagram report history:', error);
      return [];
    }
  }

  // Get Instagram report by ID. Returns null if report does not exist or does not belong to current user.
  async getInstagramReportById(reportId) {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return null;
      const docRef = doc(db, this.collections.INSTAGRAM_REPORTS, reportId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.userId !== uid) return null;
        return {
          id: docSnap.id,
          ...data
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting Instagram report:', error);
      throw error;
    }
  }

  // Get Instagram report by public link ID (for public viewing)
  async getInstagramReportByPublicLink(publicLinkId) {
    try {
      const q = query(
        collection(db, this.collections.INSTAGRAM_REPORTS),
        where('publicLinkId', '==', publicLinkId)
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
      console.error('❌ Error getting Instagram report by public link:', error);
      throw error;
    }
  }

  // Update Instagram report. Fails if report does not belong to current user (unless admin).
  async updateInstagramReport(reportId, updates) {
    try {
      const uid = auth.currentUser?.uid;
      const email = auth.currentUser?.email;
      if (!uid) throw new Error('You must be signed in to update a report');
      
      // System admins or users with adminPermissions can edit any report
      const SYSTEM_ADMINS = ['jrsschroeder@gmail.com'];
      let isAdmin = SYSTEM_ADMINS.includes(email?.toLowerCase());
      if (!isAdmin && email) {
        try {
          const perms = await this.getUserPermissions(email);
          isAdmin = !!perms?.adminPermissions;
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
      
      // System admins or users with adminPermissions can delete any report
      const SYSTEM_ADMINS = ['jrsschroeder@gmail.com'];
      let isAdmin = SYSTEM_ADMINS.includes(email?.toLowerCase());
      if (!isAdmin && email) {
        try {
          const perms = await this.getUserPermissions(email);
          isAdmin = !!perms?.adminPermissions;
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
  onInstagramReportsChange(callback, { loadAll = false, userId = null, archived = false } = {}) {
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
    
    const q = loadAll
      ? query(
          collection(db, this.collections.INSTAGRAM_REPORTS),
          where('archived', '!=', true),
          orderBy('archived', 'asc'),
          orderBy('createdAt', 'desc')
        )
      : query(
          collection(db, this.collections.INSTAGRAM_REPORTS),
          where('userId', '==', uid),
          where('archived', '!=', true),
          orderBy('archived', 'asc'),
          orderBy('createdAt', 'desc')
        );
    
    return onSnapshot(q, (snapshot) => {
      const reports = [];
      snapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });
      console.log(`📊 Instagram reports loaded: ${reports.length} reports (loadAll=${loadAll})`);
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

  // Feature permission ids granted by admin permissions switch (excludes view_financials and manage_users)
  _adminFeaturePermissions() {
    return ['approve_time_off', 'view_analytics', 'manage_clients', 'assign_client_managers', 'edit_client_packages'];
  }

  // Get user's full permissions (pages, features, adminPermissions)
  async getUserPermissions(userEmail) {
    try {
      const normalizedEmail = userEmail.toLowerCase().trim();
      const userRef = doc(db, this.collections.APPROVED_USERS, normalizedEmail);
      const userSnap = await getDoc(userRef);
      
      const mapResult = (userData) => {
        const adminPermissions = !!userData.adminPermissions;
        const features = adminPermissions
          ? this._adminFeaturePermissions()
          : (userData.featurePermissions || []);
        return {
          pages: userData.pagePermissions || [],
          features,
          adminPermissions
        };
      };

      if (userSnap.exists()) {
        return mapResult(userSnap.data());
      }
      
      if (normalizedEmail !== userEmail) {
        const altRef = doc(db, this.collections.APPROVED_USERS, userEmail);
        const altSnap = await getDoc(altRef);
        if (altSnap.exists()) {
          return mapResult(altSnap.data());
        }
      }
      
      return { pages: [], features: [], adminPermissions: false };
    } catch (error) {
      console.error('❌ Error getting user permissions:', error);
      throw error;
    }
  }

  // Get user's page permissions (legacy support)
  async getUserPagePermissions(userEmail) {
    try {
      const result = await this.getUserPermissions(userEmail);
      return result.pages || [];
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

  // Set user's feature permissions (granular access within pages)
  async setUserFeaturePermissions(userEmail, featureIds) {
    try {
      const userRef = doc(db, this.collections.APPROVED_USERS, userEmail);
      const userSnap = await getDoc(userRef);
      
      console.log('📝 Setting feature permissions for user:', userEmail);
      console.log('📝 New feature permissions:', featureIds);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: userEmail,
          featurePermissions: featureIds,
          permissionsUpdatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true });
      } else {
        await updateDoc(userRef, {
          featurePermissions: featureIds,
          permissionsUpdatedAt: serverTimestamp()
        });
      }
      
      console.log('✅ Feature permissions saved for:', userEmail);
    } catch (error) {
      console.error('❌ Error setting user feature permissions:', error);
      throw error;
    }
  }

  // Set both page and feature permissions at once (adminPermissions = grant all features except view_financials)
  async setUserFullPermissions(userEmail, { pages = [], features = [], adminPermissions = false } = {}) {
    try {
      const userRef = doc(db, this.collections.APPROVED_USERS, userEmail);
      const userSnap = await getDoc(userRef);
      
      console.log('📝 Setting full permissions for user:', userEmail);
      console.log('📝 Page permissions:', pages);
      console.log('📝 Feature permissions:', features);
      console.log('📝 Admin permissions:', adminPermissions);

      const payload = {
        pagePermissions: pages,
        featurePermissions: features,
        adminPermissions: !!adminPermissions,
        permissionsUpdatedAt: serverTimestamp()
      };

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: userEmail,
          ...payload,
          createdAt: serverTimestamp()
        }, { merge: true });
      } else {
        await updateDoc(userRef, payload);
      }
      
      console.log('✅ Full permissions saved for:', userEmail);
    } catch (error) {
      console.error('❌ Error setting user full permissions:', error);
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

  // ===== ERROR REPORTING =====

  /**
   * Submit an error report to Firestore and notify the developer
   */
  async submitErrorReport(reportData) {
    try {
      const report = {
        ...reportData,
        status: 'new',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.collections.ERROR_REPORTS), report);
      console.log('✅ Error report submitted:', docRef.id);

      // Also create a notification for the developer
      await this.createNotification({
        userEmail: 'jrsschroeder@gmail.com',
        type: 'error_report',
        title: 'New Error Report',
        message: `Error: ${reportData.errorMessage?.substring(0, 100) || 'Unknown error'}`,
        link: null, // Admin would view reports in Firestore console or a reports page
        read: false,
        metadata: {
          reportId: docRef.id,
          userEmail: reportData.userEmail,
          url: reportData.url
        }
      });

      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error submitting error report:', error);
      // Don't throw - we don't want error reporting to cause more errors
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all error reports (for admin viewing)
   */
  async getErrorReports() {
    try {
      const q = query(
        collection(db, this.collections.ERROR_REPORTS),
        orderBy('createdAt', 'desc')
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
      console.error('❌ Error getting error reports:', error);
      return [];
    }
  }

  /**
   * Mark error report as resolved
   */
  async resolveErrorReport(reportId, notes = '') {
    try {
      await updateDoc(doc(db, this.collections.ERROR_REPORTS, reportId), {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        resolvedNotes: notes
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Error resolving error report:', error);
      throw error;
    }
  }

  // ===== ANNOUNCEMENTS (Admin-managed site-wide banners) =====

  /**
   * Get all announcements (active and inactive).
   */
  async getAnnouncements() {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'announcements'), orderBy('priority', 'desc'))
      );
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error getting announcements:', error);
      return [];
    }
  }

  /**
   * Get only active, non-expired announcements.
   */
  async getActiveAnnouncements() {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'announcements'),
          where('active', '==', true),
          orderBy('priority', 'desc')
        )
      );
      const now = new Date();
      return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(a => !a.expiresAt || a.expiresAt.toDate() > now);
    } catch (error) {
      console.error('Error getting active announcements:', error);
      return [];
    }
  }

  /**
   * Real-time listener for active announcements.
   */
  onActiveAnnouncementsChange(callback) {
    try {
      return onSnapshot(
        query(
          collection(db, 'announcements'),
          where('active', '==', true),
          orderBy('priority', 'desc')
        ),
        (snapshot) => {
          const now = new Date();
          const announcements = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(a => !a.expiresAt || a.expiresAt.toDate() > now);
          callback(announcements);
        },
        (error) => {
          console.warn('Announcements listener error:', error.message);
          callback([]);
        }
      );
    } catch (error) {
      console.warn('Could not start announcements listener:', error.message);
      return () => {};
    }
  }

  /**
   * Create a new announcement.
   */
  async createAnnouncement(data) {
    try {
      const docRef = await addDoc(collection(db, 'announcements'), {
        ...data,
        active: data.active !== undefined ? data.active : true,
        dismissible: data.dismissible !== undefined ? data.dismissible : true,
        priority: data.priority || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { id: docRef.id };
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw error;
    }
  }

  /**
   * Update an existing announcement.
   */
  async updateAnnouncement(announcementId, updates) {
    try {
      const ref = doc(db, 'announcements', announcementId);
      await updateDoc(ref, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating announcement:', error);
      throw error;
    }
  }

  /**
   * Delete an announcement.
   */
  async deleteAnnouncement(announcementId) {
    try {
      await deleteDoc(doc(db, 'announcements', announcementId));
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw error;
    }
  }

  // ===== CUSTOM ROLES MANAGEMENT (System Admin Only) =====

  /**
   * Get all custom roles
   */
  async getCustomRoles() {
    try {
      const snapshot = await getDocs(collection(db, this.collections.CUSTOM_ROLES));
      const roles = [];
      snapshot.forEach((doc) => {
        roles.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log('✅ Fetched custom roles:', roles.length);
      return roles;
    } catch (error) {
      console.error('❌ Error fetching custom roles:', error);
      return [];
    }
  }

  /**
   * Create a new custom role (system admin only)
   */
  async createCustomRole(roleData) {
    try {
      const email = auth.currentUser?.email;
      const SYSTEM_ADMINS = ['jrsschroeder@gmail.com'];
      if (!SYSTEM_ADMINS.includes(email?.toLowerCase())) {
        throw new Error('Only system administrators can create custom roles');
      }

      // Use the role ID as the document ID for easy lookup
      const roleId = roleData.id || roleData.name.toLowerCase().replace(/\s+/g, '_');
      
      const docRef = doc(db, this.collections.CUSTOM_ROLES, roleId);
      await setDoc(docRef, {
        ...roleData,
        id: roleId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: email
      });
      
      console.log('✅ Custom role created:', roleId);
      return { success: true, id: roleId };
    } catch (error) {
      console.error('❌ Error creating custom role:', error);
      throw error;
    }
  }

  /**
   * Update a custom role (system admin only)
   */
  async updateCustomRole(roleId, updates) {
    try {
      const email = auth.currentUser?.email;
      const SYSTEM_ADMINS = ['jrsschroeder@gmail.com'];
      if (!SYSTEM_ADMINS.includes(email?.toLowerCase())) {
        throw new Error('Only system administrators can update custom roles');
      }

      const docRef = doc(db, this.collections.CUSTOM_ROLES, roleId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: email
      });
      
      console.log('✅ Custom role updated:', roleId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating custom role:', error);
      throw error;
    }
  }

  /**
   * Delete a custom role (system admin only)
   */
  async deleteCustomRole(roleId) {
    try {
      const email = auth.currentUser?.email;
      const SYSTEM_ADMINS = ['jrsschroeder@gmail.com'];
      if (!SYSTEM_ADMINS.includes(email?.toLowerCase())) {
        throw new Error('Only system administrators can delete custom roles');
      }

      await deleteDoc(doc(db, this.collections.CUSTOM_ROLES, roleId));
      console.log('✅ Custom role deleted:', roleId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting custom role:', error);
      throw error;
    }
  }

  /**
   * Listen to custom roles changes
   */
  onCustomRolesChange(callback) {
    return onSnapshot(collection(db, this.collections.CUSTOM_ROLES), (snapshot) => {
      const roles = [];
      snapshot.forEach((doc) => {
        roles.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(roles);
    });
  }

  // ============================================================================
  // SLACK CONNECTIONS
  // ============================================================================

  /**
   * Store user's Slack connection/token
   */
  async setSlackConnection(userEmail, connectionData) {
    try {
      const docRef = doc(db, 'slack_connections', userEmail.toLowerCase());
      await setDoc(docRef, {
        ...connectionData,
        userEmail: userEmail.toLowerCase(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log('✅ Slack connection stored for:', userEmail);
      return { success: true };
    } catch (error) {
      console.error('❌ Error storing Slack connection:', error);
      throw error;
    }
  }

  /**
   * Get user's Slack connection
   */
  async getSlackConnection(userEmail) {
    try {
      const docRef = doc(db, 'slack_connections', userEmail.toLowerCase());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting Slack connection:', error);
      return null;
    }
  }

  /**
   * Remove user's Slack connection
   */
  async removeSlackConnection(userEmail) {
    try {
      const docRef = doc(db, 'slack_connections', userEmail.toLowerCase());
      await deleteDoc(docRef);
      console.log('✅ Slack connection removed for:', userEmail);
      return { success: true };
    } catch (error) {
      console.error('❌ Error removing Slack connection:', error);
      throw error;
    }
  }

  // ============================================================================
  // GRAPHIC PROJECTS
  // ============================================================================

  /**
   * Get all graphic projects
   */
  async getGraphicProjects() {
    try {
      const q = query(
        collection(db, this.collections.GRAPHIC_PROJECTS),
        orderBy('startDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting graphic projects:', error);
      throw error;
    }
  }

  /**
   * Add a graphic project
   */
  async addGraphicProject(projectData) {
    try {
      const docRef = await addDoc(collection(db, this.collections.GRAPHIC_PROJECTS), {
        ...projectData,
        createdAt: serverTimestamp()
      });
      console.log('✅ Graphic project added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding graphic project:', error);
      throw error;
    }
  }

  /**
   * Update a graphic project
   */
  async updateGraphicProject(projectId, projectData) {
    try {
      const docRef = doc(db, this.collections.GRAPHIC_PROJECTS, projectId);
      await updateDoc(docRef, {
        ...projectData,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Graphic project updated:', projectId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating graphic project:', error);
      throw error;
    }
  }

  /**
   * Delete a graphic project
   */
  async deleteGraphicProject(projectId) {
    try {
      await deleteDoc(doc(db, this.collections.GRAPHIC_PROJECTS, projectId));
      console.log('✅ Graphic project deleted:', projectId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting graphic project:', error);
      throw error;
    }
  }

  /**
   * Bulk import graphic projects (for Excel import)
   */
  async bulkImportGraphicProjects(projects) {
    try {
      const results = [];
      for (const project of projects) {
        const docRef = await addDoc(collection(db, this.collections.GRAPHIC_PROJECTS), {
          ...project,
          createdAt: serverTimestamp(),
          importedAt: serverTimestamp()
        });
        results.push(docRef.id);
      }
      console.log(`✅ Bulk imported ${results.length} graphic projects`);
      return results;
    } catch (error) {
      console.error('❌ Error bulk importing graphic projects:', error);
      throw error;
    }
  }

  // ============ PROJECT REQUESTS ============

  /**
   * Create a project request (from any user to Jasmine/Jone)
   */
  async createProjectRequest(requestData) {
    try {
      const projectRequest = {
        fromUserEmail: requestData.fromUserEmail,
        fromUserName: requestData.fromUserName,
        toUserEmail: requestData.toUserEmail,
        toUserName: requestData.toUserName,
        client: requestData.client,
        task: requestData.task,
        priority: requestData.priority || 'medium',
        deadline: requestData.deadline, // Required
        notes: requestData.notes || '',
        status: 'pending', // pending, accepted, rejected
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.collections.PROJECT_REQUESTS), projectRequest);
      console.log('✅ Project request created:', docRef.id);

      // Create notification for recipient
      await this.createNotification({
        userEmail: requestData.toUserEmail,
        title: 'New Project Request',
        message: `${requestData.fromUserName} requested a project: "${requestData.task}" for ${requestData.client}`,
        type: 'project_request',
        link: '/graphic-projects',
        metadata: { requestId: docRef.id }
      });

      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating project request:', error);
      throw error;
    }
  }

  /**
   * Get project requests for user (designer)
   */
  async getProjectRequests(userEmail) {
    try {
      const q = query(
        collection(db, this.collections.PROJECT_REQUESTS),
        where('toUserEmail', '==', userEmail)
      );
      
      const snapshot = await getDocs(q);
      const requests = [];
      snapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by createdAt descending (newest first)
      return requests.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('❌ Error getting project requests:', error);
      throw error;
    }
  }

  /**
   * Accept project request - creates actual project
   */
  async acceptProjectRequest(requestId, requestData) {
    try {
      // Update request status
      await updateDoc(doc(db, this.collections.PROJECT_REQUESTS, requestId), {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      // Create the actual graphic project
      const newProject = {
        client: requestData.client,
        task: requestData.task,
        priority: requestData.priority || 'medium',
        status: 'not_started',
        startDate: new Date().toISOString().split('T')[0],
        endDate: requestData.deadline,
        hours: 0,
        notes: requestData.notes || '',
        assignedTo: requestData.toUserEmail,
        requestedBy: requestData.fromUserEmail,
        createdAt: serverTimestamp()
      };

      const projectRef = await addDoc(collection(db, this.collections.GRAPHIC_PROJECTS), newProject);

      // Notify requester
      await this.createNotification({
        userEmail: requestData.fromUserEmail,
        title: 'Project Request Accepted',
        message: `${requestData.toUserName} accepted your project request: "${requestData.task}"`,
        type: 'project_accepted',
        link: '/graphic-projects'
      });

      console.log('✅ Project request accepted, project created:', projectRef.id);
      return projectRef.id;
    } catch (error) {
      console.error('❌ Error accepting project request:', error);
      throw error;
    }
  }

  /**
   * Reject project request
   */
  async rejectProjectRequest(requestId, requestData, reason = '') {
    try {
      await updateDoc(doc(db, this.collections.PROJECT_REQUESTS, requestId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectionReason: reason
      });

      // Notify requester
      await this.createNotification({
        userEmail: requestData.fromUserEmail,
        title: 'Project Request Declined',
        message: `${requestData.toUserName} declined your project request: "${requestData.task}"${reason ? `. Reason: ${reason}` : ''}`,
        type: 'project_rejected',
        link: '/graphic-projects'
      });

      console.log('✅ Project request rejected:', requestId);
    } catch (error) {
      console.error('❌ Error rejecting project request:', error);
      throw error;
    }
  }

  // ============ FEEDBACK & SUPPORT ============

  /**
   * Create feedback (bug report or feature request)
   */
  async createFeedback(feedbackData) {
    try {
      const feedback = {
        type: feedbackData.type, // 'bug' or 'feature'
        title: feedbackData.title,
        description: feedbackData.description,
        priority: feedbackData.priority || 'medium',
        userEmail: feedbackData.userEmail,
        userName: feedbackData.userName,
        status: 'open', // open, in_progress, resolved, closed
        url: feedbackData.url || '',
        createdAt: serverTimestamp()
      };

      // Add bug-specific fields
      if (feedbackData.type === 'bug') {
        if (feedbackData.consoleLogs) {
          feedback.consoleLogs = feedbackData.consoleLogs;
        }
        if (feedbackData.selectedElement) {
          feedback.selectedElement = feedbackData.selectedElement;
        }
        if (feedbackData.userInfo) {
          feedback.userInfo = feedbackData.userInfo;
        }
      }

      const docRef = await addDoc(collection(db, this.collections.FEEDBACK), feedback);
      console.log('✅ Feedback created:', docRef.id);

      // Create notifications for IT support users
      const itSupportEmails = ['joshua@smmluxurylistings.com', 'jrsschroeder@gmail.com'];
      for (const email of itSupportEmails) {
        await this.createNotification({
          userEmail: email,
          title: feedbackData.type === 'bug' ? '🐛 New Bug Report' : '💡 New Feature Request',
          message: `${feedbackData.userName || feedbackData.userEmail} submitted: "${feedbackData.title}"`,
          type: feedbackData.type === 'bug' ? 'bug_report' : 'feature_request',
          link: '/it-support'
        });
      }

      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating feedback:', error);
      throw error;
    }
  }

  /**
   * Get all feedback (for admin)
   */
  async getAllFeedback() {
    try {
      const q = query(
        collection(db, this.collections.FEEDBACK),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const feedback = [];
      snapshot.forEach(doc => {
        feedback.push({ id: doc.id, ...doc.data() });
      });
      
      return feedback;
    } catch (error) {
      console.error('❌ Error getting feedback:', error);
      return [];
    }
  }

  /**
   * Get usage analytics events (for system admin). Optional: sinceTimestamp (Firestore Timestamp).
   * Returns list of { page_path, event_type, value?, timestamp, user_email? }.
   */
  async getUsageAnalytics() {
    try {
      const coll = collection(db, this.collections.USAGE_EVENTS);
      const q = query(coll, orderBy('timestamp', 'desc'), firestoreLimit(5000));
      const snapshot = await getDocs(q);
      const events = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        events.push({
          page_path: d.page_path,
          event_type: d.event_type,
          value: d.value,
          timestamp: d.timestamp,
          user_email: d.user_email || null
        });
      });
      return events;
    } catch (error) {
      console.error('❌ Error getting usage analytics:', error);
      return [];
    }
  }

  /**
   * Update feedback status
   */
  async updateFeedbackStatus(feedbackId, status) {
    try {
      await updateDoc(doc(db, this.collections.FEEDBACK, feedbackId), {
        status,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Feedback status updated:', feedbackId, status);
    } catch (error) {
      console.error('❌ Error updating feedback:', error);
      throw error;
    }
  }

  /**
   * Delete feedback (bug report or feature request)
   */
  async deleteFeedback(feedbackId) {
    try {
      await deleteDoc(doc(db, this.collections.FEEDBACK, feedbackId));
      console.log('✅ Feedback deleted:', feedbackId);
    } catch (error) {
      console.error('❌ Error deleting feedback:', error);
      throw error;
    }
  }

  /**
   * Archive a feedback chat
   */
  async archiveFeedbackChat(chatId) {
    try {
      await updateDoc(doc(db, this.collections.FEEDBACK_CHATS, chatId), {
        status: 'archived',
        archivedAt: serverTimestamp()
      });
      console.log('✅ Chat archived:', chatId);
    } catch (error) {
      console.error('❌ Error archiving chat:', error);
      throw error;
    }
  }

  /**
   * Delete a feedback chat
   */
  async deleteFeedbackChat(chatId) {
    try {
      await deleteDoc(doc(db, this.collections.FEEDBACK_CHATS, chatId));
      console.log('✅ Chat deleted:', chatId);
    } catch (error) {
      console.error('❌ Error deleting chat:', error);
      throw error;
    }
  }

  /**
   * Create a feedback chat (chat with developer)
   */
  async createFeedbackChat(chatData) {
    try {
      const chat = {
        userEmail: chatData.userEmail,
        userName: chatData.userName,
        status: 'open', // open, closed
        messages: [{
          message: chatData.initialMessage,
          senderEmail: chatData.userEmail,
          senderName: chatData.userName,
          timestamp: new Date().toISOString()
        }],
        lastMessage: chatData.initialMessage,
        messageCount: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.collections.FEEDBACK_CHATS), chat);
      console.log('✅ Feedback chat created:', docRef.id);

      // Create notifications for IT support users
      const itSupportEmails = ['joshua@smmluxurylistings.com', 'jrsschroeder@gmail.com'];
      for (const email of itSupportEmails) {
        await this.createNotification({
          userEmail: email,
          title: '💬 New Chat Started',
          message: `${chatData.userName || chatData.userEmail} wants to chat: "${chatData.initialMessage.substring(0, 50)}..."`,
          type: 'chat_started',
          link: '/it-support'
        });
      }

      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating feedback chat:', error);
      throw error;
    }
  }

  /**
   * Get feedback chats for a user
   */
  async getFeedbackChats(userEmail) {
    try {
      const q = query(
        collection(db, this.collections.FEEDBACK_CHATS),
        where('userEmail', '==', userEmail),
        orderBy('updatedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const chats = [];
      snapshot.forEach(doc => {
        chats.push({ id: doc.id, ...doc.data() });
      });
      
      return chats;
    } catch (error) {
      console.error('❌ Error getting feedback chats:', error);
      throw error;
    }
  }

  /**
   * Get all feedback chats (for admin/developer)
   */
  async getAllFeedbackChats() {
    try {
      const q = query(
        collection(db, this.collections.FEEDBACK_CHATS),
        orderBy('updatedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const chats = [];
      snapshot.forEach(doc => {
        chats.push({ id: doc.id, ...doc.data() });
      });
      
      return chats;
    } catch (error) {
      console.error('❌ Error getting all feedback chats:', error);
      throw error;
    }
  }

  /**
   * Get a specific feedback chat by ID
   */
  async getFeedbackChatById(chatId) {
    try {
      const docRef = doc(db, this.collections.FEEDBACK_CHATS, chatId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Chat not found');
      }
      
      return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
      console.error('❌ Error getting feedback chat:', error);
      throw error;
    }
  }

  /**
   * Subscribe to a feedback chat in real time (onSnapshot). Returns unsubscribe function.
   */
  subscribeToFeedbackChat(chatId, callback) {
    if (!chatId || typeof callback !== 'function') return () => {};
    const docRef = doc(db, this.collections.FEEDBACK_CHATS, chatId);
    return onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) {
        callback(null);
        return;
      }
      callback({ id: docSnap.id, ...docSnap.data() });
    }, (error) => {
      console.error('❌ Feedback chat subscription error:', error);
    });
  }

  /**
   * Add message to feedback chat
   */
  async addFeedbackChatMessage(chatId, messageData) {
    try {
      const chatRef = doc(db, this.collections.FEEDBACK_CHATS, chatId);
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        throw new Error('Chat not found');
      }
      
      const chat = chatSnap.data();
      const newMessage = {
        message: messageData.message,
        senderEmail: messageData.senderEmail,
        senderName: messageData.senderName,
        timestamp: new Date().toISOString()
      };
      
      await updateDoc(chatRef, {
        messages: [...(chat.messages || []), newMessage],
        lastMessage: messageData.message,
        messageCount: (chat.messageCount || 0) + 1,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Message added to chat:', chatId);
    } catch (error) {
      console.error('❌ Error adding message to chat:', error);
      throw error;
    }
  }

  /**
   * Close a feedback chat
   */
  async closeFeedbackChat(chatId) {
    try {
      await updateDoc(doc(db, this.collections.FEEDBACK_CHATS, chatId), {
        status: 'closed',
        closedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Feedback chat closed:', chatId);
    } catch (error) {
      console.error('❌ Error closing feedback chat:', error);
      throw error;
    }
  }

  /**
   * Mark feedback chat as read by the user (clears unread badge when user views the conversation)
   */
  async updateFeedbackChatUserLastRead(chatId) {
    try {
      await updateDoc(doc(db, this.collections.FEEDBACK_CHATS, chatId), {
        userLastReadAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Error updating chat user last read:', error);
      throw error;
    }
  }

  // ===== CANVASES (per-user block-based documents) =====
  // Block shape: { id, type, content, caption?, checked? }. types: text|h1|h2|h3|bullet|ordered|checklist|quote|code|callout|divider|image|video
  async getCanvases(userId) {
    if (!userId) return [];
    const q = query(
      collection(db, this.collections.CANVASES),
      where('userId', '==', userId),
      orderBy('updated', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      let blocks = data.blocks;
      if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
        const legacyContent = data.content || '';
        blocks = [{ id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: 'text', content: legacyContent }];
      }
      return {
        id: d.id,
        userId: data.userId,
        title: data.title || 'Untitled Canvas',
        emoji: data.emoji || '📄',
        blocks,
        created: data.created?.toMillis?.() ?? data.created ?? Date.now(),
        updated: data.updated?.toMillis?.() ?? data.updated ?? Date.now(),
      };
    });
  }

  async createCanvas(userId, canvas) {
    if (!userId) throw new Error('userId required');
    const ref = doc(db, this.collections.CANVASES, canvas.id);
    const blocks = canvas.blocks && canvas.blocks.length ? canvas.blocks : [{ id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: 'text', content: '' }];
    const data = {
      userId,
      title: canvas.title,
      emoji: canvas.emoji,
      blocks,
      created: serverTimestamp(),
      updated: serverTimestamp(),
    };
    if (canvas.sharedWithEmails?.length) {
      data.sharedWithEmails = [...new Set(canvas.sharedWithEmails)];
      data.sharedWith = (canvas.sharedWith || []).slice(0, canvas.sharedWithEmails.length);
    }
    await setDoc(ref, data);
    return { id: canvas.id, title: canvas.title, emoji: canvas.emoji, blocks, created: Date.now(), updated: Date.now() };
  }

  async updateCanvas(userId, canvasId, patch) {
    if (!userId) throw new Error('userId required');
    const ref = doc(db, this.collections.CANVASES, canvasId);
    const data = { updated: serverTimestamp() };
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.emoji !== undefined) data.emoji = patch.emoji;
    if (patch.blocks !== undefined) {
      data.blocks = JSON.parse(JSON.stringify(patch.blocks));
    }
    if (patch.sharedWithEmails !== undefined) {
      data.sharedWithEmails = [...new Set(patch.sharedWithEmails)];
      data.sharedWith = patch.sharedWith !== undefined ? patch.sharedWith : (data.sharedWith || []);
    }
    try {
      await setDoc(ref, data, { merge: true });
    } catch (e) {
      console.error('Firestore updateCanvas failed:', { canvasId, userId, patchKeys: Object.keys(patch), error: e?.code ?? e?.message ?? e });
      throw e;
    }
  }

  async deleteCanvas(userId, canvasId) {
    if (!userId) throw new Error('userId required');
    await deleteDoc(doc(db, this.collections.CANVASES, canvasId));
  }

  async getCanvasesSharedWith(userEmail) {
    if (!userEmail) return [];
    const emailLower = String(userEmail).trim().toLowerCase();
    const q = query(
      collection(db, this.collections.CANVASES),
      where('sharedWithEmails', 'array-contains', emailLower)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      let blocks = data.blocks;
      if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
        const legacyContent = data.content || '';
        blocks = [{ id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: 'text', content: legacyContent }];
      }
      return {
        id: d.id,
        userId: data.userId,
        title: data.title || 'Untitled Canvas',
        emoji: data.emoji || '📄',
        blocks,
        created: data.created?.toMillis?.() ?? data.created ?? Date.now(),
        updated: data.updated?.toMillis?.() ?? data.updated ?? Date.now(),
      };
    });
  }

  async shareCanvas(ownerUserId, canvasId, { email, role = 'editor' }) {
    if (!ownerUserId || !canvasId || !email) throw new Error('ownerUserId, canvasId, and email required');
    const ref = doc(db, this.collections.CANVASES, canvasId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Canvas not found');
    const data = snap.data();
    if (data.userId !== ownerUserId) throw new Error('Only the owner can share');
    const emailTrim = String(email).trim().toLowerCase();
    const sharedWith = Array.isArray(data.sharedWith) ? [...data.sharedWith] : [];
    const sharedWithEmails = Array.isArray(data.sharedWithEmails) ? [...data.sharedWithEmails] : [];
    if (sharedWithEmails.includes(emailTrim)) return;
    sharedWithEmails.push(emailTrim);
    sharedWith.push({ email: emailTrim, role });
    await updateDoc(ref, { sharedWith, sharedWithEmails, updated: serverTimestamp() });
  }

  async unshareCanvas(ownerUserId, canvasId, email) {
    if (!ownerUserId || !canvasId || !email) throw new Error('ownerUserId, canvasId, and email required');
    const ref = doc(db, this.collections.CANVASES, canvasId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Canvas not found');
    const data = snap.data();
    if (data.userId !== ownerUserId) throw new Error('Only the owner can unshare');
    const emailTrim = String(email).trim().toLowerCase();
    const sharedWith = (Array.isArray(data.sharedWith) ? data.sharedWith : []).filter((e) => (e.email || '').toLowerCase() !== emailTrim);
    const sharedWithEmails = (Array.isArray(data.sharedWithEmails) ? data.sharedWithEmails : []).filter((e) => String(e).toLowerCase() !== emailTrim);
    await updateDoc(ref, { sharedWith, sharedWithEmails, updated: serverTimestamp() });
  }

  async getCanvasById(canvasId) {
    if (!canvasId) return null;
    const snap = await getDoc(doc(db, this.collections.CANVASES, canvasId));
    if (!snap.exists()) return null;
    const data = snap.data();
    let blocks = data.blocks;
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      const legacyContent = data.content || '';
      blocks = [{ id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: 'text', content: legacyContent }];
    }
    return {
      id: snap.id,
      userId: data.userId,
      title: data.title || 'Untitled Canvas',
      emoji: data.emoji || '📄',
      blocks,
      sharedWith: data.sharedWith || [],
      sharedWithEmails: data.sharedWithEmails || [],
      created: data.created?.toMillis?.() ?? data.created ?? Date.now(),
      updated: data.updated?.toMillis?.() ?? data.updated ?? Date.now(),
    };
  }

  async addCanvasFormResponse(canvasId, blockId, respondentEmail, respondentName, answers) {
    const ref = await addDoc(collection(db, this.collections.CANVAS_FORM_RESPONSES), {
      canvasId,
      blockId,
      respondentEmail: respondentEmail || null,
      respondentName: respondentName || null,
      answers,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }

  async getCanvasHistory(canvasId, limit = 50) {
    if (!canvasId) return [];
    const canvasRef = doc(db, this.collections.CANVASES, canvasId);
    const col = collection(canvasRef, 'history');
    const q = query(col, orderBy('updated', 'desc'), firestoreLimit(limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        blocks: data.blocks || [],
        title: data.title,
        updated: data.updated?.toMillis?.() ?? data.updated ?? Date.now(),
        createdBy: data.createdBy,
      };
    });
  }

  async saveCanvasHistorySnapshot(canvasId, snapshot) {
    if (!canvasId || !snapshot?.blocks) return;
    const canvasRef = doc(db, this.collections.CANVASES, canvasId);
    const col = collection(canvasRef, 'history');
    const ref = await addDoc(col, {
      blocks: JSON.parse(JSON.stringify(snapshot.blocks)),
      title: snapshot.title,
      updated: serverTimestamp(),
      createdBy: snapshot.createdBy || null,
    });
    const limit = 50;
    const q = query(col, orderBy('updated', 'desc'));
    const snap = await getDocs(q);
    const toDelete = snap.docs.slice(limit);
    await Promise.all(toDelete.map((d) => deleteDoc(doc(db, this.collections.CANVASES, canvasId, 'history', d.id))));
    return ref.id;
  }

  async restoreCanvasVersion(ownerUserId, canvasId, versionId) {
    if (!ownerUserId || !canvasId || !versionId) throw new Error('ownerUserId, canvasId, versionId required');
    const docRef = doc(db, this.collections.CANVASES, canvasId, 'history', versionId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Version not found');
    const data = snap.data();
    const blocks = data.blocks || [];
    await this.updateCanvas(ownerUserId, canvasId, { blocks });
    return { blocks };
  }

  async getBlockComments(canvasId, blockId) {
    if (!canvasId || !blockId) return { comments: [], reactions: [] };
    const docRef = doc(db, this.collections.CANVASES, canvasId, 'block_comments', blockId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return { comments: [], reactions: [] };
    const data = snap.data();
    return {
      comments: Array.isArray(data.comments) ? data.comments : [],
      reactions: Array.isArray(data.reactions) ? data.reactions : [],
    };
  }

  async addBlockComment(canvasId, blockId, { user, userName, text }) {
    if (!canvasId || !blockId) throw new Error('canvasId and blockId required');
    const docRef = doc(db, this.collections.CANVASES, canvasId, 'block_comments', blockId);
    const snap = await getDoc(docRef);
    const comments = snap.exists() && Array.isArray(snap.data().comments) ? [...snap.data().comments] : [];
    const reactions = snap.exists() && Array.isArray(snap.data().reactions) ? [...snap.data().reactions] : [];
    const newComment = {
      id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      user,
      userName: userName || user,
      text,
      createdAt: new Date().toISOString(),
    };
    comments.push(newComment);
    await setDoc(docRef, { comments, reactions }, { merge: true });
    return newComment;
  }

  async toggleBlockReaction(canvasId, blockId, emoji, userId) {
    if (!canvasId || !blockId || !userId) return;
    const docRef = doc(db, this.collections.CANVASES, canvasId, 'block_comments', blockId);
    const snap = await getDoc(docRef);
    const comments = snap.exists() && Array.isArray(snap.data().comments) ? snap.data().comments : [];
    let reactions = snap.exists() && Array.isArray(snap.data().reactions) ? [...snap.data().reactions] : [];
    const idx = reactions.findIndex((r) => r.emoji === emoji && r.userId === userId);
    if (idx >= 0) reactions.splice(idx, 1);
    else reactions.push({ emoji, userId });
    await setDoc(docRef, { comments, reactions }, { merge: true });
  }

  /**
   * Migrate all users' leave balances:
   * - Set sick days total to 3
   * - Remove personal days if present
   * This is a one-time migration function.
   */
  async migrateLeaveBalances() {
    try {
      console.log('🔄 Starting leave balance migration...');
      
      // Get all employees
      const employeesSnapshot = await getDocs(collection(db, this.collections.EMPLOYEES));
      let updatedCount = 0;
      let skippedCount = 0;
      
      for (const docSnap of employeesSnapshot.docs) {
        const employee = docSnap.data();
        const currentBalances = employee.leaveBalances || {};
        
        // Build new leave balances
        const newBalances = {
          vacation: currentBalances.vacation || { total: 15, used: 0, remaining: 15 },
          sick: {
            total: 3,
            used: currentBalances.sick?.used || 0,
            remaining: Math.max(0, 3 - (currentBalances.sick?.used || 0))
          }
        };
        
        // Check if update is needed (personal exists or sick total != 3)
        const hasPersonal = currentBalances.personal !== undefined;
        const sickNeedsUpdate = currentBalances.sick?.total !== 3;
        
        if (hasPersonal || sickNeedsUpdate) {
          await updateDoc(doc(db, this.collections.EMPLOYEES, docSnap.id), {
            leaveBalances: newBalances,
            updatedAt: serverTimestamp()
          });
          updatedCount++;
          console.log(`✅ Updated leave balances for: ${employee.email || docSnap.id}`);
        } else {
          skippedCount++;
        }
      }
      
      console.log(`✅ Leave balance migration complete. Updated: ${updatedCount}, Skipped: ${skippedCount}`);
      return { success: true, updated: updatedCount, skipped: skippedCount };
    } catch (error) {
      console.error('❌ Error migrating leave balances:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const firestoreService = new FirestoreService();
export default firestoreService;
