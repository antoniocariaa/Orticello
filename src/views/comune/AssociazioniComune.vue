<script setup>
import { ref, onMounted} from 'vue'
import { useI18n } from 'vue-i18n'
import api from '../../services/api'
import { Plus, Mail, Phone, FileText, MapPin, Sprout, Handshake } from 'lucide-vue-next'

const { t } = useI18n()

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
        error.value = t('comune.home.error_loading')
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
        showToast(t('comune.associations.fill_required'), 'error')
        return
    }

    isSubmitting.value = true
    try {
        await api.post('/associazioni', newAssociazione.value)
        showToast(t('comune.associations.created_success'), 'success')
        isAddModalOpen.value = false
        fetchData() // Refresh list
    } catch (e) {
        console.error('Error creating association:', e)
        showToast(e.message || t('comune.associations.creation_error'), 'error')
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
            <h1 class="text-3xl font-bold text-primary mb-2 flex items-center gap-2">
                <Handshake class="w-8 h-8" /> {{ $t('comune.associations.title') }}
            </h1>
            <p class="text-gray-600">{{ $t('comune.associations.subtitle') }}</p>
        </div>
        <button @click="openAddModal" class="btn btn-primary gap-2">
            <Plus class="w-5 h-5" /> {{ $t('comune.associations.add_association') }}
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
        <p class="text-lg opacity-60">{{ $t('comune.associations.no_associations') }}</p>
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
                        <Mail class="w-4 h-4 opacity-70" /> {{ assoc.email }}
                    </div>
                    <div v-if="assoc.telefono" class="flex items-center gap-2">
                        <Phone class="w-4 h-4 opacity-70" /> {{ assoc.telefono }}
                    </div>
                    <div v-if="assoc.codicefiscale" class="flex items-center gap-2">
                        <FileText class="w-4 h-4 opacity-70" /> {{ assoc.codicefiscale }}
                    </div>
                </div>

                <div class="card-actions justify-end mt-4">
                    <button class="btn btn-sm btn-ghost hover:bg-primary hover:text-primary-content hover:border-primary transition-all gap-1 group">
                        <span>{{ $t('comune.associations.see_details') }}</span>
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
                            <div class="flex gap-2"><span class="font-semibold w-24">{{ $t('comune.associations.email') }}</span> {{ selectedAssociazione.email || '-' }}</div>
                            <div class="flex gap-2"><span class="font-semibold w-24">{{ $t('comune.associations.phone') }}</span> {{ selectedAssociazione.telefono || '-' }}</div>
                            <div class="flex gap-2"><span class="font-semibold w-24">{{ $t('comune.associations.tax_id') }}</span> {{ selectedAssociazione.codicefiscale || '-' }}</div>
                            <div class="flex gap-2"><span class="font-semibold w-24">{{ $t('comune.associations.address') }}</span> {{ selectedAssociazione.indirizzo || '-' }}</div>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 class="font-bold text-xl mb-4 flex items-center gap-2">
                        <Sprout class="w-6 h-6 text-primary" /> {{ $t('comune.associations.managed_orti') }}
                        <span class="badge badge-primary badge-outline">{{ getManagedOrti(selectedAssociazione._id || selectedAssociazione.id).length }}</span>
                    </h4>
                    
                    <div v-if="getManagedOrti(selectedAssociazione._id || selectedAssociazione.id).length === 0" class="alert alert-info bg-base-200 border-none text-base-content/70">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>{{ $t('comune.associations.no_managed_orti') }}</span>
                    </div>

                    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div v-for="orto in getManagedOrti(selectedAssociazione._id || selectedAssociazione.id)" :key="orto._id || orto.id"
                             class="card bg-base-100 border border-base-300 shadow-sm">
                            <div class="card-body p-5">
                                <h5 class="card-title text-lg">{{ orto.nome }}</h5>
                                <p class="text-sm text-gray-500 flex items-center gap-1"><MapPin class="w-4 h-4" /> {{ orto.indirizzo }}</p>
                                
                                <div class="divider my-2"></div>
                                
                                <div class="text-xs space-y-1">
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">{{ $t('comune.associations.assignment_start') }}</span>
                                        <span class="font-medium">{{ formatDate(orto.assignment_start) }}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">{{ $t('comune.associations.assignment_end') }}</span>
                                        <span class="font-medium">{{ formatDate(orto.assignment_end) }}</span>
                                    </div>
                                    <div class="flex justify-between mt-2 pt-2 border-t border-base-200">
                                         <span class="text-gray-500">{{ $t('comune.associations.total_lots') }}</span>
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
                    <button class="btn" @click="isModalOpen = false">{{ $t('comune.associations.close') }}</button>
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
            <h3 class="font-bold text-2xl mb-6 text-center">{{ $t('comune.associations.add_new_association') }}</h3>
            
            <form @submit.prevent="createAssociazione" class="flex flex-col gap-4">
                <div class="form-control">
                    <label class="label">{{ $t('comune.associations.association_name') }}</label>
                    <input v-model="newAssociazione.nome" type="text" class="input input-bordered w-full" placeholder="Es. Amici del Verde" required />
                </div>
                
                <div class="form-control">
                    <label class="label">{{ $t('comune.associations.association_address') }}</label>
                    <input v-model="newAssociazione.indirizzo" type="text" class="input input-bordered w-full" placeholder="Via delle Piante 12" required />
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="form-control">
                        <label class="label">{{ $t('comune.associations.association_phone') }}</label>
                        <input v-model="newAssociazione.telefono" type="tel" class="input input-bordered w-full" placeholder="333 1234567" required />
                    </div>
                    <div class="form-control">
                        <label class="label">{{ $t('comune.associations.association_email') }}</label>
                        <input v-model="newAssociazione.email" type="email" class="input input-bordered w-full" placeholder="info@associazione.it" required />
                    </div>
                </div>

                <div class="modal-action border-t border-base-200 pt-4 mt-4">
                    <button type="button" @click="isAddModalOpen = false" class="btn btn-ghost">{{ $t('comune.associations.cancel') }}</button>
                    <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                        <span v-if="isSubmitting" class="loading loading-spinner loading-sm"></span>
                        {{ isSubmitting ? $t('comune.associations.creating') : $t('comune.associations.create') }}
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
