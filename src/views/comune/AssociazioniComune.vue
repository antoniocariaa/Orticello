<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../../services/api'

const associazioni = ref([])
const affidamenti = ref([])
const orti = ref([])
const loading = ref(true)
const error = ref(null)

const selectedAssociazione = ref(null)
const isModalOpen = ref(false)

const fetchData = async () => {
    loading.value = true
    error.value = null
    try {
        const [assocRes, affidaRes, ortiRes] = await Promise.all([
            api.get('/associazioni'),
            api.get('/affidaOrti'),
            api.get('/orti')
        ])

        associazioni.value = Array.isArray(assocRes) ? assocRes : (assocRes.data || [])
        affidamenti.value = Array.isArray(affidaRes) ? affidaRes : (affidaRes.data || [])
        orti.value = Array.isArray(ortiRes) ? ortiRes : (ortiRes.data || [])

    } catch (e) {
        console.error('Error fetching data:', e)
        error.value = 'Impossibile caricare i dati. Riprova più tardi.'
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchData()
})

const openDetails = (assoc) => {
    selectedAssociazione.value = assoc
    isModalOpen.value = true
}

const getManagedOrti = (assocId) => {
    // Find all assignments for this association
    const assignments = affidamenti.value.filter(a => {
        const aId = a.associazione?._id || a.associazione
        return aId === assocId
    })

    // Map content to orti details
    return assignments.map(assignment => {
        const ortoId = assignment.orto?._id || assignment.orto
        const ortoDetails = orti.value.find(o => (o._id || o.id) === ortoId) || {}
        
        return {
            ...ortoDetails,
            assignment_start: assignment.data_inizio,
            assignment_end: assignment.data_fine
        }
    }).filter(o => o.nome) // Filter out any not found orti
}

const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('it-IT')
}

// Add Association Logic
const isAddModalOpen = ref(false)
const isSubmitting = ref(false)
const newAssociazione = ref({
    nome: '',
    indirizzo: '',
    telefono: '',
    email: ''
})

const openAddModal = () => {
    newAssociazione.value = { nome: '', indirizzo: '', telefono: '', email: '' }
    isAddModalOpen.value = true
}

const createAssociazione = async () => {
    // Basic validation
    if (!newAssociazione.value.nome || !newAssociazione.value.indirizzo || !newAssociazione.value.telefono || !newAssociazione.value.email) {
        showToast('Compila tutti i campi obbligatori.', 'error')
        return
    }

    isSubmitting.value = true
    try {
        await api.post('/associazioni', newAssociazione.value)
        showToast('Associazione creata con successo!', 'success')
        isAddModalOpen.value = false
        fetchData() // Refresh list
    } catch (e) {
        console.error('Error creating association:', e)
        showToast(e.message || 'Errore durante la creazione.', 'error')
    } finally {
        isSubmitting.value = false
    }
}

// Toast
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
    toast.value = { show: true, message, type }
    setTimeout(() => toast.value.show = false, 3000)
}
</script>

