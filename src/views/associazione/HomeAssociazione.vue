<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '../../services/api'
import { store } from '../../store'
import { 
  Sprout, Grid, Users, Info, MapPin, Signal, SignalLow, Handshake 
} from 'lucide-vue-next'

const { t } = useI18n()

const orti = ref([])
const affidamenti = ref([]) // AffidaOrto
const affidaLotti = ref([]) // AffidaLotti
const lottiDetails = ref({}) // Cache for lotti details
const users = ref([]) // Users cache

// --- Fetching Data ---

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

const fetchAffidamenti = async () => {
    try {
        const response = await api.get('/affidaOrti')
        affidamenti.value = Array.isArray(response) ? response : (response.data || [])
    } catch (e) {
        console.error('Failed to fetch affidamenti', e)
    }
}

const fetchAffidaLotti = async () => {
    try {
        const response = await api.get('/affidaLotti')
        affidaLotti.value = Array.isArray(response) ? response : (response.data || [])
    } catch (e) {
        console.error('Failed to fetch affidaLotti', e)
    }
}

const fetchUsers = async () => {
    try {
        const response = await api.get('/utenti')
        users.value = Array.isArray(response) ? response : (response.data || [])
    } catch (e) {
        console.error('Failed to fetch users', e)
    }
}

onMounted(async () => {
    await Promise.all([fetchOrti(), fetchAffidamenti(), fetchAffidaLotti(), fetchUsers()])
})

// --- Computed Properties ---

const myAssociazioneId = computed(() => {
    const user = store.user
    return user?.associazione || user?.id || user?._id
})

// Get Orti managed by ME
const myOrti = computed(() => {
    const myId = String(myAssociazioneId.value)
    const myAffidiIds = new Set()
    
    affidamenti.value.forEach(a => {
        const aId = typeof a.associazione === 'object' ? (a.associazione._id || a.associazione.id) : a.associazione
        if (String(aId) === myId) {
             const oId = typeof a.orto === 'object' ? (a.orto._id || a.orto.id) : a.orto
             myAffidiIds.add(String(oId))
        }
    })

    return orti.value.filter(o => myAffidiIds.has(String(o._id || o.id)))
})

// Metrics
const totalOrti = computed(() => myOrti.value.length)

const totalLotti = computed(() => {
    return myOrti.value.reduce((acc, o) => acc + (o.lotti ? o.lotti.length : 0), 0)
})

const totalLottiOccupati = computed(() => {
    const myLottoIds = new Set()
    myOrti.value.forEach(o => {
        if (o.lotti) {
            o.lotti.forEach(l => {
                const lId = typeof l === 'object' ? (l._id || l.id) : l
                myLottoIds.add(String(lId))
            })
        }
    })

    return affidaLotti.value.filter(al => {
        if (al.stato !== 'accepted') return false
        const lId = typeof al.lotto === 'object' ? (al.lotto._id || al.lotto.id) : al.lotto
        return myLottoIds.has(String(lId))
    }).length
})

// --- Helpers ---

const getLottoData = (lottoId) => {
    if (typeof lottoId === 'object' && lottoId !== null) {
        if (lottoId.dimensione !== undefined) return lottoId
        const id = lottoId._id || lottoId.id
        if (id && lottiDetails.value[id]) return lottiDetails.value[id]
        return lottoId
    }
    return lottiDetails.value[lottoId] || { dimensione: 'N/A', sensori: false }
}

const getLottoAssignment = (lottoId) => {
    const lIdStr = String(lottoId)
    return affidaLotti.value.find(al => {
        const alLId = typeof al.lotto === 'object' ? (al.lotto._id || al.lotto.id) : al.lotto
        return String(alLId) === lIdStr && al.stato === 'accepted'
    })
}

const getTotalSize = (orto) => {
    if (!orto.lotti) return 0
    return orto.lotti.reduce((acc, lotto) => {
        const data = getLottoData(lotto)
        return acc + (data.dimensione || 0)
    }, 0)
}

const getLottiLiberi = (orto) => {
    if (!orto.lotti) return 0
    let occupied = 0
    orto.lotti.forEach(lotto => {
       const lId = typeof lotto === 'object' ? (lotto._id || lotto.id) : lotto
       if (getLottoAssignment(lId)) occupied++
    })
    return orto.lotti.length - occupied
}

const getScadenzaOrto = (orto) => {
    const oId = String(orto._id || orto.id)
    const myId = String(myAssociazioneId.value)
    
    const assignment = affidamenti.value.find(a => {
        const aOId = typeof a.orto === 'object' ? (a.orto._id || a.orto.id) : a.orto
        const aAssocId = typeof a.associazione === 'object' ? (a.associazione._id || a.associazione.id) : a.associazione
        return String(aOId) === oId && String(aAssocId) === myId
    })
    return assignment ? assignment.data_fine : null
}

