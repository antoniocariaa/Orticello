<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../../services/api'
import { store } from '../../store'

const orti = ref([])
const requests = ref([])
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
        
        //Fetch Orti, Requests, USERS, and AffidaOrti
        const [ortiResponse, requestsResponse, usersResponse, affidaOrtoResponse] = await Promise.all([
            api.get('/orti'),
            api.get('/affidaLotti'),
            api.get('/utenti'),
            api.get('/affidaOrti')
        ])

        const allOrti = Array.isArray(ortiResponse) ? ortiResponse : (ortiResponse.data || [])
        const allRequests = Array.isArray(requestsResponse) ? requestsResponse : (requestsResponse.data || [])
        const allUsers = Array.isArray(usersResponse) ? usersResponse : (usersResponse.data || [])
        const allAffidaOrti = Array.isArray(affidaOrtoResponse) ? affidaOrtoResponse : (affidaOrtoResponse.data || [])
        
        users.value = allUsers

        // Filter Orti for this Association via AffidaOrto
        // Find which Orti are assigned to my Association AND are currently active
        const now = new Date()
        const myAffidi = allAffidaOrti.filter(ao => {
             const aId = typeof ao.associazione === 'object' ? (ao.associazione._id || ao.associazione.id) : ao.associazione
             
             // Check ownership
             if (String(aId) !== String(myAssocId)) return false

             // Check dates (inclusive)
             const start = new Date(ao.data_inizio)
             const end = new Date(ao.data_fine)
             
             return now >= start && now <= end
        })

        const myOrtoIds = new Set(myAffidi.map(ao => {
            const o = ao.orto
            return String(typeof o === 'object' ? (o._id || o.id) : o)
        }))

        // Filter allOrti to keep only those present in myOrtoIds
        orti.value = allOrti.filter(o => myOrtoIds.has(String(o._id || o.id)))
        
        console.log('Filtered Orti:', orti.value.length)

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

        // Filter Requests
        console.log('Total Requests Fetched:', allRequests.length)

        requests.value = allRequests.filter(r => {
             const lotto = r.lotto
             const lottoId = typeof lotto === 'object' ? (lotto._id || lotto.id) : lotto
             return lottoId && myLottoIds.has(String(lottoId))
        })
        
        console.log('My Relevant Requests:', requests.value.length)

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
    return users.value.find(u => (u._id || u.id) === id) || null
}

// Group requests by Lotto for easier UI
const requestsByLotto = computed(() => {
    const groups = {}
    
    requests.value.forEach(r => {
        const lotto = r.lotto
        const lottoId = typeof lotto === 'object' ? (lotto._id || lotto.id) : lotto
        const lIdStr = String(lottoId)
        
        if (!groups[lIdStr]) {
            const parentOrto = orti.value.find(o => 
                o.lotti.some(l => {
                     const lId = typeof l === 'object' ? (l._id || l.id) : l
                     return String(lId) === lIdStr
                })
            )
            
            groups[lIdStr] = {
                lottoId: lIdStr,
                lottoDetails: lotto, 
                ortoName: parentOrto ? parentOrto.nome : 'Orto Sconosciuto',
                requests: []
            }
        }
        
        // Enrich request with User Details
        const userDetails = getUserDetails(r.utente)
        
        groups[lIdStr].requests.push({
            ...r,
            userDetails // Attach found user object
        })
    })
    
    return groups
})

