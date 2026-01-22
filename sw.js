
const CACHE_NAME = 'icm-gestao-v12';

// Lista de arquivos vitais (sem eles o app não abre)
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/manifest.json',
  '/db.ts',
  '/supabase.ts',
  '/types.ts',
  '/constants.ts',
  '/praiseList.ts'
];

// Componentes e dependências (o app tenta baixar, mas não morre se falhar)
const SECONDARY_ASSETS = [
  '/components/ServiceForm.tsx',
  '/components/HistoryList.tsx',
  '/components/RankingList.tsx',
  '/components/BackupRestore.tsx',
  '/components/UnplayedList.tsx',
  '/components/WorkerStats.tsx',
  '/components/WorkerRanking.tsx',
  '/components/PraiseLearningList.tsx',
  '/components/AuthForm.tsx',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://esm.sh/react@^19.2.3',
  'https://esm.sh/react-dom@^19.2.3',
  'https://esm.sh/@supabase/supabase-js@2.45.4'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Tenta cachear os críticos primeiro
      return cache.addAll(CRITICAL_ASSETS).then(() => {
        // Depois tenta os secundários um por um para não quebrar o processo
        SECONDARY_ASSETS.forEach(url => {
          fetch(url).then(res => {
            if (res.ok) cache.put(url, res);
          }).catch(() => console.log('Falha não crítica no cache:', url));
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

  // Nunca cachear chamadas de autenticação do Supabase
  if (url.host.includes('supabase.co')) return;

  // Estratégia: Cache First (Olha no celular primeiro)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Se achou no cache, entrega na hora (rápido e offline)
        return cachedResponse;
      }

      // Se não tem no cache, tenta baixar
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
        }
        return networkResponse;
      }).catch(() => {
        // Se falhar a rede E não tiver no cache, e for navegação, manda o index
        if (request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept').includes('text/html'))) {
          return caches.match('/') || caches.match('/index.html');
        }
      });
    })
  );
});
