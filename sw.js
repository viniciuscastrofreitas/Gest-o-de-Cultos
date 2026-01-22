
const CACHE_NAME = 'icm-gestao-v11';

// Lista de arquivos essenciais do próprio app (caminhos relativos são mais seguros)
const APP_ASSETS = [
  './',
  './index.html',
  './index.tsx',
  './manifest.json',
  './types.ts',
  './constants.ts',
  './praiseList.ts',
  './db.ts',
  './App.tsx',
  './supabase.ts',
  './components/ServiceForm.tsx',
  './components/HistoryList.tsx',
  './components/RankingList.tsx',
  './components/BackupRestore.tsx',
  './components/UnplayedList.tsx',
  './components/WorkerStats.tsx',
  './components/WorkerRanking.tsx',
  './components/PraiseLearningList.tsx',
  './components/AuthForm.tsx'
];

// Dependências externas
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://esm.sh/react@^19.2.3',
  'https://esm.sh/react-dom@^19.2.3',
  'https://esm.sh/@supabase/supabase-js@2.45.4'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Primeiro tentamos cachear os arquivos internos (críticos)
      return cache.addAll(APP_ASSETS)
        .then(() => {
          // Depois tentamos os externos (se um falhar, o app ainda abre)
          EXTERNAL_ASSETS.forEach(url => {
            fetch(url).then(res => {
              if (res.ok) cache.put(url, res);
            }).catch(() => {});
          });
        });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignorar chamadas da API do Supabase (Sync/Auth) - Essas DEVEM ir para a rede
  if (url.host.includes('supabase.co')) {
    return;
  }

  // 2. Estratégia Cache-First para arquivos estáticos e código do App
  // Isso garante que o app abra instantaneamente mesmo offline
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retorna do cache imediatamente
        return cachedResponse;
      }

      // Se não estiver no cache, busca na rede
      return fetch(request).then((networkResponse) => {
        // Se for uma resposta válida, guarda no cache para a próxima vez
        if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
        }
        return networkResponse;
      }).catch(() => {
        // Se a rede falhar e for uma navegação (abrir o app), retorna o index.html
        if (request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('./');
        }
        return new Response("Offline", { status: 503 });
      });
    })
  );
});
