
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Registrar Service Worker para suporte Offline robusto
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Usando caminho relativo './sw.js' para melhor compatibilidade com subdiretórios e previews
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('Service Worker pronto:', reg.scope);
        
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('Nova versão disponível. Recarregue para atualizar.');
              }
            };
          }
        };
      })
      .catch(err => {
        // Log amigável para erro de origem comum em ambientes de preview (iFrames)
        if (err.message.includes('origin')) {
          console.warn('Service Worker: Registro ignorado (ambiente de pré-visualização). Isso é normal durante o desenvolvimento.');
        } else {
          console.error('Erro ao registrar Service Worker:', err);
        }
      });
  });
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
