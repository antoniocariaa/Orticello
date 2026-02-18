<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '../../services/api'
import { store } from '../../store'
import { 
  Sprout, Search, MapPin, Calendar, Clock, Maximize, Signal, 
  CheckCircle, XCircle, Handshake, Mail, Phone, Leaf, Plus, X, AlertCircle, Sparkles
} from 'lucide-vue-next'
import WeatherCard from '../../components/WeatherCard.vue'

const { t } = useI18n()
const router = useRouter()
const loading = ref(true)
const assignment = ref(null) 
const ortoDetails = ref(null)
const associationDetails = ref(null)

// Crops management
const newColtura = ref('')
const addingColtura = ref(false)
const colturaError = ref('')

const addColtura = async () => {
    const name = newColtura.value.trim()
    if (!name || !assignment.value) return
    if ((assignment.value.colture || []).includes(name)) {
        colturaError.value = t('citizen.home.crops_duplicate')
        setTimeout(() => colturaError.value = '', 3000)
        return
    }
    addingColtura.value = true
    colturaError.value = ''
    try {
        const id = assignment.value._id || assignment.value.id
        const res = await api.post(`/affidaLotti/${id}/colture`, { coltura: name })
        assignment.value.colture = res.colture || [...(assignment.value.colture || []), name]
        newColtura.value = ''
    } catch (err) {
        colturaError.value = t('citizen.home.crops_error')
        setTimeout(() => colturaError.value = '', 3000)
    } finally {
        addingColtura.value = false
    }
}

const removeColtura = async (coltura) => {
    if (!assignment.value) return
    colturaError.value = ''
    try {
        const id = assignment.value._id || assignment.value.id
        const res = await api.delete(`/affidaLotti/${id}/colture/${encodeURIComponent(coltura)}`)
        assignment.value.colture = res.colture || (assignment.value.colture || []).filter(c => c !== coltura)
    } catch (err) {
        colturaError.value = t('citizen.home.crops_error')
        setTimeout(() => colturaError.value = '', 3000)
    }
}

// AI Tips
const tipsText = ref('')
const tipsLoading = ref(false)
const tipsError = ref('')

const fetchConsigli = async () => {
    const colture = assignment.value?.colture || []
    if (colture.length === 0) {
        tipsError.value = t('citizen.home.tips_no_crops')
        setTimeout(() => tipsError.value = '', 3000)
        return
    }
    tipsLoading.value = true
    tipsError.value = ''
    tipsText.value = ''

    // Fetch weather from Open-Meteo for context
    let weather = null
    try {
        if (ortoDetails.value?.geometry?.coordinates) {
            const [lng, lat] = ortoDetails.value.geometry.coordinates
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
            const wRes = await fetch(url)
            if (wRes.ok) {
                const wData = await wRes.json()
                if (wData.current) {
                    weather = {
                        temperature: wData.current.temperature_2m,
                        humidity: wData.current.relative_humidity_2m,
                        windSpeed: wData.current.wind_speed_10m,
                        condition: String(wData.current.weather_code)
                    }
                }
            }
        }
    } catch (e) { /* weather is optional */ }

    try {
        const res = await api.post('/consigli', { colture, weather })
        tipsText.value = res.consigli || res.data?.consigli || ''
    } catch (err) {
        tipsError.value = t('citizen.home.tips_error')
        setTimeout(() => tipsError.value = '', 5000)
    } finally {
        tipsLoading.value = false
    }
}

const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })
}

