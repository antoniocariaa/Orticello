<template>
  <Transition name="slide-down">
    <div 
      v-if="!isOnline" 
      class="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-3 shadow-lg"
      role="alert"
      aria-live="polite"
    >
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <svg 
            class="w-6 h-6 animate-pulse" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
          <div>
            <p class="font-semibold">Modalità Offline</p>
            <p class="text-sm text-amber-100">
              Le tue modifiche verranno sincronizzate quando tornerai online
              <span v-if="queueSize > 0" class="ml-2">
                ({{ queueSize }} {{ queueSize === 1 ? 'richiesta' : 'richieste' }} in attesa)
              </span>
            </p>
          </div>
        </div>
        
        <button
          @click="retryConnection"
          class="px-3 py-1 bg-white text-amber-600 rounded-md text-sm font-medium hover:bg-amber-50 transition-colors"
          :disabled="isRetrying"
        >
          {{ isRetrying ? 'Controllo...' : 'Riprova' }}
        </button>
      </div>
    </div>
  </Transition>
  
  <!-- Toast per quando si torna online -->
  <Transition name="slide-up">
    <div 
      v-if="showOnlineToast" 
      class="fixed bottom-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-xl"
      role="alert"
      aria-live="polite"
    >
      <div class="flex items-center space-x-3">
        <svg 
          class="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p class="font-semibold">Connessione Ripristinata</p>
          <p class="text-sm text-green-100">
            {{ syncMessage }}
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useOnlineStatus } from '../composables/useOffline'

const { isOnline, queueSize, processQueue } = useOnlineStatus()

const isRetrying = ref(false)
const showOnlineToast = ref(false)
const syncMessage = ref('')

// Mostra toast quando si torna online
watch(isOnline, (newValue, oldValue) => {
  if (newValue && !oldValue) {
    // Tornato online
    const pendingCount = queueSize.value
    
    if (pendingCount > 0) {
      syncMessage.value = `Sincronizzazione di ${pendingCount} ${pendingCount === 1 ? 'richiesta' : 'richieste'}...`
      processQueue()
    } else {
      syncMessage.value = 'Sei di nuovo online!'
    }
    
    showOnlineToast.value = true
    
    // Nascondi dopo 5 secondi
    setTimeout(() => {
      showOnlineToast.value = false
    }, 5000)
  }
})

// Riprova connessione manualmente
const retryConnection = async () => {
  isRetrying.value = true
  
  try {
    // Prova a fare una richiesta di test
    const response = await fetch('/api/ping', { 
      method: 'GET',
      cache: 'no-cache'
    }).catch(() => null)
    
    if (response && response.ok) {
      // Connessione OK, forza aggiornamento stato
      window.dispatchEvent(new Event('online'))
    }
  } catch (error) {
    console.log('Still offline')
  } finally {
    setTimeout(() => {
      isRetrying.value = false
    }, 1000)
  }
}

// iOS: Nascondi automaticamente barra indirizzo quando si scrolla
onMounted(() => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (isIOS) {
    // Aggiungi viewport meta per iOS PWA
    let viewportMeta = document.querySelector('meta[name="viewport"]')
    if (viewportMeta) {
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      )
    }
  }
})
</script>

<style scoped>
/* Transizioni */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* iOS Safe Area Support */
@supports (padding: max(0px)) {
  .fixed.top-0 {
    padding-top: max(env(safe-area-inset-top), 0.75rem);
  }
  
  .fixed.bottom-4 {
    padding-bottom: max(env(safe-area-inset-bottom), 1rem);
  }
}
</style>
