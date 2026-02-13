<script setup>
import { ref, onMounted } from 'vue'
import { store } from '../../store'
import api from '../../services/api'
import { useI18n } from 'vue-i18n'
import { Mail, Phone, MapPin, User, Shield } from 'lucide-vue-next'

const { t } = useI18n()
const users = ref([])
const loading = ref(false)
const error = ref(null)

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

onMounted(() => {
    fetchUsers()
})
</script>

<template>
    <div class="container mx-auto p-4 md:p-8">
        <h1 class="text-3xl font-bold mb-6 text-primary flex items-center gap-2">
            <User class="w-8 h-8" />
            {{ $t('members.title') }}
            <span v-if="!loading && users.length" class="text-lg font-normal text-base-content/60 ml-2">({{ users.length }})</span>
        </h1>

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
    </div>
</template>
