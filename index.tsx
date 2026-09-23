
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Limpeza e gestão de Service Worker para garantir atualização imediata no preview
if ('serviceWorker' in navigator) {
  const isDevOrPreview = import.meta.env.DEV || 
                        window.location.hostname.includes('run.app') || 
                        window.location.hostname === 'localhost' ||
                        window.self !== window.top;

  if (isDevOrPreview) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      const hadController = !!navigator.serviceWorker.controller;
      if (registrations.length > 0) {
        Promise.all(registrations.map(r => r.unregister())).then(() => {
          if ('caches' in window) {
            caches.keys().then(keys => {
              Promise.all(keys.map(k => caches.delete(k))).then(() => {
                if (hadController && !sessionStorage.getItem('sw_cleaned_reload')) {
                  sessionStorage.setItem('sw_cleaned_reload', 'true');
                  window.location.reload();
                }
              });
            });
          }
        });
      }
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          reg.update();
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          reg.onupdatefound = () => {
            const installing = reg.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  window.location.reload();
                }
              };
            }
          };
        })
        .catch(err => {
          console.warn('SW register info:', err);
        });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
