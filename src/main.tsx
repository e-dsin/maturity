import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './contexts/ToastContext';
import './index.css';


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

// Composant wrapper avec Router et futures flags
const AppWithRouter = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <ToastProvider>
      <App />
    </ToastProvider>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <ToastProvider>
      <AppWithRouter />
      </ToastProvider>
    </React.StrictMode>
);

setTimeout(hideSplashScreen, 1000);