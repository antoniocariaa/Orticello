```html
<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../../services/api'
import { FileText, Download, Calendar, Clock, MailX } from 'lucide-vue-next';


const bandi = ref([])
const selectedBando = ref(null)
const isModalOpen = ref(false)

const fetchBandi = async () => {
    try {
        const response = await api.get('/bandi')
        bandi.value = Array.isArray(response) ? response : (response.data || [])
    } catch (e) {
        console.error('Failed to fetch bandi', e)
    }
}

onMounted(() => {
    fetchBandi()
})

const activeBandi = computed(() => {
    const now = new Date()
    return bandi.value.filter(b => new Date(b.data_fine) >= now)
})

const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
    })
}

const openModal = (bando) => {
    selectedBando.value = bando
    isModalOpen.value = true
}


</script>

<template>
  <div class="p-6 min-h-[calc(100vh-64px)] w-full flex flex-col items-center gap-6">
    
    <div class="w-full max-w-5xl flex flex-col gap-6">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h1 class="text-3xl font-bold text-primary">Bandi Attivi</h1>
                <p class="text-gray-600 mt-1">Consulta i bandi attivi per l'assegnazione degli orti.</p>
            </div>
        </div>

        <!-- Active Bandi Content -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-if="activeBandi.length === 0" class="col-span-full text-center py-10 opacity-50 bg-base-100 rounded-lg shadow-sm border border-base-200 flex flex-col items-center">
                <MailX class="w-16 h-16 mb-2" />
                <p>Nessun bando attivo al momento.</p>
            </div>

            <div 
                v-for="bando in activeBandi" 
                :key="bando._id || bando.id" 
                class="card card-compact bg-base-100 shadow-xl border border-base-200 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                @click="openModal(bando)"
            >
                <div class="card-body">
                    <div class="flex justify-between items-start gap-2">
                        <h2 class="card-title text-lg mb-1 leading-tight">
                            {{ bando.titolo }}
                        </h2>
                        <a v-if="bando.allegato" :href="bando.allegato" download class="btn btn-sm btn-outline gap-2">
                           <FileText class="w-4 h-4" />
                        </a>
                    </div>
                     
                    <div class="text-xs text-gray-500 flex flex-col gap-1 mb-2">
                        <span class="flex items-center gap-1">
                            <Calendar class="w-3 h-3" /> Dal: <span class="font-medium text-base-content">{{ formatDate(bando.data_inizio) }}</span>
                        </span>
                        <span class="flex items-center gap-1 text-error">
                            <Clock class="w-3 h-3" /> Scadenza: <span class="font-bold">{{ formatDate(bando.data_fine) }}</span>
                        </span>
                    </div>
                   
                    <p class="text-sm text-gray-600 line-clamp-3 mb-3">{{ bando.messaggio }}</p>

                    <div class="card-actions justify-end mt-auto">
                        <span class="text-xs text-primary font-medium hover:underline">Leggi tutto →</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal -->
    <dialog class="modal" :class="{ 'modal-open': isModalOpen }">
        <div class="modal-box w-11/12 max-w-3xl">
            <template v-if="selectedBando">
                <h3 class="font-bold text-2xl text-primary mb-2">{{ selectedBando.titolo }}</h3>
                
                <div class="flex flex-wrap gap-4 text-sm text-gray-600 mb-6 border-b pb-4">
                    <span class="flex items-center gap-1 bg-base-200 px-2 py-1 rounded">
                        <Calendar class="w-4 h-4" /> Inizio: <b>{{ formatDate(selectedBando.data_inizio) }}</b>
                    </span>
                    <span class="flex items-center gap-1 bg-error/10 text-error px-2 py-1 rounded">
                        <Clock class="w-4 h-4" /> Scadenza: <b>{{ formatDate(selectedBando.data_fine) }}</b>
                    </span>
                </div>

                <div class="prose max-w-none text-gray-700 whitespace-pre-line break-words mb-6 max-h-[60vh] overflow-y-auto pr-2">
                    {{ selectedBando.messaggio }}
                </div>

                <div class="modal-action flex justify-between items-center">
                    <a v-if="selectedBando.link" :href="selectedBando.link" target="_blank" class="btn btn-primary btn-sm gap-2">
                        <FileText class="w-4 h-4" /> Scarica Allegato
                    </a>
                    <form method="dialog">
                        <button class="btn btn-sm" @click="isModalOpen = false">Chiudi</button>
                    </form>
                </div>
            </template>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button @click="isModalOpen = false">close</button>
        </form>
    </dialog>
  </div>
</template>
