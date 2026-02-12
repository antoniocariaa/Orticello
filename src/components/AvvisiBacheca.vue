<script>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { store } from '@/store'
import api from '@/services/api'
import { 
  Bell, RefreshCw, Search, Users, Folder, Calendar, CheckCircle, 
  Plus, AlertCircle, Info, MoreVertical, Check, Circle, Pencil, Trash2, 
  Building2, Sprout 
} from 'lucide-vue-next'

export default {
  name: 'AvvisiBacheca',
  components: {
    Bell, RefreshCw, Search, Users, Folder, Calendar, CheckCircle, 
    Plus, AlertCircle, Info, MoreVertical, Check, Circle, Pencil, Trash2, 
    Building2, Sprout
  },
  props: {
    title: {
      type: String,
      default: null 
    },
    subtitle: {
      type: String,
      default: null
    },
    canEdit: {
      type: Boolean,
      default: false
    },
    showAddButton: {
      type: Boolean,
      default: false
    },
    icon: {
      type: Object,
      default: null
    },
    buttonIcon: {
      type: Object,
      default: null
    }
  },
  emits: ['edit', 'delete', 'add'],
  setup(props, { emit, expose }) {
    const { t } = useI18n()
    const avvisi = ref([])
    const loading = ref(false)
    const error = ref(null)
    
    // NUOVO: Stato per le associazioni visibili all'utente (se cittadino)
    const userAssociazioni = ref([])
    
    // Filtri UI
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
    
    // Stato lettura locale
    const avvisiLetti = ref({}) // { avvisoId: { letto: boolean, dataLettura: Date } }
    
    // Categorie disponibili
    const categorie = ref([])
    
    // Toast
    const toast = ref({ show: false, message: '', type: 'success' })
    const showToast = (message, type = 'success') => {
      toast.value = { show: true, message, type }
      setTimeout(() => toast.value.show = false, 3000)
    }

    const displayTitle = computed(() => props.title || t('components.avvisi_bacheca.title'))
    const displaySubtitle = computed(() => props.subtitle || t('components.avvisi_bacheca.subtitle'))
    
    const loadUserAssociazioni = async () => {
      // Eseguiamo solo se c'è un utente loggato ed è un cittadino
      if (!store.user || !store.user._id || store.user.tipo !== 'citt') return
      
      // Per un cittadino, ricaviamo l'associazione direttamente dall'utente
      // attraverso il lotto assegnato
      try {
        // Ottieni tutti gli affidamenti del cittadino
        const affidamentiResponse = await api.get('/affidaLotti')
        const allAffidamenti = Array.isArray(affidamentiResponse) ? affidamentiResponse : (affidamentiResponse.data || [])
        
        // Trova gli affidamenti accettati per questo utente
        const myAffidamenti = allAffidamenti.filter(a => {
          if (!a.utente || a.stato !== 'accepted') return false
          const userId = typeof a.utente === 'object' ? (a.utente._id || a.utente.id) : a.utente
          return String(userId) === String(store.user._id)
        })
        
        if (myAffidamenti.length > 0) {
          // Per ogni affidamento, recupera l'orto per trovare l'associazione
          const ortiResponse = await api.get('/affidaOrti')
          const allOrtiAssignments = Array.isArray(ortiResponse) ? ortiResponse : (ortiResponse.data || [])
          
          // Trova le associazioni uniche che gestiscono gli orti dei lotti del cittadino
          const associazioniSet = new Set()
          
          for (const affidamento of myAffidamenti) {
            const lottoId = typeof affidamento.lotto === 'object' 
              ? (affidamento.lotto._id || affidamento.lotto.id) 
              : affidamento.lotto
            
            // Trova l'orto che contiene questo lotto
            const ortiWithLotti = await api.get('/orti')
            const allOrti = Array.isArray(ortiWithLotti) ? ortiWithLotti : (ortiWithLotti.data || [])
            
            const ortoWithMyLotto = allOrti.find(o => 
              o.lotti?.some(l => {
                const lId = typeof l === 'object' ? (l._id || l.id) : l
                return String(lId) === String(lottoId)
              })
            )
            
            if (ortoWithMyLotto) {
              // Trova l'assegnazione dell'orto all'associazione
              const ortoAssignment = allOrtiAssignments.find(oa => {
                const ortoId = typeof oa.orto === 'object' ? (oa.orto._id || oa.orto.id) : oa.orto
                return String(ortoId) === String(ortoWithMyLotto._id || ortoWithMyLotto.id)
              })
              
              if (ortoAssignment && ortoAssignment.associazione) {
                const assocId = typeof ortoAssignment.associazione === 'object' 
                  ? (ortoAssignment.associazione._id || ortoAssignment.associazione.id)
                  : ortoAssignment.associazione
                associazioniSet.add(assocId)
              }
            }
          }
          
          userAssociazioni.value = Array.from(associazioniSet)
          console.log("Associazioni trovate per il cittadino:", userAssociazioni.value)
        }
      } catch (err) {
        console.warn('Errore nel recupero associazioni:', err.message)
        userAssociazioni.value = []
      }
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
      
      // Read status filter
      if (filterLetto.value !== 'all') {
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
        if (Array.isArray(data)) {
            data.forEach(avviso => {
            if (avviso.categoria) cats.add(avviso.categoria)
            })
        }
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
        if (avvisi.value.length > 0) {
          await loadReadStatus()
        }
      } catch (err) {
        error.value = err.message || 'Errore nel caricamento degli avvisi'
        console.error('Errore caricamento avvisi:', err)
      } finally {
        loading.value = false
      }
    }
    
    // --- FILTRAGGIO AVVISI CON LOGICA CITTADINO ---
    const avvisiFiltrati = computed(() => {
      let filtered = avvisi.value
      
      // LOGICA SPECIALE PER CITTADINI
      if (store.user?.tipo === 'citt') {
        const myAssocIds = userAssociazioni.value
        
        filtered = filtered.filter(avviso => {
          // 1. Avvisi del Comune (comu): Sempre visibili
          if (avviso.tipo === 'comu') {
             // Opzionale: se il backend gestisce 'destinatario', puoi filtrare qui
             // if (avviso.destinatario === 'associazioni') return false
             return true
          }
          
          // 2. Avvisi delle Associazioni (asso): 
          // Visibili SOLO se l'ID dell'associazione è nella lista delle associazioni dell'utente
          if (avviso.tipo === 'asso') {
            const avvisoAssocId = typeof avviso.associazione === 'object' 
              ? (avviso.associazione._id || avviso.associazione.id) 
              : avviso.associazione
            
            // Verifica se l'ID è presente nell'array caricato
            return myAssocIds.includes(String(avvisoAssocId))
          }
          
          return false
        })
      }

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
      if (avvisi.value.length === 0) return
      
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
      try {
        await api.put(`/avvisi/${avvisoId}/read`)
        // Update local state
        avvisiLetti.value[avvisoId] = {
          letto: true,
          dataLettura: new Date().toISOString()
        }
        showToast(t('components.avvisi_bacheca.notice_marked_read'), 'success')
      } catch (err) {
        console.error('Errore nel marcare come letto:', err)
        showToast(t('components.avvisi_bacheca.error_marking_read'), 'error')
      }
    }
    
    // Marca come non letto
    const segnaComeDaLeggere = (avvisoId) => {
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
        return t('general.comune')
      } else if (avviso.tipo === 'asso') {
        return t('general.associazione')
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
    
    onMounted(async () => {
      // Carichiamo prima le associazioni per avere i dati pronti per il filtro
      await loadUserAssociazioni()
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
      store,
      userAssociazioni, // Esposto per eventuale debug
      displayTitle,
      displaySubtitle
    }
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-6xl">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-warning mb-2 flex items-center gap-2">
        <component :is="icon || 'Bell'" class="w-8 h-8" />
        {{ displayTitle }}
      </h1>
      <p class="text-base-content/70">{{ displaySubtitle }}</p>
    </div>

    <div class="card bg-base-200 shadow-md mb-6">
      <div class="card-body p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">{{ $t('components.avvisi_bacheca.filters') }}</h3>
          <button 
            @click="resetFiltri" 
            class="btn btn-sm btn-ghost gap-2"
          >
            <RefreshCw class="w-4 h-4" />
            {{ $t('components.avvisi_bacheca.reset') }}
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text flex items-center gap-2"><Search class="w-4 h-4" /> {{ $t('general.search') }}</span>
            </label>
            <input 
              v-model="searchText"
              type="text" 
              :placeholder="$t('components.avvisi_bacheca.search_placeholder')" 
              class="input input-bordered input-sm"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text flex items-center gap-2"><Users class="w-4 h-4" /> {{ $t('components.avvisi_bacheca.issuer') }}</span>
            </label>
            <select v-model="filterEmittente" @change="reloadOnFilterChange" class="select select-bordered select-sm">
              <option value="all">{{ $t('general.all') }}</option>
              <option value="comu">{{ $t('general.comune') }}</option>
              <option value="asso">{{ $t('general.associazione') }}</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text flex items-center gap-2"><Folder class="w-4 h-4" /> {{ $t('components.avvisi_bacheca.category') }}</span>
            </label>
            <select v-model="filterCategoria" @change="reloadOnFilterChange" class="select select-bordered select-sm">
              <option value="all">{{ $t('general.all_f') }}</option>
              <option v-for="cat in categorie" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text flex items-center gap-2"><Calendar class="w-4 h-4" /> {{ $t('general.date') }}</span>
            </label>
            <select v-model="filterData" @change="reloadOnFilterChange" class="select select-bordered select-sm">
              <option value="all">{{ $t('general.all_f') }}</option>
              <option value="today">{{ $t('general.today') }}</option>
              <option value="week">{{ $t('general.last_week') }}</option>
              <option value="month">{{ $t('general.last_month') }}</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text flex items-center gap-2"><CheckCircle class="w-4 h-4" /> {{ $t('general.status') }}</span>
            </label>
            <select v-model="filterLetto" @change="reloadOnFilterChange" class="select select-bordered select-sm">
              <option value="all">{{ $t('general.all') }}</option>
              <option value="non-letto">{{ $t('components.avvisi_bacheca.unread') }}</option>
              <option value="letto">{{ $t('components.avvisi_bacheca.read') }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddButton" class="flex justify-end mb-4">
      <button 
        @click="handleAdd" 
        class="btn btn-warning gap-2"
      >
        <component :is="buttonIcon || 'Plus'" class="w-5 h-5" />
        {{ $t('components.avvisi_bacheca.new_notice') }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg text-warning"></span>
    </div>

    <div v-else-if="error" class="alert alert-error shadow-lg">
      <div>
        <AlertCircle class="stroke-current flex-shrink-0 h-6 w-6" />
        <span>{{ error }}</span>
      </div>
      <button @click="loadAvvisi" class="btn btn-sm">{{ $t('general.retry') }}</button>
    </div>

    <div v-else>
      <div class="mb-4 text-sm text-base-content/70">
        {{ $t('components.avvisi_bacheca.avvisi_found', { count: avvisiFiltrati.length }, avvisiFiltrati.length) }}
      </div>

      <div v-if="avvisiFiltrati.length === 0" class="alert alert-info shadow-lg">
        <div>
          <Info class="stroke-current flex-shrink-0 w-6 h-6" />
          <span>{{ $t('components.avvisi_bacheca.no_notices') }}</span>
        </div>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="avviso in avvisiFiltrati" 
          :key="avviso._id"
          class="card bg-base-100 shadow-md hover:shadow-xl transition-shadow duration-200"
          :class="{ 'border-l-4 border-l-warning': !isLetto(avviso._id) }"
        >
          <div class="card-body">
            <div class="flex items-start justify-between gap-4 mb-3">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <span class="badge badge-sm gap-1" :class="avviso.tipo === 'comu' ? 'badge-primary' : 'badge-secondary'">
                    <Building2 v-if="avviso.tipo === 'comu' ? true : false" class="w-3 h-3" />
                    <Sprout v-else class="w-3 h-3" />
                    {{ getEmittenteLabel(avviso) }}
                  </span>
                  <span v-if="avviso.categoria" class="badge badge-sm badge-outline">
                    {{ avviso.categoria }}
                  </span>
                  <span v-if="!isLetto(avviso._id)" class="badge badge-sm badge-warning">
                    {{ $t('general.new') }}
                  </span>
                </div>
                <h2 class="card-title text-xl">
                  {{ avviso.titolo }}
                </h2>
              </div>
              
              <div class="dropdown dropdown-end">
                <label tabindex="0" class="btn btn-ghost btn-sm btn-circle">
                  <MoreVertical class="w-5 h-5" />
                </label>
                <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52">
                  <li v-if="!isLetto(avviso._id)">
                    <a @click="segnaComeLetto(avviso._id)" class="flex items-center gap-2">
                      <Check class="w-4 h-4 text-success" />
                      {{ $t('components.avvisi_bacheca.mark_as_read') }}
                    </a>
                  </li>
                  <li v-else>
                    <a @click="segnaComeDaLeggere(avviso._id)" class="flex items-center gap-2">
                       <Circle class="w-4 h-4 text-warning" />
                       {{ $t('components.avvisi_bacheca.mark_as_unread') }}
                    </a>
                  </li>
                  
                  <template v-if="canEdit">
                    <li><hr class="my-1" /></li>
                    <li>
                      <a @click="handleEdit(avviso)" class="text-info flex items-center gap-2">
                        <Pencil class="w-4 h-4" />
                        {{ $t('general.edit') }}
                      </a>
                    </li>
                    <li>
                      <a @click="handleDelete(avviso)" class="text-error flex items-center gap-2">
                        <Trash2 class="w-4 h-4" />
                        {{ $t('general.delete') }}
                      </a>
                    </li>
                  </template>
                </ul>
              </div>
            </div>

            <div class="flex items-center gap-2 text-sm text-base-content/60 mb-3">
              <Calendar class="h-4 w-4" />
              <span>{{ avviso.dataFormatted }}</span>
            </div>

            <p class="text-base-content/80 whitespace-pre-wrap">
              {{ avviso.messaggio }}
            </p>
          </div>
        </div>
      </div>
      
      <div v-if="totalPages > 1" class="flex justify-center mt-6">
        <div class="join">
          <button 
            class="join-item btn btn-sm" 
            :disabled="currentPage === 1"
            @click="prevPage"
          >
            «
          </button>
          
          <button 
            v-if="currentPage > 2"
            class="join-item btn btn-sm" 
            @click="goToPage(1)"
          >
            1
          </button>
          
          <button 
            v-if="currentPage > 3"
            class="join-item btn btn-sm btn-disabled"
          >
            ...
          </button>
          
          <button 
            v-if="currentPage > 1"
            class="join-item btn btn-sm" 
            @click="goToPage(currentPage - 1)"
          >
            {{ currentPage - 1 }}
          </button>
          
          <button class="join-item btn btn-sm btn-active">
            {{ currentPage }}
          </button>
          
          <button 
            v-if="currentPage < totalPages"
            class="join-item btn btn-sm" 
            @click="goToPage(currentPage + 1)"
          >
            {{ currentPage + 1 }}
          </button>
          
          <button 
            v-if="currentPage < totalPages - 2"
            class="join-item btn btn-sm btn-disabled"
          >
            ...
          </button>
          
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
    
    <div v-if="toast.show" class="toast toast-end z-[9999]">
      <div class="alert" :class="toast.type === 'error' ? 'alert-error' : 'alert-success'">
        <span class="text-white">{{ toast.message }}</span>
      </div>
    </div>
  </div>
</template>