const fetchData = async () => {
    loading.value = true
    try {
        const user = store.user
        if (!user) return

        const userId = user._id || user.id

       
        const affidaResponse = await api.get('/affidaLotti')
        const allAffidi = Array.isArray(affidaResponse) ? affidaResponse : (affidaResponse.data || [])
        
        // Find active assignment for me
        const myAffido = allAffidi.find(a => {
            if (!a.utente) return false
            
            const uId = typeof a.utente === 'object' ? (a.utente._id || a.utente.id) : a.utente
            return String(uId) === String(userId) && a.stato === 'accepted'
        })

        if (myAffido) {
            assignment.value = myAffido
            
            // Get Orto Details
            const lottoId = typeof myAffido.lotto === 'object' ? (myAffido.lotto._id || myAffido.lotto.id) : myAffido.lotto
            
            const ortiResponse = await api.get('/orti')
            const allOrti = Array.isArray(ortiResponse) ? ortiResponse : (ortiResponse.data || [])
            
            const myOrto = allOrti.find(o => 
                o.lotti.some(l => {
                    const lId = typeof l === 'object' ? (l._id || l.id) : l
                    return String(lId) === String(lottoId)
                })
            )
            
            if (myOrto) {
                ortoDetails.value = myOrto

                // Fetch full Lotto details (dimension, sensors)        
                try {
                    const lottoRes = await api.get(`/lotti/${lottoId}`)
                    if (lottoRes && (lottoRes.data || lottoRes._id)) {
                            const existingLotto = typeof assignment.value.lotto === 'object' ? assignment.value.lotto : {}
                            if (existingLotto.dimensione === undefined) {
                                const lData = lottoRes.data || lottoRes
                                assignment.value.lotto = lData
                            }
                    }
                } catch (err) {
                    console.log('Fetching single lotto failed, relying on populated data or defaults')
                }

                

                // Find Association managing this Orto
                const affidaOrtoResponse = await api.get('/affidaOrti')
                const allAffidaOrti = Array.isArray(affidaOrtoResponse) ? affidaOrtoResponse : (affidaOrtoResponse.data || [])
                
                // Find active assignment of Orto -> Associazione
                const ortoAssignment = allAffidaOrti.find(ao => {
                    if (!ao.orto) return false
                    const oId = typeof ao.orto === 'object' ? (ao.orto._id || ao.orto.id) : ao.orto
                    return String(oId) === String(myOrto._id || myOrto.id)
                })

                if (ortoAssignment) {
                     if (typeof ortoAssignment.associazione === 'object') {
                         associationDetails.value = ortoAssignment.associazione
                     } else {
                         // Fetch association details if only ID
                         try {
                              const assocRes = await api.get(`/associazioni/${ortoAssignment.associazione}`)
                              associationDetails.value = assocRes.data || assocRes
                         } catch (err) {
                             console.warn('Could not fetch association details')
                         }
                     }
                }
            }
        }

    } catch (e) {
        console.error('Error fetching home data', e)
    } finally {
        loading.value = false
    }
}

onMounted(fetchData)
</script>

