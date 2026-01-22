
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Service Worker Registration - Version 16
 * Focuses on extreme resilience for preview environments and iframes.
 */
const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return;

  // Wait for the document to be fully ready
  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => setTimeout(registerServiceWorker, 1000));
    return;
  }

  try {
    // Only register on secure origins
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHttps = window.location.protocol === 'https:';
    
    if (!isHttps && !isLocalhost) {
      console.warn('Service Worker requer HTTPS ou localhost.');
      return;
    }

    // Attempt registration with a simple relative path
    const registration = await navigator.serviceWorker.register('sw.js', {
      scope: './'
    });

    console.log('Service Worker v16 registrado com sucesso no escopo:', registration.scope);

    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (installingWorker) {
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('Nova versão do App disponível. Recarregando...');
            window.location.reload();
          }
        };
      }
    };
  } catch (error: any) {
    // Handle specific documented errors
    if (error.name === 'InvalidStateError') {
      console.warn('Documento em estado inválido para SW. Tentando novamente em 3s...');
      setTimeout(registerServiceWorker, 3000);
    } else if (error.name === 'SecurityError') {
      console.error('Erro de Segurança (Origin Mismatch):', error.message);
    } else {
      console.error('Falha ao registrar Service Worker:', error);
    }
  }
};

// Start registration process
registerServiceWorker();

// Ensure the app reloads when the SW takes control
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
