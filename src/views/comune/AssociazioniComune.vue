<script setup>
import { ref, onMounted} from 'vue'
import { useI18n } from 'vue-i18n'
import api from '../../services/api'
import { Plus, Mail, Phone, FileText, MapPin, Sprout, Handshake, Pencil, Trash2 } from 'lucide-vue-next'

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


// Edit Association Logic
const isEditModalOpen = ref(false)
const isSubmittingEdit = ref(false)
const editAssociazioneData = ref({
    id: '',
    nome: '',
    indirizzo: '',
    telefono: '',
    email: ''
})

const openEditModal = (assoc) => {
    editAssociazioneData.value = {
        id: assoc._id || assoc.id,
        nome: assoc.nome,
        indirizzo: assoc.indirizzo,
        telefono: assoc.telefono,
        email: assoc.email
    }
    isEditModalOpen.value = true
}

const closeEditModal = () => {
    isEditModalOpen.value = false
    editAssociazioneData.value = { id: '', nome: '', indirizzo: '', telefono: '', email: '' }
}

const updateAssociazione = async () => {
    // Basic validation
    if (!editAssociazioneData.value.nome || !editAssociazioneData.value.indirizzo || !editAssociazioneData.value.telefono || !editAssociazioneData.value.email) {
        showToast(t('comune.associations.fill_required'), 'error')
        return
    }

    isSubmittingEdit.value = true
    try {
        const payload = { ...editAssociazioneData.value }
        const id = payload.id
        delete payload.id

        await api.put(`/associazioni/${id}`, payload)
        showToast(t('comune.associations.updated_success'), 'success')
        closeEditModal()
        fetchData() // Refresh list
    } catch (e) {
        console.error('Error updating association:', e)
        showToast(e.message || t('comune.associations.update_error'), 'error')
    } finally {
        isSubmittingEdit.value = false
    }
}


// Delete Logic with Modal
const isDeleteModalOpen = ref(false)
const associationToDelete = ref(null)
const isDeleting = ref(false)

const confirmDeleteAssociazione = (assoc) => {
    associationToDelete.value = assoc
    isDeleteModalOpen.value = true
}

const closeDeleteModal = () => {
    isDeleteModalOpen.value = false
    associationToDelete.value = null
}

const confirmDelete = async () => {
    if (!associationToDelete.value) return

    isDeleting.value = true
    try {
        await api.delete(`/associazioni/${associationToDelete.value._id || associationToDelete.value.id}`)
        showToast(t('success.associazione_deleted'), 'success')
        fetchData() // Refresh list
        closeDeleteModal()
    } catch (e) {
        console.error('Error deleting association:', e)
        showToast(e.message || t('errors.deleting_associazione'), 'error')
    } finally {
        isDeleting.value = false
    }
}


// Toast
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
    toast.value = { show: true, message, type }
    setTimeout(() => toast.value.show = false, 3000)
}

// Members Logic
const selectedAssociazioneMembers = ref([])
const isMembersModalOpen = ref(false)
const isLoadingMembers = ref(false)

const viewMembers = async (assoc) => {
    selectedAssociazione.value = assoc
    isLoadingMembers.value = true
    isMembersModalOpen.value = true
    selectedAssociazioneMembers.value = []
    
    try {
        const res = await api.get(`/utenti/associazione/${assoc._id || assoc.id}`)
        selectedAssociazioneMembers.value = Array.isArray(res) ? res : (res.data || [])
    } catch (e) {
        console.error('Error fetching members:', e)
        showToast(t('comune.associations.error_loading_members'), 'error')
    } finally {
        isLoadingMembers.value = false
    }
}

const closeMembersModal = () => {
    isMembersModalOpen.value = false
    selectedAssociazioneMembers.value = []
}

// Edit Member Logic
const isEditMemberModalOpen = ref(false)
const editMemberId = ref(null)
const editMemberEmail = ref('')
const editMemberAdmin = ref(false)
const isEditingMember = ref(false)
const editMemberError = ref(null)

const openEditMemberModal = (member) => {
    editMemberId.value = member._id || member.id
    editMemberEmail.value = member.email
    editMemberAdmin.value = member.admin
    editMemberError.value = null
    isEditMemberModalOpen.value = true
}

const closeEditMemberModal = () => {
    isEditMemberModalOpen.value = false
    editMemberId.value = null
    editMemberEmail.value = ''
    editMemberAdmin.value = false
}

