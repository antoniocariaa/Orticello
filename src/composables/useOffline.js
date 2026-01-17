/**
 * Composable per gestire stato online/offline nei componenti Vue
 * Ottimizzato per iOS e compatibilità PWA
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { offlineManager } from '../services/offlineManager'

/**
 * Hook per monitorare stato online/offline
 */
export function useOnlineStatus() {
  const isOnline = ref(navigator.onLine)
  const queueSize = ref(0)
  
  let removeListener = null
  let queueCheckInterval = null
  
  onMounted(() => {
    // Registra listener per cambio stato
    removeListener = offlineManager.addListener((online) => {
      isOnline.value = online
      
      // Feedback visivo per utente
      if (online) {
        console.log('✅ Connessione ripristinata')
      } else {
        console.log('⚠️ Sei offline - le modifiche saranno sincronizzate quando tornerai online')
      }
    })
    
    // Controlla periodicamente dimensione coda (per UI)
    queueCheckInterval = setInterval(async () => {
      queueSize.value = await offlineManager.checkQueueSize()
    }, 5000)
  })
  
  onUnmounted(() => {
    if (removeListener) {
      removeListener()
    }
    if (queueCheckInterval) {
      clearInterval(queueCheckInterval)
    }
  })
  
  return {
    isOnline,
    queueSize,
    canMakeRequest: () => offlineManager.canMakeRequest(),
    processQueue: () => offlineManager.processQueue(),
    whenOnline: (callback) => offlineManager.whenOnline(callback)
  }
}

/**
 * Hook per gestire richieste con fallback offline
 */
export function useOfflineRequest() {
  const { isOnline, whenOnline } = useOnlineStatus()
  const isPending = ref(false)
  const error = ref(null)
  
  /**
   * Esegui richiesta con gestione offline automatica
   */
  const executeRequest = async (requestFn, options = {}) => {
    const { 
      onSuccess, 
      onError, 
      onOffline,
      retryWhenOnline = true 
    } = options
    
    isPending.value = true
    error.value = null
    
    try {
      const result = await requestFn()
      
      if (onSuccess) {
        onSuccess(result)
      }
      
      return result
    } catch (err) {
      error.value = err
      
      // Se offline, gestisci di conseguenza
      if (!isOnline.value) {
        if (onOffline) {
          onOffline(err)
        }
        
        // Retry automatico quando torna online
        if (retryWhenOnline) {
          whenOnline(async () => {
            try {
              const result = await requestFn()
              if (onSuccess) {
                onSuccess(result)
              }
            } catch (retryError) {
              if (onError) {
                onError(retryError)
              }
            }
          })
        }
      } else if (onError) {
        onError(err)
      }
      
      throw err
    } finally {
      isPending.value = false
    }
  }
  
  return {
    executeRequest,
    isPending,
    error,
    isOnline
  }
}

/**
 * Hook per salvare dati localmente quando offline
 * Preparato per futura implementazione IndexedDB
 */
export function useOfflineStorage(key) {
  const isOnline = ref(navigator.onLine)
  
  /**
   * Salva dato (per ora in localStorage, futuro: IndexedDB)
   */
  const save = (data) => {
    try {
      const serialized = JSON.stringify({
        data,
        timestamp: Date.now(),
        synced: isOnline.value
      })
      localStorage.setItem(`offline_${key}`, serialized)
      return true
    } catch (error) {
      console.error('[useOfflineStorage] Save error:', error)
      return false
    }
  }
  
  /**
   * Carica dato
   */
  const load = () => {
    try {
      const serialized = localStorage.getItem(`offline_${key}`)
      if (!serialized) return null
      
      return JSON.parse(serialized)
    } catch (error) {
      console.error('[useOfflineStorage] Load error:', error)
      return null
    }
  }
  
  /**
   * Rimuovi dato
   */
  const remove = () => {
    try {
      localStorage.removeItem(`offline_${key}`)
      return true
    } catch (error) {
      console.error('[useOfflineStorage] Remove error:', error)
      return false
    }
  }
  
  /**
   * Segna come sincronizzato
   */
  const markSynced = () => {
    const stored = load()
    if (stored) {
      stored.synced = true
      save(stored.data)
    }
  }
  
  return {
    save,
    load,
    remove,
    markSynced
  }
}
