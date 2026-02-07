import { firestoreService } from '../services/firestoreService';

export class DailyTask {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.category = data.category; // Will be deprecated in favor of labels
    this.priority = data.priority;
    this.due_date = data.due_date;
    this.estimated_time = data.estimated_time;
    this.assigned_to = data.assigned_to;
    this.assignedBy = data.assignedBy;
    this.status = data.status || 'pending';
    this.created_date = data.created_date;
    
    // New Todoist-like features
    this.labels = data.labels || []; // Array of label strings
    this.subtasks = data.subtasks || []; // Array of {id, text, completed, order}
    this.comments = data.comments || []; // Array of {id, user, userName, text, timestamp, attachmentUrls?}
    this.attachments = data.attachments || []; // Array of image URLs attached to task
    this.project = data.project || null; // Project ID
    this.section = data.section || null; // Section within project
    this.parent_task = data.parent_task || null; // For subtask hierarchy
    this.order = data.order || 0; // Manual ordering within a view
    
    // Recurring task configuration
    this.recurring = data.recurring || null; // {pattern, interval, daysOfWeek, endDate}
    this.recurring_parent = data.recurring_parent || null; // Link to parent recurring task
    
    // Reminders
    this.reminders = data.reminders || []; // Array of {type: 'absolute'|'relative', datetime, minutes}
    
    // Metadata
    this.completed_date = data.completed_date || null;
    this.last_modified = data.last_modified || null;
    this.task_type = data.task_type || 'user_created'; // 'user_created', 'delegated', 'recurring_instance'
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

  // ===== SUBTASK METHODS =====
  
  async addSubtask(subtaskText) {
    const newSubtask = {
      id: Date.now().toString(),
      text: subtaskText,
      completed: false,
      order: this.subtasks.length,
      created_at: new Date().toISOString()
    };
    const updatedSubtasks = [...this.subtasks, newSubtask];
    await DailyTask.update(this.id, { subtasks: updatedSubtasks });
    this.subtasks = updatedSubtasks;
    return newSubtask;
  }

  async toggleSubtask(subtaskId) {
    const updatedSubtasks = this.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    await DailyTask.update(this.id, { subtasks: updatedSubtasks });
    this.subtasks = updatedSubtasks;
  }

  async removeSubtask(subtaskId) {
    const updatedSubtasks = this.subtasks.filter(st => st.id !== subtaskId);
    await DailyTask.update(this.id, { subtasks: updatedSubtasks });
    this.subtasks = updatedSubtasks;
  }

  get subtaskProgress() {
    if (this.subtasks.length === 0) return null;
    const completed = this.subtasks.filter(st => st.completed).length;
    return `${completed}/${this.subtasks.length}`;
  }

  get subtaskPercentage() {
    if (this.subtasks.length === 0) return 0;
    const completed = this.subtasks.filter(st => st.completed).length;
    return Math.round((completed / this.subtasks.length) * 100);
  }

  // ===== COMMENT METHODS =====
  
  async addComment(userEmail, userName, commentText, attachmentUrls = []) {
    const newComment = {
      id: Date.now().toString(),
      user: userEmail,
      userName: userName,
      text: commentText,
      timestamp: new Date().toISOString(),
      ...(attachmentUrls?.length ? { attachmentUrls } : {})
    };
    const updatedComments = [...this.comments, newComment];
    await DailyTask.update(this.id, { comments: updatedComments });
    this.comments = updatedComments;
    return newComment;
  }

  async deleteComment(commentId) {
    const updatedComments = this.comments.filter(c => c.id !== commentId);
    await DailyTask.update(this.id, { comments: updatedComments });
    this.comments = updatedComments;
  }

  // ===== LABEL METHODS =====
  
  async addLabel(label) {
    if (!this.labels.includes(label)) {
      const updatedLabels = [...this.labels, label];
      await DailyTask.update(this.id, { labels: updatedLabels });
      this.labels = updatedLabels;
    }
  }

  async removeLabel(label) {
    const updatedLabels = this.labels.filter(l => l !== label);
    await DailyTask.update(this.id, { labels: updatedLabels });
    this.labels = updatedLabels;
  }

  // ===== REMINDER METHODS =====
  