const updateMember = async () => {
    if (!editMemberId.value) return
    
    isEditingMember.value = true
    editMemberError.value = null
    
    try {
        const res = await api.put('/utenti/updateAssociazioneMember', {
            id: editMemberId.value,
            admin: editMemberAdmin.value
        })
        
        if (res.utente) {
            // Update local state
            const index = selectedAssociazioneMembers.value.findIndex(m => (m._id || m.id) === editMemberId.value)
            if (index !== -1) {
                selectedAssociazioneMembers.value[index] = res.utente
            }
            showToast(t('success.member_updated'), 'success')
            closeEditMemberModal()
        }
    } catch (e) {
        console.error('Error updating member:', e)
        editMemberError.value = e.message || t('members.update_error')
    } finally {
        isEditingMember.value = false
    }
}

// Remove Member Logic
const removeMember = async (memberId) => {
    if (!confirm(t('comune.associations.confirm_remove_member'))) return
    
    try {
        await api.put(`/utenti/removeAssociazioneRole/${memberId}`)
        
        // Remove from local list
        selectedAssociazioneMembers.value = selectedAssociazioneMembers.value.filter(m => (m._id || m.id) !== memberId)
        showToast(t('success.member_removed'), 'success')
    } catch (e) {
        console.error('Error removing member:', e)
        showToast(e.message || t('members.remove_error'), 'error')
    }
}

// Add Member Logic
const addMemberEmail = ref('')
const addMemberAdmin = ref(false)
const isAddingMember = ref(false)
const addMemberError = ref(null)
const isAddMemberModalOpen = ref(false)

const openAddMemberModal = () => {
    addMemberEmail.value = ''
    addMemberAdmin.value = false
    addMemberError.value = null
    isAddMemberModalOpen.value = true
}

const closeAddMemberModal = () => {
    isAddMemberModalOpen.value = false
}

