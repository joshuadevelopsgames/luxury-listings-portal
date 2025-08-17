import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
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

// Initialize Firebase services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider to redirect to your custom domain
googleProvider.setCustomParameters({
  prompt: 'select_account',
  redirect_uri: 'https://www.smmluxurylistings.info'
});

export const db = getFirestore(app);

export default app;

