export class AppIntegration {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.category = data.category;
    this.priority = data.priority;
    this.status = data.status;
    this.icon = data.icon;
    this.url = data.url;
    this.last_sync = data.last_sync;
    this.setup_required = data.setup_required;
    this.configuration = data.configuration;
  }

  get priorityColor() {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      important: 'bg-orange-100 text-orange-800 border-orange-200',
      optional: 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return colors[this.priority] || colors.optional;
  }

  get statusColor() {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      inactive: 'bg-gray-100 text-gray-600 border-gray-200',
      error: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[this.status] || colors.inactive;
  }

  get isCritical() {
    return this.priority === 'critical';
  }

  get isActive() {
    return this.status === 'active';
  }

  get lastSyncFormatted() {
    if (!this.last_sync) return 'Never';
    const date = new Date(this.last_sync);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  }

  // Note: Integrations should be stored in Firestore and loaded dynamically
  // This returns an empty array - configure integrations in admin settings
  static async list(sortBy = 'priority') {
    console.warn('AppIntegration.list() returns empty array. Configure integrations in Firestore.');
    return [];
  }

  static async filter(filters = {}) {
    const allIntegrations = await this.list();
    
    let filtered = allIntegrations;
    
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(integration => integration.category === filters.category);
    }
    
    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(integration => integration.priority === filters.priority);
    }
    
    if (filters.status) {
      filtered = filtered.filter(integration => integration.status === filters.status);
    }

    return filtered;
  }

  static async update(id, updates) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In a real app, this would update the database
    // For now, we'll just return success
    return { success: true, id };
  }
}