  async addReminder(reminderData) {
    const newReminder = {
      id: Date.now().toString(),
      ...reminderData
    };
    const updatedReminders = [...this.reminders, newReminder];
    await DailyTask.update(this.id, { reminders: updatedReminders });
    this.reminders = updatedReminders;
    return newReminder;
  }

  async removeReminder(reminderId) {
    const updatedReminders = this.reminders.filter(r => r.id !== reminderId);
    await DailyTask.update(this.id, { reminders: updatedReminders });
    this.reminders = updatedReminders;
  }

  // ===== RECURRING TASK METHODS =====
  
  static async createRecurringTask(taskData, recurringPattern) {
    const taskId = await firestoreService.addTask({
      ...taskData,
      recurring: recurringPattern,
      is_recurring_template: true
    });
    return new DailyTask({ id: taskId, ...taskData, recurring: recurringPattern });
  }

  async generateNextRecurringInstance() {
    if (!this.recurring) return null;

    const nextDueDate = this.calculateNextDueDate();
    if (!nextDueDate) return null;

    const newTaskData = {
      ...this,
      id: undefined,
      due_date: nextDueDate,
      status: 'pending',
      completed_date: null,
      recurring_parent: this.id,
      task_type: 'recurring_instance'
    };

    return await DailyTask.create(newTaskData);
  }

  calculateNextDueDate() {
    if (!this.recurring || !this.due_date) return null;

    const currentDate = new Date(this.due_date);
    const pattern = this.recurring.pattern;
    const interval = this.recurring.interval || 1;

    switch (pattern) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (7 * interval));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + interval);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + interval);
        break;
      default:
        return null;
    }

    // Check if we've passed the end date
    if (this.recurring.endDate && currentDate > new Date(this.recurring.endDate)) {
      return null;
    }

    return currentDate.toISOString().split('T')[0];
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
      case 'p1':
        return 'text-red-600';
      case 'high':
      case 'p2':
        return 'text-orange-600';
      case 'medium':
      case 'p3':
        return 'text-blue-600';
      case 'low':
      case 'p4':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  }

  get priorityFlag() {
    switch (this.priority) {
      case 'urgent':
      case 'p1':
        return { color: 'text-red-600', bgColor: 'bg-red-50', label: 'P1' };
      case 'high':
      case 'p2':
        return { color: 'text-orange-600', bgColor: 'bg-orange-50', label: 'P2' };
      case 'medium':
      case 'p3':
        return { color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'P3' };
      case 'low':
      case 'p4':
        return { color: 'text-gray-600', bgColor: 'bg-gray-50', label: 'P4' };
      default:
        return { color: 'text-gray-600', bgColor: 'bg-gray-50', label: 'P4' };
    }
  }

  // Contextual date formatting (Todoist-style)
  get formattedDueDate() {
    if (!this.due_date) return null;

    const dueDate = new Date(this.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate.getTime() === today.getTime()) {
      return { text: 'Today', color: 'text-green-600', isOverdue: false };
    } else if (dueDate.getTime() === tomorrow.getTime()) {
      return { text: 'Tomorrow', color: 'text-orange-600', isOverdue: false };
    } else if (dueDate.getTime() === yesterday.getTime()) {
      return { text: 'Yesterday', color: 'text-red-600', isOverdue: true };
    } else if (dueDate < today) {
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      return { 
        text: `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`, 
        color: 'text-red-600', 
        isOverdue: true 
      };
    } else if (dueDate < new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      // Within next 7 days - show day name
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return { text: days[dueDate.getDay()], color: 'text-amber-600', isOverdue: false };
    } else if (dueDate.getFullYear() === today.getFullYear()) {
      // This year - show month and day
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return { 
        text: `${months[dueDate.getMonth()]} ${dueDate.getDate()}`, 
        color: 'text-gray-600', 
        isOverdue: false 
      };
    } else {
      // Future years - show full date
      return { 
        text: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 
        color: 'text-gray-600', 
        isOverdue: false 
      };
    }
  }

  get isOverdue() {
    if (!this.due_date || this.status === 'completed') return false;
    const dueDate = new Date(this.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }

  get isDueToday() {
    if (!this.due_date) return false;
    const dueDate = new Date(this.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  }

  get isDueTomorrow() {
    if (!this.due_date) return false;
    const dueDate = new Date(this.due_date);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === tomorrow.getTime();
  }
}

