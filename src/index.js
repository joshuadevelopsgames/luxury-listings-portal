import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Add global error handler
window.addEventListener('error', (event) => {
  // Suppress Firestore internal assertion errors (SDK bug, not app issue)
  if (event.error?.message?.includes('FIRESTORE') && event.error?.message?.includes('INTERNAL ASSERTION')) {
    console.warn('⚠️ Firestore SDK internal error (suppressed):', event.error.message);
    event.preventDefault();
    return;
  }
  console.error('❌ Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  // Suppress Firestore internal assertion errors
  const reason = event.reason?.message || event.reason?.toString() || '';
  if (reason.includes('FIRESTORE') && reason.includes('INTERNAL ASSERTION')) {
    console.warn('⚠️ Firestore SDK internal error (suppressed):', reason);
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










