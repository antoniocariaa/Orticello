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
                    <button class="btn btn-sm btn-ghost hover:bg-primary hover:text-primary-content hover:border-primary transition-all gap-1 group"
                            @click.stop="viewMembers(assoc)">
                        <span>{{ $t('comune.associations.view_members') }}</span>
                        <!-- Users Icon -->
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                    </button>
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

    <!-- Toast -->
    <div v-if="toast.show" class="toast toast-end z-[9999]">
        <div class="alert" :class="toast.type === 'error' ? 'alert-error' : 'alert-success'">
            <span class="text-white">{{ toast.message }}</span>
        </div>
    </div>

  </div>
</template>
