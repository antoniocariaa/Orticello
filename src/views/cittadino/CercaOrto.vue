<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '../../services/api'
import { store } from '../../store'
import "leaflet/dist/leaflet.css"
import { LMap, LTileLayer, LMarker, LPopup, LIcon } from "@vue-leaflet/vue-leaflet"
import L from 'leaflet'
import { Search, Map, List, MapPin, Info, Check, X } from 'lucide-vue-next'

const { t } = useI18n()

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
        
        return lottoId 
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

const allAffidamenti = ref([])

const fetchAllAffidamenti = async () => {
    try {
        const response = await api.get('/affidaLotti')
        allAffidamenti.value = Array.isArray(response) ? response : (response.data || [])
    } catch (e) {
        console.error('Failed to fetch affidaLotti', e)
    }
}

const hasRequested = (lottoId) => {
    const id = typeof lottoId === 'object' ? (lottoId._id || lottoId.id) : lottoId
    const userId = store.user?._id || store.user?.id
    
    if (!userId) return false

    return allAffidamenti.value.some(a => {
        if (!a.utente || !a.lotto) return false
        
        const assignedLottoId = typeof a.lotto === 'object' ? (a.lotto._id || a.lotto.id) : a.lotto
        const assignedUserId = typeof a.utente === 'object' ? (a.utente._id || a.utente.id) : a.utente
        
        // Check if it's my request (pending or accepted)
        return assignedLottoId === id && assignedUserId === userId
    })
}

const isLottoOccupied = (lottoId) => {
    const id = typeof lottoId === 'object' ? (lottoId._id || lottoId.id) : lottoId
    return allAffidamenti.value.some(a => {
        if (!a.lotto) return false
        
        const assignedLottoId = typeof a.lotto === 'object' ? (a.lotto._id || a.lotto.id) : a.lotto
        // It is occupied if status is accepted
        // Note: The model has enum ["pending", "accepted", "rejected"]
        return assignedLottoId === id && a.stato === 'accepted'
    })
}

onMounted(async () => {
    await Promise.all([fetchOrti(), fetchAffidamenti(), fetchAssociazioni(), fetchAllAffidamenti()])
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

const userHasActiveLotto = computed(() => {
    const userId = store.user?._id || store.user?.id
    if (!userId) return false

    return allAffidamenti.value.some(a => {
        if (!a.utente) return false
        
        const assignedUserId = typeof a.utente === 'object' ? (a.utente._id || a.utente.id) : a.utente
        return String(assignedUserId) === String(userId) && a.stato === 'accepted'
    })
})

// Trova l'affidamento attivo del cittadino
const myActiveLottoAssignment = computed(() => {
    const userId = store.user?._id || store.user?.id
    if (!userId) return null

    return allAffidamenti.value.find(a => {
        if (!a.utente) return false
        const assignedUserId = typeof a.utente === 'object' ? (a.utente._id || a.utente.id) : a.utente
        return String(assignedUserId) === String(userId) && a.stato === 'accepted'
    })
})

// Verifica se un orto contiene il lotto del cittadino
const isMyOrto = (orto) => {
    if (!myActiveLottoAssignment.value) return false
    
    const myLottoId = typeof myActiveLottoAssignment.value.lotto === 'object' 
        ? (myActiveLottoAssignment.value.lotto._id || myActiveLottoAssignment.value.lotto.id)
        : myActiveLottoAssignment.value.lotto
    
    return orto.lotti?.some(lotto => {
        const lottoId = typeof lotto === 'object' ? (lotto._id || lotto.id) : lotto
        return String(lottoId) === String(myLottoId)
    })
}

// Ottieni solo il lotto del cittadino da un orto
const getMyLottoFromOrto = (orto) => {
    if (!myActiveLottoAssignment.value) return null
    
    const myLottoId = typeof myActiveLottoAssignment.value.lotto === 'object' 
        ? (myActiveLottoAssignment.value.lotto._id || myActiveLottoAssignment.value.lotto.id)
        : myActiveLottoAssignment.value.lotto
    
    return orto.lotti?.find(lotto => {
        const lottoId = typeof lotto === 'object' ? (lotto._id || lotto.id) : lotto
        return String(lottoId) === String(myLottoId)
    })
}

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
             showToast(t('search.user_not_identified_toast'), 'error')
             return
        }

        const payload = {
            lotto: lottoId,
            utente: user._id || user.id
        }
        
        // Optimistic UI update or just feedback
        await api.post('/affidaLotti', payload)
        
        showToast(t('search.request_sent_toast', { name: orto.nome }), 'success')
        await fetchAllAffidamenti() // Refresh requests to update UI
        isDetailsModalOpen.value = false
    } catch (e) {
        console.error('Request failed', e)
        showToast(t('search.error_request_toast'), 'error')
    }
}

