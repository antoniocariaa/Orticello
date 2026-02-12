<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../services/api'
import { store } from '../../store'
import { 
  Sprout, Search, MapPin, Calendar, Clock, Maximize, Signal, 
  CheckCircle, XCircle, Handshake, Mail, Phone 
} from 'lucide-vue-next'

const router = useRouter()
const loading = ref(true)
const assignment = ref(null) 
const ortoDetails = ref(null)
const associationDetails = ref(null)

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
<div class="p-6 min-h-[calc(100vh-64px)] w-full flex flex-col items-center gap-6">

    <div v-if="loading" class="loading loading-spinner loading-lg text-primary mt-10"></div>

    <!-- STATE No Assignment -->
    <div v-else-if="!assignment" class="hero bg-base-100 rounded-box shadow-xl max-w-4xl p-10">
        <div class="hero-content text-center">
            <div class="max-w-md">
                <h1 class="text-5xl font-bold text-primary flex justify-center items-center gap-4">
                    Benvenuto! <Sprout class="w-12 h-12" />
                </h1>
                <p class="py-6 text-lg">
                    Non hai ancora un orto assegnato. Inizia la tua avventura nel verde cercando un orto disponibile nel tuo comune.
                </p>
                <button @click="router.push('/cittadino/cerca')" class="btn btn-primary btn-lg text-white shadow-lg animate-pulse gap-2">
                    <Search class="w-6 h-6" /> Cerca un Orto
                </button>
            </div>
        </div>
    </div>

    <!-- STATE Assignment Exists -->
    <div v-else class="w-full max-w-5xl flex flex-col gap-6 animate-fade-in-up">
        
        <!-- Header / Welcome -->
        <div class="text-center mb-4">
            <h1 class="text-3xl font-bold text-gray-800 flex justify-center items-center gap-2">
                Il tuo Orto <Sprout class="w-8 h-8 text-primary" />
            </h1>
            <p class="text-gray-500">Gestisci la tua coltivazione e visualizza i dettagli.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <!-- Main Info Card -->
            <div class="card bg-base-100 shadow-xl md:col-span-2 border-t-4 border-primary">
                <div class="card-body">
                    <h2 class="card-title text-3xl">
                        {{ ortoDetails?.nome || 'Orto Sconosciuto' }}
                    </h2>
                    <div class="flex items-center gap-2 text-gray-600 mb-4">
                        <MapPin class="w-5 h-5" />
                        {{ ortoDetails?.indirizzo || 'Indirizzo non disponibile' }}
                    </div>

                    <div class="divider">Dettagli Lotto</div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="stat bg-base-200 rounded-lg p-4">
                            <div class="stat-title flex items-center gap-2"><Calendar class="w-4 h-4" /> Data Inizio</div>
                            <div class="stat-value text-lg">{{ formatDate(assignment.data_inizio) }}</div>
                        </div>
                        <div class="stat bg-base-200 rounded-lg p-4">
                            <div class="stat-title flex items-center gap-2"><Clock class="w-4 h-4" /> Scadenza</div>
                            <div class="stat-value text-lg">{{ formatDate(assignment.data_fine) || 'Illimitata' }}</div>
                        </div>
                        <div class="stat bg-base-200 rounded-lg p-4">
                            <div class="stat-title flex items-center gap-2"><Maximize class="w-4 h-4" /> Dimensione</div>
                            <div class="stat-value text-lg">
                                {{ assignment.lotto?.dimensione || '-' }} mq
                            </div>
                        </div>
                        <div class="stat bg-base-200 rounded-lg p-4">
                            <div class="stat-title flex items-center gap-2"><Signal class="w-4 h-4" /> Sensori</div>
                            <div class="stat-value text-lg flex items-center gap-2">
                                <span v-if="assignment.lotto?.sensori" class="text-success flex items-center gap-1">Presenti <CheckCircle class="w-4 h-4" /></span>
                                <span v-else class="text-error flex items-center gap-1">Assenti <XCircle class="w-4 h-4" /></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sidebar Info -->
            <div class="flex flex-col gap-6">
                
                <!-- Association Card -->
                <div class="card bg-base-100 shadow-xl border border-base-200">
                    <div class="card-body">
                        <h3 class="card-title text-secondary text-lg flex items-center gap-2">
                            <Handshake class="w-5 h-5" /> Gestito da
                        </h3>
                        <div v-if="associationDetails">
                            <div class="font-bold text-xl mb-1">{{ associationDetails.nome }}</div>
                            <div class="text-sm opacity-70 mb-4">{{ associationDetails.indirizzo }}</div>
                            
                            <div class="flex flex-col gap-2">
                                <div class="flex items-center gap-2">
                                    <Mail class="w-4 h-4" />
                                    <a :href="'mailto:' + associationDetails.email" class="link link-primary">
                                        {{ associationDetails.email }}
                                    </a>
                                </div>
                                <div v-if="associationDetails.telefono" class="flex items-center gap-2">
                                    <Phone class="w-4 h-4" />
                                    <a :href="'tel:' + associationDetails.telefono" class="link link-primary">
                                        {{ associationDetails.telefono }}
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div v-else class="text-sm italic opacity-50">
                            Informazioni associazione non disponibili.
                        </div>
                    </div>
                </div>

            </div>

        </div>

    </div>
</div>
</template>
