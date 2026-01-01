<script>
import { ref, computed, onMounted } from 'vue'
import { store } from '@/store'
import api from '@/services/api'

export default {
  name: 'AvvisiBacheca',
  props: {
    title: {
      type: String,
      default: '🔔 Bacheca Avvisi'
    },
    subtitle: {
      type: String,
      default: 'Rimani aggiornato con le ultime comunicazioni dal Comune e dalle Associazioni'
    },
    canEdit: {
      type: Boolean,
      default: false
    },
    showAddButton: {
      type: Boolean,
      default: false
    }
  },
  emits: ['edit', 'delete', 'add'],
  setup(props, { emit, expose }) {
    const avvisi = ref([])
    const loading = ref(false)
    const error = ref(null)
    
    // Filtri
    const searchText = ref('')
    const filterEmittente = ref('all') // all, comu, asso
    const filterCategoria = ref('all')
    const filterData = ref('all') // all, today, week, month
    const filterLetto = ref('all') // all, letto, non-letto
    
    // Pagination
    const currentPage = ref(1)
    const totalPages = ref(1)
    const totalItems = ref(0)
    const itemsPerPage = ref(20)
    
    // Stato lettura
    const avvisiLetti = ref({}) // { avvisoId: { letto: boolean, dataLettura: Date } }
    
    // Categorie disponibili (loaded from all avvisi)
    const categorie = ref([])
    
    // Toast
    const toast = ref({ show: false, message: '', type: 'success' })
    const showToast = (message, type = 'success') => {
      toast.value = { show: true, message, type }
      setTimeout(() => toast.value.show = false, 3000)
    }
    
    // Build query parameters based on filters
    const buildQueryParams = () => {
      const params = new URLSearchParams()
      
      // Entity type filter
      if (filterEmittente.value !== 'all') {
        params.append('tipo', filterEmittente.value)
      }
      
      // Category filter
      if (filterCategoria.value !== 'all') {
        params.append('categoria', filterCategoria.value)
      }
      
      // Date range filter
      if (filterData.value !== 'all') {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        
        switch (filterData.value) {
          case 'today':
            params.append('dataInizio', today.toISOString())
            params.append('dataFine', new Date(today.getTime() + 86400000).toISOString())
            break
          case 'week':
            const weekAgo = new Date(today)
            weekAgo.setDate(weekAgo.getDate() - 7)
            params.append('dataInizio', weekAgo.toISOString())
            break
          case 'month':
            const monthAgo = new Date(today)
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            params.append('dataInizio', monthAgo.toISOString())
            break
        }
      }
      
      // Read status filter (only if user is authenticated)
      if (filterLetto.value !== 'all' && store.token) {
        params.append('letto', filterLetto.value === 'letto' ? 'true' : 'false')
      }
      
      // Pagination
      params.append('page', currentPage.value)
      params.append('limit', itemsPerPage.value)
      
      return params.toString()
    }
    
    // Load all categories for filter dropdown
    const loadCategorie = async () => {
      try {
        const data = await api.get('/avvisi')
        const cats = new Set()
        data.forEach(avviso => {
          if (avviso.categoria) cats.add(avviso.categoria)
        })
        categorie.value = Array.from(cats).sort()
      } catch (err) {
        console.error('Errore caricamento categorie:', err)
      }
    }
    
    // Carica avvisi dall'API usando endpoint filtered
    const loadAvvisi = async () => {
      loading.value = true
      error.value = null
      try {
        const queryParams = buildQueryParams()
        const response = await api.get(`/avvisi/filtered?${queryParams}`)
        
        avvisi.value = response.data.map(avviso => ({
          ...avviso,
          dataFormatted: new Date(avviso.data).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        }))
        
        // Update pagination info
        if (response.pagination) {
          currentPage.value = response.pagination.currentPage
          totalPages.value = response.pagination.totalPages
          totalItems.value = response.pagination.totalItems
          itemsPerPage.value = response.pagination.itemsPerPage
        }
        
        // Load read status if user is authenticated
        if (store.token && avvisi.value.length > 0) {
          await loadReadStatus()
        }
      } catch (err) {
        error.value = err.message || 'Errore nel caricamento degli avvisi'
        console.error('Errore caricamento avvisi:', err)
      } finally {
        loading.value = false
      }
    }
    
    // Filtra avvisi in base ai criteri (client-side text search only)
    const avvisiFiltrati = computed(() => {
      let filtered = avvisi.value
      
      // Filtro per testo di ricerca (client-side)
      if (searchText.value) {
        const search = searchText.value.toLowerCase()
        filtered = filtered.filter(avviso => 
          avviso.titolo?.toLowerCase().includes(search) ||
          avviso.messaggio?.toLowerCase().includes(search)
        )
      }
      
      // Ordina per data (più recenti prima)
      return filtered.sort((a, b) => new Date(b.data) - new Date(a.data))
    })
    
    // Load read status for current avvisi
    const loadReadStatus = async () => {
      if (!store.token || avvisi.value.length === 0) return
      
      try {
        const avvisiIds = avvisi.value.map(a => a._id)
        const response = await api.post('/avvisi/read-status', { avvisiIds })
        avvisiLetti.value = response.data
      } catch (err) {
        console.error('Errore caricamento stato lettura:', err)
      }
    }
    
    // Marca come letto
    const segnaComeLetto = async (avvisoId) => {
      if (!store.token) {
        showToast('Devi effettuare il login per marcare gli avvisi come letti', 'error')
        return
      }
      
      try {
        await api.put(`/avvisi/${avvisoId}/read`)
        // Update local state
        avvisiLetti.value[avvisoId] = {
          letto: true,
          dataLettura: new Date().toISOString()
        }
        showToast('Avviso segnato come letto', 'success')
      } catch (err) {
        console.error('Errore nel marcare come letto:', err)
        showToast('Errore nel marcare l\'avviso come letto', 'error')
      }
    }
    
    // Marca come non letto (note: API doesn't support unread, so we just update locally)
    const segnaComeDaLeggere = (avvisoId) => {
      // Update local state only (backend doesn't have unread endpoint)
      avvisiLetti.value[avvisoId] = {
        letto: false,
        dataLettura: null
      }
    }
    
    // Verifica se un avviso è stato letto
    const isLetto = (avvisoId) => {
      return avvisiLetti.value[avvisoId]?.letto || false
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
      currentPage.value = 1
      loadAvvisi()
    }
    
    // Watch filters to reload data when changed
    const reloadOnFilterChange = () => {
      currentPage.value = 1
      loadAvvisi()
    }
    
    // Navigation functions
    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++
        loadAvvisi()
      }
    }
    
    const prevPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--
        loadAvvisi()
      }
    }
    
    const goToPage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page
        loadAvvisi()
      }
    }
    
    // Gestione edit/delete/add
    const handleEdit = (avviso) => {
      emit('edit', avviso)
    }
    
    const handleDelete = (avviso) => {
      emit('delete', avviso)
    }
    
    const handleAdd = () => {
      emit('add')
    }
    
    onMounted(() => {
      loadCategorie()
      loadAvvisi()
    })
    
    // Esponi loadAvvisi per permettere il refresh dall'esterno
    expose({
      loadAvvisi
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
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      loadAvvisi,
      segnaComeLetto,
      segnaComeDaLeggere,
      isLetto,
      getEmittenteLabel,
      resetFiltri,
      reloadOnFilterChange,
      nextPage,
      prevPage,
      goToPage,
      handleEdit,
      handleDelete,
      handleAdd,
      toast,
      store
    }
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-6xl">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-warning mb-2">{{ title }}</h1>
      <p class="text-base-content/70">{{ subtitle }}</p>
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
            <select v-model="filterEmittente" @change="reloadOnFilterChange" class="select select-bordered select-sm">
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
            <select v-model="filterCategoria" @change="reloadOnFilterChange" class="select select-bordered select-sm">
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
            <select v-model="filterData" @change="reloadOnFilterChange" class="select select-bordered select-sm">
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
            <select v-model="filterLetto" @change="reloadOnFilterChange" class="select select-bordered select-sm">
              <option value="all">Tutti</option>
              <option value="non-letto">Non letti</option>
              <option value="letto">Letti</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Pulsante Aggiungi Avviso -->
    <div v-if="showAddButton" class="flex justify-end mb-4">
      <button 
        @click="handleAdd" 
        class="btn btn-warning"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        Nuovo Avviso
      </button>
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
              <!-- menu azioni -->
              <div class="dropdown dropdown-end">
                <label tabindex="0" class="btn btn-ghost btn-sm btn-circle">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-5 h-5 stroke-current">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </label>
                <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52">
                  <!-- Azioni di lettura -->
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
                  
                  <!-- Azioni di gestione (solo se canEdit è true) -->
                  <template v-if="canEdit">
                    <li><hr class="my-1" /></li>
                    <li>
                      <a @click="handleEdit(avviso)" class="text-info">
                        ✏️ Modifica
                      </a>
                    </li>
                    <li>
                      <a @click="handleDelete(avviso)" class="text-error">
                        🗑️ Elimina
                      </a>
                    </li>
                  </template>
                </ul>
              </div>
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
      
      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center mt-6">
        <div class="join">
          <button 
            class="join-item btn btn-sm" 
            :disabled="currentPage === 1"
            @click="prevPage"
          >
            «
          </button>
          
          <!-- First page -->
          <button 
            v-if="currentPage > 2"
            class="join-item btn btn-sm" 
            @click="goToPage(1)"
          >
            1
          </button>
          
          <!-- Ellipsis before -->
          <button 
            v-if="currentPage > 3"
            class="join-item btn btn-sm btn-disabled"
          >
            ...
          </button>
          
          <!-- Previous page -->
          <button 
            v-if="currentPage > 1"
            class="join-item btn btn-sm" 
            @click="goToPage(currentPage - 1)"
          >
            {{ currentPage - 1 }}
          </button>
          
          <!-- Current page -->
          <button class="join-item btn btn-sm btn-active">
            {{ currentPage }}
          </button>
          
          <!-- Next page -->
          <button 
            v-if="currentPage < totalPages"
            class="join-item btn btn-sm" 
            @click="goToPage(currentPage + 1)"
          >
            {{ currentPage + 1 }}
          </button>
          
          <!-- Ellipsis after -->
          <button 
            v-if="currentPage < totalPages - 2"
            class="join-item btn btn-sm btn-disabled"
          >
            ...
          </button>
          
          <!-- Last page -->
          <button 
            v-if="currentPage < totalPages - 1"
            class="join-item btn btn-sm" 
            @click="goToPage(totalPages)"
          >
            {{ totalPages }}
          </button>
          
          <button 
            class="join-item btn btn-sm" 
            :disabled="currentPage === totalPages"
            @click="nextPage"
          >
            »
          </button>
        </div>
      </div>
    </div>
    
    <!-- Toast -->
    <div v-if="toast.show" class="toast toast-end z-[9999]">
      <div class="alert" :class="toast.type === 'error' ? 'alert-error' : 'alert-success'">
        <span class="text-white">{{ toast.message }}</span>
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
