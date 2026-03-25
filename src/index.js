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

// Verify root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ Root element not found!');
  }
  document.body.innerHTML = '<div style="padding: 2rem; text-align: center;"><h1>Error: Root element not found</h1><p>Please check if index.html has a div with id="root"</p></div>';
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);

        // Check for SW updates every 60s (catches new deploys quickly)
        setInterval(() => registration.update(), 60 * 1000);

        // When a new SW is installed, tell it to activate immediately
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New service worker installed — activating now');
              newWorker.postMessage('skipWaiting');
            }
          });
        });
      })
      .catch((error) => {
        console.warn('⚠️ Service Worker registration failed:', error);
      });

    // Listen for the SW's cache-purge confirmation (from ChunkLoadError recovery)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data === 'cachesPurged') {
        console.log('🗑️ SW caches purged — reloading for fresh assets');
        window.location.reload();
      }
    });

    // When a new SW takes over, reload to pick up fresh assets
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      console.log('🔄 New service worker activated — reloading page');
      window.location.reload();
    });
  });
}










