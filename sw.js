
const CACHE_NAME = 'icm-gestao-v16';

// Assets to be cached for offline support
const ASSETS_TO_CACHE = [
  'index.html',
  'index.tsx',
  'App.tsx',
  'manifest.json',
  'db.ts',
  'supabase.ts',
  'types.ts',
  'constants.ts',
  'praiseList.ts',
  'components/ServiceForm.tsx',
  'components/HistoryList.tsx',
  'components/RankingList.tsx',
  'components/BackupRestore.tsx',
  'components/UnplayedList.tsx',
  'components/WorkerStats.tsx',
  'components/WorkerRanking.tsx',
  'components/PraiseLearningList.tsx',
  'components/AuthForm.tsx',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://esm.sh/react@^19.2.3',
  'https://esm.sh/react-dom@^19.2.3',
  'https://esm.sh/@supabase/supabase-js@2.45.4'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use allSettled to be resilient against single file fetch failures
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => 
          fetch(url, { mode: url.startsWith('http') ? 'cors' : 'no-cors' })
            .then(res => {
              if (res.ok || res.type === 'opaque') return cache.put(url, res);
            })
            .catch(() => console.warn('Falha ao cachear:', url))
        )
      );
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

  // Skip Supabase API calls and non-GET requests
  if (request.method !== 'GET' || url.host.includes('supabase.co')) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Offline-first strategy: Return cached version if available
      if (cachedResponse) return cachedResponse;

      // Fallback to network
      return fetch(request).then((networkResponse) => {
        // Cache successful responses for future use
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for SPA navigation when completely offline
        if (request.mode === 'navigate') {
          return caches.match('index.html');
        }
      });
    })
  );
});
