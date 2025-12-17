import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root');

// Global error handler for startup crashes
window.onerror = function(message, source, lineno, colno, error) {
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: #ff6b6b; font-family: monospace; background: #1a1a1a; height: 100vh; overflow: auto;">
        <h3>The Ritual Failed (App Crash)</h3>
        <p><strong>Error:</strong> ${message}</p>
        <p><strong>Source:</strong> ${source}:${lineno}:${colno}</p>
        <pre style="white-space: pre-wrap; margin-top: 10px; opacity: 0.8;">${error?.stack || 'No stack trace'}</pre>
      </div>
    `;
  }
};

if (!rootElement) {
  const fallback = document.createElement('div');
  fallback.id = 'root';
  document.body.appendChild(fallback);
}

try {
  createRoot(rootElement!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e) {
  console.error("React render failed:", e);
  if (rootElement) {
    rootElement.innerHTML = `<div style="color:red; padding:20px;">Failed to initialize ritual: ${e}</div>`;
  }
}
