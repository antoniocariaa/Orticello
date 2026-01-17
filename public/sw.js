// ============================================
// CONFIGURAZIONE CACHE
// ============================================
const CACHE_VERSION = 'v3'  // Incrementata per forzare aggiornamento e supporto offline
const CACHE_STATIC = `orticello-static-${CACHE_VERSION}`
const CACHE_DYNAMIC = `orticello-dynamic-${CACHE_VERSION}`
const CACHE_API = `orticello-api-${CACHE_VERSION}`

// Lista minima per primo install - altri asset vengono cachati dinamicamente
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.png',
  '/manifest.json'
]

// Assets Vite che vengono cachati dinamicamente al primo caricamento
const VITE_ASSETS_PATTERN = /\.(js|css|woff|woff2|ttf|eot)$/

// Timeout per le richieste di rete (iOS ha limitazioni stringenti)
const NETWORK_TIMEOUT = 5000

// In-memory store per richieste offline (temporaneo, preparato per futura persistenza)
const offlineRequestQueue = []

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Rileva se il client è online o offline
 * iOS richiede approcci multipli per rilevamento affidabile
 */
function isOnline() {
  // Verifica lo stato della connessione (limitato su iOS)
  return self.navigator.onLine !== false
}

/**
 * Determina la strategia di cache in base al tipo di risorsa
 * iOS beneficia di strategie cache-first per performance
 */
function getCacheStrategy(request) {
  const url = new URL(request.url)
  
  // API requests: Network-first con fallback
  if (url.pathname.startsWith('/api/')) {
    return 'network-first'
  }
  
  // Assets statici (inclusi Vite): Cache-first SEMPRE
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff|woff2|ttf|ico)$/)) {
    return 'cache-first'
  }
  
  // Assets Vite con hash (@vite, src/): Cache-first
  if (url.pathname.includes('@vite') || url.pathname.includes('/src/') || url.pathname.includes('/assets/')) {
    return 'cache-first'
  }
  
  // HTML: Cache-first quando offline, network-first quando online
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    return isOnline() ? 'network-first' : 'cache-first'
  }
  
  return 'cache-first'
}

/**
 * Fetch con timeout - essenziale per iOS che può bloccarsi
 */
function fetchWithTimeout(request, timeout = NETWORK_TIMEOUT) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Network timeout')), timeout)
    )
  ])
}

/**
 * Salva richiesta fallita per retry futuro
 * Preparato per integrazione con IndexedDB
 */
function queueOfflineRequest(request, body = null) {
  const queuedRequest = {
    url: request.url,
    method: request.method,
    headers: Array.from(request.headers.entries()),
    body: body,
    timestamp: Date.now()
  }
  
  offlineRequestQueue.push(queuedRequest)
  
  // Notifica i client dell'aggiornamento della coda
  notifyClients({
    type: 'OFFLINE_REQUEST_QUEUED',
    queueSize: offlineRequestQueue.length
  })
  
  console.log('[SW] Request queued for retry:', request.url)
}

/**
 * Processa richieste in coda quando si torna online
 */
async function processOfflineQueue() {
  if (offlineRequestQueue.length === 0 || !isOnline()) {
    return
  }
  
  console.log('[SW] Processing offline queue:', offlineRequestQueue.length, 'requests')
  
  const queue = [...offlineRequestQueue]
  offlineRequestQueue.length = 0
  
  for (const queuedRequest of queue) {
    try {
      const request = new Request(queuedRequest.url, {
        method: queuedRequest.method,
        headers: queuedRequest.headers,
        body: queuedRequest.body
      })
      
      await fetch(request)
      console.log('[SW] Offline request synced:', queuedRequest.url)
    } catch (error) {
      console.error('[SW] Failed to sync offline request:', error)
      // Re-queue se necessario
      offlineRequestQueue.push(queuedRequest)
    }
  }
  
  notifyClients({
    type: 'OFFLINE_QUEUE_PROCESSED',
    queueSize: offlineRequestQueue.length
  })
}

/**
 * Notifica tutti i client connessi
 */
async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' })
  clients.forEach(client => client.postMessage(message))
}

/**
 * Crea una risposta offline fallback compatibile iOS
 */
function createOfflineResponse(request) {
  const url = new URL(request.url)
  
  // Per richieste API, ritorna JSON con status offline
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({ 
        offline: true, 
        message: 'La richiesta sarà sincronizzata quando tornerai online',
        timestamp: Date.now()
      }),
      {
        status: 503,
        statusText: 'Service Unavailable - Offline',
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Mode': 'true'
        }
      }
    )
  }
  
  // Per altre richieste, cerca in cache dinamica
  return caches.match('/')
}

// ============================================
// CACHE STRATEGIES
// ============================================

/**
 * Strategy: Cache First
 * Ottimale per iOS - riduce latenza e consumo dati
 */
async function cacheFirst(request) {
  // Cerca in tutte le cache (static, dynamic, api)
  const cachedResponse = await caches.match(request, { ignoreSearch: true })
  
  if (cachedResponse) {
    console.log('[SW] Cache HIT:', request.url)
    
    // Aggiorna cache in background (stale-while-revalidate)
    if (isOnline()) {
      fetchWithTimeout(request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheName = request.url.includes('/api/') ? CACHE_API : CACHE_DYNAMIC
            caches.open(cacheName).then(cache => {
              cache.put(request, networkResponse.clone())
            })
          }
        })
        .catch(() => {}) // Silently fail background updates
    }
    
    return cachedResponse
  }
  
  console.log('[SW] Cache MISS:', request.url)
  
  // Non in cache, prova network
  if (isOnline()) {
    return networkFirst(request)
  } else {
    // Offline e non in cache - ritorna fallback
    if (request.mode === 'navigate') {
      // Per navigazione, ritorna index.html se disponibile
      const fallback = await caches.match('/index.html')
      if (fallback) return fallback
    }
    return createOfflineResponse(request)
  }
}

