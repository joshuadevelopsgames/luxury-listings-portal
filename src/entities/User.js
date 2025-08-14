export class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.role = data.role;
    this.department = data.department;
    this.startDate = data.startDate;
    this.avatar = data.avatar;
  }

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  get daysSinceStart() {
    if (!this.startDate) return 0;
    const start = new Date(this.startDate);
    const today = new Date();
    const diffTime = Math.abs(today - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  static async me() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock data for luxury real estate content leader
    const mockUser = {
      id: 1,
      email: 'content.leader@luxuryrealestate.com',
      firstName: 'Sarah',
      lastName: 'Mitchell',
      role: 'Head of Content — @luxury_listings',
      department: 'Social Media & Marketing',
      startDate: new Date().toISOString(), // Today
      avatar: null
    };

    return new User(mockUser);
  }

  static async list() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock data for team members
    const mockUsers = [
      {
        id: 1,
        email: 'content.leader@luxuryrealestate.com',
        firstName: 'Sarah',
        lastName: 'Mitchell',
        role: 'Head of Content — @luxury_listings',
        department: 'Social Media & Marketing',
        startDate: new Date().toISOString(),
        avatar: null
      },
      {
        id: 2,
        email: 'pankaj.boosting@luxuryrealestate.com',
        firstName: 'Pankaj',
        lastName: 'Sharma',
        role: 'Digital Marketing Manager',
        department: 'Social Media & Marketing',
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
        avatar: null
      },
      {
        id: 3,
        email: 'creative.designer@luxuryrealestate.com',
        firstName: 'Emma',
        lastName: 'Rodriguez',
        role: 'Creative Designer',
        department: 'Social Media & Marketing',
        startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
        avatar: null
      }
    ];

    return mockUsers.map(user => new User(user));
  }
}
