<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '../../services/api'
import { store } from '../../store'
import { 
  Building2, Globe, Users, AlertTriangle, Map, Sprout, Eye, Search, X 
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()

// --- State ---
const orti = ref([])
const affidamenti = ref([]) 
const users = ref([]) 
const loading = ref(false)
const error = ref(null)

// --- UI State ---
const searchQuery = ref('')
const filterStatus = ref('all') // 'all', 'free', 'assigned'
const currentPage = ref(1)
const itemsPerPage = 10

// --- Fetching Data ---
const fetchData = async () => {
    loading.value = true
    error.value = null
    try {
        const [resOrti, resAffidi, resUsers] = await Promise.all([
            api.get('/orti'),
            api.get('/affidaOrti'),
            api.get('/utenti')
        ])
        
        orti.value = Array.isArray(resOrti) ? resOrti : (resOrti.data || [])
        affidamenti.value = Array.isArray(resAffidi) ? resAffidi : (resAffidi.data || [])
        users.value = Array.isArray(resUsers) ? resUsers : (resUsers.data || [])
    } catch (e) {
        console.error('Errore caricamento dati dashboard', e)
        error.value = '$t("comune.home.error_loading")'
    } finally {
        loading.value = false
    }
}

onMounted(fetchData)

// --- Helpers Logici ---

const getCurrentAssignment = (ortoId) => {
    if (!ortoId) return null
    const oIdStr = String(ortoId)
    const now = new Date()
    return affidamenti.value.find(a => {
        const aOId = typeof a.orto === 'object' ? (a.orto._id || a.orto.id) : a.orto
        const startDate = new Date(a.data_inizio)
        const endDate = new Date(a.data_fine)
        return String(aOId) === oIdStr && startDate <= now && endDate >= now
    })
}

const getAssociazioneName = (ortoId) => {
    const assignment = getCurrentAssignment(ortoId)
    if (!assignment) return '-'
    
    // Se l'associazione è già un oggetto popolato, usa direttamente i suoi dati
    if (typeof assignment.associazione === 'object' && assignment.associazione !== null) {
        return assignment.associazione.nome || assignment.associazione.username || 'Associazione'
    }
    
    // Altrimenti cerca l'utente associazione nella lista users
    const assocId = assignment.associazione
    const assocUser = users.value.find(u => String(u._id || u.id) === String(assocId))
    
    if (!assocUser) {
        console.warn(`Associazione con ID ${assocId} non trovata`)
        return 'Associazione non trovata'
    }
    
    return assocUser.nome || assocUser.username || 'Associazione'
}

const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('it-IT')
}

// --- Computed Properties ---

const totalOrti = computed(() => orti.value.length)
const totalAssociazioni = computed(() => users.value.filter(u => u.tipo === 'asso').length)

const ortiNonAssegnati = computed(() => {
    return orti.value.filter(o => !getCurrentAssignment(o._id || o.id)).length
})

// --- Logic per Filtri e Paginazione ---

const filteredOrti = computed(() => {
    let result = orti.value

    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(o => 
            (o.nome && o.nome.toLowerCase().includes(q)) || 
            (o.indirizzo && o.indirizzo.toLowerCase().includes(q))
        )
    }

    if (filterStatus.value !== 'all') {
        result = result.filter(o => {
            const isAssigned = !!getCurrentAssignment(o._id || o.id)
            return filterStatus.value === 'assigned' ? isAssigned : !isAssigned
        })
    }

    return result
})

const totalPages = computed(() => Math.ceil(filteredOrti.value.length / itemsPerPage))

const paginatedOrti = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredOrti.value.slice(start, end)
})

watch([searchQuery, filterStatus], () => {
    currentPage.value = 1
})

// --- Modals ---
const selectedOrto = ref(null)
const selectedAssignment = ref(null)
const isDetailsModalOpen = ref(false)

