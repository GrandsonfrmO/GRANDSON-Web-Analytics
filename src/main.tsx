import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './animations.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Global error listener for unhandled exceptions
window.addEventListener('error', (event) => {
  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'GlobalError',
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack || event.error?.toString(),
      url: window.location.href
    })
  }).catch(() => {});
});

// Global error listener for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  let message = 'Promise Rejection';
  let errorStack = '';
  
  if (event.reason instanceof Error) {
    message = event.reason.message;
    errorStack = event.reason.stack || '';
  } else if (typeof event.reason === 'string') {
    message = event.reason;
  } else if (event.reason && typeof event.reason === 'object') {
    try {
      // Handle Event objects (like WebSocket errors) which don't stringify well
      if (event.reason instanceof Event) {
        message = `Event: ${event.reason.type}`;
      } else {
        message = JSON.stringify(event.reason);
      }
    } catch (e) {
      message = String(event.reason);
    }
  }

  // Ignore Vite's benign WebSocket errors (often happens in iframes/sandboxes)
  if (message.includes('WebSocket') || message.includes('ws://') || message.includes('wss://') || message.includes('Event: error')) {
    return;
  }

  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'UnhandledRejection',
      message,
      error: errorStack,
      url: window.location.href
    })
  }).catch(() => {});
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