const addMember = async () => {
    if (!addMemberEmail.value) return
    
    isAddingMember.value = true
    addMemberError.value = null
    
    try {
        const res = await api.put('/utenti/addAssociazioneMember', {
            email: addMemberEmail.value,
            admin: addMemberAdmin.value,
            associazione: selectedAssociazione.value._id || selectedAssociazione.value.id
        })
        
        // Refresh members list
        if (res.utente) {
            selectedAssociazioneMembers.value.push(res.utente)
            showToast(t('success.member_added'), 'success')
            closeAddMemberModal()
        }
    } catch (e) {
        console.error('Error adding member:', e)
        addMemberError.value = e.message || t('members.add_error')
    } finally {
        isAddingMember.value = false
    }
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
             class="card bg-base-100 shadow-lg border border-base-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden">
            
            <!-- Card Header Decoration -->
            <div class="h-2 bg-gradient-to-r from-primary to-secondary w-full"></div>
            
            <div class="card-body p-6">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center gap-3">
                        <div class="avatar placeholder">
                            <div class="bg-primary/10 text-primary rounded-full w-12 h-12 flex items-center justify-center border border-primary/20">
                                <span class="text-xl font-bold">{{ assoc.nome ? assoc.nome.charAt(0).toUpperCase() : '?' }}</span>
                            </div>
                        </div>
                        <h2 class="card-title text-lg font-bold text-gray-800 group-hover:text-primary transition-colors line-clamp-1" :title="assoc.nome">
                            {{ assoc.nome }}
                        </h2>
                    </div>
                </div>
                
                <div class="divider my-1"></div>

                <div class="text-sm text-gray-600 space-y-2 flex-grow">
                    <div v-if="assoc.email" class="flex items-center gap-2 group/item">
                        <div class="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-colors">
                             <Mail class="w-4 h-4" />
                        </div>
                        <span class="truncate" :title="assoc.email">{{ assoc.email }}</span>
                    </div>
                    <div v-if="assoc.telefono" class="flex items-center gap-2 group/item">
                        <div class="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-colors">
                            <Phone class="w-4 h-4" />
                        </div>
                        <span>{{ assoc.telefono }}</span>
                    </div>
                    <div v-if="assoc.indirizzo" class="flex items-center gap-2 group/item">
                        <div class="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-colors">
                            <MapPin class="w-4 h-4" />
                        </div>
                        <span class="truncate" :title="assoc.indirizzo">{{ assoc.indirizzo }}</span>
                    </div>
                </div>

                <div class="flex gap-2 mt-4 pt-4 border-t border-base-100">
                    <div class="badge badge-ghost gap-1 p-3 flex-1 justify-center" :title="$t('comune.associations.managed_orti')">
                         <Sprout class="w-3 h-3" /> 
                         <span class="font-bold">{{ getManagedOrti(assoc._id || assoc.id).length }}</span> {{ $t('comune.associations.gardens_short') }}
                    </div>
                     <!-- Placeholder for members count if available -->
                </div>

                <div class="card-actions justify-end mt-4 gap-2">
                    <div class="join w-full grid grid-cols-3">
                        <button class="join-item btn btn-sm btn-ghost hover:bg-base-200 hover:text-primary tooltip"
                                :data-tip="$t('comune.associations.view_members')"
                                @click.stop="viewMembers(assoc)">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                            </svg>
                        </button>
                        <button class="join-item btn btn-sm btn-ghost hover:bg-warning/20 hover:text-warning tooltip"
                                :data-tip="$t('comune.associations.edit')"
                                @click.stop="openEditModal(assoc)">
                             <Pencil class="w-4 h-4" />
                        </button>
                        <button class="join-item btn btn-sm btn-ghost hover:bg-error/20 hover:text-error tooltip"
                                :data-tip="$t('comune.associations.delete')"
                                @click.stop="confirmDeleteAssociazione(assoc)">
                             <Trash2 class="w-4 h-4" />
                        </button>
                    </div>             
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Details -->
    <dialog class="modal" :class="{ 'modal-open': isModalOpen }">
        <div class="modal-box w-11/12 max-w-5xl bg-base-100 p-0 overflow-hidden">
            <!-- Modal Header -->
            <div class="bg-primary text-primary-content p-6 flex items-start gap-4">
                 <div class="avatar placeholder">
                    <div class="bg-white/20 text-white rounded-xl w-20 h-20 text-3xl font-bold flex items-center justify-center backdrop-blur-sm">
                        {{ selectedAssociazione?.nome ? selectedAssociazione.nome.charAt(0).toUpperCase() : '?' }}
                    </div>
                </div>
                <div class="flex-1">
                     <h3 class="font-bold text-3xl">{{ selectedAssociazione?.nome }}</h3>
                     <div class="flex flex-wrap gap-4 mt-2 opacity-90 text-sm">
                        <div class="flex items-center gap-2"><Mail class="w-4 h-4" /> {{ selectedAssociazione?.email || '-' }}</div>
                        <div class="flex items-center gap-2"><Phone class="w-4 h-4" /> {{ selectedAssociazione?.telefono || '-' }}</div>
                     </div>
                </div>
                 <button class="btn btn-sm btn-circle btn-ghost text-white/70 hover:text-white" @click="isModalOpen = false">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div class="p-6">
                <!-- Address & Extra Info -->
                 <div class="flex items-center gap-2 text-gray-600 mb-6 bg-base-200 p-3 rounded-lg">
                    <MapPin class="w-5 h-5 text-primary" />
                    <span class="font-medium">{{ selectedAssociazione?.indirizzo || '-' }}</span>
                </div>

                <div>
                    <h4 class="font-bold text-xl mb-4 flex items-center gap-2 border-b border-base-200 pb-2">
                        <Sprout class="w-6 h-6 text-primary" /> {{ $t('comune.associations.managed_orti') }}
                        <span class="badge badge-primary badge-outline ml-auto">{{ selectedAssociazione ? getManagedOrti(selectedAssociazione._id || selectedAssociazione.id).length : 0 }}</span>
                    </h4>
                    
                    <div v-if="selectedAssociazione && getManagedOrti(selectedAssociazione._id || selectedAssociazione.id).length === 0" 
                         class="alert alert-info bg-base-200 border-none text-base-content/70 flex justify-center">
                        <div class="flex items-center gap-2">
                            <span class="loading loading-ring loading-md"></span>
                            <span>{{ $t('comune.associations.no_managed_orti') }}</span>
                        </div>
                    </div>

                    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                        <div v-for="orto in (selectedAssociazione ? getManagedOrti(selectedAssociazione._id || selectedAssociazione.id) : [])" 
                             :key="orto._id || orto.id"
                             class="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-all">
                            <div class="card-body p-5">
                                <h5 class="card-title text-lg text-primary">{{ orto.nome }}</h5>
                                <p class="text-sm text-gray-500 flex items-center gap-1 mb-2"><MapPin class="w-3 h-3" /> {{ orto.indirizzo }}</p>
                                
                                <div class="stats stats-vertical lg:stats-horizontal shadow bg-base-200/50 w-full text-xs">
                                     <div class="stat p-2 place-items-center">
                                        <div class="stat-title">{{ $t('comune.associations.lots') }}</div>
                                        <div class="stat-value text-lg">{{ orto.lotti?.length || 0 }}</div>
                                    </div>
                                    <div class="stat p-2 place-items-center">
                                        <div class="stat-title">{{ $t('comune.associations.assignment_end') }}</div>
                                        <div class="stat-value text-sm font-medium">{{ formatDate(orto.assignment_end) }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
             <div class="modal-action bg-base-200/50 p-4 m-0">
                <form method="dialog">
                    <button class="btn" @click="isModalOpen = false">{{ $t('comune.associations.close') }}</button>
                </form>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button @click="isModalOpen = false">close</button>
        </form>
    </dialog>
    <!-- Delete Confirmation Modal -->
    <dialog class="modal" :class="{ 'modal-open': isDeleteModalOpen }">
        <div class="modal-box">
            <h3 class="font-bold text-lg text-error flex items-center gap-2">
                <Trash2 class="w-6 h-6" /> {{ $t('comune.associations.delete_confirm_title') }}
            </h3>
            <p class="py-4">
                {{ $t('comune.associations.delete_association_confirm', { name: associationToDelete?.nome }) }}
            </p>
            <div class="modal-action">
                <button class="btn btn-ghost" @click="closeDeleteModal">{{ $t('comune.associations.cancel') }}</button>
                <button class="btn btn-error" @click="confirmDelete" :disabled="isDeleting">
                    <span v-if="isDeleting" class="loading loading-spinner"></span>
                    {{ $t('comune.associations.delete') }}
                </button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button @click="closeDeleteModal">close</button>
        </form>
    </dialog>
    
    <!-- Members Modal -->
    <dialog class="modal" :class="{ 'modal-open': isMembersModalOpen }">
        <div class="modal-box w-11/12 max-w-4xl bg-base-100">
            <div class="flex items-center justify-between mb-6">
                <h3 class="font-bold text-2xl" v-if="selectedAssociazione">
                    {{ $t('comune.associations.members_of') }} {{ selectedAssociazione.nome }}
                </h3>
                <button class="btn btn-sm btn-primary gap-2" @click="openAddMemberModal">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3.75 19.125a7.125 7.125 0 0114.25 0v.003h-.001c.002.321.002.645-.002.96h.002v.003a7.125 7.125 0 01-14.25 0v-.003H3.75v-.963h.001v-.003z" />
                    </svg>
                    {{ $t('comune.associations.add_member') }}
                </button>
            </div>

            <div v-if="isLoadingMembers" class="flex justify-center py-12">
                <span class="loading loading-spinner loading-lg text-primary"></span>
            </div>

            <div v-else-if="selectedAssociazioneMembers.length === 0" class="alert alert-info">
                 <span>{{ $t('comune.associations.no_members_found') }}</span>
            </div>

            <div v-else class="overflow-x-auto">
                <table class="table">
                    <!-- head -->
                    <thead>
                    <tr>
                        <th>{{ $t('comune.associations.member_name') }}</th>
                        <th>{{ $t('comune.associations.member_email') }}</th>
                        <th>{{ $t('comune.associations.member_phone') }}</th>
                        <th>{{ $t('comune.associations.member_role') }}</th>
                        <th>{{ $t('comune.associations.actions') }}</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="member in selectedAssociazioneMembers" :key="member._id || member.id" class="hover">
                        <td>
                            <div class="font-bold">{{ member.nome }} {{ member.cognome }}</div>
                        </td>
                        <td>{{ member.email }}</td>
                        <td>{{ member.telefono }}</td>
                        <td>
                            <span class="badge" :class="member.admin ? 'badge-primary' : 'badge-ghost'">
                                {{ member.admin ? 'Admin' : 'Utente' }}
                            </span>
                        </td>
                        <td class="flex gap-2">
                             <button class="btn btn-ghost btn-xs text-info" @click="openEditMemberModal(member)" :title="$t('comune.associations.edit_member')">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                                </svg>
                            </button>
                            <button class="btn btn-ghost btn-xs text-error" @click="removeMember(member._id || member.id)" :title="$t('comune.associations.remove_member')">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </button>
                        </td>
                    </tr>
                    </tbody>
                </table>
            </div>

            <div class="modal-action">
                <button class="btn" @click="closeMembersModal">{{ $t('comune.associations.close') }}</button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button @click="closeMembersModal">close</button>
        </form>
    </dialog>

    <!-- Edit Member Modal -->
    <dialog class="modal" :class="{ 'modal-open': isEditMemberModalOpen }">
         <div class="modal-box w-11/12 max-w-lg bg-base-100">
            <h3 class="font-bold text-lg mb-4">{{ $t('comune.associations.edit_member_title') }}</h3>
            
            <div class="form-control mb-4">
                <label class="label">
                    <span class="label-text">{{ $t('comune.associations.member_email') }}</span>
                </label>
                <input type="email" v-model="editMemberEmail" disabled class="input input-bordered w-full opacity-70" />
            </div>
            
            <div class="form-control mb-6">
                <label class="label cursor-pointer justify-start gap-4">
                    <span class="label-text">{{ $t('comune.associations.member_is_admin') }}</span>
                    <input type="checkbox" class="toggle toggle-primary" v-model="editMemberAdmin" />
                </label>
            </div>
            
             <div v-if="editMemberError" class="alert alert-error mb-4">
                <span>{{ editMemberError }}</span>
            </div>

            <div class="modal-action">
                <button class="btn btn-ghost" @click="closeEditMemberModal" :disabled="isEditingMember">{{ $t('comune.associations.cancel') }}</button>
                <button class="btn btn-primary" @click="updateMember" :disabled="isEditingMember">
                    <span v-if="isEditingMember" class="loading loading-spinner"></span>
                    {{ $t('comune.associations.update') }}
                </button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button @click="closeEditMemberModal" :disabled="isEditingMember">close</button>
        </form>
    </dialog>

    <!-- Add Member Modal -->
    <dialog class="modal" :class="{ 'modal-open': isAddMemberModalOpen }">
         <div class="modal-box w-11/12 max-w-lg bg-base-100">
            <h3 class="font-bold text-lg mb-4">{{ $t('comune.associations.add_member_title') }}</h3>
            <p class="text-sm text-gray-500 mb-4">{{ $t('comune.associations.add_member_desc', { name: selectedAssociazione?.nome }) }}</p>
            
            <div class="form-control mb-4">
                <label class="label">
                    <span class="label-text">{{ $t('comune.associations.member_email') }} *</span>
                </label>
                <input type="email" v-model="addMemberEmail" :placeholder="$t('comune.associations.member_email_placeholder')" class="input input-bordered w-full" />
            </div>
            
            <div class="form-control mb-6">
                <label class="label cursor-pointer justify-start gap-4">
                    <span class="label-text">{{ $t('comune.associations.member_is_admin') }}</span>
                    <input type="checkbox" class="toggle toggle-primary" v-model="addMemberAdmin" />
                </label>
            </div>
            
             <div v-if="addMemberError" class="alert alert-error mb-4">
                <span>{{ addMemberError }}</span>
            </div>

            <div class="modal-action">
                <button class="btn btn-ghost" @click="closeAddMemberModal" :disabled="isAddingMember">{{ $t('comune.associations.cancel') }}</button>
                <button class="btn btn-primary" @click="addMember" :disabled="!addMemberEmail || isAddingMember">
                    <span v-if="isAddingMember" class="loading loading-spinner"></span>
                    {{ $t('comune.associations.add') }}
                </button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button @click="closeAddMemberModal" :disabled="isAddingMember">close</button>
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

    <!-- Edit Association Modal -->
    <dialog class="modal" :class="{ 'modal-open': isEditModalOpen }">
         <div class="modal-box w-11/12 max-w-2xl bg-base-100">
            <h3 class="font-bold text-2xl mb-6 text-center">{{ $t('comune.associations.edit_association_title') }}</h3>
            
            <form @submit.prevent="updateAssociazione" class="flex flex-col gap-4">
                <div class="form-control">
                    <label class="label">{{ $t('comune.associations.association_name') }}</label>
                    <input v-model="editAssociazioneData.nome" type="text" class="input input-bordered w-full" required />
                </div>
                
                <div class="form-control">
                    <label class="label">{{ $t('comune.associations.association_address') }}</label>
                    <input v-model="editAssociazioneData.indirizzo" type="text" class="input input-bordered w-full" required />
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="form-control">
                        <label class="label">{{ $t('comune.associations.association_phone') }}</label>
                        <input v-model="editAssociazioneData.telefono" type="tel" class="input input-bordered w-full" required />
                    </div>
                    <div class="form-control">
                        <label class="label">{{ $t('comune.associations.association_email') }}</label>
                        <input v-model="editAssociazioneData.email" type="email" class="input input-bordered w-full" required />
                    </div>
                </div>

                <div class="modal-action border-t border-base-200 pt-4 mt-4">
                    <button type="button" @click="closeEditModal" class="btn btn-ghost">{{ $t('comune.associations.cancel') }}</button>
                    <button type="submit" class="btn btn-primary" :disabled="isSubmittingEdit">
                        <span v-if="isSubmittingEdit" class="loading loading-spinner loading-sm"></span>
                        {{ isSubmittingEdit ? $t('comune.associations.saving') : $t('comune.associations.save') }}
                    </button>
                </div>
            </form>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button @click="closeEditModal">close</button>
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
