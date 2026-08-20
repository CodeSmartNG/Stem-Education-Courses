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
console.log('📍 Firebase Config:', {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? '✅ Set' : '❌ Missing',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? '✅ Set' : '❌ Missing',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ? '✅ Set' : '❌ Missing',
});

// Check if root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found! Check your index.html');
} else {
  console.log('✅ Root element found');
}

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
  console.log('✅ React app rendered successfully');
} catch (error) {
  console.error('❌ Error rendering React app:', error);
  // Display error on page
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h2>⚠️ Something went wrong</h2>
        <p style="color: #666;">${error.message}</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #4F46E5; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Retry
        </button>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">Check console for more details</p>
      </div>
    `;
  }
}
