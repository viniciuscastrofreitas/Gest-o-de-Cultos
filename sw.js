// Service Worker para Funcionamento 100% Offline do Gestão de Culto ICM
const CACHE_NAME = 'icm-gestao-offline-v8';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/apple-touch-icon.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Precache os itens essenciais com tratamento individual para não interromper se um falhar
      await Promise.allSettled(
        PRECACHE_ASSETS.map(url =>
          fetch(url, { mode: 'no-cors' })
            .then(res => cache.put(url, res))
            .catch(err => console.warn(`Falha ao precachear: ${url}`, err))
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

// Helper de timeout de rede para evitar que conexão fraca na igreja congele o app
function fetchWithTimeout(request, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Network timeout')), timeoutMs);
    fetch(request)
      .then(res => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar chamadas da API do Supabase (essas o App.tsx gerencia localmente quando offline)
  if (url.host.includes('supabase.co')) {
    return;
  }

  // 1. RECURSOS ESTÁTICOS / FONTES / CDN: Cache First (Acesso instantâneo sem gastar dados)
  if (
    url.host.includes('fonts.') ||
    url.host.includes('cdn.tailwindcss.com') ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((networkRes) => {
            if (networkRes.status === 200 || networkRes.type === 'opaque') {
              const copy = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkRes;
          })
          .catch(() => new Response('', { status: 408, statusText: 'Offline Resource' }));
      })
    );
    return;
  }

  // 2. NAVEGAÇÃO PRINCIPAL (Abrir o app na igreja sem sinal):
  // Tenta rede com timeout rápido (1.5s). Se falhar ou demorar, entrega O CACHE IMEDIATAMENTE!
  if (request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(request, 1500)
        .then((networkRes) => {
          if (networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkRes;
        })
        .catch(async () => {
          const cachedIndex = await caches.match('/index.html') || await caches.match('/');
          if (cachedIndex) return cachedIndex;
          return new Response('Aplicativo disponível offline.', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // 3. DEMAIS SCRIPTS / REQUISIÇÕES (JS bundles do Vite):
  // Cache First com revalidação em background (Stale While Revalidate)
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkRes;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
