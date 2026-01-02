<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../../services/api'
import "leaflet/dist/leaflet.css"
import { LMap, LTileLayer, LMarker, LPopup, LIcon } from "@vue-leaflet/vue-leaflet"
import L from 'leaflet'

// --- STATO ---
const zoom = ref(13)
const center = ref([46.06787, 11.12108]) // Trento
const orti = ref([])
const affidamentiAssociazioni = ref([]) // Quale associazione gestisce l'orto
const occupazioneLotti = ref([]) // Quali lotti sono occupati dai cittadini
const associazioni = ref([])

const viewMode = ref('map') // 'map' o 'list'
const isModalOpen = ref(false)
const selectedOrto = ref(null)
const loading = ref(false)

// --- ICONE MAPPA (Stesse del Comune) ---
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

// --- API CALLS ---
const fetchData = async () => {
    try {
        const [resOrti, resAffidaAssoc, resAssoc, resAffidaCitt] = await Promise.all([
            api.get('/orti'),               // Elenco Orti
            api.get('/affidaOrti/active'),  // Gestione Associazioni
            api.get('/associazioni'),       // Nomi Associazioni
            api.get('/affidaLotti/attivi')  // Lotti occupati da cittadini
        ])

        orti.value = Array.isArray(resOrti) ? resOrti : (resOrti.data || [])
        affidamentiAssociazioni.value = Array.isArray(resAffidaAssoc) ? resAffidaAssoc : (resAffidaAssoc.data || [])
        associazioni.value = Array.isArray(resAssoc) ? resAssoc : (resAssoc.data || [])
        occupazioneLotti.value = Array.isArray(resAffidaCitt) ? resAffidaCitt : (resAffidaCitt.data || [])

    } catch (e) {
        console.error('Errore caricamento dati', e)
        showToast('Errore caricamento dati: ' + e.message, 'error')
    }
}

onMounted(() => {
    fetchData()
})

// --- HELPERS ---

// Trova l'associazione che gestisce l'orto
const getAssociazioneInfo = (ortoId) => {
    const assignment = affidamentiAssociazioni.value.find(a => (a.orto === ortoId || a.orto?._id === ortoId))
    if (!assignment) return null // Orto non gestito, quindi non richiedibile

    const assocId = assignment.associazione?._id || assignment.associazione
    const assoc = associazioni.value.find(a => (a._id || a.id) === assocId)
    return assoc
}

// Verifica se un singolo lotto è occupato da un cittadino
const isLottoOccupato = (lottoId) => {
    // Cerca negli affidamenti attivi ai cittadini
    return occupazioneLotti.value.some(a => (a.lotto === lottoId || a.lotto?._id === lottoId))
}

// --- AZIONI ---

const openDetailModal = async (orto) => {
    loading.value = true
    try {
        // Se i lotti sono solo ID (stringhe), dobbiamo scaricare i dettagli completi dell'orto
        if (orto.lotti.length > 0 && typeof orto.lotti[0] === 'string') {
             const res = await api.get(`/orti/${orto._id || orto.id}`)
             selectedOrto.value = res.data || res
        } else {
            selectedOrto.value = orto
        }
        isModalOpen.value = true
    } catch (e) {
        showToast("Errore apertura dettagli", 'error')
    } finally {
        loading.value = false
    }
}

const richiediLotto = async (lottoId) => {
    if(!confirm("Confermi di voler richiedere questo lotto?")) return

    loading.value = true
    try {
        // Chiamata alla rotta POST creata nel backend
        await api.post('/affidaLotti', { lotto: lottoId })
        showToast('Richiesta inviata con successo!', 'success')
        isModalOpen.value = false
        // Ricarichiamo i dati per vedere eventuali aggiornamenti
        fetchData()
    } catch (e) {
        console.error(e)
        showToast(e.response?.data?.message || 'Errore nella richiesta', 'error')
    } finally {
        loading.value = false
    }
}

// --- TOAST ---
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success', time = 3000) => {
    toast.value = { show: true, message, type }
    setTimeout(() => { toast.value.show = false }, time)
}
</script>

