// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

// Debug logging
console.log('🚀 STEM Education Platform Starting...');
console.log('📍 Environment:', import.meta.env.MODE);
console.log('📍 Base URL:', import.meta.env.BASE_URL);
console.log('📍 Current URL:', window.location.href);

// Check Firebase configuration
const firebaseConfigStatus = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? '✅ Set' : '❌ Missing',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? '✅ Set' : '❌ Missing',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ? '✅ Set' : '❌ Missing',
};

console.log('🔥 Firebase Config Status:', firebaseConfigStatus);

// Check if all Firebase config is present
const missingConfig = Object.entries(firebaseConfigStatus)
  .filter(([key, value]) => value === '❌ Missing')
  .map(([key]) => key);

if (missingConfig.length > 0) {
  console.warn('⚠️ Missing Firebase configuration:', missingConfig.join(', '));
  console.warn('Please check your .env file and ensure all VITE_FIREBASE_* variables are set.');
}

// Check if root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found! Check your index.html');
  document.body.innerHTML = `
    <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif;">
      <h1 style="color: #ef4444;">❌ Error</h1>
      <p style="color: #666;">Root element not found. Please check your index.html.</p>
      <p style="color: #999; font-size: 14px;">Make sure there is a div with id="root" in your HTML.</p>
    </div>
  `;
} else {
  console.log('✅ Root element found');
}

// Handle rendering with error catching
try {
  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
  
  console.log('✅ React app rendered successfully');
  console.log('📱 App ready! Visit your site to see the STEM Education Platform.');
} catch (error) {
  console.error('❌ Error rendering React app:', error);
  console.error('Error details:', error.stack);
  
  // Display error on page
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h2 style="color: #1f2937; margin: 0 0 8px 0;">Something Went Wrong</h2>
        <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 16px;">
          ${error.message || 'An unexpected error occurred while loading the app.'}
        </p>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; text-align: left; font-family: monospace; font-size: 12px; overflow: auto; max-height: 150px; margin-bottom: 16px; color: #374151;">
          ${error.stack || 'No stack trace available'}
        </div>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button 
            onclick="window.location.reload()" 
            style="padding: 10px 24px; background: #4F46E5; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
            onmouseover="this.style.background='#4338CA'"
            onmouseout="this.style.background='#4F46E5'"
          >
            🔄 Refresh Page
          </button>
          <button 
            onclick="localStorage.clear(); window.location.reload()" 
            style="padding: 10px 24px; background: #ef4444; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
            onmouseover="this.style.background='#dc2626'"
            onmouseout="this.style.background='#ef4444'"
          >
            🗑️ Clear Cache & Refresh
          </button>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">
          If the problem persists, please contact support.
        </p>
      </div>
    `;
  }
}

// Log performance metrics
if ('performance' in window && 'getEntriesByType' in performance) {
  const perfEntries = performance.getEntriesByType('navigation');
  if (perfEntries.length > 0) {
    const navTiming = perfEntries[0];
    console.log('⏱️ Page Load Time:', Math.round(navTiming.loadEventEnd - navTiming.fetchStart), 'ms');
    console.log('⏱️ DOM Interactive:', Math.round(navTiming.domInteractive - navTiming.fetchStart), 'ms');
  }
}

// Log browser info
console.log('🌐 Browser Info:', {
  userAgent: navigator.userAgent,
  language: navigator.language,
  online: navigator.onLine,
  screenSize: `${window.screen.width}x${window.screen.height}`,
});

// Handle offline/online events
window.addEventListener('offline', () => {
  console.warn('📡 You are offline. Some features may not work.');
});

window.addEventListener('online', () => {
  console.log('📡 You are back online.');
});

// Log any unhandled errors
window.addEventListener('error', (event) => {
  console.error('❌ Unhandled error:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
});

console.log('✅ Main.jsx initialization complete');
