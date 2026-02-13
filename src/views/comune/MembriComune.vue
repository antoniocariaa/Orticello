<script setup>
import { ref, onMounted } from 'vue'
import { store } from '../../store'
import api from '../../services/api'
import { useI18n } from 'vue-i18n'
import { Mail, Phone, MapPin, User, Shield, UserMinus, UserPlus } from 'lucide-vue-next'

const { t } = useI18n()
const users = ref([])
const loading = ref(false)
const error = ref(null)
const userToRemove = ref(null)
const removing = ref(false)

// Add member state
const addEmail = ref('')
const addAdmin = ref(false)
const adding = ref(false)
const addError = ref(null)

const isAdmin = store.user?.admin === true

const fetchUsers = async () => {
    try {
        loading.value = true
        
        const response = await api.get('/utenti/comune')
        users.value = response
    } catch (err) {
        console.error('Error fetching users:', err)
        error.value = t('errors.generic')
    } finally {
        loading.value = false
    }
}

const confirmRemove = (user) => {
    userToRemove.value = user
    document.getElementById('remove-role-modal').showModal()
}

const removeComuneRole = async () => {
    if (!userToRemove.value) return
    try {
        removing.value = true
        await api.put(`/utenti/removeComuneRole/${userToRemove.value._id}`)
        users.value = users.value.filter(u => u._id !== userToRemove.value._id)
        userToRemove.value = null
        document.getElementById('remove-role-modal').close()
    } catch (err) {
        console.error('Error removing role:', err)
        error.value = t('members.remove_error')
    } finally {
        removing.value = false
    }
}

const openAddModal = () => {
    addEmail.value = ''
    addAdmin.value = false
    addError.value = null
    document.getElementById('add-member-modal').showModal()
}

const addComuneMember = async () => {
    if (!addEmail.value) return
    try {
        adding.value = true
        addError.value = null
        const res = await api.put('/utenti/addComuneMember', {
            email: addEmail.value,
            admin: addAdmin.value
        })
        // Add the new user to the list
        if (res.utente) {
            users.value.push(res.utente)
        }
        document.getElementById('add-member-modal').close()
        addEmail.value = ''
        addAdmin.value = false
    } catch (err) {
        console.error('Error adding member:', err)
        addError.value = err.message || t('members.add_error')
    } finally {
        adding.value = false
    }
}

onMounted(() => {
    fetchUsers()
})
</script>

<template>
    <div class="container mx-auto p-4 md:p-8">
        <div class="flex items-center justify-between mb-6">
            <h1 class="text-3xl font-bold text-primary flex items-center gap-2">
                <User class="w-8 h-8" />
                {{ $t('members.title') }}
                <span v-if="!loading && users.length" class="text-lg font-normal text-base-content/60 ml-2">({{ users.length }})</span>
            </h1>
            <button
                v-if="isAdmin"
                class="btn btn-primary btn-sm gap-2"
                @click="openAddModal"
            >
                <UserPlus class="w-4 h-4" />
                {{ $t('members.add_member') }}
            </button>
        </div>

        <div v-if="loading" class="flex justify-center py-12">
            <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>

        <div v-else-if="error" class="alert alert-error">
            <span>{{ error }}</span>
        </div>

        <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div v-for="user in users" :key="user._id" class="card bg-base-100 shadow-xl border border-base-200 hover:shadow-2xl transition-all duration-300">
                <div class="card-body">
                    <div class="flex items-start justify-between">
                        <div class="flex items-center gap-3">
                            <div class="avatar placeholder">
                                <div class="bg-neutral text-neutral-content rounded-full w-12">
                                    <span class="text-xl">{{ user.nome?.charAt(0).toUpperCase() }}</span>
                                </div>
                            </div>
                            <div>
                                <h2 class="card-title text-lg">{{ user.nome }} {{ user.cognome }}</h2>
                                <div v-if="user.admin" class="badge badge-primary badge-sm gap-1">
                                    <Shield class="w-3 h-3" />
                                    Admin
                                </div>
                            </div>
                        </div>
                        <!-- Remove button: visible only if admin and not self -->
                        <button
                            v-if="isAdmin && user._id !== store.user?.id && user._id !== store.user?._id"
                            class="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/10"
                            :title="$t('members.remove_role')"
                            @click="confirmRemove(user)"
                        >
                            <UserMinus class="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div class="divider my-2"></div>
                    
                    <div class="space-y-2 text-sm">
                        <div class="flex items-center gap-2 text-base-content/80">
                            <Mail class="w-4 h-4" />
                            <span>{{ user.email }}</span>
                        </div>
                        <div v-if="user.telefono" class="flex items-center gap-2 text-base-content/80">
                            <Phone class="w-4 h-4" />
                            <span>{{ user.telefono }}</span>
                        </div>
                        <div v-if="user.indirizzo" class="flex items-center gap-2 text-base-content/80">
                            <MapPin class="w-4 h-4" />
                            <span>{{ user.indirizzo }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div v-if="!loading && !error && users.length === 0" class="text-center py-12 text-base-content/60">
            <User class="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>{{ $t('members.no_members') }}</p>
        </div>

        <!-- Remove Role Confirmation Modal -->
        <dialog id="remove-role-modal" class="modal">
            <div class="modal-box">
                <h3 class="font-bold text-lg">{{ $t('members.remove_role_title') }}</h3>
                <p class="py-4">
                    {{ $t('members.remove_role_confirm', { name: userToRemove ? `${userToRemove.nome} ${userToRemove.cognome}` : '' }) }}
                </p>
                <div class="modal-action">
                    <form method="dialog">
                        <button class="btn btn-ghost">{{ $t('nav.cancel') }}</button>
                    </form>
                    <button
                        class="btn btn-error"
                        :disabled="removing"
                        @click="removeComuneRole"
                    >
                        <span v-if="removing" class="loading loading-spinner loading-sm"></span>
                        {{ $t('members.remove_role_btn') }}
                    </button>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>

        <!-- Add Member Modal -->
        <dialog id="add-member-modal" class="modal">
            <div class="modal-box">
                <h3 class="font-bold text-lg">{{ $t('members.add_member_title') }}</h3>
                
                <div class="form-control mt-4">
                    <label class="label">
                        <span class="label-text">{{ $t('members.add_member_email') }}</span>
                    </label>
                    <input
                        type="email"
                        v-model="addEmail"
                        :placeholder="$t('members.add_member_email_placeholder')"
                        class="input input-bordered w-full"
                        @keyup.enter="addComuneMember"
                    />
                </div>

                <div class="form-control mt-4">
                    <label class="label cursor-pointer">
                        <span class="label-text">{{ $t('members.add_member_admin') }}</span>
                        <input type="checkbox" class="toggle toggle-primary" v-model="addAdmin" />
                    </label>
                </div>

                <div v-if="addError" class="alert alert-error mt-4 text-sm">
                    <span>{{ addError }}</span>
                </div>

                <div class="modal-action">
                    <form method="dialog">
                        <button class="btn btn-ghost">{{ $t('nav.cancel') }}</button>
                    </form>
                    <button
                        class="btn btn-primary"
                        :disabled="adding || !addEmail"
                        @click="addComuneMember"
                    >
                        <span v-if="adding" class="loading loading-spinner loading-sm"></span>
                        {{ $t('members.add_member_btn') }}
                    </button>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    </div>
</template>
