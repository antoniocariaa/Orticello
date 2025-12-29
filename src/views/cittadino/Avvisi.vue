<script>
import { ref, computed, onMounted } from 'vue'
import { store } from '@/store'
import api from '@/services/api'

export default {
  name: 'AvvisiCittadino',
  setup() {
    const avvisi = ref([])
    const loading = ref(false)
    const error = ref(null)
    
    // Filtri
    const searchText = ref('')
    const filterEmittente = ref('all') // all, comune, associazione
    const filterCategoria = ref('all')
    const filterData = ref('all') // all, today, week, month
    const filterLetto = ref('all') // all, letto, non-letto
    
    // Stato lettura locale (temporaneo finché non c'è l'API)
    const avvisiLetti = ref(new Set())
    
    // Categorie disponibili
    const categorie = computed(() => {
      const cats = new Set()
      avvisi.value.forEach(avviso => {
        if (avviso.categoria) cats.add(avviso.categoria)
      })
      return Array.from(cats).sort()
    })
    
    // Carica avvisi dall'API
    const loadAvvisi = async () => {
      loading.value = true
      error.value = null
      try {
        const data = await api.get('/avvisi')
        avvisi.value = data.map(avviso => ({
          ...avviso,
          dataFormatted: new Date(avviso.data).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        }))
      } catch (err) {
        error.value = err.message || 'Errore nel caricamento degli avvisi'
        console.error('Errore caricamento avvisi:', err)
      } finally {
        loading.value = false
      }
    }
    
    // Filtra avvisi in base ai criteri
    const avvisiFiltrati = computed(() => {
      let filtered = avvisi.value
      
      // Filtro per testo di ricerca
      if (searchText.value) {
        const search = searchText.value.toLowerCase()
        filtered = filtered.filter(avviso => 
          avviso.titolo?.toLowerCase().includes(search) ||
          avviso.messaggio?.toLowerCase().includes(search)
        )
      }
      
      // Filtro per emittente
      if (filterEmittente.value !== 'all') {
        filtered = filtered.filter(avviso => avviso.tipo === filterEmittente.value)
      }
      
      // Filtro per categoria
      if (filterCategoria.value !== 'all') {
        filtered = filtered.filter(avviso => avviso.categoria === filterCategoria.value)
      }
      
      // Filtro per data
      if (filterData.value !== 'all') {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        
        filtered = filtered.filter(avviso => {
          const avvisoDate = new Date(avviso.data)
          const avvisoDay = new Date(avvisoDate.getFullYear(), avvisoDate.getMonth(), avvisoDate.getDate())
          
          switch (filterData.value) {
            case 'today':
              return avvisoDay.getTime() === today.getTime()
            case 'week':
              const weekAgo = new Date(today)
              weekAgo.setDate(weekAgo.getDate() - 7)
              return avvisoDay >= weekAgo
            case 'month':
              const monthAgo = new Date(today)
              monthAgo.setMonth(monthAgo.getMonth() - 1)
              return avvisoDay >= monthAgo
            default:
              return true
          }
        })
      }
      
      // Filtro per stato lettura
      if (filterLetto.value !== 'all') {
        filtered = filtered.filter(avviso => {
          const isLetto = avvisiLetti.value.has(avviso._id)
          return filterLetto.value === 'letto' ? isLetto : !isLetto
        })
      }
      
      // Ordina per data (più recenti prima)
      return filtered.sort((a, b) => new Date(b.data) - new Date(a.data))
    })
    
    // Marca come letto (temporaneo)
    const segnaComeLetto = (avvisoId) => {
      avvisiLetti.value.add(avvisoId)
      // TODO: quando l'API sarà disponibile, chiamare:
      // await api.post(`/avvisi/${avvisoId}/letto`)
      alert('Funzionalità "Segna come letto" non ancora implementata nel backend.\nLo stato è salvato solo localmente.')
    }
    
    // Marca come non letto (temporaneo)
    const segnaComeDaLeggere = (avvisoId) => {
      avvisiLetti.value.delete(avvisoId)
      // TODO: quando l'API sarà disponibile, chiamare:
      // await api.delete(`/avvisi/${avvisoId}/letto`)
    }
    
    // Verifica se un avviso è stato letto
    const isLetto = (avvisoId) => {
      return avvisiLetti.value.has(avvisoId)
    }
    
    // Ottieni label dell'emittente
    const getEmittenteLabel = (avviso) => {
      if (avviso.tipo === 'comu') {
        return '🏛️ Comune'
      } else if (avviso.tipo === 'asso') {
        return '🌱 Associazione'
      }
      return 'N/A'
    }
    
    // Resetta tutti i filtri
    const resetFiltri = () => {
      searchText.value = ''
      filterEmittente.value = 'all'
      filterCategoria.value = 'all'
      filterData.value = 'all'
      filterLetto.value = 'all'
    }
    
    onMounted(() => {
      loadAvvisi()
    })
    
    return {
      avvisi,
      avvisiFiltrati,
      loading,
      error,
      searchText,
      filterEmittente,
      filterCategoria,
      filterData,
      filterLetto,
      categorie,
      loadAvvisi,
      segnaComeLetto,
      segnaComeDaLeggere,
      isLetto,
      getEmittenteLabel,
      resetFiltri,
      store
    }
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-6xl">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-warning mb-2">🔔 Bacheca Avvisi</h1>
      <p class="text-base-content/70">
        Rimani aggiornato con le ultime comunicazioni dal Comune e dalle Associazioni
      </p>
    </div>

    <!-- Filtri -->
    <div class="card bg-base-200 shadow-md mb-6">
      <div class="card-body p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Filtri</h3>
          <button 
            @click="resetFiltri" 
            class="btn btn-sm btn-ghost"
          >
            🔄 Reset
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Ricerca testuale -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">🔍 Cerca</span>
            </label>
            <input 
              v-model="searchText"
              type="text" 
              placeholder="Cerca negli avvisi..." 
              class="input input-bordered input-sm"
            />
          </div>

          <!-- Filtro emittente -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">👥 Emittente</span>
            </label>
            <select v-model="filterEmittente" class="select select-bordered select-sm">
              <option value="all">Tutti</option>
              <option value="comu">Comune</option>
              <option value="asso">Associazione</option>
            </select>
          </div>

          <!-- Filtro categoria -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">📂 Categoria</span>
            </label>
            <select v-model="filterCategoria" class="select select-bordered select-sm">
              <option value="all">Tutte</option>
              <option v-for="cat in categorie" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>

          <!-- Filtro data -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">📅 Data</span>
            </label>
            <select v-model="filterData" class="select select-bordered select-sm">
              <option value="all">Tutte</option>
              <option value="today">Oggi</option>
              <option value="week">Ultima settimana</option>
              <option value="month">Ultimo mese</option>
            </select>
          </div>

          <!-- Filtro stato lettura -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">✅ Stato</span>
            </label>
            <select v-model="filterLetto" class="select select-bordered select-sm">
              <option value="all">Tutti</option>
              <option value="non-letto">Non letti</option>
              <option value="letto">Letti</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg text-warning"></span>
    </div>

    <!-- Errore -->
    <div v-else-if="error" class="alert alert-error shadow-lg">
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ error }}</span>
      </div>
      <button @click="loadAvvisi" class="btn btn-sm">Riprova</button>
    </div>

    <!-- Lista avvisi -->
    <div v-else>
      <!-- Conteggio risultati -->
      <div class="mb-4 text-sm text-base-content/70">
        {{ avvisiFiltrati.length }} avviso{{ avvisiFiltrati.length !== 1 ? 'i' : '' }} trovato{{ avvisiFiltrati.length !== 1 ? 'i' : '' }}
      </div>

      <!-- Nessun avviso -->
      <div v-if="avvisiFiltrati.length === 0" class="alert alert-info shadow-lg">
        <div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current flex-shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Nessun avviso disponibile con i filtri selezionati.</span>
        </div>
      </div>

      <!-- Card avvisi -->
      <div v-else class="space-y-4">
        <div 
          v-for="avviso in avvisiFiltrati" 
          :key="avviso._id"
          class="card bg-base-100 shadow-md hover:shadow-xl transition-shadow duration-200"
          :class="{ 'border-l-4 border-l-warning': !isLetto(avviso._id) }"
        >
          <div class="card-body">
            <!-- Header della card -->
            <div class="flex items-start justify-between gap-4 mb-3">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <span class="badge badge-sm" :class="avviso.tipo === 'comu' ? 'badge-primary' : 'badge-secondary'">
                    {{ getEmittenteLabel(avviso) }}
                  </span>
                  <span v-if="avviso.categoria" class="badge badge-sm badge-outline">
                    {{ avviso.categoria }}
                  </span>
                  <span v-if="!isLetto(avviso._id)" class="badge badge-sm badge-warning">
                    Nuovo
                  </span>
                </div>
                <h2 class="card-title text-xl">
                  {{ avviso.titolo }}
                </h2>
              </div>
              
              <!-- Pulsante segna come letto/non letto -->
              <div class="dropdown dropdown-end">
                <label tabindex="0" class="btn btn-ghost btn-sm btn-circle">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-5 h-5 stroke-current">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </label>
                <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52">
                  <li v-if="!isLetto(avviso._id)">
                    <a @click="segnaComeLetto(avviso._id)">
                      ✅ Segna come letto
                    </a>
                  </li>
                  <li v-else>
                    <a @click="segnaComeDaLeggere(avviso._id)">
                      ⭕ Segna come da leggere
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Data -->
            <div class="flex items-center gap-2 text-sm text-base-content/60 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{{ avviso.dataFormatted }}</span>
            </div>

            <!-- Messaggio -->
            <p class="text-base-content/80 whitespace-pre-wrap">
              {{ avviso.messaggio }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Animazione per gli avvisi non letti */
.border-l-warning {
  animation: pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-border {
  0%, 100% {
    border-left-width: 4px;
    opacity: 1;
  }
  50% {
    border-left-width: 6px;
    opacity: 0.8;
  }
}
</style>
