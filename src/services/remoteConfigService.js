/**
 * Remote Config Service — backed by Supabase system_config table.
 * Replaces Firebase Remote Config (which was only used for a single "systemUptime" value).
 */
import { supabaseService } from './supabaseService';

class RemoteConfigService {
  constructor() {
    this.isInitialized = false;
    this.listeners = new Set();
    this.cachedValues = { systemUptime: '99.9%' };
  }

  async initialize() {
    try {
      const stored = await supabaseService.getSystemConfig('systemUptime').catch(() => null);
      if (stored) this.cachedValues.systemUptime = stored;
      this.isInitialized = true;
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Error initializing remote config:', error);
      return false;
    }
  }

  getSystemUptime() {
    return this.cachedValues.systemUptime;
  }

  addListener(callback) {
    this.listeners.add(callback);
    if (this.isInitialized) {
      callback({ systemUptime: this.getSystemUptime() });
    }
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    const values = { systemUptime: this.getSystemUptime() };
    this.listeners.forEach(cb => { try { cb(values); } catch (_) {} });
  }

  async refresh() {
    try {
      const stored = await supabaseService.getSystemConfig('systemUptime').catch(() => null);
      if (stored) this.cachedValues.systemUptime = stored;
      this.notifyListeners();
      return true;
    } catch (error) {
      return false;
    }
  }

  getAllValues() {
    return { systemUptime: this.getSystemUptime() };
  }
}

export const remoteConfigService = new RemoteConfigService();
export default remoteConfigService;
