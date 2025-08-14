import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "luxury-listings-portal.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "luxury-listings-portal",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "luxury-listings-portal.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class FirebaseService {
  constructor() {
    this.tasksCollection = collection(db, 'tasks');
    this.listeners = new Map(); // Track real-time listeners
  }

  // Create a new task
  async createTask(taskData) {
    try {
      const docRef = await addDoc(this.tasksCollection, {
        ...taskData,
        created_date: serverTimestamp(),
        updated_date: serverTimestamp(),
        status: taskData.status || 'pending'
      });
      
      return {
        id: docRef.id,
        ...taskData,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error('Failed to create task');
    }
  }

  // Update an existing task
  async updateTask(taskId, updates) {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        ...updates,
        updated_date: serverTimestamp()
      });
      
      return { success: true, id: taskId };
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error('Failed to update task');
    }
  }

  // Delete a task
  async deleteTask(taskId) {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await deleteDoc(taskRef);
      
      return { success: true, id: taskId };
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  }

  // Get a single task by ID
  async getTaskById(taskId) {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDocs(taskRef);
      
      if (taskSnap.exists()) {
        return { id: taskSnap.id, ...taskSnap.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting task:', error);
      throw new Error('Failed to get task');
    }
  }

  // Get all tasks with optional filtering and sorting
  async getTasks(filters = {}, sortBy = null) {
    try {
      let q = this.tasksCollection;
      
      // Apply filters
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.priority) {
        q = query(q, where('priority', '==', filters.priority));
      }
      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }
      if (filters.assigned_to) {
        q = query(q, where('assigned_to', '==', filters.assigned_to));
      }
      
      // Apply sorting
      if (sortBy === 'priority') {
        q = query(q, orderBy('priority', 'desc'));
      } else if (sortBy === 'due_date') {
        q = query(q, orderBy('due_date', 'asc'));
      } else if (sortBy === 'created_date') {
        q = query(q, orderBy('created_date', 'desc'));
      }
      
      const querySnapshot = await getDocs(q);
      const tasks = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        tasks.push({
          id: doc.id,
          ...data,
          created_date: data.created_date?.toDate?.()?.toISOString() || data.created_date,
          updated_date: data.updated_date?.toDate?.()?.toISOString() || data.updated_date
        });
      });
      
      return tasks;
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw new Error('Failed to get tasks');
    }
  }

  // Set up real-time listener for tasks
  subscribeToTasks(filters = {}, sortBy = null, callback) {
    let q = this.tasksCollection;
    
    // Apply filters
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.priority) {
      q = query(q, where('priority', '==', filters.priority));
    }
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters.assigned_to) {
      q = query(q, where('assigned_to', '==', filters.assigned_to));
    }
    
    // Apply sorting
    if (sortBy === 'priority') {
      q = query(q, orderBy('priority', 'desc'));
    } else if (sortBy === 'due_date') {
      q = query(q, orderBy('due_date', 'asc'));
    } else if (sortBy === 'created_date') {
      q = query(q, orderBy('created_date', 'desc'));
    }
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasks = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        tasks.push({
          id: doc.id,
          ...data,
          created_date: data.created_date?.toDate?.()?.toISOString() || data.created_date,
          updated_date: data.updated_date?.toDate?.()?.toISOString() || data.updated_date
        });
      });
      
      callback(tasks);
    }, (error) => {
      console.error('Error listening to tasks:', error);
    });
    
    // Store the unsubscribe function
    const listenerId = Date.now().toString();
    this.listeners.set(listenerId, unsubscribe);
    
    return listenerId;
  }

  // Unsubscribe from real-time updates
  unsubscribeFromTasks(listenerId) {
    const unsubscribe = this.listeners.get(listenerId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(listenerId);
    }
  }

  // Unsubscribe from all listeners
  unsubscribeFromAll() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }

  // Get task counts for different statuses
  async getTaskCounts() {
    try {
      const allTasks = await this.getTasks();
      
      return {
        today: allTasks.filter(task => this.isToday(task.due_date)).length,
        upcoming: allTasks.filter(task => this.isUpcoming(task.due_date)).length,
        overdue: allTasks.filter(task => this.isOverdue(task.due_date) && task.status !== 'completed').length,
        completed: allTasks.filter(task => task.status === 'completed').length
      };
    } catch (error) {
      console.error('Error getting task counts:', error);
      return { today: 0, upcoming: 0, overdue: 0, completed: 0 };
    }
  }

  // Helper methods for date filtering
  isToday(dateString) {
    if (!dateString) return false;
    const [year, month, day] = dateString.split('-').map(Number);
    const taskDate = new Date(year, month - 1, day);
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return taskDate.getTime() === todayOnly.getTime();
  }

  isUpcoming(dateString) {
    if (!dateString) return false;
    const [year, month, day] = dateString.split('-').map(Number);
    const taskDate = new Date(year, month - 1, day);
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return taskDate > todayOnly;
  }

  isOverdue(dateString) {
    if (!dateString) return false;
    const [year, month, day] = dateString.split('-').map(Number);
    const taskDate = new Date(year, month - 1, day);
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return taskDate < todayOnly;
  }

  // Seed initial data (for first-time setup)
  async seedInitialData() {
    try {
      const existingTasks = await this.getTasks();
      
      if (existingTasks.length === 0) {
        const initialTasks = this.getInitialMockTasks();
        
        for (const task of initialTasks) {
          await this.createTask(task);
        }
        
        console.log('Initial data seeded successfully');
        return true;
      }
      
      return false; // Data already exists
    } catch (error) {
      console.error('Error seeding initial data:', error);
      throw new Error('Failed to seed initial data');
    }
  }

  // Get initial mock tasks for seeding
  getInitialMockTasks() {
    return [
      {
        title: "Read and review the Content Style Guide",
        description: "Familiarize yourself with the brand voice, tone, and content guidelines",
        category: "Training",
        priority: "high",
        due_date: "2025-08-13",
        estimated_time: 45,
        assigned_to: "joshua@luxurylistings.com",
        status: "completed"
      },
      {
        title: "Log in to all active content tools",
        description: "Set up access to Later.com, ClickUp, and other content management platforms",
        category: "Setup",
        priority: "medium",
        due_date: "2025-08-13",
        estimated_time: 30,
        assigned_to: "joshua@luxurylistings.com",
        status: "completed"
      },
      {
        title: "Review last 10 posts on luxury accounts",
        description: "Analyze competitor content and identify successful patterns",
        category: "Research",
        priority: "medium",
        due_date: "2025-08-13",
        estimated_time: 60,
        assigned_to: "joshua@luxurylistings.com",
        status: "in_progress"
      },
      {
        title: "Create your first luxury post using the Luxe Post Kit",
        description: "Design a high-quality post following the brand guidelines",
        category: "Content Creation",
        priority: "high",
        due_date: "2025-08-14",
        estimated_time: 90,
        assigned_to: "joshua@luxurylistings.com",
        status: "pending"
      },
      {
        title: "Schedule your first post using Later.com",
        description: "Learn the scheduling platform and set up your first automated post",
        category: "Training",
        priority: "medium",
        due_date: "2025-08-14",
        estimated_time: 45,
        assigned_to: "joshua@luxurylistings.com",
        status: "pending"
      }
    ];
  }
}

export default new FirebaseService();
