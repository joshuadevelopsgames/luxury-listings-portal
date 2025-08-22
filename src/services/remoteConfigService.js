import { remoteConfig, fetchAndActivate, getValue } from '../firebase';

class RemoteConfigService {
  constructor() {
    this.isInitialized = false;
    this.listeners = new Set();
  }

  // Initialize Remote Config and fetch latest values
  async initialize() {
    try {
      console.log('🔄 Initializing Remote Config...');
      await fetchAndActivate(remoteConfig);
      this.isInitialized = true;
      console.log('✅ Remote Config initialized');
      
      // Notify all listeners of the initial values
      this.notifyListeners();
      
      return true;
    } catch (error) {
      console.error('❌ Error initializing Remote Config:', error);
      return false;
    }
  }

  // Get system uptime value
  getSystemUptime() {
    try {
      const value = getValue(remoteConfig, 'systemUptime');
      return value.asString();
    } catch (error) {
      console.error('❌ Error getting system uptime from Remote Config:', error);
      return '99.9%';
    }
  }

  // Add a listener for config changes
  addListener(callback) {
    this.listeners.add(callback);
    
    // If already initialized, call immediately with current values
    if (this.isInitialized) {
      callback({
        systemUptime: this.getSystemUptime()
      });
    }
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners of current values
  notifyListeners() {
    const values = {
      systemUptime: this.getSystemUptime()
    };
    
    this.listeners.forEach(callback => {
      try {
        callback(values);
      } catch (error) {
        console.error('❌ Error in Remote Config listener:', error);
      }
    });
  }

  // Refresh config values from server
  async refresh() {
    try {
      console.log('🔄 Refreshing Remote Config...');
      await fetchAndActivate(remoteConfig);
      console.log('✅ Remote Config refreshed');
      
      // Notify all listeners of the new values
      this.notifyListeners();
      
      return true;
    } catch (error) {
      console.error('❌ Error refreshing Remote Config:', error);
      return false;
    }
  }

  // Get all current config values
  getAllValues() {
    return {
      systemUptime: this.getSystemUptime()
    };
  }
}

// Export singleton instance
export const remoteConfigService = new RemoteConfigService();
export default remoteConfigService;