const getUserName = (userId) => {
    if (!userId) return 'Sconosciuto'
    const uId = typeof userId === 'object' ? (userId._id || userId.id) : userId
    const user = users.value.find(u => (u._id || u.id) === uId)
    if (user) return `${user.nome} ${user.cognome}`
    return 'Utente'
}

const getUserDetails = (userId) => {
    if (!userId) return null
    const uId = typeof userId === 'object' ? (userId._id || userId.id) : userId
    return users.value.find(u => (u._id || u.id) === uId)
}

const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString()
}

// --- Modals ---
const selectedOrto = ref(null)
const isDetailsModalOpen = ref(false)
const selectedUser = ref(null)

const openDetailsModal = (orto) => {
    selectedOrto.value = orto
    isDetailsModalOpen.value = true
}

const openUserModal = (userId) => {
    selectedUser.value = getUserDetails(userId)
    const modal = document.getElementById('user_info_modal_home')
    if (modal) modal.showModal()
}
</script>

<template>
  <div class="p-6 min-h-[calc(100vh-64px)] w-full flex flex-col items-center gap-8">
      
      <!-- HEADER -->
      <div class="w-full max-w-6xl">
          <h1 class="text-3xl font-bold text-primary mb-2 flex items-center gap-2">
            {{ $t('association.dashboard.title') }} <Handshake class="w-8 h-8" />
          </h1>
          <p class="text-gray-600">{{ $t('association.dashboard.subtitle') }}</p>
      </div>

      <!-- METRICS CARDS -->
      <div class="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
           <div class="stat bg-base-100 shadow-xl rounded-box border border-base-200">
                <div class="stat-figure text-primary">
                    <Sprout class="w-8 h-8" />
                </div>
                <div class="stat-title">{{ $t('association.dashboard.total_gardens') }}</div>
                <div class="stat-value text-primary">{{ totalOrti }}</div>
           </div>
           
           <div class="stat bg-base-100 shadow-xl rounded-box border border-base-200">
                <div class="stat-figure text-secondary">
                    <Grid class="w-8 h-8" />
                </div>
                <div class="stat-title">{{ $t('association.dashboard.total_lots') }}</div>
                <div class="stat-value text-secondary">{{ totalLotti }}</div>
           </div>

           <div class="stat bg-base-100 shadow-xl rounded-box border border-base-200">
                <div class="stat-figure text-accent">
                    <Users class="w-8 h-8" />
                </div>
                <div class="stat-title">{{ $t('association.dashboard.occupied_lots') }}</div>
                <div class="stat-value text-accent">{{ totalLottiOccupati }}</div>
           </div>
      </div>

      <!-- ORTI LIST -->
      <div class="w-full max-w-6xl">
          <h2 class="text-2xl font-bold mb-4">{{ $t('association.dashboard.your_gardens') }}</h2>
          
          <div v-if="myOrti.length === 0" class="alert alert-info shadow-lg">
              <Info class="stroke-current shrink-0 w-6 h-6" />
              <span>{{ $t('association.dashboard.no_gardens_assigned') }}</span>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div v-for="orto in myOrti" :key="orto._id || orto.id" class="card bg-base-100 shadow-md border border-base-200 hover:shadow-xl transition-all">
                  <div class="card-body">
                      <h2 class="card-title text-primary">{{ orto.nome }}</h2>
                      <p class="text-sm text-gray-500 mb-2 flex items-center gap-1"><MapPin class="w-4 h-4" /> {{ orto.indirizzo }}</p>
                      
                      <div class="flex flex-col gap-2 my-2">
                          <div class="flex justify-between border-b pb-1">
                              <span class="text-sm font-semibold">{{ $t('association.dashboard.surface') }}</span>
                              <span class="text-sm">{{ getTotalSize(orto) }} mq</span>
                          </div>
                          <div class="flex justify-between border-b pb-1">
                              <span class="text-sm font-semibold">{{ $t('association.dashboard.total_lots_label') }}</span>
                              <span class="text-sm">{{ orto.lotti?.length || 0 }}</span>
                          </div>
                          <div class="flex justify-between border-b pb-1">
                              <span class="text-sm font-semibold">{{ $t('association.dashboard.free_lots') }}</span>
                              <span class="text-sm">{{ getLottiLiberi(orto) }}</span>
                          </div>
                          <div class="flex justify-between border-b pb-1">
                              <span class="text-sm font-semibold">{{ $t('association.dashboard.expiry') }}</span>
                              <span class="text-sm">{{ formatDate(getScadenzaOrto(orto)) }}</span>
                          </div>
                      </div>

                      <div class="card-actions justify-end mt-4">
                          <button class="btn btn-primary w-full" @click="openDetailsModal(orto)">{{ $t('association.dashboard.details_management') }}</button>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <!-- DETAILS MODAL -->
      <dialog class="modal" :class="{ 'modal-open': isDetailsModalOpen }">
          <div class="modal-box w-11/12 max-w-5xl">
              <h3 class="font-bold text-lg mb-4 text-primary" v-if="selectedOrto">
                  {{ $t('association.dashboard.management_title', { name: selectedOrto.nome }) }}
              </h3>
              
              <div v-if="selectedOrto" class="overflow-x-auto">
                <table class="table w-full">
                    <thead>
                        <tr>
                            <th>{{ $t('association.dashboard.lot') }}</th>
                            <th>{{ $t('association.dashboard.characteristics') }}</th>
                            <th>{{ $t('association.dashboard.status') }}</th>
                            <th>{{ $t('association.dashboard.citizen') }}</th>
                            <th>{{ $t('association.dashboard.expiry') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(lotto, idx) in selectedOrto.lotti" :key="idx" class="hover">
                            <td>
                                <div class="font-bold text-lg">#{{ idx + 1 }}</div>
                            </td>
                            <td>
                                <div class="text-sm font-semibold">{{ getLottoData(lotto).dimensione }} mq</div>
                                <div class="text-xs opacity-70 flex items-center gap-1">
                                    <template v-if="getLottoData(lotto).sensori">
                                        <Signal class="w-3 h-3" /> {{ $t('association.dashboard.with_sensors') }}
                                    </template>
                                    <template v-else>
                                        <SignalLow class="w-3 h-3" /> {{ $t('association.dashboard.no_sensors') }}
                                    </template>
                                </div>
                            </td>
                            <td>
                                <div class="badge" :class="getLottoAssignment(typeof lotto === 'object' ? (lotto._id || lotto.id) : lotto) ? 'badge-error text-white' : 'badge-success text-white'">
                                    {{ getLottoAssignment(typeof lotto === 'object' ? (lotto._id || lotto.id) : lotto) ? $t('association.dashboard.occupied') : $t('association.dashboard.free') }}
                                </div>
                            </td>
                            <td>
                                <div v-if="getLottoAssignment(typeof lotto === 'object' ? (lotto._id || lotto.id) : lotto)">
                                    <span 
                                        class="link link-primary font-bold hover:text-secondary transition-colors"
                                        @click="openUserModal(getLottoAssignment(typeof lotto === 'object' ? (lotto._id || lotto.id) : lotto).utente)"
                                    >
                                        {{ getUserName(getLottoAssignment(typeof lotto === 'object' ? (lotto._id || lotto.id) : lotto).utente) }}
                                    </span>
                                </div>
                                <span v-else class="text-gray-300 italic">-</span>
                            </td>
                            <td>
                                <span v-if="getLottoAssignment(typeof lotto === 'object' ? (lotto._id || lotto.id) : lotto)" class="text-sm font-mono">
                                    {{ formatDate(getLottoAssignment(typeof lotto === 'object' ? (lotto._id || lotto.id) : lotto).data_fine) }}
                                </span>
                                <span v-else class="text-gray-300">-</span>
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

      <!-- USER INFO MODAL -->
      <dialog id="user_info_modal_home" class="modal">
        <div class="modal-box">
            <h3 class="font-bold text-lg mb-4 text-secondary">{{ $t('modals.orti.citizen_profile') }}</h3>
            
            <div v-if="selectedUser" class="flex flex-col gap-4">
                <div class="flex items-center gap-4">
                    <div class="avatar placeholder">
                        <div class="bg-neutral text-neutral-content rounded-full w-16">
                            <span class="text-2xl">{{ selectedUser.nome?.charAt(0) }}{{ selectedUser.cognome?.charAt(0) }}</span>
                        </div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold">{{ selectedUser.nome }} {{ selectedUser.cognome }}</div>
                        <div class="text-sm opacity-50">{{ selectedUser.email }}</div>
                    </div>
                </div>
                
                <div class="divider"></div>
                
                <div class="grid grid-cols-1 gap-4">
                    <div class="flex justify-between border-b pb-2">
                        <span class="font-bold text-gray-600">{{ $t('association.requests.phone') }}</span>
                        <span>{{ selectedUser.telefono || '-' }}</span>
                    </div>
                    <div class="flex justify-between border-b pb-2">
                        <span class="font-bold text-gray-600">{{ $t('association.requests.tax_id') }}</span>
                        <span>{{ selectedUser.codicefiscale || '-' }}</span>
                    </div>
                     <div class="flex justify-between border-b pb-2">
                        <span class="font-bold text-gray-600">{{ $t('association.requests.address') }}</span>
                        <span>{{ selectedUser.indirizzo || '-' }}</span>
                    </div>
                </div>
            </div>

            <div class="modal-action">
                <form method="dialog">
                    <button class="btn">{{ $t('general.close') }}</button>
                </form>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button>close</button>
        </form>
    </dialog>

  </div>
</template>
