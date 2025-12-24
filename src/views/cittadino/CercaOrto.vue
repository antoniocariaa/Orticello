<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../../services/api'
import { store } from '../../store'
import "leaflet/dist/leaflet.css"
import { LMap, LTileLayer, LMarker, LPopup, LIcon } from "@vue-leaflet/vue-leaflet"
import L from 'leaflet'

const zoom = ref(13)
const center = ref([46.06787, 11.12108]) // Trento
const orti = ref([])
const affidamenti = ref([])
const associazioni = ref([]) 
const lottiDetails = ref({}) // Cache for lotti details: { lottoId: lottoData }

// Icons
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const fetchOrti = async () => {
    try {
        const response = await api.get('/orti')
        orti.value = Array.isArray(response) ? response : (response.data || [])
        await fetchAllLotti()
    } catch (e) {
        console.error('Failed to fetch orti', e)
    }
}

const fetchAllLotti = async () => {
    try {
        const response = await api.get('/lotti')
        const allLotti = Array.isArray(response) ? response : (response.data || [])
        
        // Create lookup map
        allLotti.forEach(lotto => {
            if (lotto._id) lottiDetails.value[lotto._id] = lotto
            if (lotto.id) lottiDetails.value[lotto.id] = lotto
        })
    } catch (e) {
        console.error('Failed to fetch all lotti', e)
    }
}

const getLottoData = (lottoId) => {
    // If lottoId is already an object use it
    if (typeof lottoId === 'object' && lottoId !== null) {
        // If it is populated return it
        if (lottoId.dimensione !== undefined) return lottoId
        
        // try to look up via ID
        const id = lottoId._id || lottoId.id
        if (id && lottiDetails.value[id]) return lottiDetails.value[id]
        
        return lottoId // Return as is if we can't improve it
    }
    
    // If string ID, look up
    return lottiDetails.value[lottoId] || { dimensione: 'N/A', sensori: false }
}

const fetchAffidamenti = async () => {
    try {
        const response = await api.get('/affidaOrti')
        affidamenti.value = Array.isArray(response) ? response : (response.data || [])
    } catch (e) {
        console.error('Failed to fetch affidamenti', e)
    }
}

const fetchAssociazioni = async () => {
    try {
        const response = await api.get('/associazioni')
        associazioni.value = Array.isArray(response) ? response : (response.data || [])
    } catch (e) {
        console.error('Failed to fetch associazioni', e)
    }
}

const userRequests = ref([])

const fetchUserRequests = async () => {
    try {
        const user = store.user
        if (!user || (!user.id && !user._id)) return
        
        const userId = user._id || user.id
        const response = await api.get(`/richiestaLotto?id_utente=${userId}`)
        userRequests.value = Array.isArray(response) ? response : (response.data || [])
    } catch (e) {
        console.error('Failed to fetch user requests', e)
    }
}

const hasRequested = (lottoId) => {
    const id = typeof lottoId === 'object' ? (lottoId._id || lottoId.id) : lottoId
    return userRequests.value.some(r => {
        const reqLottoId = typeof r.id_lotto === 'object' ? (r.id_lotto._id || r.id_lotto.id) : r.id_lotto
        return reqLottoId === id
    })
}

onMounted(async () => {
    await Promise.all([fetchOrti(), fetchAffidamenti(), fetchAssociazioni(), fetchUserRequests()])
})

const getAssignment = (ortoId) => {
    return affidamenti.value.find(a => (a.orto === ortoId || a.orto?._id === ortoId))
}

const getAssociazioneName = (assignment) => {
    if (!assignment) return null
    if (assignment.associazione && assignment.associazione.nome) return assignment.associazione.nome
    
    const assocId = assignment.associazione?._id || assignment.associazione
    const assoc = associazioni.value.find(a => (a._id || a.id) === assocId)
    return assoc ? assoc.nome : 'Associazione sconosciuta'
}

const myAssociazioneId = computed(() => {
    const user = store.user
    // For citizen, check if they belong to an association
    return user?.associazione || user?.id || user?._id
})

const getStatus = (ortoId) => {
    const assignment = getAssignment(ortoId)
    if (!assignment) return 'available'
    const assignedAssocId = assignment.associazione?._id || assignment.associazione
    if (assignedAssocId === myAssociazioneId.value) return 'mine'
    return 'other'
}

const filteredOrti = computed(() => {
    return orti.value.filter(orto => getStatus(orto._id || orto.id) !== 'available')
})

const getTotalSize = (orto) => {
    if (!orto.lotti) return 0
    return orto.lotti.reduce((acc, lotto) => {
        const data = getLottoData(lotto)
        return acc + (data.dimensione || 0)
    }, 0)
}

const selectedOrto = ref(null)
const isDetailsModalOpen = ref(false)

const openDetailsModal = (orto) => {
    selectedOrto.value = orto
    isDetailsModalOpen.value = true
}

const viewMode = ref('map') // 'map' or 'list'

const toast = ref({
    show: false,
    message: '',
    type: 'success'
})

