
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Service Worker Registration - Version 20
 * Simplificado para evitar erros de "Invalid URL" em ambientes de sandbox/preview.
 */
const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return;

  try {
    // Registro direto usando caminho relativo, que é o mais robusto.
    const registration = await navigator.serviceWorker.register('sw.js', {
      scope: './'
    });
    
    console.log('PWA: Modo offline ativado.');

    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (installingWorker) {
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('PWA: Nova atualização instalada. Reiniciando...');
            window.location.reload();
          }
        };
      }
    };
  } catch (error: any) {
    // Ignora apenas erros de cross-origin comuns em desenvolvimento
    if (error.message && !error.message.includes('origin')) {
      console.warn('PWA: Aviso no registro:', error.message);
    }
  }
};

registerServiceWorker();

let refreshing = false;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      window.location.reload();
      refreshing = true;
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root não encontrado");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
