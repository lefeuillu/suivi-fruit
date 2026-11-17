import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './components.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);

// Installation sur l'écran d'accueil uniquement (aucun cache : pas de mode hors ligne)
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