const confirmAccept = async () => {
    if (!requestToAccept.value) return
    if (!acceptanceEndDate.value) {
        showToast('Devi selezionare una data di fine validità.', 'warning')
        return
    }

    const request = requestToAccept.value

    try {
        // Accept this request with END DATE
        await api.put(`/affidaLotti/${request._id}`, { 
            stato: 'accepted',
            data_inizio: new Date(),
            data_fine: new Date(acceptanceEndDate.value)
        })
        
        // Reject all other PENDING requests:
        const lottoId = typeof request.lotto === 'object' ? (request.lotto._id || request.lotto.id) : request.lotto
        const userId = typeof request.utente === 'object' ? (request.utente._id || request.utente.id) : request.utente

        const siblings = requests.value.filter(r => {
             if (r._id === request._id) return false // Skip the one we just accepted
             if (r.stato !== 'pending') return false // Skip non-pending

             const rLottoId = typeof r.lotto === 'object' ? (r.lotto._id || r.lotto.id) : r.lotto
             const rUserId = typeof r.utente === 'object' ? (r.utente._id || r.utente.id) : r.utente

             // Reject if same Lotto OR same User
             return String(rLottoId) === String(lottoId) || String(rUserId) === String(userId)
        })
        
        await Promise.all(siblings.map(sib => 
            api.put(`/affidaLotti/${sib._id}`, { stato: 'rejected' })
        ))
        
        showToast('Richiesta accettata. Altre richieste incompatibili rifiutate.', 'success')
        const modal = document.getElementById('accept_modal')
        if (modal) modal.close()
        await fetchData() // Refresh
    } catch (e) {
        console.error('Error accepting request', e)
        showToast('Errore durante l\'operazione', 'error')
    }
}

const handleReject = async (request) => {
    try {
        await api.put(`/affidaLotti/${request._id}`, { stato: 'rejected' })
        showToast('Richiesta rifiutata.', 'warning')
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
    <div class="w-full max-w-5xl">
        <h1 class="text-3xl font-bold text-primary mb-2">Richieste Lotti</h1>
        <p class="text-gray-600">Gestisci le richieste di assegnazione per i tuoi lotti.</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading loading-spinner loading-lg text-primary"></div>

    <!-- Empty State -->
    <div v-else-if="requests.length === 0" class="w-full max-w-5xl card bg-base-100 shadow-xl p-10 text-center opacity-70">
        <h3 class="text-xl font-bold mb-2">Nessuna richiesta pending</h3>
        <p>Non ci sono nuove richieste per i tuoi orti al momento.</p>
    </div>

    <!-- List -->
    <div v-else class="w-full max-w-5xl flex flex-col gap-6">
        
        <div v-for="(group, lId) in requestsByLotto" :key="lId" class="card bg-base-100 shadow-xl border border-base-200">
            <div class="card-body">
                <h2 class="card-title text-secondary">
                    Lotto in {{ group.ortoName }}
                </h2>
                <div class="text-xs uppercase tracking-wide opacity-50 mb-4">ID: {{ lId }}</div>
                
                <div class="flex flex-wrap gap-2 mb-4">
                    <div class="badge badge-outline">
                        Dimensioni: {{ group.lottoDetails?.dimensione || '-' }} m²
                    </div>
                    <div class="badge badge-outline" :class="group.lottoDetails?.sensori ? 'badge-success' : 'badge-ghost'">
                        {{ group.lottoDetails?.sensori ? 'Con Sensori' : 'Senza Sensori' }}
                    </div>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="table w-full">
                        <thead>
                            <tr>
                                <th>Data Richiesta</th>
                                <th>Richiedente</th>
                                <th>Stato</th>
                                <th class="text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="req in group.requests" :key="req._id">
                                <td>{{ formatDate(req.createdAt || req.data_richiesta) }}</td>
                                <td>
                                    <div class="font-bold cursor-pointer hover:text-primary hover:underline" @click="openUserModal(req.userDetails || req.utente)">
                                        {{ req.userDetails?.nome || req.utente?.nome || 'Utente' }} 
                                        {{ req.userDetails?.cognome || req.utente?.cognome || '' }}
                                    </div>
                                    <div class="text-xs opacity-50">{{ req.userDetails?.email || req.utente?.email || 'No email' }}</div>
                                </td>
                                <td>
                                    <div class="badge" :class="{
                                        'badge-warning': req.stato === 'pending',
                                        'badge-success text-white': req.stato === 'accepted',
                                        'badge-error text-white': req.stato === 'rejected'
                                    }">
                                        {{ req.stato }}
                                    </div>
                                </td>
                                <td class="text-right">
                                    <div v-if="req.stato === 'pending'" class="join">
                                        <button @click="openAcceptModal(req)" class="btn btn-sm btn-success join-item text-white">Accetta</button>
                                        <button @click="handleReject(req)" class="btn btn-sm btn-error join-item text-white">Rifiuta</button>
                                    </div>


                                    <span v-else class="text-xs opacity-50 italic">Processata</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
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
