<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../../services/api'
import { store } from '../../store'

const orti = ref([])
const affidamenti = ref([]) // Tabella affidaOrti (Orto -> Associazione)
const users = ref([]) // Per recuperare i nomi delle associazioni
const bandi = ref([]) 

// --- Fetching Data ---

const fetchOrti = async () => {
    try {
        const response = await api.get('/orti')
        orti.value = Array.isArray(response) ? response : (response.data || [])
    } catch (e) {
        console.error('Failed to fetch orti', e)
    }
}

const fetchAffidamenti = async () => {
    try {
        const response = await api.get('/affidaOrti')
        affidamenti.value = Array.isArray(response) ? response : (response.data || [])
    } catch (e) {
        console.error('Failed to fetch affidaOrti', e)
    }
}

const fetchUsers = async () => {
    try {
        const response = await api.get('/utenti')
        users.value = Array.isArray(response) ? response : (response.data || [])
    } catch (e) {
        console.error('Failed to fetch users', e)
    }
}

const fetchBandi = async () => {
    try {
        const response = await api.get('/bandi')
        bandi.value = Array.isArray(response) ? response : (response.data || [])
    } catch (e) {
        console.error('Failed to fetch bandi', e)
    }
}

onMounted(async () => {
    await Promise.all([fetchOrti(), fetchAffidamenti(), fetchUsers(), fetchBandi()])
})

// --- Computed Properties ---

// 1. Totale Orti nel comune
const totalOrti = computed(() => orti.value.length)

// 2. Totale Associazioni (Utenti con ruolo 'asso')
const totalAssociazioni = computed(() => {
    return users.value.filter(u => u.tipo === 'asso').length
})

// 3. Orti non assegnati a nessuna associazione (Critico per il comune)
const ortiNonAssegnati = computed(() => {
    // Prendiamo gli ID degli orti che hanno un affidamento attivo
    const now = new Date()
    const assignedIds = new Set()
    
    affidamenti.value.forEach(a => {
        // Controlliamo se l'affidamento è valido (data fine futura)
        const endDate = new Date(a.data_fine)
        if (endDate >= now) {
            const oId = typeof a.orto === 'object' ? (a.orto._id || a.orto.id) : a.orto
            assignedIds.add(String(oId))
        }
    })

    return orti.value.filter(o => !assignedIds.has(String(o._id || o.id))).length
})

// --- Helpers ---

// Trova l'affidamento attivo per un orto
const getCurrentAssignment = (ortoId) => {
    const oIdStr = String(ortoId)
    const now = new Date()
    
    // Cerchiamo l'affidamento più recente e valido
    return affidamenti.value.find(a => {
        const aOId = typeof a.orto === 'object' ? (a.orto._id || a.orto.id) : a.orto
        const endDate = new Date(a.data_fine)
        return String(aOId) === oIdStr && endDate >= now
    })
}

// Recupera il nome dell'associazione assegnataria
const getAssociazioneName = (ortoId) => {
    const assignment = getCurrentAssignment(ortoId)
    if (!assignment) return 'Non Assegnato'

    const assocId = typeof assignment.associazione === 'object' ? (assignment.associazione._id || assignment.associazione.id) : assignment.associazione
    const assocUser = users.value.find(u => String(u._id || u.id) === String(assocId))
    
    return assocUser ? (assocUser.nome || 'Associazione') : 'Associazione Sconosciuta'
}

const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString()
}

// --- Modals ---
const selectedOrto = ref(null)
const selectedAssignment = ref(null)
const isDetailsModalOpen = ref(false)

const openDetailsModal = (orto) => {
    selectedOrto.value = orto
    selectedAssignment.value = getCurrentAssignment(orto._id || orto.id)
    isDetailsModalOpen.value = true
}

</script>