/**
 * Strategy: Network First
 * Con fallback robusto per iOS
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetchWithTimeout(request)
    
    // Cache response valide (200-299)
    if (networkResponse && networkResponse.ok) {
      const cacheName = request.url.includes('/api/') ? CACHE_API : CACHE_DYNAMIC
      const cache = await caches.open(cacheName)
      
      // iOS può avere problemi con alcuni tipi di response
      // Cloniamo esplicitamente e gestiamo errori
      try {
        await cache.put(request, networkResponse.clone())
        console.log('[SW] Cached:', request.url)
      } catch (err) {
        console.warn('[SW] Failed to cache:', err)
      }
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error.message)
    
    // Fallback a cache (cerca in tutte le cache)
    const cachedResponse = await caches.match(request, { ignoreSearch: true })
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache (offline):', request.url)
      return cachedResponse
    }
    
    // Se richiesta di navigazione e niente in cache, usa index.html
    if (request.mode === 'navigate') {
      const indexCache = await caches.match('/index.html')
      if (indexCache) {
        console.log('[SW] Serving index.html as fallback')
        return indexCache
      }
    }
    
    // Se POST/PUT/DELETE e offline, metti in coda
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      // Clona il body se presente
      const body = await request.clone().text().catch(() => null)
      queueOfflineRequest(request, body)
    }
    
    // Ritorna risposta offline
    return createOfflineResponse(request)
  }
}

// ============================================
// SERVICE WORKER LIFECYCLE
// ============================================

/**
 * Install - Precache assets essenziali
 * iOS richiede gestione attenta della cache durante install
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(async (cache) => {
        console.log('[SW] Caching static assets')
        
        // Cache assets uno per uno per evitare fallimento completo
        const cachePromises = STATIC_ASSETS.map(async (url) => {
          try {
            await cache.add(url)
            console.log('[SW] Cached:', url)
          } catch (error) {
            console.warn('[SW] Failed to cache:', url, error)
          }
        })
        
        await Promise.all(cachePromises)
        return cache
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error)
        // Continua comunque per permettere caching dinamico
        return self.skipWaiting()
      })
  )
})

/**
 * Activate - Pulizia cache vecchie
 * Importante su iOS per gestione memoria limitata
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  const currentCaches = [CACHE_STATIC, CACHE_DYNAMIC, CACHE_API]
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Service worker activated')
        return self.clients.claim()
      })
  )
})

/**
 * Fetch - Gestione richieste con strategia dinamica
 * Ottimizzato per compatibilità iOS e detection offline
 */
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Ignora richieste esterne (CDN, API esterne)
  if (!url.origin.includes(self.location.origin) && !url.pathname.startsWith('/api/')) {
    return
  }
  
  // iOS Safari ha limitazioni con richieste non-GET in SW
  // Gestisci solo GET per massima compatibilità
  if (request.method !== 'GET') {
    // Per POST/PUT/DELETE, lascia passare ma gestisci offline
    event.respondWith(
      fetch(request).catch(error => {
        console.log('[SW] Non-GET request failed offline:', error)
        request.clone().text().then(body => {
          queueOfflineRequest(request, body)
        }).catch(() => {})
        return createOfflineResponse(request)
      })
    )
    return
  }
  
  // Determina strategia di cache
  const strategy = getCacheStrategy(request)
  
  console.log('[SW] Fetch:', url.pathname, '| Strategy:', strategy, '| Online:', isOnline())
  
  event.respondWith(
    strategy === 'cache-first' 
      ? cacheFirst(request)
      : networkFirst(request)
  )
})

/**
 * Message handler - Comunicazione con client
 * iOS richiede comunicazione esplicita per sync
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data.type === 'CHECK_ONLINE_STATUS') {
    event.ports[0].postMessage({ online: isOnline() })
  }
  
  if (event.data.type === 'PROCESS_QUEUE') {
    processOfflineQueue()
  }
  
  if (event.data.type === 'GET_QUEUE_SIZE') {
    event.ports[0].postMessage({ queueSize: offlineRequestQueue.length })
  }
})

/**
 * Sync event - Background sync per iOS (limitato)
 * Preparato per future implementazioni
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag)
  
  if (event.tag === 'sync-offline-requests') {
    event.waitUntil(processOfflineQueue())
  }
})

// ============================================
// PERIODIC CHECKS (iOS compatibility)
// ============================================

// iOS non supporta nativamente background sync
// Monitora cambiamenti di stato online/offline
let wasOffline = !isOnline()

setInterval(() => {
  const nowOnline = isOnline()
  
  if (wasOffline && nowOnline) {
    console.log('[SW] Device back online - processing queue')
    processOfflineQueue()
    notifyClients({ type: 'ONLINE_STATUS_CHANGED', online: true })
  } else if (!wasOffline && !nowOnline) {
    console.log('[SW] Device went offline')
    notifyClients({ type: 'ONLINE_STATUS_CHANGED', online: false })
  }
  
  wasOffline = !nowOnline
}, 3000) // Check ogni 3 secondi (bilanciato per iOS)