<template>
  <div class="p-6 min-h-[calc(100vh-64px)] w-full flex flex-col items-center gap-4 bg-base-50">
      
      <div class="flex flex-col md:flex-row justify-between w-full max-w-5xl items-center gap-4">
          <h1 class="text-3xl font-bold text-primary flex items-center gap-2">
            🌱 Trova il tuo Orto
          </h1>
          
          <div class="flex flex-wrap gap-4 items-center">
              <div class="flex gap-4 text-xs font-medium bg-white p-2 rounded-lg shadow-sm border border-base-200">
                    <div class="flex items-center gap-1">
                        <span class="w-3 h-3 rounded-full bg-green-500"></span> Attivo
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="w-3 h-3 rounded-full bg-red-500"></span> Non Gestito
                    </div>
                </div>
              <div class="join shadow-sm">
                <button 
                    class="btn btn-sm join-item" 
                    :class="viewMode === 'map' ? 'btn-active btn-primary' : 'bg-white'"
                    @click="viewMode = 'map'"
                >
                   🗺️ Mappa
                </button>
                <button 
                    class="btn btn-sm join-item" 
                    :class="viewMode === 'list' ? 'btn-active btn-primary' : 'bg-white'"
                    @click="viewMode = 'list'"
                >
                  📋 Lista
                </button>
              </div>
          </div>
      </div>

      <div v-show="viewMode === 'map'" class="card bg-base-100 shadow-xl w-full max-w-5xl h-[600px] border border-base-200 overflow-hidden relative z-0">
          <l-map ref="map" v-model:zoom="zoom" :center="center" :use-global-leaflet="false">
            <l-tile-layer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              layer-type="base"
              name="OpenStreetMap"
            ></l-tile-layer>

            <l-marker 
                v-for="orto in orti" 
                :key="orto._id || orto.id" 
                :lat-lng="[orto.coordinate.lat, orto.coordinate.lng]"
            >
                <l-icon :icon-url="getAssociazioneInfo(orto._id || orto.id) ? greenIcon.options.iconUrl : redIcon.options.iconUrl" 
                        :shadow-url="redIcon.options.shadowUrl"
                        :icon-size="redIcon.options.iconSize"
                        :icon-anchor="redIcon.options.iconAnchor"
                        :popup-anchor="redIcon.options.popupAnchor"
                        :shadow-size="redIcon.options.shadowSize"
                />
                
                <l-popup>
                    <div class="p-2 min-w-[200px]">
                        <h3 class="font-bold text-lg mb-1">{{ orto.nome }}</h3>
                        <p class="text-sm text-gray-600 mb-2">📍 {{ orto.indirizzo }}</p>
                        
                        <div v-if="getAssociazioneInfo(orto._id || orto.id)" class="text-xs mb-3">
                            Gestito da: <br>
                            <span class="font-bold text-secondary">{{ getAssociazioneInfo(orto._id || orto.id).nome }}</span>
                        </div>
                        <div v-else class="text-xs text-error mb-3 font-bold">
                            Momentaneamente non assegnato
                        </div>

                        <button 
                            @click="openDetailModal(orto)" 
                            class="btn btn-sm btn-primary w-full"
                            :disabled="!getAssociazioneInfo(orto._id || orto.id)"
                        >
                            🔍 Vedi Lotti
                        </button>
                    </div>
                </l-popup>
            </l-marker>
          </l-map>
      </div>

      <div v-if="viewMode === 'list'" class="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
        <div v-for="orto in orti" :key="orto._id || orto.id" class="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-all">
          <div class="card-body p-6">
            <h2 class="card-title text-primary">{{ orto.nome }}</h2>
            <p class="text-sm text-gray-600">📍 {{ orto.indirizzo }}</p>
            
            <div class="divider my-2"></div>
            
            <div class="text-sm">
               <div v-if="getAssociazioneInfo(orto._id || orto.id)">
                   <span class="text-gray-500">Gestito da:</span>
                   <div class="font-medium text-secondary">{{ getAssociazioneInfo(orto._id || orto.id).nome }}</div>
               </div>
               <div v-else class="text-error italic">Non gestito al momento</div>
            </div>

            <div class="card-actions justify-end mt-4">
              <button 
                @click="openDetailModal(orto)" 
                class="btn btn-outline btn-primary btn-sm w-full"
                :disabled="!getAssociazioneInfo(orto._id || orto.id)"
              >
                Vedi Lotti Disponibili
              </button>
            </div>
          </div>
        </div>
        
        <div v-if="orti.length === 0" class="col-span-full text-center py-10 opacity-50">
            Nessun orto trovato.
        </div>
      </div>

    <dialog class="modal" :class="{ 'modal-open': isModalOpen }">
        <div class="modal-box w-11/12 max-w-4xl bg-base-100">
            <div v-if="selectedOrto">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h3 class="font-bold text-2xl text-primary">{{ selectedOrto.nome }}</h3>
                        <p class="text-gray-500">{{ selectedOrto.indirizzo }}</p>
                    </div>
                    <button class="btn btn-circle btn-ghost btn-sm" @click="isModalOpen = false">✕</button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div v-for="(lotto, index) in selectedOrto.lotti" :key="index" 
                         class="border rounded-lg p-4 flex flex-col justify-between transition-colors"
                         :class="isLottoOccupato(lotto._id || lotto) ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200 hover:shadow-md'">
                        
                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <span class="font-bold text-lg text-gray-700">Lotto #{{ index + 1 }}</span>
                                <span class="badge" :class="isLottoOccupato(lotto._id || lotto) ? 'badge-error text-white' : 'badge-success text-white'">
                                    {{ isLottoOccupato(lotto._id || lotto) ? 'Occupato' : 'Libero' }}
                                </span>
                            </div>
                            <div class="text-sm text-gray-600 space-y-1">
                                <p>📏 Dimensione: <strong>{{ lotto.dimensione }} mq</strong></p>
                                <p>📡 Sensori: <strong>{{ lotto.sensori ? 'Sì ✅' : 'No ❌' }}</strong></p>
                            </div>
                        </div>

                        <button 
                            @click="richiediLotto(lotto._id || lotto)"
                            class="btn btn-sm mt-4 w-full"
                            :class="isLottoOccupato(lotto._id || lotto) ? 'btn-disabled bg-gray-200 text-gray-400' : 'btn-primary'"
                            :disabled="isLottoOccupato(lotto._id || lotto) || loading"
                        >
                            {{ isLottoOccupato(lotto._id || lotto) ? 'Non disponibile' : 'Richiedi Assegnazione' }}
                        </button>
                    </div>
                </div>

                <div v-if="!selectedOrto.lotti || selectedOrto.lotti.length === 0" class="text-center py-10 text-gray-500">
                    Nessun lotto configurato per questo orto.
                </div>
            </div>
            <div v-else class="flex justify-center py-10">
                <span class="loading loading-spinner loading-lg text-primary"></span>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button @click="isModalOpen = false">close</button>
        </form>
    </dialog>
    
    <div v-if="toast.show" class="toast toast-end z-[9999]">
        <div class="alert" :class="toast.type === 'error' ? 'alert-error' : 'alert-success'">
            <span class="text-white">{{ toast.message }}</span>
        </div>
    </div>
  </div>
</template>