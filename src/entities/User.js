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

  // Note: Use firestoreService.getApprovedUsers() for real data
  // This method returns null - use AuthContext for current user
  static async me() {
    console.warn('User.me() is deprecated. Use AuthContext for current user data.');
    return null;
  }

  // Note: Use firestoreService.getApprovedUsers() for real data
  static async list() {
    console.warn('User.list() is deprecated. Use firestoreService.getApprovedUsers() for real data.');
    return [];
  }
}
