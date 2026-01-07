<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../../services/api'
import { store } from '../../store'

const orti = ref([])
const pendingRequestsData = ref([]) // Solo pending dal backend
const historicalRequestsData = ref([]) // Solo storico dal backend
const storicoLoadedForOrto = ref({}) // Traccia quali orti hanno lo storico caricato
const loadingStorico = ref({}) // Traccia il caricamento per ogni orto
const loading = ref(true)
const toast = ref({ show: false, message: '', type: 'success' })

const showToast = (message, type = 'success') => {
    toast.value = { show: true, message, type }
    setTimeout(() => {
        toast.value.show = false
    }, 3000)
}

const users = ref([])
const selectedUser = ref(null)

const openUserModal = (user) => {
    selectedUser.value = user || {}
    const modal = document.getElementById('user_modal')
    if (modal) modal.showModal()
}

const requestToAccept = ref(null)
const acceptanceEndDate = ref('')

const openAcceptModal = (req) => {
    requestToAccept.value = req
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    acceptanceEndDate.value = d.toISOString().split('T')[0]
    
    const modal = document.getElementById('accept_modal')
    if (modal) modal.showModal()
}

// Fetch all necessary data
const fetchData = async () => {
    loading.value = true
    try {
        const user = store.user
        if (!user) return

        console.log('Current User:', user)

        const myAssocId = user.associazione && typeof user.associazione === 'object' 
            ? (user.associazione._id || user.associazione.id) 
            : user.associazione
        
        //Fetch Orti, Pending Requests, USERS, and AffidaOrti
        const [ortiResponse, pendingResponse, usersResponse, affidaOrtoResponse] = await Promise.all([
            api.get('/orti'),
            api.get('/affidaLotti/pending'),
            api.get('/utenti'),
            api.get('/affidaOrti')
        ])

        const allOrti = Array.isArray(ortiResponse) ? ortiResponse : (ortiResponse.data || [])
        const pendingData = Array.isArray(pendingResponse) ? pendingResponse : (pendingResponse.data || [])
        const allUsers = Array.isArray(usersResponse) ? usersResponse : (usersResponse.data || [])
        const allAffidaOrti = Array.isArray(affidaOrtoResponse) ? affidaOrtoResponse : (affidaOrtoResponse.data || [])
        
        users.value = allUsers

        console.log('Pending requests from API:', pendingData.length)

        // Filter Orti for this Association via AffidaOrto
        // Find which Orti are assigned to my Association (current or past)
        const myAffidi = allAffidaOrti.filter(ao => {
             const aId = typeof ao.associazione === 'object' ? (ao.associazione._id || ao.associazione.id) : ao.associazione
             
             // Check ownership only (remove date filtering to show all assigned orti)
             return String(aId) === String(myAssocId)
        })

        console.log('My Affidi Orti:', myAffidi.length, myAffidi)

        const myOrtoIds = new Set(myAffidi.map(ao => {
            const o = ao.orto
            return String(typeof o === 'object' ? (o._id || o.id) : o)
        }))

        console.log('My Orto IDs:', myOrtoIds)

        // Filter allOrti to keep only those present in myOrtoIds
        orti.value = allOrti.filter(o => myOrtoIds.has(String(o._id || o.id)))
        
        console.log('Filtered Orti:', orti.value.length, orti.value.map(o => ({ id: o._id, nome: o.nome })))

        // Collect all unique Lotto IDs belonging to my Orti
        const myLottoIds = new Set()
        orti.value.forEach(o => {
            if (Array.isArray(o.lotti)) {
                o.lotti.forEach(l => {
                    const lId = typeof l === 'object' ? (l._id || l.id) : l
                    if (lId) myLottoIds.add(String(lId))
                })
            }
        })
        
        console.log('My Lotto IDs:', myLottoIds)

        // Le richieste pending arrivano già filtrate dal backend per l'associazione
        pendingRequestsData.value = pendingData
        
        console.log('Pending requests (from /pending endpoint):', pendingRequestsData.value.length)

    } catch (e) {
        console.error('Error fetching data', e)
        showToast('Errore nel caricamento dei dati', 'error')
    } finally {
        loading.value = false
    }
}

onMounted(fetchData)

const getUserDetails = (userId) => {
    if (!userId) return null
    const id = typeof userId === 'object' ? (userId._id || userId.id) : userId
    const idStr = String(id)
    return users.value.find(u => {
        const uId = u._id || u.id
        return String(uId) === idStr
    }) || null
}

