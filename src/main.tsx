import React from 'react';
import ReactDOM from 'react-dom/client';
//import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './contexts/ToastContext';
import './index.css';

// Configure React Router v6 with v7 transitions
window.__reactRouterVersion = {
  v7_startTransition: true,
};

// Fonction pour masquer le splash screen
const hideSplashScreen = () => {
  const splashScreen = document.getElementById('splash-screen');
  if (splashScreen) {
    // D'abord on réduit l'opacité
    splashScreen.style.opacity = '0';
    
    // Puis on le retire complètement après la transition
    setTimeout(() => {
      splashScreen.style.display = 'none';
    }, 500); // Correspond à la durée de transition dans le CSS
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <ToastProvider>
      <App />
      </ToastProvider>
    </React.StrictMode>
);

setTimeout(hideSplashScreen, 1000);