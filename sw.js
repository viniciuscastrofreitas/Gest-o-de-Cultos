
const CACHE_NAME = 'icm-gestao-v10'; // Versão incrementada para forçar atualização
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json',
  '/types.ts',
  '/constants.ts',
  '/praiseList.ts',
  '/db.ts',
  '/App.tsx',
  '/supabase.ts',
  '/components/ServiceForm.tsx',
  '/components/HistoryList.tsx',
  '/components/RankingList.tsx',
  '/components/BackupRestore.tsx',
  '/components/UnplayedList.tsx',
  '/components/WorkerStats.tsx',
  '/components/WorkerRanking.tsx',
  '/components/PraiseLearningList.tsx',
  '/components/AuthForm.tsx',
  'https://cdn-icons-png.flaticon.com/512/1672/1672225.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v142/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap'
];

const ESM_DEPS = [
  'https://esm.sh/react@^19.2.3',
  'https://esm.sh/react-dom@^19.2.3',
  'https://esm.sh/react@^19.2.3/',
  'https://esm.sh/react-dom@^19.2.3/',
  'https://esm.sh/@supabase/supabase-js@2.45.4'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos addAll em vez de Map para garantir que o cache seja fatal se os itens essenciais falharem
      return cache.addAll([...PRECACHE_ASSETS, ...ESM_DEPS]).catch(err => {
        console.warn('Alguns recursos não puderam ser cacheados durante a instalação:', err);
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

  // IGNORA CACHE PARA SUPABASE (Autenticação e Sincronização em tempo real)
  if (url.host.includes('supabase.co')) {
    return;
  }

  // Estratégia Cache First para dependências externas e fontes
  if (url.host === 'esm.sh' || url.host.includes('fonts.') || url.host.includes('cdn.tailwindcss.com') || url.host.includes('flaticon.com')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Estratégia Network-First com fallback para Cache para os arquivos do App
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (request.method === 'GET' && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Se for uma navegação (abrir o app), retorna o index.html do cache
          if (request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
