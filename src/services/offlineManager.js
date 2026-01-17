/**
 * Offline Manager
 * 
 * Modulo per gestire lo stato offline/online dell'app
 * con particolare attenzione alla compatibilità iOS
 */

class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine
    this.listeners = new Set()
    this.serviceWorker = null
    this.queueSize = 0
    
    // Bind methods
    this.handleOnline = this.handleOnline.bind(this)
    this.handleOffline = this.handleOffline.bind(this)
    this.handleSWMessage = this.handleSWMessage.bind(this)
    
    this.init()
  }
  
  /**
   * Inizializza il manager
   */
  init() {
    // Eventi nativi browser (limitati su iOS)
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    
    // Setup service worker communication
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        this.serviceWorker = registration.active
        navigator.serviceWorker.addEventListener('message', this.handleSWMessage)
        
        // Richiedi dimensione coda iniziale
        this.checkQueueSize()
      })
    }
    
    // iOS-specific: Polling aggiuntivo per rilevamento stato
    // iOS Safari può non triggerare sempre gli eventi online/offline
    this.startIOSPolling()
  }
  
  /**
   * Polling per iOS - controlla connessione più frequentemente
   */
  startIOSPolling() {
    // Rileva se è iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    
    if (!isIOS) return
    
    setInterval(() => {
      const previousState = this.isOnline
      const currentState = navigator.onLine
      
      if (previousState !== currentState) {
        if (currentState) {
          this.handleOnline()
        } else {
          this.handleOffline()
        }
      }
    }, 2000)
  }
  
  /**
   * Handler quando si torna online
   */
  handleOnline() {
    console.log('[OfflineManager] Device is online')
    this.isOnline = true
    this.notifyListeners(true)
    
    // Notifica SW per processare coda
    if (this.serviceWorker) {
      this.serviceWorker.postMessage({ type: 'PROCESS_QUEUE' })
    }
  }
  
  /**
   * Handler quando si va offline
   */
  handleOffline() {
    console.log('[OfflineManager] Device is offline')
    this.isOnline = false
    this.notifyListeners(false)
  }
  
  /**
   * Handler messaggi dal Service Worker
   */
  handleSWMessage(event) {
    const { type, queueSize, online } = event.data
    
    switch (type) {
      case 'ONLINE_STATUS_CHANGED':
        if (this.isOnline !== online) {
          this.isOnline = online
          this.notifyListeners(online)
        }
        break
        
      case 'OFFLINE_REQUEST_QUEUED':
      case 'OFFLINE_QUEUE_PROCESSED':
        this.queueSize = queueSize || 0
        this.notifyQueueListeners(this.queueSize)
        break
    }
  }
  
  /**
   * Registra listener per cambio stato online/offline
   */
  addListener(callback) {
    this.listeners.add(callback)
    
    // Notifica stato attuale immediatamente
    callback(this.isOnline)
    
    // Ritorna funzione per rimuovere listener
    return () => {
      this.listeners.delete(callback)
    }
  }
  
  /**
   * Notifica tutti i listener dello stato
   */
  notifyListeners(isOnline) {
    this.listeners.forEach(callback => {
      try {
        callback(isOnline)
      } catch (error) {
        console.error('[OfflineManager] Listener error:', error)
      }
    })
  }
  
  /**
   * Notifica cambio dimensione coda
   */
  notifyQueueListeners(queueSize) {
    // Puoi estendere questo per listener specifici della coda
    console.log('[OfflineManager] Queue size:', queueSize)
  }
  
  /**
   * Controlla dimensione coda richieste offline
   */
  async checkQueueSize() {
    if (!this.serviceWorker) return 0
    
    try {
      const messageChannel = new MessageChannel()
      
      const response = await new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data)
        }
        
        this.serviceWorker.postMessage(
          { type: 'GET_QUEUE_SIZE' },
          [messageChannel.port2]
        )
        
        // Timeout per iOS
        setTimeout(() => resolve({ queueSize: 0 }), 1000)
      })
      
      this.queueSize = response.queueSize || 0
      return this.queueSize
    } catch (error) {
      console.error('[OfflineManager] Error checking queue:', error)
      return 0
    }
  }
  
  /**
   * Forza processing coda
   */
  processQueue() {
    if (this.serviceWorker && this.isOnline) {
      this.serviceWorker.postMessage({ type: 'PROCESS_QUEUE' })
    }
  }
  
  /**
   * Cleanup
   */
  destroy() {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', this.handleSWMessage)
    }
    
    this.listeners.clear()
  }
  
  /**
   * Utility: Esegui azione quando online
   */
  whenOnline(callback) {
    if (this.isOnline) {
      callback()
    } else {
      const removeListener = this.addListener((isOnline) => {
        if (isOnline) {
          callback()
          removeListener()
        }
      })
    }
  }
  
  /**
   * Utility: Verifica se una richiesta può essere eseguita
   */
  canMakeRequest() {
    return this.isOnline
  }
}

// Singleton instance
export const offlineManager = new OfflineManager()

// Export class per testing
export { OfflineManager }
