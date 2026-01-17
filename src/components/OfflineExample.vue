<template>
  <div class="max-w-2xl mx-auto p-4">
    <h2 class="text-2xl font-bold mb-4">Esempio Gestione Offline</h2>
    
    <!-- Status indicator -->
    <div 
      class="mb-6 p-4 rounded-lg"
      :class="isOnline ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'"
    >
      <p class="font-semibold">
        {{ isOnline ? '🟢 Online' : '🔴 Offline' }}
      </p>
      <p class="text-sm mt-1">
        {{ isOnline 
          ? 'Connesso al server' 
          : `Modalità offline - ${queueSize} richieste in attesa` 
        }}
      </p>
    </div>
    
    <!-- Form esempio -->
    <div class="bg-white shadow rounded-lg p-6">
      <h3 class="text-lg font-semibold mb-4">Crea Nuovo Orto</h3>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Nome Orto</label>
          <input 
            v-model="form.nome"
            type="text" 
            class="w-full px-3 py-2 border rounded-md"
            placeholder="Es: Orto Comunale Nord"
            required
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">Superficie (mq)</label>
          <input 
            v-model.number="form.superficie"
            type="number" 
            class="w-full px-3 py-2 border rounded-md"
            placeholder="100"
            required
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">Descrizione</label>
          <textarea 
            v-model="form.descrizione"
            class="w-full px-3 py-2 border rounded-md"
            rows="3"
            placeholder="Descrizione dell'orto..."
          ></textarea>
        </div>
        
        <!-- Checkbox per salvare bozza offline -->
        <div class="flex items-center">
          <input 
            v-model="salvaBozzaAutomatico"
            type="checkbox" 
            id="autosave"
            class="mr-2"
          />
          <label for="autosave" class="text-sm">
            Salva bozza automaticamente quando offline
          </label>
        </div>
        
        <!-- Pulsanti -->
        <div class="flex gap-3">
          <button
            type="submit"
            class="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isPending"
          >
            {{ isPending ? 'Invio in corso...' : 'Crea Orto' }}
          </button>
          
          <button
            type="button"
            @click="salvaBozza"
            class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Salva Bozza
          </button>
        </div>
        
        <!-- Messaggio errore -->
        <div v-if="error" class="p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {{ error }}
        </div>
        
        <!-- Messaggio successo -->
        <div v-if="successMessage" class="p-3 bg-green-50 text-green-700 rounded-md text-sm">
          {{ successMessage }}
        </div>
        
        <!-- Info bozza salvata -->
        <div v-if="bozzaSalvata" class="p-3 bg-blue-50 text-blue-700 rounded-md text-sm">
          <div class="flex justify-between items-center">
            <span>📝 Bozza salvata localmente</span>
            <button 
              @click="caricaBozza"
              class="text-blue-600 underline text-xs"
            >
              Carica
            </button>
          </div>
        </div>
      </form>
    </div>
    
    <!-- Pulsante per testare sync -->
    <div class="mt-6 p-4 bg-gray-50 rounded-lg">
      <h4 class="font-semibold mb-2">Debug</h4>
      <div class="space-y-2 text-sm">
        <button 
          @click="processQueue"
          class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          :disabled="!isOnline || queueSize === 0"
        >
          Sincronizza Richieste ({{ queueSize }})
        </button>
        
        <button 
          @click="simulaOffline"
          class="ml-2 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
        >
          Simula Offline
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useOnlineStatus, useOfflineRequest, useOfflineStorage } from '@/composables/useOffline'
import api from '@/services/api'

// Composables
const { isOnline, queueSize, processQueue } = useOnlineStatus()
const { executeRequest, isPending, error: requestError } = useOfflineRequest()
const { save: saveDraft, load: loadDraft, remove: removeDraft } = useOfflineStorage('orto-bozza')

// Form data
const form = ref({
  nome: '',
  superficie: '',
  descrizione: ''
})

// UI state
const error = ref(null)
const successMessage = ref(null)
const salvaBozzaAutomatico = ref(true)
const bozzaSalvata = ref(false)

// Check bozza salvata all'avvio
onMounted(() => {
  const bozza = loadDraft()
  if (bozza && bozza.data) {
    bozzaSalvata.value = true
  }
})

// Auto-salva bozza quando offline
watch([form, isOnline], ([newForm, online], [oldForm]) => {
  if (salvaBozzaAutomatico.value && !online) {
    // Solo se il form è cambiato
    if (JSON.stringify(newForm) !== JSON.stringify(oldForm)) {
      salvaBozza()
    }
  }
}, { deep: true })

// Salva bozza
const salvaBozza = () => {
  if (!form.value.nome) return
  
  saveDraft(form.value)
  bozzaSalvata.value = true
  successMessage.value = 'Bozza salvata localmente'
  
  setTimeout(() => {
    successMessage.value = null
  }, 3000)
}

// Carica bozza
const caricaBozza = () => {
  const bozza = loadDraft()
  if (bozza && bozza.data) {
    form.value = { ...bozza.data }
    successMessage.value = 'Bozza caricata'
    
    setTimeout(() => {
      successMessage.value = null
    }, 3000)
  }
}

// Submit form
const handleSubmit = async () => {
  error.value = null
  successMessage.value = null
  
  try {
    await executeRequest(
      // Funzione di richiesta
      () => api.post('/orti', form.value),
      
      // Opzioni
      {
        onSuccess: (result) => {
          successMessage.value = '✅ Orto creato con successo!'
          
          // Cancella bozza dopo successo
          if (bozzaSalvata.value) {
            removeDraft()
            bozzaSalvata.value = false
          }
          
          // Reset form
          form.value = {
            nome: '',
            superficie: '',
            descrizione: ''
          }
          
          setTimeout(() => {
            successMessage.value = null
          }, 5000)
        },
        
        onOffline: () => {
          successMessage.value = '📱 Salvato! Verrà sincronizzato quando tornerai online.'
          
          // Salva bozza
          savaBozza()
        },
        
        onError: (err) => {
          error.value = err.message || 'Errore durante la creazione dell\'orto'
        },
        
        retryWhenOnline: true  // Retry automatico quando torna online
      }
    )
  } catch (err) {
    if (!err.isOffline) {
      error.value = err.message
    }
  }
}

// Simula offline (solo per testing)
const simulaOffline = () => {
  window.dispatchEvent(new Event('offline'))
  
  setTimeout(() => {
    window.dispatchEvent(new Event('online'))
  }, 5000)
}
</script>

<style scoped>
/* iOS-specific fixes */
@supports (-webkit-touch-callout: none) {
  input, textarea {
    font-size: 16px; /* Previene zoom su iOS */
  }
}
</style>