<template>
  <div class="p-6 min-h-[calc(100vh-64px)] w-full flex flex-col items-center gap-6">
    
    <div class="w-full max-w-6xl flex justify-between items-end">
        <div>
            <h1 class="text-3xl font-bold text-primary mb-2">🤝 Associazioni</h1>
            <p class="text-gray-600">Elenco delle associazioni registrate e dei loro orti gestiti.</p>
        </div>
        <button @click="openAddModal" class="btn btn-primary gap-2">
            <span class="text-xl">+</span> Aggiungi Associazione
        </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="w-full max-w-6xl flex justify-center py-12">
        <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-error max-w-2xl">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>{{ error }}</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="associazioni.length === 0" class="w-full max-w-6xl text-center py-12 bg-base-100 rounded-box shadow-sm border border-base-200">
        <p class="text-lg opacity-60">Nessuna associazione trovata.</p>
    </div>

    <!-- Grid Layout -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        <div v-for="assoc in associazioni" :key="assoc._id || assoc.id" 
             class="card bg-base-100 shadow-xl border border-base-200 hover:shadow-2xl transition-all cursor-pointer group"
             @click="openDetails(assoc)">
            <div class="card-body">
                <div class="flex items-start justify-between">
                    <div class="avatar placeholder">
                        <div class="bg-primary text-primary-content rounded-full w-12">
                            <span class="text-xl font-bold">{{ assoc.nome ? assoc.nome.charAt(0).toUpperCase() : '?' }}</span>
                        </div>
                    </div>
                </div>
                
                <h2 class="card-title text-primary mt-2 group-hover:underline">{{ assoc.nome }}</h2>
                
                <div class="text-sm text-gray-600 space-y-1 mt-2">
                    <div v-if="assoc.email" class="flex items-center gap-2">
                        <span class="opacity-70">📧</span> {{ assoc.email }}
                    </div>
                    <div v-if="assoc.telefono" class="flex items-center gap-2">
                        <span class="opacity-70">📞</span> {{ assoc.telefono }}
                    </div>
                    <div v-if="assoc.codicefiscale" class="flex items-center gap-2">
                        <span class="opacity-70">🆔</span> {{ assoc.codicefiscale }}
                    </div>
                </div>

                <div class="card-actions justify-end mt-4">
                    <button class="btn btn-sm btn-ghost hover:bg-primary hover:text-primary-content hover:border-primary transition-all gap-1 group">
                        <span>Vedi Dettagli</span>
                        <span class="transition-transform group-hover:translate-x-1">→</span>
                    </button>                
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Details -->
    <dialog class="modal" :class="{ 'modal-open': isModalOpen }">
        <div class="modal-box w-11/12 max-w-5xl bg-base-100">
            <div v-if="selectedAssociazione">
                <div class="flex flex-col md:flex-row gap-6 md:items-start border-b border-base-200 pb-6 mb-6">
                    <div class="avatar placeholder">
                        <div class="bg-primary text-primary-content rounded-xl w-24 h-24 text-3xl font-bold">
                            {{ selectedAssociazione.nome ? selectedAssociazione.nome.charAt(0).toUpperCase() : '?' }}
                        </div>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-3xl text-primary">{{ selectedAssociazione.nome }}</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-4 text-sm">
                            <div class="flex gap-2"><span class="font-semibold w-24">Email:</span> {{ selectedAssociazione.email || '-' }}</div>
                            <div class="flex gap-2"><span class="font-semibold w-24">Telefono:</span> {{ selectedAssociazione.telefono || '-' }}</div>
                            <div class="flex gap-2"><span class="font-semibold w-24">Cod. Fiscale:</span> {{ selectedAssociazione.codicefiscale || '-' }}</div>
                            <div class="flex gap-2"><span class="font-semibold w-24">Indirizzo:</span> {{ selectedAssociazione.indirizzo || '-' }}</div>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 class="font-bold text-xl mb-4 flex items-center gap-2">
                        🌱 Orti Gestiti
                        <span class="badge badge-primary badge-outline">{{ getManagedOrti(selectedAssociazione._id || selectedAssociazione.id).length }}</span>
                    </h4>
                    
                    <div v-if="getManagedOrti(selectedAssociazione._id || selectedAssociazione.id).length === 0" class="alert alert-info bg-base-200 border-none text-base-content/70">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>Nessun orto attualmente assegnato a questa associazione.</span>
                    </div>

                    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div v-for="orto in getManagedOrti(selectedAssociazione._id || selectedAssociazione.id)" :key="orto._id || orto.id"
                             class="card bg-base-100 border border-base-300 shadow-sm">
                            <div class="card-body p-5">
                                <h5 class="card-title text-lg">{{ orto.nome }}</h5>
                                <p class="text-sm text-gray-500 flex items-center gap-1">📍 {{ orto.indirizzo }}</p>
                                
                                <div class="divider my-2"></div>
                                
                                <div class="text-xs space-y-1">
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">Inizio Affidamento:</span>
                                        <span class="font-medium">{{ formatDate(orto.assignment_start) }}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">Fine Affidamento:</span>
                                        <span class="font-medium">{{ formatDate(orto.assignment_end) }}</span>
                                    </div>
                                    <div class="flex justify-between mt-2 pt-2 border-t border-base-200">
                                         <span class="text-gray-500">Lotti Totali:</span>
                                         <span class="badge badge-sm badge-ghost">{{ orto.lotti?.length || 0 }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="modal-action">
                <form method="dialog">
                    <button class="btn" @click="isModalOpen = false">Chiudi</button>
                </form>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button @click="isModalOpen = false">close</button>
        </form>
    </dialog>

    <!-- Add Association Modal -->
    <dialog class="modal" :class="{ 'modal-open': isAddModalOpen }">
        <div class="modal-box w-11/12 max-w-2xl bg-base-100">
            <h3 class="font-bold text-2xl mb-6 text-center">Aggiungi Nuova Associazione</h3>
            
            <form @submit.prevent="createAssociazione" class="flex flex-col gap-4">
                <div class="form-control">
                    <label class="label">Nome Associazione</label>
                    <input v-model="newAssociazione.nome" type="text" class="input input-bordered w-full" placeholder="Es. Amici del Verde" required />
                </div>
                
                <div class="form-control">
                    <label class="label">Indirizzo</label>
                    <input v-model="newAssociazione.indirizzo" type="text" class="input input-bordered w-full" placeholder="Via delle Piante 12" required />
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="form-control">
                        <label class="label">Telefono</label>
                        <input v-model="newAssociazione.telefono" type="tel" class="input input-bordered w-full" placeholder="333 1234567" required />
                    </div>
                    <div class="form-control">
                        <label class="label">Email</label>
                        <input v-model="newAssociazione.email" type="email" class="input input-bordered w-full" placeholder="info@associazione.it" required />
                    </div>
                </div>

                <div class="modal-action border-t border-base-200 pt-4 mt-4">
                    <button type="button" @click="isAddModalOpen = false" class="btn btn-ghost">Annulla</button>
                    <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                        <span v-if="isSubmitting" class="loading loading-spinner loading-sm"></span>
                        {{ isSubmitting ? 'Salvataggio...' : 'Crea Associazione' }}
                    </button>
                </div>
            </form>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button @click="isAddModalOpen = false">close</button>
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
