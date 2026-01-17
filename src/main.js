import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.mount('#app')

// Register service worker with enhanced iOS support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope)
        
        // Check for updates periodically (importante per iOS)
        setInterval(() => {
          registration.update()
        }, 60000) // Ogni minuto
        
        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nuovo service worker disponibile
              console.log('🔄 Nuovo Service Worker disponibile')
              
              // Opzionale: Notifica l'utente
              if (confirm('È disponibile un aggiornamento. Ricaricare la pagina?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' })
                window.location.reload()
              }
            }
          })
        })
        
        // iOS: Verifica supporto notifiche push (limitato)
        if ('PushManager' in window) {
          console.log('📱 Push notifications supportate')
        }
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error)
      })
  })
  
  // Listen for controller change (service worker updated)
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })
}

// iOS: Prevent zoom on input focus
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  const meta = document.querySelector('meta[name=viewport]')
  if (meta) {
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
  }
  
  // Logging per debug su iOS
  console.log('📱 iOS detected - PWA optimizations enabled')
}