const checkAndRequest = (lotto, orto) => {
    // Check if I already requested THIS lotto
    if (hasRequested(lotto)) {
         showToast(t('search.already_requested_toast'), 'warning')
         return
    }

    // Check if I already have ANY accepted lotto (One Orto Rule)
    const userId = store.user?._id || store.user?.id
    if (!userId) return

    const hasActiveAssignment = allAffidamenti.value.some(a => {
        if (!a.utente) return false
        
        const assignedUserId = typeof a.utente === 'object' ? (a.utente._id || a.utente.id) : a.utente
        // Check if it's me AND it's accepted
        return String(assignedUserId) === String(userId) && a.stato === 'accepted'
    })

    if (hasActiveAssignment) {
        showToast(t('search.already_have_lot_toast'), 'warning')
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
               <h1 class="text-3xl font-bold text-primary flex items-center gap-2">
                {{ $t('search.title') }} <Search class="w-8 h-8" />
               </h1>
               <p class="text-sm opacity-70">{{ $t('search.subtitle') }}</p>
               
               <div class="flex flex-wrap gap-4 items-center">
                   <!-- Legend -->
                    <div class="flex gap-4 text-xs font-medium bg-base-100 p-2 rounded-lg shadow-sm">
                        <div class="flex items-center gap-1">
                            <span class="w-3 h-3 rounded-full bg-green-500"></span> {{ $t('search.legend_available') }}
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="w-3 h-3 rounded-full bg-blue-500"></span> {{ $t('search.legend_your_garden') }}
                        </div>
                        <div class="flex items-center gap-1" v-if="myAssociazioneId">
                            <span class="w-3 h-3 rounded-full bg-red-500"></span> {{ $t('search.legend_occupied') }}
                        </div>
                    </div>

                    <!-- View Toggle -->
                    <div class="join shadow-sm">
                        <button 
                            class="btn btn-sm join-item" 
                            :class="viewMode === 'map' ? 'btn-active btn-neutral' : 'bg-base-100'"
                            @click="viewMode = 'map'"
                        >
                            <Map class="w-4 h-4 mr-1" /> {{ $t('search.view_map') }}
                        </button>
                        <button 
                            class="btn btn-sm join-item" 
                            :class="viewMode === 'list' ? 'btn-active btn-neutral' : 'bg-base-100'"
                            @click="viewMode = 'list'"
                        >
                            <List class="w-4 h-4 mr-1" /> {{ $t('search.view_list') }}
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
                v-for="orto in filteredOrti.filter(o => o.geometry?.coordinates?.[0] && o.geometry?.coordinates?.[1])" 
                :key="orto._id || orto.id"
                :lat-lng="[orto.geometry.coordinates[1], orto.geometry.coordinates[0]]"
            >
                <l-icon 
                    :icon-url="isMyOrto(orto) ? blueIcon.options.iconUrl : (getStatus(orto._id || orto.id) === 'mine' ? blueIcon.options.iconUrl : greenIcon.options.iconUrl)"
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
                             <MapPin class="w-3 h-3" /> {{ orto.indirizzo }}
                        </p>

                        <div v-if="getStatus(orto._id || orto.id) === 'mine'" class="badge badge-info text-white mb-2">{{ $t('search.your_assoc') }}</div>
                        <div v-else-if="isMyOrto(orto)" class="badge badge-info text-white mb-2">{{ $t('search.legend_your_garden') }}</div>
                        <div v-else class="badge badge-success text-white mb-2">{{ $t('search.legend_available') }}</div>
                        
                        <div class="flex gap-2 items-stretch mt-1 mb-2">
                            <div class="alert alert-sm bg-base-200 p-2 flex-1 flex items-center gap-1">
                                 <span class="text-xs">{{ $t('search.managed_by_label') }}</span>
                                 <span class="font-semibold text-sm">{{ getAssociazioneName(getAssignment(orto._id || orto.id)) }}</span>
                            </div>
                            <div v-if="userHasActiveLotto" class="tooltip tooltip-left" :data-tip="$t('search.active_request_tooltip')">
                                <div class="alert alert-sm bg-base-200 p-2 h-full flex items-center justify-center cursor-help min-w-[2.5rem]">
                                    <Info class="w-5 h-5 text-warning" />
                                </div>
                            </div>
                        </div>
                        
                        <!-- Lotti Details (solo se l'utente NON ha già un lotto) -->
                        <div v-if="!userHasActiveLotto">
                            <div class="divider my-1">{{ $t('search.lots') }}</div>
                            <div class="max-h-[200px] overflow-y-auto space-y-2">
                                <div v-if="!orto.lotti || orto.lotti.length === 0" class="text-xs italic opacity-50">{{ $t('search.no_lots') }}</div>
                                <div v-for="(lotto, idx) in orto.lotti" :key="idx" class="bg-base-100 p-2 rounded text-xs border border-base-200 shadow-sm">
                                    <div class="flex justify-between items-start mb-1">
                                        <div class="font-bold">{{ $t('search.lot_num', { number: idx + 1 }) }}</div>
                                        <div class="badge badge-neutral badge-xs">{{ getLottoData(lotto).dimensione }} mq</div>
                                    </div>
                                    <div class="mb-2 flex justify-between items-center bg-base-100 rounded p-1">
                                        <span class="flex items-center gap-1">{{ $t('search.sensors_label') }}<Check v-if="getLottoData(lotto).sensori" class="w-3 h-3 text-success" /><X v-else class="w-3 h-3 text-error" /></span>
                                        <span v-if="isLottoOccupied(lotto)" class="badge badge-error badge-xs">{{ $t('search.legend_occupied') }}</span>
                                    </div>
                                    <button 
                                        v-if="!isLottoOccupied(lotto)"
                                        @click="checkAndRequest(lotto, orto)"
                                        class="btn btn-xs w-full"
                                        :class="hasRequested(lotto) ? 'btn-neutral opacity-50' : 'btn-primary'"
                                    >
                                        {{ $t('search.request') }}
                                    </button>
                                    <button v-else class="btn btn-xs btn-disabled w-full opacity-50">
                                        {{ $t('search.not_available') }}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <!-- Se è il suo orto, mostra solo il suo lotto -->
                        <div v-else-if="isMyOrto(orto)">
                            <div class="divider my-1">{{ $t('search.your_lot') }}</div>
                            <div class="bg-blue-50 p-2 rounded text-xs border border-blue-200 shadow-sm">
                                <div class="flex justify-between items-start mb-1">
                                    <div class="font-bold text-blue-800">{{ $t('search.your_lot') }}</div>
                                    <div class="badge badge-info badge-xs">{{ getLottoData(getMyLottoFromOrto(orto)).dimensione }} mq</div>
                                </div>
                                <div class="mb-2 flex justify-between items-center text-blue-800">
                                    <span class="flex items-center gap-1">{{ $t('search.sensors_label') }}<Check v-if="getLottoData(getMyLottoFromOrto(orto)).sensori" class="w-3 h-3 text-success" /><X v-else class="w-3 h-3 text-error" /></span>
                                    <span class="badge badge-success badge-xs">{{ $t('search.assigned_badge') }}</span>
                                </div>
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
                    <span v-if="getStatus(orto._id || orto.id) === 'mine'" class="badge badge-info text-white">{{ $t('search.your_assoc') }}</span>
                    <span v-else class="badge badge-success text-white">{{ $t('search.legend_available') }}</span>
                </div>

                <!-- Title -->
                <h2 class="card-title text-primary mb-2">
                    {{ orto.nome }}
                </h2>

                <!-- Address -->
                <div class="flex items-start gap-2 text-sm text-gray-600 mb-3">
                    <MapPin class="w-4 h-4 mt-0.5" />
                    <span>{{ orto.indirizzo }}</span>
                </div>

                 <!-- Association -->
                <div class="mb-3 p-2 bg-base-200 rounded text-sm">
                     <span class="text-xs opacity-70">{{ $t('search.managed_by_label') }}</span>
                     <div class="font-medium truncate">
                         {{ getAssociazioneName(getAssignment(orto._id || orto.id)) }}
                     </div>
                </div>

                <!-- Size Info & Details Button -->
                <div class="mb-4 flex-grow">
                     <div v-if="userHasActiveLotto" class="flex items-center justify-center gap-2 p-3 bg-base-200 rounded-lg">
                         <div class="tooltip" :data-tip="$t('search.active_request_tooltip')">
                             <Info class="w-6 h-6 text-warning cursor-help" />
                         </div>
                         <span class="text-xs opacity-70 text-center">{{ $t('search.no_lots_available') }}</span>
                     </div>
                     <div v-else class="flex flex-col gap-2">
                         <div class="flex justify-between items-center text-sm font-medium">
                             <span>{{ $t('search.total_size') }}</span>
                             <span class="badge badge-neutral">{{ getTotalSize(orto) }} mq</span>
                         </div>
                         <div class="flex justify-between items-center text-sm font-medium opacity-70">
                             <span>{{ $t('search.lots_count') }}</span>
                             <span>{{ orto.lotti?.length || 0 }}</span>
                         </div>
                     
                         <button @click="openDetailsModal(orto)" class="btn btn-sm btn-outline w-full mt-4 gap-2">
                             <Search class="w-4 h-4" /> {{ $t('search.details_lots') }}
                         </button>
                     </div>
                </div>
            </div>
          </div>
          
           <div v-if="filteredOrti.length === 0" class="col-span-full text-center py-10 opacity-50">
              {{ $t('search.no_orti_available') }}
          </div>
      </div>

      <!-- Details Modal -->
      <dialog class="modal" :class="{ 'modal-open': isDetailsModalOpen }">
          <div class="modal-box">
              <h3 class="font-bold text-lg mb-4" v-if="selectedOrto">
                  {{ $t('search.lots_in', { name: selectedOrto.nome }) }}
              </h3>
              
              <div v-if="selectedOrto" class="overflow-x-auto">
                <table class="table table-sm w-full">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>{{ $t('home.dimension') }}</th>
                            <th>{{ $t('home.sensors') }}</th>
                            <th>{{ $t('general.actions') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(lotto, idx) in selectedOrto.lotti" :key="idx" class="hover">
                            <th>{{ idx + 1 }}</th>
                            <td>{{ getLottoData(lotto).dimensione }} mq</td>
                            <td>
                                <span v-if="getLottoData(lotto).sensori" class="text-success flex items-center gap-1">
                                    <Check class="w-4 h-4 mr-1" />
                                    {{ $t('general.yes') }}
                                </span>
                                <span v-else class="text-gray-400 flex items-center gap-1"><X class="w-4 h-4" /> {{ $t('general.no') }}</span>
                            </td>
                            <td>
                                <button
                                    v-if="!isLottoOccupied(lotto)" 
                                    class="btn btn-xs"
                                    :class="hasRequested(lotto) ? 'btn-neutral opacity-50' : 'btn-primary'"
                                    @click="checkAndRequest(lotto, selectedOrto)"
                                >
                                    {{ $t('search.request') }}
                                </button>
                                <span v-else class="badge badge-error badge-xs">{{ $t('search.legend_occupied') }}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
             </div>

              <div class="modal-action">
                  <button class="btn" @click="isDetailsModalOpen = false">{{ $t('general.close') }}</button>
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