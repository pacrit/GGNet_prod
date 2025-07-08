const CACHE_NAME = 'ggnetworking-v1.0.0';
const STATIC_CACHE = 'ggnetworking-static-v1.0.0';
const DYNAMIC_CACHE = 'ggnetworking-dynamic-v1.0.0';

// Assets para cache estático
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html'
];

// Install
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalando...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Cacheando assets estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker instalado');
        return self.skipWaiting();
      })
  );
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker ativando...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker ativado');
        return self.clients.claim();
      })
  );
});

// 🔧 FETCH - CORRIGIDO PARA NÃO INTERCEPTAR APIs
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 🚨 IGNORAR COMPLETAMENTE requisições de API
  if (url.pathname.startsWith('/api/')) {
    console.log('🔄 API request - deixando passar:', url.pathname);
    return; // ✅ NÃO INTERCEPTA
  }

  // 🚨 IGNORAR requisições para Cloudinary
  if (url.hostname.includes('cloudinary.com')) {
    console.log('☁️ Cloudinary request - deixando passar:', url.hostname);
    return; // ✅ NÃO INTERCEPTA
  }

  // 🚨 IGNORAR requisições não-HTTP
  if (!request.url.startsWith('http')) {
    return; // ✅ NÃO INTERCEPTA
  }

  // 🚨 IGNORAR Chrome Extensions
  if (url.protocol === 'chrome-extension:') {
    return; // ✅ NÃO INTERCEPTA
  }

  // 🚨 IGNORAR _next (Next.js internos)
  if (url.pathname.startsWith('/_next/')) {
    return; // ✅ NÃO INTERCEPTA
  }

  // ✅ APENAS cachear assets estáticos
  if (request.destination === 'image' || 
      request.destination === 'font' ||
      request.destination === 'style' ||
      request.destination === 'script') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ✅ APENAS para navegação (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 🚨 TUDO MAIS: deixar passar normalmente
  // NÃO interceptar nada mais
});

// Cache First - apenas para assets
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('❌ Erro no cacheFirst:', error);
    throw error;
  }
}

// Stale While Revalidate - apenas para navegação
async function staleWhileRevalidate(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request)
      .then((response) => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => cachedResponse || caches.match('/offline.html'));
    
    return cachedResponse || fetchPromise;
  } catch (error) {
    console.log('❌ Erro no staleWhileRevalidate:', error);
    return caches.match('/offline.html');
  }
}