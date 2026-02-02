import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { initConsoleCapture } from './utils/consoleCapture';

// Initialize console capture for error reporting
initConsoleCapture();

// Add global error handler
window.addEventListener('error', (event) => {
  const message = event.error?.message || event.message || '';
  
  // Suppress Firebase/Firestore internal errors
  if (message.includes('FIRESTORE') && message.includes('INTERNAL ASSERTION')) {
    event.preventDefault();
    return;
  }
  if (message.includes('Remote Config') || message.includes('indexedDB')) {
    event.preventDefault();
    return;
  }
  if (message.includes('Quota exceeded') || message.includes('resource-exhausted')) {
    event.preventDefault();
    return;
  }
  if (message.includes('Cross-Origin-Opener-Policy')) {
    event.preventDefault();
    return;
  }
  console.error('❌ Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || event.reason?.toString() || '';
  
  // Suppress Firebase/Firestore internal errors
  if (reason.includes('FIRESTORE') && reason.includes('INTERNAL ASSERTION')) {
    event.preventDefault();
    return;
  }
  if (reason.includes('Remote Config') || reason.includes('indexedDB') || reason.includes('storage-open')) {
    event.preventDefault();
    return;
  }
  if (reason.includes('Quota exceeded') || reason.includes('resource-exhausted')) {
    event.preventDefault();
    return;
  }
  if (reason.includes('Missing or insufficient permissions')) {
    event.preventDefault();
    return;
  }
  if (reason.includes('Cross-Origin-Opener-Policy')) {
    event.preventDefault();
    return;
  }
  console.error('❌ Unhandled promise rejection:', event.reason);
});

// Debug environment variables
console.log('🔍 Environment check:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  VERCEL_ENV:', process.env.VERCEL_ENV);
console.log('  REACT_APP_DEV_AUTO_LOGIN:', process.env.REACT_APP_DEV_AUTO_LOGIN);
console.log('  Window location:', window.location.href);

// Verify root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = '<div style="padding: 2rem; text-align: center;"><h1>Error: Root element not found</h1><p>Please check if index.html has a div with id="root"</p></div>';
} else {
  console.log('✅ Root element found, mounting React app...');
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('✅ React app mounted');
}

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New service worker available');
            }
          });
        });
      })
      .catch((error) => {
        console.warn('⚠️ Service Worker registration failed:', error);
      });
  });
}










