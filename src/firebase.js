import { initializeApp } from 'firebase/app';

// Firebase configuration — only needed for Cloud Functions (Vision OCR, OpenAI, Client Health).
// Auth → Supabase, Storage → Supabase, Analytics → Supabase usage_events,
// Remote Config → Supabase system_config.
const firebaseConfig = {
  apiKey: "AIzaSyCNTi85Mc9Bpxiz_B9YKmQHsbkmkpaJzLQ",
  authDomain: "luxury-listings-portal-e56de.firebaseapp.com",
  projectId: "luxury-listings-portal-e56de",
  storageBucket: "luxury-listings-portal-e56de.firebasestorage.app",
  messagingSenderId: "660966083126",
  appId: "1:660966083126:web:ece8041e9d9cc016b7a697"
};

const app = initializeApp(firebaseConfig);

export default app;
