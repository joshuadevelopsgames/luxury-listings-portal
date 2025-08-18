import { firestoreService } from '../services/firestoreService';

export class DailyTask {
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

  // Get all tasks for a user
  static async getTasksForUser(userEmail) {
    try {
      const tasks = await firestoreService.getTasksByUser(userEmail);
      return tasks.map(task => new DailyTask(task));
    } catch (error) {
      console.error('Error getting tasks for user:', error);
      throw error;
    }
  }

  // Create a new task
  static async create(taskData) {
    try {
      const taskId = await firestoreService.addTask(taskData);
      return new DailyTask({ id: taskId, ...taskData });
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // Update a task
  static async update(taskId, updates) {
    try {
      await firestoreService.updateTask(taskId, updates);
      return { success: true, id: taskId };
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // Delete a task
  static async delete(taskId) {
    try {
      await firestoreService.deleteTask(taskId);
      return { success: true, id: taskId };
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // Get a task by ID
  static async findById(taskId) {
    try {
      const allTasks = await firestoreService.getTasks();
      const task = allTasks.find(t => t.id === taskId);
      return task ? new DailyTask(task) : null;
    } catch (error) {
      console.error('Error finding task by ID:', error);
      throw error;
    }
  }

  // Filter tasks with various criteria
  static async filter(filters = {}, sortBy = null) {
    try {
      let tasks = await firestoreService.getTasks();
      
      // Apply filters
      if (filters.assigned_to) {
        tasks = tasks.filter(task => task.assigned_to === filters.assigned_to);
      }
      if (filters.status) {
        tasks = tasks.filter(task => task.status === filters.status);
      }
      if (filters.priority) {
        tasks = tasks.filter(task => task.priority === filters.priority);
      }
      if (filters.category) {
        tasks = tasks.filter(task => task.category === filters.category);
      }

      // Apply sorting
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        tasks.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
      } else if (sortBy === 'due_date') {
        tasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
      } else if (sortBy === 'created_date') {
        tasks.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      }

      return tasks.map(task => new DailyTask(task));
    } catch (error) {
      console.error('Error filtering tasks:', error);
      throw error;
    }
  }

  // Subscribe to real-time task changes for a user
  static onUserTasksChange(userEmail, callback) {
    return firestoreService.onUserTasksChange(userEmail, (tasks) => {
      const dailyTasks = tasks.map(task => new DailyTask(task));
      callback(dailyTasks);
    });
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
}

