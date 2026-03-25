import { initializeApp } from 'firebase/app';
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';
import { getAnalytics, logEvent } from 'firebase/analytics';

// Firebase configuration (Remote Config + Analytics only — auth & data are Supabase)
const firebaseConfig = {
  apiKey: "AIzaSyCNTi85Mc9Bpxiz_B9YKmQHsbkmkpaJzLQ",
  authDomain: "luxury-listings-portal-e56de.firebaseapp.com",
  projectId: "luxury-listings-portal-e56de",
  storageBucket: "luxury-listings-portal-e56de.firebasestorage.app",
  messagingSenderId: "660966083126",
  appId: "1:660966083126:web:ece8041e9d9cc016b7a697"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Remote Config
export const remoteConfig = getRemoteConfig(app);

// Set minimum fetch interval to 0 for development (default is 12 hours)
remoteConfig.settings.minimumFetchIntervalMillis = 0;

// Set default values
remoteConfig.defaultConfig = {
  systemUptime: '99.9%'
};

// Export Remote Config functions
export { fetchAndActivate, getValue } from 'firebase/remote-config';

// Analytics: init in browser only (non-blocking; events batched in background)
let analytics = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (_) {}
}
export function getAppAnalytics() {
  return analytics;
}
export { logEvent };

export default app;

