import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root');

if (!rootElement) {
  // Fallback if root is missing (should not happen, but safe for debugging)
  const fallback = document.createElement('div');
  fallback.id = 'root';
  document.body.appendChild(fallback);
  
  // Visual error if things go really wrong
  fallback.style.color = 'white';
  fallback.style.padding = '20px';
  fallback.innerText = 'App initializing...';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
