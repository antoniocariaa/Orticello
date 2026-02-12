<script setup>
import { ref, onMounted} from 'vue'
import api from '../../services/api'
import "leaflet/dist/leaflet.css"
import { LMap, LTileLayer, LMarker, LPopup, LIcon } from "@vue-leaflet/vue-leaflet"
import L from 'leaflet'
import { Map, List, Plus, MapPin, Pencil, Handshake, Trash2 } from 'lucide-vue-next'

const zoom = ref(13)
const center = ref([46.06787, 11.12108]) // Coordinate Trento
const orti = ref([])
const affidamenti = ref([])

const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref(null)
const loading = ref(false)
const associazioni = ref([])
const isSelectingCoordinates = ref(false)

const form = ref({
  nome: '',
  indirizzo: '',
  lat: '',
  lng: '',
  lotti: [],
  associazione: '',
  data_inizio: '',
  data_fine: ''
})

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

const fetchOrti = async () => {
    try {
        const response = await api.get('/orti')
        orti.value = Array.isArray(response) ? response : (response.data || [])
    } catch (e) {
        console.error('Failed to fetch orti', e)
    }
}

const fetchAffidamenti = async () => {
    try {
        const response = await api.get('/affidaOrti/active')
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

const isAssigned = (ortoId) => {
    // Check if there is an active assignment for this orto
    return affidamenti.value.some(a => (a.orto === ortoId || a.orto?._id === ortoId))
}

onMounted(async () => {
    await Promise.all([fetchOrti(), fetchAffidamenti(), fetchAssociazioni()])
})

const viewMode = ref('map') // 'map' or 'list'

const openAddModal = () => {
    isEditMode.value = false
    editingId.value = null
    form.value = { nome: '', indirizzo: '', lat: '', lng: '', lotti: [], associazione: '', data_inizio: '', data_fine: '' }
    isModalOpen.value = true
    isSelectingCoordinates.value = false
}

const openEditModal = async (orto) => {
    isEditMode.value = true
    editingId.value = orto._id || orto.id
    loading.value = true
    isSelectingCoordinates.value = false

    try {
        const assignment = affidamenti.value.find(a => (a.orto === editingId.value || a.orto?._id === editingId.value))
        
        // Prepare base form data
        // Extract lat/lng from GeoJSON geometry.coordinates [longitude, latitude]
        const lng = orto.geometry?.coordinates?.[0] || ''
        const lat = orto.geometry?.coordinates?.[1] || ''
        
        form.value = {
            nome: orto.nome,
            indirizzo: orto.indirizzo,
            lat: lat,
            lng: lng,
            lotti: [], // placeholder
            associazione: assignment ? (assignment.associazione?._id || assignment.associazione) : '',
            data_inizio: assignment ? (assignment.data_inizio?.split('T')[0]) : '',
            data_fine: assignment ? (assignment.data_fine?.split('T')[0]) : ''
        }

        // Get initial lotti data 
        let lottiData = orto.lotti || []
        
        if (lottiData.length > 0 && typeof lottiData[0] === 'string') {
            try {
                const fullOrto = await api.get(`/orti/${editingId.value}`)
                
                if (fullOrto && fullOrto.lotti && fullOrto.lotti.length > 0 && typeof fullOrto.lotti[0] !== 'string') {
                    lottiData = fullOrto.lotti
                } else {
                    const lottiPromises = lottiData.map(id => api.get(`/lotti/${id}`))
                    const lottiResults = await Promise.all(lottiPromises)
                     lottiData = lottiResults.map((res, index) => {
                        const data = res.data || res
                        if (!data._id && !data.id) {
                             data._id = lottiData[index] 
                        }
                        return data
                    })
                }
            } catch (err) {
                 console.error('Failed to fetch detailed Lotti data', err)
            }
        }
        
        form.value.lotti = JSON.parse(JSON.stringify(lottiData))

    } catch (e) {
        console.error('Error preparing edit form', e)
        showToast('Errore nel caricamento dei dati: ' + e.message, 'error')
    } finally {
        loading.value = false
        isModalOpen.value = true
    }
}

const addLotto = () => {
  form.value.lotti.push({ dimensione: 10, sensori: false })
}

const removeLotto = (index) => {
  form.value.lotti.splice(index, 1)
}

// Toast State
const toast = ref({
    show: false,
    message: '',
    type: 'success'
})

const showToast = (message, type = 'success', time = 3000) => {
    toast.value = { show: true, message, type }
    setTimeout(() => {
        toast.value.show = false
    }, time)
}

const onMapClick = (event) => {
    if (isSelectingCoordinates.value) {
        form.value.lat = event.latlng.lat.toFixed(6)
        form.value.lng = event.latlng.lng.toFixed(6)
        isSelectingCoordinates.value = false
        showToast('Coordinate selezionate dalla mappa', 'success')
        isModalOpen.value = true;
    }
}

const toggleCoordinateSelection = () => {
    isSelectingCoordinates.value = !isSelectingCoordinates.value
    if (isSelectingCoordinates.value) {
        showToast('Clicca sulla mappa per selezionare le coordinate', 'success')
        isModalOpen.value = false;
    }
}

const getAssociazioneName = (ortoId) => {
    const assignment = affidamenti.value.find(a => (a.orto === ortoId || a.orto?._id === ortoId))
    if (!assignment) return null
    
    // Check if associazione is populated
    if (assignment.associazione && assignment.associazione.nome) {
        return assignment.associazione.nome
    }
    
    // If only ID, find in associazioni list
    const assocId = assignment.associazione?._id || assignment.associazione
    const assoc = associazioni.value.find(a => (a._id || a.id) === assocId)
    return assoc ? assoc.nome : 'Associazione sconosciuta'
}

const saveOrto = async () => {
    loading.value = true
    try {
        //Handle Lotti (Create new ones or Update existing)
        const lottiIds = []
        for (const lotto of form.value.lotti) {
            if (lotto._id || lotto.id) {
                // Update existing Lotto
                const id = lotto._id || lotto.id
                await api.put(`/lotti/${id}`, {
                    dimensione: lotto.dimensione,
                    sensori: lotto.sensori
                })
                lottiIds.push(id)
            } else {
                // Create new Lotto
                 const lottoResponse = await api.post('/lotti', {
                    dimensione: lotto.dimensione,
                    sensori: lotto.sensori
                })
                if (lottoResponse._id) lottiIds.push(lottoResponse._id)
                else if (lottoResponse.id) lottiIds.push(lottoResponse.id)
            }
        }

        const ortoPayload = {
            nome: form.value.nome,
            indirizzo: form.value.indirizzo,
            geometry: {
                type: 'Point',
                coordinates: [parseFloat(form.value.lng), parseFloat(form.value.lat)] // GeoJSON format: [longitude, latitude]
            },
            lotti: lottiIds
        }

        let ortoId = editingId.value

        if (isEditMode.value) {
             await api.put(`/orti/${ortoId}`, ortoPayload)
        } else {
            const ortoResponse = await api.post('/orti', ortoPayload)
            ortoId = ortoResponse._id || ortoResponse.data?._id || ortoResponse.id
        }

        // Handle Association / AffidaOrto
         if (form.value.associazione) {
            if (!form.value.data_inizio || !form.value.data_fine) {
                throw new Error('Date inizio e fine obbligatorie per assegnare un\'associazione')
            }

            const existingAssignment = affidamenti.value.find(a => (a.orto === ortoId || a.orto?._id === ortoId))
            if(existingAssignment && isEditMode) {
                // Update existing assignment
                await api.put(`/affidaOrti/${existingAssignment._id || existingAssignment.id}`, {
                    orto: ortoId,
                    associazione: form.value.associazione,
                    data_inizio: form.value.data_inizio,
                    data_fine: form.value.data_fine
                })
            } else {
                // New assignment
                await api.post('/affidaOrti/', {
                    orto: ortoId,
                    associazione: form.value.associazione,
                    data_inizio: form.value.data_inizio,
                    data_fine: form.value.data_fine
                })
            }
        }
        
        isModalOpen.value = false
        showToast(isEditMode.value ? 'Orto modificato con successo!' : 'Orto creato con successo!', 'success')
        
        await Promise.all([fetchOrti(), fetchAffidamenti()])
    } catch (e) {
        console.error(e)
        showToast('Errore durante il salvataggio: ' + e.message, 'error')
    } finally {
        loading.value = false
    }
}
</script>

<template>
  <div class="p-6 min-h-[calc(100vh-64px)] w-full flex flex-col items-center gap-4">
      
      <div class="flex flex-col md:flex-row justify-between w-full max-w-5xl items-start md:items-end gap-4">
          <div class="flex flex-col gap-3 w-full md:w-auto">
              <h1 class="text-3xl font-bold text-primary">Orti a Trento</h1>
              
              <div class="flex flex-wrap gap-4 items-center">
                  <!-- Legend -->
                    <div class="flex gap-4 text-xs font-medium bg-base-100 p-2 rounded-lg shadow-sm">
                        <div class="flex items-center gap-1">
                            <span class="w-3 h-3 rounded-full bg-red-500"></span> Assegnato
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="w-3 h-3 rounded-full bg-green-500"></span> Libero
                        </div>
                    </div>
                  <!-- Toggle View -->
                  <div class="join">
                    <button 
                        class="btn btn-sm join-item" 
                        :class="viewMode === 'map' ? 'btn-active btn-neutral' : ''"
                        @click="viewMode = 'map'"
                    >
                       <Map class="w-4 h-4 mr-1" /> Mappa
                    </button>
                    <button 
                        class="btn btn-sm join-item" 
                        :class="viewMode === 'list' ? 'btn-active btn-neutral' : ''"
                        @click="viewMode = 'list'"
                    >
                      <List class="w-4 h-4 mr-1" /> Lista
                    </button>
                  </div>
              </div>
          </div>
          <button @click="openAddModal" class="btn btn-primary gap-2 w-full md:w-auto">
             <Plus class="w-5 h-5" /> Aggiungi Orto
          </button>
      </div>

      <!-- Map View -->
      <div v-show="viewMode === 'map'" class="card bg-base-100 shadow-xl w-full max-w-5xl h-[600px] border border-base-200 overflow-hidden relative z-0" :class="{ 'ring-4 ring-success ring-opacity-50': isSelectingCoordinates && isModalOpen }">
          <l-map ref="map" v-model:zoom="zoom" :center="center" :use-global-leaflet="false" @click="onMapClick">
            <l-tile-layer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              layer-type="base"
              name="OpenStreetMap"
            ></l-tile-layer>

            <l-marker 
                v-for="orto in orti.filter(o => o.geometry?.coordinates?.[0] && o.geometry?.coordinates?.[1])" 
                :key="orto._id || orto.id"
                :lat-lng="[orto.geometry.coordinates[1], orto.geometry.coordinates[0]]"
            >
                <l-icon :icon-url="isAssigned(orto._id || orto.id) ? redIcon.options.iconUrl : greenIcon.options.iconUrl" 
                        :shadow-url="redIcon.options.shadowUrl"
                        :icon-size="redIcon.options.iconSize"
                        :icon-anchor="redIcon.options.iconAnchor"
                        :popup-anchor="redIcon.options.popupAnchor"
                        :shadow-size="redIcon.options.shadowSize"
                />
                
                <l-popup>
                    <div class="p-2 min-w-[200px]">
                        <h3 class="font-bold text-lg mb-1">{{ orto.nome }}</h3>
                        <p class="text-sm text-gray-600 mb-2 flex items-center gap-1">
                            <MapPin class="w-3 h-3" /> {{ orto.indirizzo }}
                        </p>
                         <div class="flex items-center gap-2 mb-3 text-xs">
                            <span class="badge badge-sm" :class="isAssigned(orto._id || orto.id) ? 'badge-error text-white' : 'badge-success text-white'">
                                {{ isAssigned(orto._id || orto.id) ? 'Assegnato' : 'Libero' }}
                            </span>
                            <span class="badge badge-ghost badge-sm">Lotti: {{ orto.lotti?.length || 0 }}</span>
                        </div>
                        <button @click="openEditModal(orto)" class="btn btn-sm btn-outline btn-warning w-full gap-2">
                            <Pencil class="w-3 h-3" /> Modifica
                        </button>
                    </div>
                </l-popup>
            </l-marker>
          </l-map>
      </div>

      <!-- List View -->
      <div v-if="viewMode === 'list'" class="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
<div v-for="orto in orti" :key="orto._id || orto.id" class="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow">
  <div class="card-body p-6">
    <!-- Status Badge at Top -->
    <div class="mb-3">
      <span class="badge badge-sm" :class="isAssigned(orto._id || orto.id) ? 'badge-error text-white' : 'badge-success text-white'">
        {{ isAssigned(orto._id || orto.id) ? 'Assegnato' : 'Libero' }}
      </span>
    </div>

    <!-- Title -->
    <h2 class="card-title text-primary mb-3">
      {{ orto.nome }}
    </h2>
    
    <!-- Association Name -->
    <div class="mb-3">
      <div v-if="isAssigned(orto._id || orto.id)" class="flex items-center gap-2 text-sm">
        <Handshake class="w-4 h-4" />
        <span class="font-medium text-secondary">{{ getAssociazioneName(orto._id || orto.id) }}</span>
      </div>
      <div v-else class="flex items-center gap-2 text-sm text-gray-500">
        <Handshake class="w-4 h-4" />
        <span class="italic">Nessuna</span>
      </div>
    </div>
    
    <!-- Address -->
    <div class="flex items-start gap-2 text-sm text-gray-600 mb-3">
      <MapPin class="w-4 h-4 mt-0.5" />
      <span>{{ orto.indirizzo }}</span>
    </div>
    
    <!-- Lotti Badge -->
    <div class="mb-4">
      <div class="badge badge-ghost badge-sm">
        Lotti: {{ orto.lotti?.length || 0 }}
      </div>
    </div>

    <!-- Action Button -->
    <div class="card-actions justify-end">
      <button @click="openEditModal(orto)" class="btn btn-sm btn-outline btn-warning gap-1">
        <Pencil class="w-3 h-3" /> Modifica
      </button>
    </div>
  </div>
</div>
          
          <div v-if="orti.length === 0" class="col-span-full text-center py-10 opacity-50">
              Nessun orto presente.
          </div>
      </div>

    <!-- Modal -->
    <dialog class="modal" :class="{ 'modal-open': isModalOpen }">
        <div class="modal-box w-11/12 max-w-4xl bg-base-100">
            <h3 class="font-bold text-2xl mb-6 text-center">
                {{ isEditMode ? 'Modifica Orto' : 'Aggiungi Nuovo Orto' }}
            </h3>
            
            <form @submit.prevent="saveOrto" class="flex flex-col gap-6">
                <!-- Orto Details -->
                <div class="bg-base-200 p-4 rounded-box">
                    <h4 class="font-semibold mb-2">Dettagli Orto</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="form-control">
                            <label class="label">Nome</label>
                            <input v-model="form.nome" type="text" class="input input-bordered w-full" placeholder="Es. Orto Urbano Nord" required />
                        </div>
                        <div class="form-control">
                            <label class="label">Indirizzo</label>
                            <input v-model="form.indirizzo" type="text" class="input input-bordered w-full" placeholder="Via Garibaldi 10" required />
                        </div>
                        <div class="form-control">
                            <label class="label">Latitudine</label>
                            <input v-model="form.lat" type="number" step="any" class="input input-bordered w-full" placeholder="46.06787" required :class="{ 'input-success': isSelectingCoordinates }" />
                        </div>
                        <div class="form-control">
                            <label class="label flex justify-between items-center">
                                <span>Longitudine</span>
                                <button type="button" @click="toggleCoordinateSelection" class="btn btn-xs btn-outline gap-1" :class="isSelectingCoordinates ? 'btn-success' : 'btn-neutral'">
                                    <MapPin class="w-3 h-3" />
                                    {{ isSelectingCoordinates ? 'Clicca mappa' : 'Dalla mappa' }}
                                </button>
                            </label>
                            <input v-model="form.lng" type="number" step="any" class="input input-bordered w-full" placeholder="11.12108" required :class="{ 'input-success': isSelectingCoordinates }" />
                        </div>
                        <!-- Association Selection -->
                        <div class="form-control md:col-span-2">
                             <label class="label">Associazione (Opzionale)</label>
                             <select v-model="form.associazione" class="select select-bordered w-full">
                                 <option value="">Nessuna Associazione</option>
                                 <option v-for="assoc in associazioni" :key="assoc._id || assoc.id" :value="assoc._id || assoc.id">
                                     {{ assoc.nome }}
                                 </option>
                             </select>
                        </div>
                        
                        <!-- Dates for Association -->
                        <div v-if="form.associazione" class="form-control">
                            <label class="label">Data Inizio Affidamento</label>
                            <input v-model="form.data_inizio" type="date" class="input input-bordered w-full" required />
                        </div>
                        <div v-if="form.associazione" class="form-control">
                            <label class="label">Data Fine Affidamento</label>
                            <input v-model="form.data_fine" type="date" class="input input-bordered w-full" required />
                        </div>
                    </div>
                </div>
                
                <div class="divider m-0"></div>

                <!-- Lotti Section -->
                <div>
                     <div class="flex justify-between items-center mb-4">
                        <h4 class="font-semibold">Lotti Disponibili</h4>
                        <button type="button" @click="addLotto" class="btn btn-sm btn-outline btn-success">
                            + Aggiungi Lotto
                        </button>
                     </div>
                     
                     <div v-if="form.lotti.length === 0" class="text-center p-8 bg-base-200 rounded-lg text-base-content/50 italic">
                         Nessun lotto aggiunto. Aggiungine almeno uno.
                     </div>

                    <div class="space-y-3">
                        <div v-for="(lotto, index) in form.lotti" :key="index" class="p-3 bg-base-200 rounded-lg flex flex-wrap md:flex-nowrap items-end gap-3 animate-fade-in">
                            <div class="form-control w-24 flex-none font-mono opacity-50 flex justify-center items-center pb-3">
                                #{{ index + 1 }}
                            </div>
                            <div class="form-control flex-1 min-w-[150px]">
                                <label class="label text-xs">Dimensione (mq)</label>
                                <input v-model="lotto.dimensione" type="number" class="input input-bordered input-sm w-full" required />
                            </div>
                            <div class="form-control flex-none pt-8">
                                <label class="label cursor-pointer gap-2 border border-base-300 rounded-lg px-3 py-1 bg-base-100 hover:bg-base-200 transition-colors">
                                    <span class="label-text font-medium">Sensori</span> 
                                    <input v-model="lotto.sensori" type="checkbox" class="checkbox checkbox-sm checkbox-primary" />
                                </label>
                            </div>
                            <div class="flex-none pb-0.5">
                                <button type="button" @click="removeLotto(index)" class="btn btn-sm btn-square btn-ghost text-error hover:bg-error/10">
                                    <Trash2 class="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-action border-t border-base-200 pt-4 mt-2">
                    <button type="button" @click="isModalOpen = false" class="btn btn-ghost px-6">Annulla</button>
                    <button type="submit" class="btn btn-primary px-8" :disabled="loading">
                        <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                        {{ loading ? 'Salvataggio...' : 'Salva' }}
                    </button>
                </div>
            </form>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button @click="isModalOpen = false">close</button>
        </form>
    </dialog>
    
    <!-- Toast -->
    <div v-if="toast.show" class="toast toast-end z-[9999]">
        <div class="alert" :class="toast.type === 'error' ? 'alert-error' : 'alert-success'">
            <span class="text-white">{{ toast.message }}</span>
        </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.2s ease-in-out;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