const showToast = (message, type = 'success') => {
    toast.value = { show: true, message, type }
    setTimeout(() => {
        toast.value.show = false
    }, 3000)
}

const requestLotto = async (lotto, orto) => {
    try {
        const lottoId = lotto._id || lotto.id || lotto
        const user = store.user
        
        if (!user || (!user.id && !user._id)) {
             showToast('Errore: Utente non identificato. Effettua il login.', 'error')
             return
        }

        const payload = {
            id_lotto: lottoId,
            id_utente: user._id || user.id
        }
        
        // Optimistic UI update or just feedback
        await api.post('/richiestaLotto', payload)
        
        showToast(`Richiesta inviata per il lotto in ${orto.nome}`, 'success')
        await fetchUserRequests() // Refresh requests to update UI
        isDetailsModalOpen.value = false
    } catch (e) {
        console.error('Request failed', e)
        showToast('Errore durante la richiesta. Riprova più tardi.', 'error')
    }
}

const checkAndRequest = (lotto, orto) => {
    if (hasRequested(lotto)) {
         showToast('Richiesta già effettuata per questo Lotto', 'warning')
         return
    }
    requestLotto(lotto, orto)
}

</script>

<template>
  <div class="p-6 min-h-[calc(100vh-64px)] w-full flex flex-col items-center gap-4">
      
      <!-- Header -->
      <div class="flex justify-between w-full max-w-5xl items-end">
           <div class="flex flex-col gap-3">
               <h1 class="text-3xl font-bold text-primary">Cerca Orto</h1>
               <p class="text-sm opacity-70">Esplora gli orti disponibili e visualizza i dettagli</p>
               
               <div class="flex flex-wrap gap-4 items-center">
                   <!-- Legend -->
                    <div class="flex gap-4 text-xs font-medium bg-base-100 p-2 rounded-lg shadow-sm">
                        <div class="flex items-center gap-1">
                            <span class="w-3 h-3 rounded-full bg-green-500"></span> Disponibile
                        </div>
                        <div class="flex items-center gap-1" v-if="myAssociazioneId">
                            <span class="w-3 h-3 rounded-full bg-red-500"></span> Occupato
                        </div>
                    </div>

                    <!-- View Toggle -->
                    <div class="join shadow-sm">
                        <button 
                            class="btn btn-sm join-item" 
                            :class="viewMode === 'map' ? 'btn-active btn-neutral' : 'bg-base-100'"
                            @click="viewMode = 'map'"
                        >
                            🗺️ Mappa
                        </button>
                        <button 
                            class="btn btn-sm join-item" 
                            :class="viewMode === 'list' ? 'btn-active btn-neutral' : 'bg-base-100'"
                            @click="viewMode = 'list'"
                        >
                            📋 Lista
                        </button>
                    </div>
               </div>
           </div>
      </div>

    <!-- Map Card -->
    <div v-show="viewMode === 'map'" class="card bg-base-100 shadow-xl w-full max-w-5xl h-[600px] border border-base-200 overflow-hidden relative z-0">
        <l-map ref="map" v-model:zoom="zoom" :center="center" :use-global-leaflet="false">
            <l-tile-layer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              layer-type="base"
              name="OpenStreetMap"
            ></l-tile-layer>

            <l-marker 
                v-for="orto in filteredOrti" 
                :key="orto._id || orto.id" 
                :lat-lng="[orto.coordinate.lat, orto.coordinate.lng]"
            >
                <l-icon 
                    :icon-url="getStatus(orto._id || orto.id) === 'mine' ? blueIcon.options.iconUrl : greenIcon.options.iconUrl"
                    :shadow-url="greenIcon.options.shadowUrl"
                    :icon-size="greenIcon.options.iconSize"
                    :icon-anchor="greenIcon.options.iconAnchor"
                    :popup-anchor="greenIcon.options.popupAnchor"
                    :shadow-size="greenIcon.options.shadowSize"
                />

                <l-popup>
                    <div class="p-2 min-w-[250px]">
                        
                        <!-- Header -->
                        <h3 class="font-bold text-lg mb-1">{{ orto.nome }}</h3>
                        <p class="text-sm text-gray-600 mb-2 flex items-center gap-1">
                             📍 {{ orto.indirizzo }}
                        </p>

                        <div v-if="getStatus(orto._id || orto.id) === 'mine'" class="badge badge-info text-white mb-2">La tua Associazione</div>
                        <div v-else class="badge badge-success text-white mb-2">Disponibile</div>
                        
                        <div class="alert alert-sm bg-base-200 p-2 mt-1 mb-2">
                             <span class="text-xs">Gestito da:</span>
                             <div class="font-semibold text-sm">
                                 {{ getAssociazioneName(getAssignment(orto._id || orto.id)) }}
                             </div>
                        </div>
                        
                        <!-- Lotti Details -->
                        <div class="divider my-1">Lotti</div>
                        <div class="max-h-[200px] overflow-y-auto space-y-2">
                            <div v-if="!orto.lotti || orto.lotti.length === 0" class="text-xs italic opacity-50">Nessun lotto</div>
                            <div v-for="(lotto, idx) in orto.lotti" :key="idx" class="bg-base-100 p-2 rounded text-xs border border-base-200 shadow-sm">
                                <div class="flex justify-between items-start mb-1">
                                    <div class="font-bold">Lotto #{{ idx + 1 }}</div>
                                    <div class="badge badge-neutral badge-xs">{{ getLottoData(lotto).dimensione }} mq</div>
                                </div>
                                <div class="mb-2">Sensori: {{ getLottoData(lotto).sensori ? '✅' : '❌' }}</div>
                                <button 
                                    @click="checkAndRequest(lotto, orto)"
                                    class="btn btn-xs w-full"
                                    :class="hasRequested(lotto) ? 'btn-neutral opacity-50' : 'btn-primary'"
                                >
                                    Richiedi
                                </button>
                            </div>
                        </div>

                    </div>
                </l-popup>
            </l-marker>
        </l-map>
    </div>

    <!-- List View -->
      <div v-if="viewMode === 'list'" class="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
          <div v-for="orto in filteredOrti" :key="orto._id || orto.id" class="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow">
            <div class="card-body p-6 h-full flex flex-col">
                <!-- Status Badge -->
                <div class="mb-2">
                    <span v-if="getStatus(orto._id || orto.id) === 'mine'" class="badge badge-info text-white">La tua Associazione</span>
                    <span v-else class="badge badge-success text-white">Disponibile</span>
                </div>

                <!-- Title -->
                <h2 class="card-title text-primary mb-2">
                    {{ orto.nome }}
                </h2>

                <!-- Address -->
                <div class="flex items-start gap-2 text-sm text-gray-600 mb-3">
                    <span class="text-base">📍</span>
                    <span>{{ orto.indirizzo }}</span>
                </div>

                 <!-- Association -->
                <div class="mb-3 p-2 bg-base-200 rounded text-sm">
                     <span class="text-xs opacity-70">Gestito da:</span>
                     <div class="font-medium truncate">
                         {{ getAssociazioneName(getAssignment(orto._id || orto.id)) }}
                     </div>
                </div>

                <!-- Size Info & Details Button -->
                <div class="mb-4 flex-grow">
                     <div class="flex flex-col gap-2">
                         <div class="flex justify-between items-center text-sm font-medium">
                             <span>Dimensione Totale:</span>
                             <span class="badge badge-neutral">{{ getTotalSize(orto) }} mq</span>
                         </div>
                         <div class="flex justify-between items-center text-sm font-medium opacity-70">
                             <span>Lotti:</span>
                             <span>{{ orto.lotti?.length || 0 }}</span>
                         </div>
                     </div>
                     
                     <button @click="openDetailsModal(orto)" class="btn btn-sm btn-outline w-full mt-4">
                         🔍 Visualizza e Richiedi
                     </button>
                </div>
            </div>
          </div>
          
           <div v-if="filteredOrti.length === 0" class="col-span-full text-center py-10 opacity-50">
              Nessun orto disponibile al momento.
          </div>
      </div>

      <!-- Details Modal -->
      <dialog class="modal" :class="{ 'modal-open': isDetailsModalOpen }">
          <div class="modal-box">
              <h3 class="font-bold text-lg mb-4" v-if="selectedOrto">
                  Lotti in {{ selectedOrto.nome }}
              </h3>
              
              <div v-if="selectedOrto" class="overflow-x-auto">
                <table class="table table-sm w-full">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Dimensione</th>
                            <th>Sensori</th>
                            <th>Azione</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(lotto, idx) in selectedOrto.lotti" :key="idx" class="hover">
                            <th>{{ idx + 1 }}</th>
                            <td>{{ getLottoData(lotto).dimensione }} mq</td>
                            <td>
                                <span v-if="getLottoData(lotto).sensori" class="text-success flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                    </svg>
                                    Sì
                                </span>
                                <span v-else class="text-gray-400">No</span>
                            </td>
                            <td>
                                <button 
                                    class="btn btn-xs"
                                    :class="hasRequested(lotto) ? 'btn-neutral opacity-50' : 'btn-primary'"
                                    @click="checkAndRequest(lotto, selectedOrto)"
                                >
                                    Richiedi
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
             </div>

              <div class="modal-action">
                  <button class="btn" @click="isDetailsModalOpen = false">Chiudi</button>
              </div>
          </div>
          <form method="dialog" class="modal-backdrop">
                <button @click="isDetailsModalOpen = false">close</button>
          </form>
      </dialog>



      <!-- Toast Notification -->
      <div v-if="toast.show" class="toast toast-end">
          <div class="alert" :class="{
              'alert-error': toast.type === 'error',
              'alert-warning': toast.type === 'warning',
              'alert-success': toast.type === 'success'
          }">
            <span>{{ toast.message }}</span>
          </div>
      </div>
  </div>
</template>
