
const CACHE_NAME = 'icm-gestao-v20';

// Lista exaustiva de TUDO que o app precisa para renderizar a interface offline
const CORE_ASSETS = [
  './',
  './index.html',
  './index.tsx',
  './App.tsx',
  './constants.ts',
  './types.ts',
  './praiseList.ts',
  './db.ts',
  './supabase.ts',
  './manifest.json',
  './components/ServiceForm.tsx',
  './components/HistoryList.tsx',
  './components/RankingList.tsx',
  './components/BackupRestore.tsx',
  './components/UnplayedList.tsx',
  './components/WorkerStats.tsx',
  './components/WorkerRanking.tsx',
  './components/PraiseLearningList.tsx',
  './components/AuthForm.tsx',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://esm.sh/react@^19.2.3',
  'https://esm.sh/react-dom@^19.2.3',
  'https://esm.sh/@supabase/supabase-js@2.45.4',
  'https://fonts.gstatic.com/s/materialicons/v142/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        CORE_ASSETS.map(url => 
          fetch(url)
            .then(res => {
              if (res.ok) return cache.put(url, res);
            })
            .catch(err => console.warn(`PWA: Falha ao cachear ${url}`))
        )
      );
    })
  );
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

  // Não interceptar Supabase
  if (url.host.includes('supabase.co')) return;

  // Estratégia Cache-First com atualização em background (Stale-while-revalidate)
  // Isso garante que o app abra INSTANTANEAMENTE se houver cache
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
        }
        return networkResponse;
      }).catch(() => null);

      // Retorna o cache se existir, senão aguarda a rede
      return cachedResponse || fetchPromise || (request.mode === 'navigate' ? caches.match('./index.html') : null);
    })
  );
});