<template>
  <div class="p-6 min-h-[calc(100vh-64px)] w-full flex flex-col items-center gap-8 bg-base-50">
      
      <div class="w-full max-w-6xl mt-4">
          <div class="flex justify-between items-end">
              <div>
                  <h1 class="text-3xl font-bold text-secondary mb-2">Dashboard Comune 🏛️</h1>
                  <p class="text-gray-600">Panoramica degli orti urbani e delle associazioni gestori.</p>
              </div>
              <router-link to="/comune/avvisi" class="btn btn-sm btn-ghost gap-2">
                  🔔 Pubblica Avviso
              </router-link>
          </div>
      </div>

      <div class="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="stat bg-white shadow-lg rounded-box border border-base-200">
                <div class="stat-figure text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div class="stat-title">Totale Orti Urbani</div>
                <div class="stat-value text-secondary">{{ totalOrti }}</div>
                <div class="stat-desc">Censiti nel sistema</div>
           </div>
           
           <div class="stat bg-white shadow-lg rounded-box border border-base-200">
                <div class="stat-figure text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
                <div class="stat-title">Associazioni Partner</div>
                <div class="stat-value text-primary">{{ totalAssociazioni }}</div>
                <div class="stat-desc">Registrate a portale</div>
           </div>

           <div class="stat bg-white shadow-lg rounded-box border border-base-200">
                <div class="stat-figure text-error">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <div class="stat-title">Orti Non Assegnati</div>
                <div class="stat-value" :class="ortiNonAssegnati > 0 ? 'text-error' : 'text-success'">{{ ortiNonAssegnati }}</div>
                <div class="stat-desc">Richiedono bando o affidamento</div>
           </div>
      </div>

      <div class="w-full max-w-6xl">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-gray-700">Stato Orti Comunali</h2>
            <router-link to="/comune/mappa" class="btn btn-outline btn-sm">Visualizza Mappa 🗺️</router-link>
          </div>
          
          <div v-if="orti.length === 0" class="alert shadow-lg">
              <div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-info shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>Nessun orto registrato. Inizia creandone uno dalla mappa.</span>
              </div>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div v-for="orto in orti" :key="orto._id || orto.id" class="card bg-white shadow-md border border-base-200 hover:shadow-xl transition-all">
                  <div class="card-body">
                      <div class="flex justify-between items-start">
                          <h2 class="card-title text-secondary">{{ orto.nome }}</h2>
                          <div class="badge gap-2 text-white" 
                               :class="getCurrentAssignment(orto._id || orto.id) ? 'badge-success' : 'badge-error'">
                               {{ getCurrentAssignment(orto._id || orto.id) ? 'Affidato' : 'Libero' }}
                          </div>
                      </div>

                      <p class="text-sm text-gray-500 mb-2">📍 {{ orto.indirizzo }}</p>
                      
                      <div class="divider my-1"></div>

                      <div class="text-sm space-y-2">
                          <div v-if="getCurrentAssignment(orto._id || orto.id)">
                              <span class="font-bold text-gray-600 block">Gestito da:</span>
                              <span class="text-lg text-primary font-semibold">
                                  {{ getAssociazioneName(orto._id || orto.id) }}
                              </span>
                              <div class="mt-1 text-xs text-gray-400">
                                  Scadenza: {{ formatDate(getCurrentAssignment(orto._id || orto.id).data_fine) }}
                              </div>
                          </div>
                          <div v-else>
                              <span class="text-error font-semibold italic">
                                  Attualmente non gestito.
                              </span>
                              <p class="text-xs text-gray-400 mt-1">
                                  Crea un bando o assegnalo direttamente.
                              </p>
                          </div>
                      </div>

                      <div class="card-actions justify-end mt-4">
                          <button class="btn btn-ghost btn-sm" @click="openDetailsModal(orto)">
                              Dettagli
                          </button>
                          <router-link v-if="!getCurrentAssignment(orto._id || orto.id)" 
                                       to="/comune/associazioni" 
                                       class="btn btn-secondary btn-sm text-white">
                              Assegna
                          </router-link>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <dialog class="modal" :class="{ 'modal-open': isDetailsModalOpen }">
          <div class="modal-box">
              <h3 class="font-bold text-lg mb-4 text-secondary" v-if="selectedOrto">
                  Dettagli {{ selectedOrto.nome }}
              </h3>
              
              <div v-if="selectedOrto" class="space-y-4">
                  
                  <div class="grid grid-cols-2 gap-4 bg-base-100 p-4 rounded-lg">
                      <div>
                          <p class="text-xs text-gray-500 uppercase font-bold">Lotti Totali</p>
                          <p class="text-xl font-bold">{{ selectedOrto.lotti?.length || 0 }}</p>
                      </div>
                      <div>
                          <p class="text-xs text-gray-500 uppercase font-bold">Comune</p>
                          <p class="text-xl font-bold">{{ selectedOrto.comune }}</p>
                      </div>
                  </div>

                  <div v-if="selectedAssignment" class="alert alert-success shadow-sm">
                      <div>
                          <h4 class="font-bold">Affidamento Attivo</h4>
                          <p class="text-sm">Associazione: {{ getAssociazioneName(selectedOrto._id || selectedOrto.id) }}</p>
                          <p class="text-sm">Dal: {{ formatDate(selectedAssignment.data_inizio) }}</p>
                          <p class="text-sm">Al: {{ formatDate(selectedAssignment.data_fine) }}</p>
                      </div>
                  </div>
                  
                  <div v-else class="alert alert-warning shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      <div>
                          <h3 class="font-bold">Attenzione</h3>
                          <div class="text-xs">Questo orto non è attualmente gestito da nessuna associazione. È necessario avviare una procedura di assegnazione.</div>
                      </div>
                  </div>

              </div>

              <div class="modal-action">
                  <button class="btn" @click="isDetailsModalOpen = false">Chiudi</button>
              </div>
          </div>
          <form method="dialog" class="modal-backdrop">
                <button @click="isDetailsModalOpen = false">close</button>
          </form>
      </dialog>

  </div>
</template>