<template>
<div class="p-4 md:p-8 min-h-[calc(100vh-64px)] w-full flex flex-col items-center">

    <div v-if="loading" class="flex-1 flex items-center justify-center">
        <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- STATE No Assignment -->
    <div v-else-if="!assignment" class="flex-1 flex items-center justify-center">
        <div class="card bg-base-100 shadow-2xl max-w-lg w-full">
            <div class="card-body items-center text-center py-12">
                <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Sprout class="w-10 h-10 text-primary" />
                </div>
                <h1 class="text-3xl font-bold mb-2">{{ $t('citizen.home.welcome') }}</h1>
                <p class="text-base-content/60 mb-6">{{ $t('citizen.home.no_garden_assigned') }}</p>
                <button @click="router.push('/cittadino/cerca')" class="btn btn-primary btn-lg gap-2 shadow-lg">
                    <Search class="w-5 h-5" /> {{ $t('citizen.home.search_garden') }}
                </button>
            </div>
        </div>
    </div>

    <!-- STATE Assignment Exists -->
    <div v-else class="w-full max-w-6xl flex flex-col gap-6">
        
        <!-- Hero Header Card -->
        <div class="card bg-gradient-to-r from-primary to-primary/80 text-primary-content shadow-2xl">
            <div class="card-body py-8">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <Sprout class="w-7 h-7" />
                            </div>
                            <div>
                                <p class="text-sm opacity-80 font-medium">{{ $t('citizen.home.your_garden') }}</p>
                                <h1 class="text-2xl md:text-3xl font-bold">
                                    {{ ortoDetails?.nome || $t('citizen.home.unknown_garden') }}
                                </h1>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 opacity-80 ml-15">
                            <MapPin class="w-4 h-4 flex-shrink-0" />
                            <span class="text-sm">{{ ortoDetails?.indirizzo || $t('citizen.home.address_unavailable') }}</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>

        <!-- AI Tips Card — Premium Full Width, RIGHT AFTER HERO -->
        <div class="ai-tips-card card overflow-hidden shadow-xl border border-accent/20">
            <!-- Gradient top border -->
            <div class="h-1.5 bg-gradient-to-r from-accent via-primary to-success"></div>
            
            <div class="card-body bg-base-100 relative">
                <!-- Subtle background decoration -->
                <div class="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-accent/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <div class="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-primary/10 to-transparent rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>

                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3 relative">
                    <div class="flex items-center gap-3">
                        <div class="ai-icon-wrapper w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg">
                            <Sparkles class="w-5 h-5 text-primary-content" />
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-base-content flex items-center gap-2">
                                {{ $t('citizen.home.tips_title') }}
                                <span class="ai-badge text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r from-accent to-primary text-primary-content shadow-sm">
                                    AI
                                </span>
                            </h3>
                            <p class="text-xs text-base-content/50 mt-0.5">{{ $t('citizen.home.tips_empty_state') }}</p>
                        </div>
                    </div>
                    <button 
                        @click="fetchConsigli" 
                        class="btn btn-sm border-0 text-primary-content bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 gap-2 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.03]"
                        :disabled="tipsLoading || !assignment?.colture?.length"
                    >
                        <span v-if="tipsLoading" class="loading loading-spinner loading-xs"></span>
                        <Sparkles v-else class="w-4 h-4" />
                        {{ tipsText ? $t('citizen.home.tips_refresh') : $t('citizen.home.tips_button') }}
                    </button>
                </div>

                <!-- Error -->
                <div v-if="tipsError" class="alert alert-warning alert-sm py-2 text-sm relative">
                    <AlertCircle class="w-4 h-4" />
                    <span>{{ tipsError }}</span>
                </div>

                <!-- Loading -->
                <div v-if="tipsLoading" class="flex flex-col items-center justify-center gap-3 py-12 relative">
                    <div class="ai-icon-wrapper w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg">
                        <Sparkles class="w-7 h-7 text-primary-content animate-spin" />
                    </div>
                    <p class="text-sm text-base-content/60 font-medium">{{ $t('citizen.home.tips_loading') }}</p>
                </div>

                <!-- Tips Content -->
                <div v-else-if="tipsText" class="relative">
                    <div class="bg-base-200 rounded-xl p-6 text-sm leading-relaxed whitespace-pre-line border border-primary/15 shadow-inner">
                        {{ tipsText }}
                    </div>
                    <p class="text-[11px] text-base-content/40 mt-2 text-center italic">⚠️ {{ $t('citizen.home.tips_disclaimer') }}</p>
                </div>

                <!-- Empty state: no crops yet -->
                <div v-else-if="!assignment?.colture?.length" class="flex flex-col items-center py-10 gap-4 relative">
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                        <Leaf class="w-8 h-8 text-accent" />
                    </div>
                    <div class="text-center">
                        <p class="text-sm font-medium text-base-content/60 mb-1">
                            {{ $t('citizen.home.tips_no_crops') }}
                        </p>
                        <p class="text-xs text-base-content/40">{{ $t('citizen.home.crops_empty') }}</p>
                    </div>
                </div>

                <!-- Empty state: has crops, no tips generated yet -->
                <div v-else class="flex flex-col items-center py-10 gap-4 relative">
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/15 to-primary/15 flex items-center justify-center">
                        <Sparkles class="w-8 h-8 text-accent" />
                    </div>
                    <div class="text-center">
                        <p class="text-sm font-medium text-base-content/60 mb-1">
                            {{ $t('citizen.home.tips_empty_state') }}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Stats Row -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
                <div class="card-body p-4 flex-row items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Calendar class="w-5 h-5 text-primary" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-base-content/50 truncate">{{ $t('citizen.home.start_date') }}</p>
                        <p class="font-semibold text-sm truncate">{{ formatDate(assignment.data_inizio) }}</p>
                    </div>
                </div>
            </div>
            <div class="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
                <div class="card-body p-4 flex-row items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <Clock class="w-5 h-5 text-secondary" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-base-content/50 truncate">{{ $t('citizen.home.expiration') }}</p>
                        <p class="font-semibold text-sm truncate">{{ formatDate(assignment.data_fine) || $t('citizen.home.unlimited') }}</p>
                    </div>
                </div>
            </div>
            <div class="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
                <div class="card-body p-4 flex-row items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Maximize class="w-5 h-5 text-accent" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-base-content/50 truncate">{{ $t('citizen.home.dimension') }}</p>
                        <p class="font-semibold text-sm">{{ assignment.lotto?.dimensione || '-' }} mq</p>
                    </div>
                </div>
            </div>
            <div class="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
                <div class="card-body p-4 flex-row items-center gap-3">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                         :class="assignment.lotto?.sensori ? 'bg-success/10' : 'bg-error/10'">
                        <Signal class="w-5 h-5" :class="assignment.lotto?.sensori ? 'text-success' : 'text-error'" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs text-base-content/50 truncate">{{ $t('citizen.home.sensors') }}</p>
                        <p class="font-semibold text-sm flex items-center gap-1">
                            <span v-if="assignment.lotto?.sensori" class="text-success">{{ $t('citizen.home.present') }}</span>
                            <span v-else class="text-error">{{ $t('citizen.home.absent') }}</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Compact Crops Row -->
        <div class="card bg-base-100 shadow-md">
            <div class="card-body p-4">
                <div class="flex flex-wrap items-center gap-3">
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <div class="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                            <Leaf class="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span class="font-semibold text-sm">{{ $t('citizen.home.crops_title') }}</span>
                    </div>

                    <div class="flex flex-wrap items-center gap-1.5">
                        <div 
                            v-for="coltura in (assignment.colture || [])" 
                            :key="coltura"
                            class="badge badge-md gap-1.5 py-2.5 px-3 bg-primary/5 border-primary/20 text-primary font-medium"
                        >
                            🌱 {{ coltura }}
                            <button 
                                @click="removeColtura(coltura)" 
                                class="btn btn-ghost btn-xs btn-circle p-0 hover:text-error hover:bg-error/10 transition-colors h-4 w-4 min-h-0"
                                :title="$t('citizen.home.crops_remove')"
                            >
                                <X class="w-2.5 h-2.5" />
                            </button>
                        </div>
                        <span v-if="!assignment.colture?.length" class="text-xs text-base-content/40 italic">{{ $t('citizen.home.crops_empty') }}</span>
                    </div>

                    <div class="flex items-center gap-1.5 ml-auto">
                        <input 
                            v-model="newColtura"
                            @keyup.enter="addColtura"
                            type="text"
                            :placeholder="$t('citizen.home.crops_add_placeholder')"
                            class="input input-bordered input-xs w-36 text-xs"
                            :disabled="addingColtura"
                        />
                        <button 
                            @click="addColtura" 
                            class="btn btn-primary btn-xs gap-1"
                            :disabled="!newColtura.trim() || addingColtura"
                        >
                            <span v-if="addingColtura" class="loading loading-spinner loading-xs"></span>
                            <Plus v-else class="w-3 h-3" />
                            {{ $t('citizen.home.crops_add_button') }}
                        </button>
                    </div>
                </div>
                <div v-if="colturaError" class="alert alert-error alert-sm py-1.5 text-xs mt-2">
                    <AlertCircle class="w-3.5 h-3.5" />
                    <span>{{ colturaError }}</span>
                </div>
            </div>
        </div>

        <!-- Main Content Row: Association + Weather -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <!-- Association Card -->
            <div class="card bg-base-100 shadow-xl">
                <div class="card-body">
                    <h3 class="card-title text-lg flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                            <Handshake class="w-4 h-4 text-secondary" />
                        </div>
                        {{ $t('citizen.home.managed_by') }}
                    </h3>
                    <div v-if="associationDetails" class="mt-1">
                        <p class="font-bold text-lg">{{ associationDetails.nome }}</p>
                        <p class="text-sm text-base-content/60 mb-3">{{ associationDetails.indirizzo }}</p>
                        <div class="flex flex-col gap-2">
                            <a :href="'mailto:' + associationDetails.email" class="flex items-center gap-2 text-sm link link-primary hover:gap-3 transition-all">
                                <Mail class="w-4 h-4 flex-shrink-0" /> {{ associationDetails.email }}
                            </a>
                            <a v-if="associationDetails.telefono" :href="'tel:' + associationDetails.telefono" class="flex items-center gap-2 text-sm link link-primary hover:gap-3 transition-all">
                                <Phone class="w-4 h-4 flex-shrink-0" /> {{ associationDetails.telefono }}
                            </a>
                        </div>
                    </div>
                    <p v-else class="text-sm italic text-base-content/40 mt-1">{{ $t('citizen.home.info_unavailable') }}</p>
                </div>
            </div>

            <!-- Weather Card -->
            <WeatherCard 
                v-if="ortoDetails?.geometry?.coordinates" 
                :coordinates="ortoDetails.geometry.coordinates" 
            />
        </div>

    </div>
</div>
</template>

<style scoped>
.ai-tips-card {
    transition: box-shadow 0.3s ease, transform 0.3s ease;
}
.ai-tips-card:hover {
    box-shadow: 0 8px 30px -5px oklch(68% 0.18 78 / 0.15), 0 4px 12px -4px oklch(68% 0.18 78 / 0.1);
    transform: translateY(-1px);
}
.ai-icon-wrapper {
    animation: icon-pulse 3s ease-in-out infinite;
}
@keyframes icon-pulse {
    0%, 100% { box-shadow: 0 4px 15px -3px oklch(68% 0.18 78 / 0.3); }
    50% { box-shadow: 0 4px 25px -3px oklch(68% 0.18 78 / 0.5); }
}
.ai-badge {
    animation: badge-glow 2s ease-in-out infinite alternate;
}
@keyframes badge-glow {
    0% { box-shadow: 0 0 4px oklch(68% 0.18 78 / 0.3); }
    100% { box-shadow: 0 0 12px oklch(52% 0.21 142 / 0.5); }
}
</style>
