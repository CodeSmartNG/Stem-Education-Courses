// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

console.log('🚀 STEM Education Platform Starting...');
console.log('📍 Environment:', import.meta.env.MODE);
console.log('📍 Base URL:', import.meta.env.BASE_URL);
console.log('📍 Current URL:', window.location.href);

// Check if root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
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
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h2>⚠️ Something went wrong</h2>
        <p style="color: #666;">${error.message}</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #4F46E5; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Retry
        </button>
      </div>
    `;
  }
}