// Ottieni il numero progressivo del lotto nell'orto
const getLottoNumber = (lottoId, orto) => {
    if (!orto || !orto.lotti) return 'N/A'
    const index = orto.lotti.findIndex(l => {
        const lId = typeof l === 'object' ? (l._id || l.id) : l
        return String(lId) === String(lottoId)
    })
    return index !== -1 ? `Lotto ${index + 1}` : 'N/A'
}

// Carica lo storico per un orto specifico
const loadStoricoForOrto = async (ortoId) => {
    // Se è già caricato e aggiornato, non ricaricare
    if (storicoLoadedForOrto.value[ortoId]) {
        console.log(`Storico già caricato per orto ${ortoId}`)
        return
    }
    
    loadingStorico.value[ortoId] = true
    
    try {
        const storicoResponse = await api.get('/affidaLotti/storico')
        const storicoData = Array.isArray(storicoResponse) ? storicoResponse : (storicoResponse.data || [])
        
        console.log('Historical requests loaded:', storicoData.length)
        
        // Sostituisci i dati storici con quelli nuovi
        historicalRequestsData.value = storicoData
        
        // Marca come caricato
        storicoLoadedForOrto.value[ortoId] = true
        
    } catch (e) {
        console.error('Error loading storico:', e)
        showToast('Errore nel caricamento dello storico', 'error')
    } finally {
        loadingStorico.value[ortoId] = false
    }
}

// Forza il ricaricamento dello storico (ad esempio dopo aver accettato/rifiutato una richiesta)
const refreshStorico = () => {
    storicoLoadedForOrto.value = {}
    historicalRequestsData.value = []
}

// Raggruppa i dati per orto
const dataByOrto = computed(() => {
    const ortoMap = {}
    
    // Inizializza ogni orto
    orti.value.forEach(orto => {
        const ortoId = String(orto._id || orto.id)
        ortoMap[ortoId] = {
            orto: orto,
            pending: [],
            storico: []
        }
    })
    
    // Funzione helper per trovare l'orto di un lotto
    const findOrtoForLotto = (lottoId) => {
        return orti.value.find(o => 
            o.lotti && o.lotti.some(l => {
                const lId = typeof l === 'object' ? (l._id || l.id) : l
                return String(lId) === String(lottoId)
            })
        )
    }
    
    // Aggiungi richieste pendenti
    pendingRequestsData.value.forEach(req => {
        const lottoId = typeof req.lotto === 'object' ? (req.lotto._id || req.lotto.id) : req.lotto
        const orto = findOrtoForLotto(lottoId)
        if (orto) {
            const ortoId = String(orto._id || orto.id)
            if (ortoMap[ortoId]) {
                ortoMap[ortoId].pending.push({
                    ...req,
                    userDetails: getUserDetails(req.utente)
                })
            }
        }
    })
    
    // Aggiungi storico solo per gli orti che lo hanno caricato
    historicalRequestsData.value.forEach(req => {
        const lottoId = typeof req.lotto === 'object' ? (req.lotto._id || req.lotto.id) : req.lotto
        const orto = findOrtoForLotto(lottoId)
        if (orto) {
            const ortoId = String(orto._id || orto.id)
            if (ortoMap[ortoId]) {
                ortoMap[ortoId].storico.push({
                    ...req,
                    userDetails: getUserDetails(req.utente)
                })
            }
        }
    })
    
    return ortoMap
})

const confirmAccept = async () => {
    if (!requestToAccept.value) return
    if (!acceptanceEndDate.value) {
        showToast('Devi selezionare una data di fine validità.', 'warning')
        return
    }

    const request = requestToAccept.value

    try {
        // Accept this request with END DATE using the correct /gestisci endpoint
        await api.put(`/affidaLotti/${request._id}/gestisci`, { 
            azione: 'accetta',
            data_inizio: new Date().toISOString().split('T')[0],
            data_fine: acceptanceEndDate.value
        })
        
        showToast('Richiesta accettata con successo!', 'success')
        const modal = document.getElementById('accept_modal')
        if (modal) modal.close()
        refreshStorico() // Invalida lo storico
        await fetchData() // Refresh
    } catch (e) {
        console.error('Error accepting request', e)
        showToast('Errore durante l\'operazione', 'error')
    }
}

