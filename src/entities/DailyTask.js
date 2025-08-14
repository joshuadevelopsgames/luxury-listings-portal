export class DailyTask {
  static STORAGE_KEY = 'luxury-listings-tasks';
  static allTasks = null;

  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.category = data.category;
    this.priority = data.priority;
    this.due_date = data.due_date;
    this.estimated_time = data.estimated_time;
    this.assigned_to = data.assigned_to;
    this.assignedBy = data.assignedBy;
    this.status = data.status || 'pending';
    this.created_date = data.created_date;
  }

  // Load tasks from Local Storage
  static loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load tasks from storage:', error);
    }
    return null;
  }

  // Save tasks to Local Storage
  static saveToStorage(tasks) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.warn('Failed to save tasks to storage:', error);
    }
  }

  // Initialize tasks (load from storage or use defaults)
  static getInitialTasks() {
    if (!this.allTasks) {
      // Try to load from storage first
      const storedTasks = this.loadFromStorage();
      
      if (storedTasks && storedTasks.length > 0) {
        this.allTasks = storedTasks;
      } else {
        // Use default mock tasks if no stored data
        this.allTasks = this.getInitialMockTasks();
        this.saveToStorage(this.allTasks);
      }
    }
    return this.allTasks;
  }

  static async filter(filters = {}, sortBy = null) {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const tasks = this.getInitialTasks();
    let filteredTasks = tasks;

    // Apply filters
    if (filters.status) {
      filteredTasks = filteredTasks.filter(task => task.status === filters.status);
    }
    if (filters.priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
    }
    if (filters.category) {
      filteredTasks = filteredTasks.filter(task => task.category === filters.category);
    }
    if (filters.assigned_to) {
      filteredTasks = filteredTasks.filter(task => task.assigned_to === filters.assigned_to);
    }

    // Apply sorting
    if (sortBy === 'priority') {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      filteredTasks.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    } else if (sortBy === 'due_date') {
      filteredTasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    } else if (sortBy === 'created_date') {
      filteredTasks.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }

    return filteredTasks.map(task => new DailyTask(task));
  }

  static async create(data) {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const tasks = this.getInitialTasks();
    const newTask = { 
      id: Date.now(), 
      ...data, 
      created_date: new Date().toISOString(),
      status: data.status || 'pending'
    };
    
    tasks.push(newTask);
    this.allTasks = tasks;
    this.saveToStorage(tasks);
    
    return new DailyTask(newTask);
  }

  static async update(id, updates) {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const tasks = this.getInitialTasks();
    const taskIndex = tasks.findIndex(task => task.id === id);
    
    if (taskIndex !== -1) {
      tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
      this.allTasks = tasks;
      this.saveToStorage(tasks);
      return { success: true, id };
    }
    
    return { success: false, error: 'Task not found' };
  }

  static async delete(id) {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const tasks = this.getInitialTasks();
    const taskIndex = tasks.findIndex(task => task.id === id);
    
    if (taskIndex !== -1) {
      tasks.splice(taskIndex, 1);
      this.allTasks = tasks;
      this.saveToStorage(tasks);
      return { success: true, id };
    }
    
    return { success: false, error: 'Task not found' };
  }

  static async findById(id) {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const tasks = this.getInitialTasks();
    const task = tasks.find(task => task.id === id);
    
    return task ? new DailyTask(task) : null;
  }

  // Clear all tasks (useful for testing or resetting)
  static clearAllTasks() {
    this.allTasks = [];
    this.saveToStorage([]);
  }

  // Export tasks (useful for backup or migration)
  static exportTasks() {
    const tasks = this.getInitialTasks();
    return JSON.stringify(tasks, null, 2);
  }

  // Import tasks (useful for backup restoration or migration)
  static importTasks(jsonData) {
    try {
      const tasks = JSON.parse(jsonData);
      if (Array.isArray(tasks)) {
        this.allTasks = tasks;
        this.saveToStorage(tasks);
        return { success: true, count: tasks.length };
      }
      return { success: false, error: 'Invalid data format' };
    } catch (error) {
      return { success: false, error: 'Invalid JSON data' };
    }
  }

  get formattedTime() {
    if (this.estimated_time < 60) {
      return `${this.estimated_time}m`;
    }
    const hours = Math.floor(this.estimated_time / 60);
    const minutes = this.estimated_time % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  get difficultyColor() {
    switch (this.priority) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-blue-600';
      case 'low':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  }

  static getInitialMockTasks() {
    return [
      {
        id: 1,
        title: "Read and review the Content Style Guide",
        description: "Familiarize yourself with the brand voice, tone, and content guidelines",
        category: "Training",
        priority: "high",
        due_date: "2025-08-13",
        estimated_time: 45,
        assigned_to: "joshua@luxurylistings.com",
        status: "completed",
        created_date: "2025-08-10T10:00:00.000Z"
      },
      {
        id: 2,
        title: "Log in to all active content tools",
        description: "Set up access to Later.com, ClickUp, and other content management platforms",
        category: "Setup",
        priority: "medium",
        due_date: "2025-08-13",
        estimated_time: 30,
        assigned_to: "joshua@luxurylistings.com",
        status: "completed",
        created_date: "2025-08-10T10:00:00.000Z"
      },
      {
        id: 3,
        title: "Review last 10 posts on luxury accounts",
        description: "Analyze competitor content and identify successful patterns",
        category: "Research",
        priority: "medium",
        due_date: "2025-08-13",
        estimated_time: 60,
        assigned_to: "joshua@luxurylistings.com",
        status: "in_progress",
        created_date: "2025-08-10T10:00:00.000Z"
      },
      {
        id: 4,
        title: "Create your first luxury post using the Luxe Post Kit",
        description: "Design a high-quality post following the brand guidelines",
        category: "Content Creation",
        priority: "high",
        due_date: "2025-08-14",
        estimated_time: 90,
        assigned_to: "joshua@luxurylistings.com",
        status: "pending",
        created_date: "2025-08-10T10:00:00.000Z"
      },
      {
        id: 5,
        title: "Schedule your first post using Later.com",
        description: "Learn the scheduling platform and set up your first automated post",
        category: "Training",
        priority: "medium",
        due_date: "2025-08-14",
        estimated_time: 45,
        assigned_to: "joshua@luxurylistings.com",
        status: "pending",
        created_date: "2025-08-10T10:00:00.000Z"
      },
      {
        id: 6,
        title: "Review and update your ClickUp task status",
        description: "Update progress on all assigned tasks in the project management system",
        category: "Administrative",
        priority: "low",
        due_date: "2025-08-15",
        estimated_time: 20,
        assigned_to: "joshua@luxurylistings.com",
        status: "pending",
        created_date: "2025-08-10T10:00:00.000Z"
      },
      {
        id: 7,
        title: "Review yesterday's post metrics in Insights",
        description: "Analyze engagement, reach, and performance of recent content",
        category: "Analytics",
        priority: "medium",
        due_date: "2025-08-16",
        estimated_time: 30,
        assigned_to: "joshua@luxurylistings.com",
        status: "pending",
        created_date: "2025-08-10T10:00:00.000Z"
      },
      {
        id: 8,
        title: "Research 1 new high-value listing for Luxe Post Kit",
        description: "Find premium properties that align with our luxury brand positioning",
        category: "Research",
        priority: "high",
        due_date: "2025-08-17",
        estimated_time: 60,
        assigned_to: "joshua@luxurylistings.com",
        status: "pending",
        created_date: "2025-08-10T10:00:00.000Z"
      },
      {
        id: 9,
        title: "Check ClickUp for team tasks and update statuses",
        description: "Review collaborative tasks and ensure proper communication",
        category: "Team Management",
        priority: "medium",
        due_date: "2025-08-18",
        estimated_time: 25,
        assigned_to: "joshua@luxurylistings.com",
        status: "pending",
        created_date: "2025-08-10T10:00:00.000Z"
      },
      {
        id: 10,
        title: "Check in with client list via Google Sheets",
        description: "Review client status and identify follow-up opportunities",
        category: "Client Relations",
        priority: "high",
        due_date: "2025-08-19",
        estimated_time: 40,
        assigned_to: "joshua@luxurylistings.com",
        status: "pending",
        created_date: "2025-08-10T10:00:00.000Z"
      }
    ];
  }
}