const openDetailsModal = (orto) => {
    selectedOrto.value = orto
    selectedAssignment.value = getCurrentAssignment(orto._id || orto.id)
    isDetailsModalOpen.value = true
}

const closeDetailsModal = () => {
    isDetailsModalOpen.value = false
    selectedOrto.value = null
    selectedAssignment.value = null
}

const goToAssegna = (ortoId) => {
    router.push(`/comune/assegna/${ortoId}`)
}
</script>

<template>
  <div class="p-6 min-h-[calc(100vh-64px)] w-full bg-base-50">
      
      <div class="max-w-7xl mx-auto space-y-8">
      
          <div>
              <div class="mb-6">
                  <h1 class="text-3xl font-bold text-secondary mb-1 flex items-center gap-2">
                    {{ $t('comune.home.title') }} <Building2 class="w-8 h-8" />
                  </h1>
                  <p class="text-gray-600 text-sm">{{ $t('comune.home.subtitle') }}</p>
              </div>
          </div>

          <div v-if="loading" class="flex justify-center py-12">
              <span class="loading loading-spinner loading-lg text-primary"></span>
          </div>

          <div v-else-if="error">
              <div class="alert alert-error shadow-lg">
                  <div>
                      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{{ error }}</span>
                  </div>
                  <button class="btn btn-sm" @click="fetchData">{{ $t('comune.home.retry') }}</button>
              </div>
          </div>

          <template v-else>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="stat bg-white shadow rounded-box border border-base-200 py-4">
                      <div class="stat-figure text-secondary">
                          <Globe class="w-8 h-8" />
                      </div>
                      <div class="stat-title text-xs uppercase font-bold tracking-wider">{{ $t('comune.home.total_orti') }}</div>
                      <div class="stat-value text-secondary text-2xl">{{ totalOrti }}</div>
                      <div class="stat-desc mt-1">{{ $t('comune.home.orti_managed') }}</div>
                  </div>
                  
                  <div class="stat bg-white shadow rounded-box border border-base-200 py-4">
                      <div class="stat-figure text-primary">
                          <Users class="w-8 h-8" />
                      </div>
                      <div class="stat-title text-xs uppercase font-bold tracking-wider">{{ $t('comune.home.associations') }}</div>
                      <div class="stat-value text-primary text-2xl">{{ totalAssociazioni }}</div>
                      <div class="stat-desc mt-1">{{ $t('comune.home.associations_active') }}</div>
                  </div>

                  <div class="stat bg-white shadow rounded-box border border-base-200 py-4">
                      <div class="stat-figure text-error">
                          <AlertTriangle class="w-8 h-8" />
                      </div>
                      <div class="stat-title text-xs uppercase font-bold tracking-wider">{{ $t('comune.home.to_assign') }}</div>
                      <div class="stat-value text-2xl" :class="ortiNonAssegnati > 0 ? 'text-error' : 'text-success'">
                          {{ ortiNonAssegnati }}
                      </div>
                      <div class="stat-desc mt-1">{{ $t('comune.home.orti_available') }}</div>
                  </div>
              </div>

              <div class="bg-white shadow-md rounded-xl border border-base-200 overflow-hidden">
                  
                  <div class="p-4 border-b border-base-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div class="flex items-center gap-2 w-full md:w-auto flex-wrap">
                          <h2 class="text-lg font-bold text-gray-700 mr-4">{{ $t('comune.home.orti_list') }}</h2>
                          
                          <div class="form-control">
                              <div class="input-group">
                                  <input 
                                      type="text" 
                                      :placeholder="$t('comune.home.search_placeholder')" 
                                      class="input input-bordered input-sm w-full max-w-xs" 
                                      v-model="searchQuery" 
                                  />
                                  <button v-if="searchQuery" class="btn btn-sm btn-square" @click="searchQuery = ''">
                                      <X class="w-4 h-4" />
                                  </button>
                              </div>
                          </div>

                          <select class="select select-bordered select-sm" v-model="filterStatus">
                              <option value="all">{{ $t('comune.home.all_status') }}</option>
                              <option value="free">{{ $t('comune.home.only_free') }}</option>
                              <option value="assigned">{{ $t('comune.home.only_assigned') }}</option>
                          </select>
                      </div>

                      <div class="flex gap-2">
                          <router-link to="/comune/mappa" class="btn btn-outline btn-sm gap-2">
                               <Map class="w-4 h-4" /> {{ $t('comune.home.map') }}
                          </router-link>
                      </div>
                  </div>

                  <div class="overflow-x-auto w-full">
                      <table class="table w-full">
                          <thead class="bg-base-100 text-gray-600">
                              <tr>
                                  <th>{{ $t('comune.home.orto_address') }}</th>
                                  <th class="text-center">{{ $t('comune.home.capacity') }}</th>
                                  <th>{{ $t('comune.home.status') }}</th>
                                  <th>{{ $t('comune.home.current_management') }}</th>
                                  <th class="text-right">{{ $t('comune.home.actions') }}</th>
                              </tr>
                          </thead>
                          <tbody>
                              <tr v-for="orto in paginatedOrti" :key="orto._id || orto.id" class="hover:bg-base-50">
                                  
                                  <td>
                                      <div class="flex items-center space-x-3">
                                          <div class="avatar placeholder">
                                              <div class="bg-green-100 text-green-700 rounded-full w-10 h-10 flex items-center justify-center">
                                                  <Sprout class="w-6 h-6" />
                                              </div>
                                          </div>
                                          <div>
                                              <div class="font-bold text-gray-700">{{ orto.nome }}</div>
                                              <div class="text-xs text-gray-500">{{ orto.indirizzo }}</div>
                                          </div>
                                      </div>
                                  </td>

                                  <td class="text-center">
                                      <span class="font-mono font-bold text-lg">{{ orto.lotti ? orto.lotti.length : 0 }}</span>
                                      <span class="text-xs text-gray-400 block">{{ $t('comune.home.lots') }}</span>
                                  </td>

                                  <td>
                                      <div class="badge gap-2" 
                                           :class="getCurrentAssignment(orto._id || orto.id) ? 'badge-success text-white' : 'badge-error text-white'">
                                           {{ getCurrentAssignment(orto._id || orto.id) ? $t('comune.home.assigned') : $t('comune.home.free') }}
                                      </div>
                                  </td>

                                  <td>
                                      <div v-if="getCurrentAssignment(orto._id || orto.id)">
                                          <div class="font-semibold text-sm">{{ getAssociazioneName(orto._id || orto.id) }}</div>
                                          <div class="text-xs text-gray-500">
                                              {{ $t('comune.home.expires') }} {{ formatDate(getCurrentAssignment(orto._id || orto.id).data_fine) }}
                                          </div>
                                      </div>
                                      <div v-else class="text-gray-400 text-sm italic">
                                          {{ $t('comune.home.no_manager') }}
                                      </div>
                                  </td>

                                  <td class="text-right">
                                      <button class="btn btn-ghost btn-xs mr-2 gap-1" @click="openDetailsModal(orto)">
                                          <Eye class="w-3 h-3" /> {{ $t('comune.home.details') }}
                                      </button>
                                  </td>
                              </tr>

                              <tr v-if="paginatedOrti.length === 0">
                                  <td colspan="5" class="text-center py-8 text-gray-500">
                                      <div class="flex flex-col items-center gap-2">
                                          <Search class="w-8 h-8 opacity-50" />
                                          <span>{{ $t('comune.home.no_orti_found') }}</span>
                                      </div>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>

                  <div class="p-4 border-t border-base-200 flex justify-between items-center bg-gray-50">
                      <span class="text-xs text-gray-500">
                          {{ $t('comune.home.showing', { count: paginatedOrti.length, total: filteredOrti.length }) }}
                      </span>
                      <div class="btn-group">
                          <button class="btn btn-sm" :disabled="currentPage === 1" @click="currentPage--">«</button>
                          <button class="btn btn-sm no-animation bg-white hover:bg-white text-gray-700 cursor-default">
                              {{ $t('comune.home.page', { current: currentPage, total: totalPages || 1 }) }}
                          </button>
                          <button class="btn btn-sm" :disabled="currentPage >= totalPages" @click="currentPage++">»</button>
                      </div>
                  </div>
              </div>
          </template>

          <dialog class="modal" :class="{ 'modal-open': isDetailsModalOpen }">
              <div class="modal-box max-w-2xl">
                  <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeDetailsModal"><X class="w-4 h-4" /></button>
                  
                  <h3 class="font-bold text-2xl mb-4 text-secondary" v-if="selectedOrto">
                      {{ selectedOrto.nome }}
                  </h3>
                  
                  <div v-if="selectedOrto" class="space-y-4">
                      <div class="grid grid-cols-2 gap-4">
                          <div class="bg-base-100 p-4 rounded-lg">
                              <p class="text-xs text-gray-500 uppercase font-bold mb-1">{{ $t('comune.home.address') }}</p>
                              <p class="text-sm font-semibold">{{ selectedOrto.indirizzo }}</p>
                          </div>
                          <div class="bg-base-100 p-4 rounded-lg">
                              <p class="text-xs text-gray-500 uppercase font-bold mb-1">{{ $t('comune.home.municipality') }}</p>
                              <p class="text-sm font-semibold">{{ selectedOrto.comune || 'Trento' }}</p>
                          </div>
                          <div class="bg-base-100 p-4 rounded-lg">
                              <p class="text-xs text-gray-500 uppercase font-bold mb-1">{{ $t('comune.home.total_lots') }}</p>
                              <p class="text-2xl font-bold text-primary">{{ selectedOrto.lotti?.length || 0 }}</p>
                          </div>
                          <div class="bg-base-100 p-4 rounded-lg">
                              <p class="text-xs text-gray-500 uppercase font-bold mb-1">{{ $t('comune.home.status') }}</p>
                              <div class="badge badge-lg" :class="selectedAssignment ? 'badge-success' : 'badge-error'">
                                  {{ selectedAssignment ? $t('comune.home.assigned') : $t('comune.home.free') }}
                              </div>
                          </div>
                      </div>

                      <div v-if="selectedAssignment" class="alert alert-success shadow-sm">
                          <div class="w-full">
                              <h4 class="font-bold text-lg mb-2">{{ $t('comune.home.active_assignment') }}</h4>
                              <div class="space-y-1">
                                  <p><span class="font-semibold">{{ $t('comune.home.association') }}</span> {{ getAssociazioneName(selectedOrto._id || selectedOrto.id) }}</p>
                                  <p><span class="font-semibold">{{ $t('comune.home.start_date') }}</span> {{ formatDate(selectedAssignment.data_inizio) }}</p>
                                  <p><span class="font-semibold">{{ $t('comune.home.expiry_date') }}</span> {{ formatDate(selectedAssignment.data_fine) }}</p>
                              </div>
                          </div>
                      </div>
                      
                      <div v-else class="alert alert-warning shadow-sm">
                          <div>
                              <h4 class="font-bold">{{ $t('comune.home.not_assigned') }}</h4>
                              <p class="text-sm">{{ $t('comune.home.orto_free_message') }}</p>
                          </div>
                      </div>
                  </div>

                  <div class="modal-action">
                      <button 
                          v-if="selectedOrto && !selectedAssignment" 
                          class="btn btn-secondary text-white"
                          @click="goToAssegna(selectedOrto._id || selectedOrto.id)">
                          {{ $t('comune.home.assign_orto') }}
                      </button>
                      <button class="btn" @click="closeDetailsModal">{{ $t('comune.home.close') }}</button>
                  </div>
              </div>
              <div class="modal-backdrop bg-black bg-opacity-50" @click="closeDetailsModal"></div>
          </dialog>

      </div>
  </div>
</template>