const handleReject = async (request) => {
    try {
        await api.put(`/affidaLotti/${request._id}/gestisci`, { azione: 'rifiuta' })
        showToast('Richiesta rifiutata.', 'warning')
        refreshStorico() // Invalida lo storico
        await fetchData()
    } catch (e) {
        console.error('Error rejecting request', e)
        showToast('Errore durante l\'operazione', 'error')
    }
}

const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString()
}
</script>

<template>
<div class="p-6 min-h-[calc(100vh-64px)] w-full flex flex-col items-center gap-6">
    <div class="w-full max-w-6xl">
        <h1 class="text-3xl font-bold text-primary mb-2">Gestione Richieste e Assegnazioni</h1>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading loading-spinner loading-lg text-primary"></div>

    <!-- Empty State -->
    <div v-else-if="orti.length === 0" class="w-full max-w-6xl card bg-base-100 shadow-xl p-10 text-center opacity-70">
        <h3 class="text-xl font-bold mb-2">Nessun orto assegnato</h3>
        <p>Non ci sono orti gestiti dalla tua associazione al momento.</p>
    </div>

    <!-- List by Orto -->
    <div v-else class="w-full max-w-6xl flex flex-col gap-8">
        <div v-for="(data, ortoId) in dataByOrto" :key="ortoId" class="card bg-base-100 shadow-2xl border-2 border-primary/20">
            <div class="card-body">
                <!-- Orto Header -->
                <div class="flex items-start justify-between mb-6">
                    <div>
                        <h2 class="card-title text-2xl text-primary mb-1">{{ data.orto.nome }}</h2>
                        <p class="text-sm text-gray-500">{{ data.orto.indirizzo }}</p>
                        <div class="flex gap-2 mt-2">
                            <div class="badge badge-outline">{{ data.orto.lotti?.length || 0 }} lotti</div>
                        </div>
                    </div>
                    <div class="stats shadow-sm">
                        <div class="stat p-3">
                            <div class="stat-title text-xs">Pendenti</div>
                            <div class="stat-value text-xl text-warning">{{ data.pending.length }}</div>
                        </div>
                    </div>
                </div>

                <!-- Richieste Pendenti -->
                <div v-if="data.pending.length > 0" class="mb-6">
                    <h3 class="text-lg font-bold text-warning mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                        </svg>
                        Richieste Pendenti ({{ data.pending.length }})
                    </h3>
                    <div class="overflow-x-auto">
                        <table class="table table-zebra w-full">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Lotto</th>
                                    <th>Richiedente</th>
                                    <th class="text-right">Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="req in data.pending" :key="req._id">
                                    <td>{{ formatDate(req.createdAt || req.data_richiesta) }}</td>
                                    <td>
                                        <div class="font-semibold">{{ getLottoNumber(req.lotto?._id || req.lotto?.id || req.lotto, data.orto) }}</div>
                                        <div class="text-xs opacity-60">{{ req.lotto?.dimensione }} m²</div>
                                    </td>
                                    <td>
                                        <div class="font-bold cursor-pointer hover:text-primary hover:underline" 
                                             @click="openUserModal(req.userDetails)">
                                            {{ req.userDetails?.nome || req.utente?.nome || 'Utente' }} 
                                            {{ req.userDetails?.cognome || req.utente?.cognome || '' }}
                                        </div>
                                        <div class="text-xs opacity-50">{{ req.userDetails?.email || req.utente?.email || 'No email' }}</div>
                                    </td>
                                    <td class="text-right">
                                        <div class="join">
                                            <button @click="openAcceptModal(req)" 
                                                    class="btn btn-sm btn-success join-item text-white">
                                                Accetta
                                            </button>
                                            <button @click="handleReject(req)" 
                                                    class="btn btn-sm btn-error join-item text-white">
                                                Rifiuta
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Storico -->
                <div>
                    <details class="collapse collapse-arrow bg-base-200" @toggle="(e) => e.target.open && loadStoricoForOrto(ortoId)">
                        <summary class="collapse-title text-lg font-bold cursor-pointer">
                            <div class="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                                </svg>
                                <span>Storico Assegnazioni</span>
                                <span v-if="storicoLoadedForOrto[ortoId]" class="badge badge-sm badge-ghost">{{ data.storico.length }}</span>
                            </div>
                        </summary>
                        <div class="collapse-content">
                            <!-- Loading -->
                            <div v-if="loadingStorico[ortoId]" class="flex justify-center py-8">
                                <div class="loading loading-spinner loading-md text-primary"></div>
                            </div>
                            
                            <!-- Empty State -->
                            <div v-else-if="storicoLoadedForOrto[ortoId] && data.storico.length === 0" 
                                 class="text-center py-8 opacity-50">
                                <p>Nessuna assegnazione storica per questo orto</p>
                            </div>
                            
                            <!-- Storico Table -->
                            <div v-else-if="data.storico.length > 0" class="overflow-x-auto mt-4">
                                <table class="table table-sm w-full">
                                    <thead>
                                        <tr>
                                            <th>Data Richiesta</th>
                                            <th>Lotto</th>
                                            <th>Richiedente</th>
                                            <th>Periodo</th>
                                            <th>Stato</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="req in data.storico" :key="req._id" class="hover">
                                            <td>{{ formatDate(req.createdAt || req.data_richiesta) }}</td>
                                            <td>
                                                <div class="font-semibold text-sm">{{ getLottoNumber(req.lotto?._id || req.lotto?.id || req.lotto, data.orto) }}</div>
                                                <div class="text-xs opacity-60">{{ req.lotto?.dimensione }} m²</div>
                                            </td>
                                            <td>
                                                <div class="font-bold cursor-pointer hover:text-primary hover:underline text-sm" 
                                                     @click="openUserModal(req.userDetails)">
                                                    {{ req.userDetails?.nome || req.utente?.nome || 'Utente' }} 
                                                    {{ req.userDetails?.cognome || req.utente?.cognome || '' }}
                                                </div>
                                            </td>
                                            <td>
                                                <span v-if="req.data_inizio && req.data_fine" class="text-xs">
                                                    {{ formatDate(req.data_inizio) }} - {{ formatDate(req.data_fine) }}
                                                </span>
                                                <span v-else class="text-xs opacity-50">-</span>
                                            </td>
                                            <td>
                                                <div class="badge badge-sm" :class="{
                                                    'badge-success': req.stato === 'accepted',
                                                    'badge-error': req.stato === 'rejected'
                                                }">
                                                    {{ req.stato === 'accepted' ? 'Accettata' : 'Rifiutata' }}
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </details>
                </div>

                <!-- Empty State per orto -->
                <div v-if="data.pending.length === 0" 
                     class="text-center py-8 opacity-50">
                    <p>Nessuna richiesta pendente per questo orto</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Accept Confirmation Modal -->
    <dialog id="accept_modal" class="modal">
        <div class="modal-box">
            <h3 class="font-bold text-lg mb-4 text-success">Accetta Richiesta</h3>
            
            <p class="mb-4">
                Stai per assegnare il lotto a 
                <span class="font-bold">
                    {{ requestToAccept?.userDetails?.nome || requestToAccept?.utente?.nome }} 
                    {{ requestToAccept?.userDetails?.cognome || requestToAccept?.utente?.cognome }}
                </span>.
                Questa azione rifiuterà automaticamente tutte le altre richieste pendenti per questo lotto.
            </p>

            <div class="form-control w-full">
                <label class="label">
                    <span class="label-text">Data di Scadenza Affidamento</span>
                </label>
                <input type="date" v-model="acceptanceEndDate" class="input input-bordered w-full" />
            </div>

            <div class="modal-action">
                <form method="dialog">
                    <button class="btn btn-ghost mr-2">Annulla</button>
                    <button class="btn btn-success text-white" @click.prevent="confirmAccept">Conferma Assegnazione</button>
                </form>
            </div>
        </div>
    </dialog>

    <!-- User Info Modal -->
    <dialog id="user_modal" class="modal">
        <div class="modal-box">
            <h3 class="font-bold text-lg mb-4 text-primary">Dettagli Utente</h3>
            
            <div v-if="selectedUser" class="flex flex-col gap-3">
                <div class="flex items-center gap-2">
                    <div class="font-semibold w-32">Nome:</div>
                    <div>{{ selectedUser.nome }} {{ selectedUser.cognome }}</div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="font-semibold w-32">Email:</div>
                    <div>{{ selectedUser.email }}</div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="font-semibold w-32">Telefono:</div>
                    <div>{{ selectedUser.telefono || '-' }}</div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="font-semibold w-32">Codice Fiscale:</div>
                    <div>{{ selectedUser.codicefiscale || '-' }}</div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="font-semibold w-32">Indirizzo:</div>
                    <div>{{ selectedUser.indirizzo || '-' }}</div>
                </div>
            </div>

            <div class="modal-action">
                <form method="dialog">
                    <button class="btn">Chiudi</button>
                </form>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button>close</button>
        </form>
    </dialog>

    <!-- Toast -->
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
