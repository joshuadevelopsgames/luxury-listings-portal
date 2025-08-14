export class TutorialProgress {
  constructor(data = {}) {
    this.id = data.id;
    this.userEmail = data.userEmail;
    this.tutorialId = data.tutorialId;
    this.status = data.status || 'not_started'; // not_started, in_progress, completed, skipped
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.timeSpent = data.timeSpent || 0; // in minutes
    this.score = data.score; // optional quiz score
    this.notes = data.notes;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async filter(filters = {}, sortBy = '-createdAt') {
    // Simulate API call - replace with actual API logic
    const mockData = [
      new TutorialProgress({
        id: '1',
        userEmail: 'john.doe@company.com',
        tutorialId: '1',
        status: 'completed',
        startedAt: '2024-01-15T09:00:00Z',
        completedAt: '2024-01-15T09:35:00Z',
        timeSpent: 35,
        score: 95,
        notes: 'Great overview of company culture!'
      }),
      new TutorialProgress({
        id: '2',
        userEmail: 'john.doe@company.com',
        tutorialId: '2',
        status: 'in_progress',
        startedAt: '2024-01-16T10:00:00Z',
        timeSpent: 20,
        notes: 'Working on IT setup'
      }),
      new TutorialProgress({
        id: '3',
        userEmail: 'john.doe@company.com',
        tutorialId: '3',
        status: 'not_started'
      }),
      new TutorialProgress({
        id: '4',
        userEmail: 'john.doe@company.com',
        tutorialId: '4',
        status: 'not_started'
      })
    ];

    // Apply filters
    let filtered = mockData;
    
    if (filters.user_email) {
      filtered = filtered.filter(p => p.userEmail === filters.user_email);
    }
    
    if (filters.tutorial_id) {
      filtered = filtered.filter(p => p.tutorialId === filters.tutorial_id);
    }
    
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    // Apply sorting
    if (sortBy.startsWith('-')) {
      const field = sortBy.slice(1);
      filtered.sort((a, b) => {
        if (a[field] < b[field]) return 1;
        if (a[field] > b[field]) return -1;
        return 0;
      });
    } else {
      filtered.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return -1;
        if (a[sortBy] > b[sortBy]) return 1;
        return 0;
      });
    }

    return filtered;
  }

  static async create(data) {
    // Simulate API call - replace with actual API logic
    const progress = new TutorialProgress({
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return progress;
  }

  static async update(id, data) {
    // Simulate API call - replace with actual API logic
    const progress = new TutorialProgress({
      ...data,
      id,
      updatedAt: new Date().toISOString()
    });
    return progress;
  }

  get isCompleted() {
    return this.status === 'completed';
  }

  get isInProgress() {
    return this.status === 'in_progress';
  }

  get isNotStarted() {
    return this.status === 'not_started';
  }

  get formattedTimeSpent() {
    if (this.timeSpent < 60) {
      return `${this.timeSpent}m`;
    }
    const hours = Math.floor(this.timeSpent / 60);
    const minutes = this.timeSpent % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  get statusColor() {
    const colors = {
      not_started: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      skipped: 'bg-yellow-100 text-yellow-800'
    };
    return colors[this.status] || colors.not_started;
  }
}

