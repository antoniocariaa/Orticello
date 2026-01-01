<script>
import { ref, computed, onMounted } from 'vue'
import { store } from '@/store'
import api from '@/services/api'
import AvvisiBacheca from '@/components/AvvisiBacheca.vue'

export default {
  name: 'AvvisiComune',
  components: {
    AvvisiBacheca
  },
  setup() {
    const avvisiBachecaRef = ref(null)
    const showModal = ref(false)
    const modalMode = ref('create') // 'create' | 'edit'
    const currentAvviso = ref(null)
    const loading = ref(false)
    
    // Form data
    const formData = ref({
      titolo: '',
      messaggio: '',
      categoria: '',
      data: new Date().toISOString().split('T')[0],
      target: 'all' // 'all' | 'asso'
    })
    
    const formErrors = ref({})
    
    // Toast
    const toast = ref({ show: false, message: '', type: 'success' })
    const showToast = (message, type = 'success') => {
      toast.value = { show: true, message, type }
      setTimeout(() => toast.value.show = false, 3000)
    }
    
    // Apri modale per creare nuovo avviso
    const openCreateModal = () => {
      modalMode.value = 'create'
      formData.value = {
        titolo: '',
        messaggio: '',
        categoria: '',
        data: new Date().toISOString().split('T')[0],
        target: 'all'
      }
      formErrors.value = {}
      showModal.value = true
    }
    
    // Apri modale per modificare avviso
    const openEditModal = (avviso) => {
      modalMode.value = 'edit'
      currentAvviso.value = avviso
      formData.value = {
        titolo: avviso.titolo,
        messaggio: avviso.messaggio,
        categoria: avviso.categoria || '',
        data: new Date(avviso.data).toISOString().split('T')[0],
        target: avviso.target || 'all'
      }
      formErrors.value = {}
      showModal.value = true
    }
    
    // Chiudi modale
    const closeModal = () => {
      showModal.value = false
      currentAvviso.value = null
      formErrors.value = {}
    }
    
    // Valida form
    const validateForm = () => {
      const errors = {}
      
      if (!formData.value.titolo.trim()) {
        errors.titolo = 'Il titolo è obbligatorio'
      }
      
      if (!formData.value.messaggio.trim()) {
        errors.messaggio = 'Il messaggio è obbligatorio'
      }
      
      if (!formData.value.data) {
        errors.data = 'La data è obbligatoria'
      }
      
      if (!formData.value.target) {
        errors.target = 'Il destinatario è obbligatorio'
      }
      
      formErrors.value = errors
      return Object.keys(errors).length === 0
    }
    
    // Salva avviso (crea o modifica)
    const saveAvviso = async () => {
      if (!validateForm()) return
      
      loading.value = true
      try {
        const payload = {
          titolo: formData.value.titolo,
          messaggio: formData.value.messaggio,
          categoria: formData.value.categoria,
          data: new Date(formData.value.data).toISOString(),
          tipo: 'comu',
          comune: store.user.comune?._id || store.user.comune,
          target: formData.value.target
        }
        
        if (modalMode.value === 'create') {
          await api.post('/avvisi', payload)
          showToast('Avviso creato con successo!', 'success')
        } else {
          await api.put(`/avvisi/${currentAvviso.value._id}`, payload)
          showToast('Avviso modificato con successo!', 'success')
        }
        
        closeModal()
        // Ricarica gli avvisi
        if (avvisiBachecaRef.value) {
          avvisiBachecaRef.value.loadAvvisi()
        }
      } catch (error) {
        console.error('Errore salvataggio avviso:', error)
        showToast(error.message || 'Errore durante il salvataggio dell\'avviso', 'error')
      } finally {
        loading.value = false
      }
    }
    
    // Elimina avviso
    const deleteAvviso = async (avviso) => {
      if (!confirm(`Sei sicuro di voler eliminare l'avviso "${avviso.titolo}"?`)) {
        return
      }
      
      loading.value = true
      try {
        await api.delete(`/avvisi/${avviso._id}`)
        showToast('Avviso eliminato con successo!', 'success')
        
        // Ricarica gli avvisi
        if (avvisiBachecaRef.value) {
          avvisiBachecaRef.value.loadAvvisi()
        }
      } catch (error) {
        console.error('Errore eliminazione avviso:', error)
        showToast(error.message || 'Errore durante l\'eliminazione dell\'avviso', 'error')
      } finally {
        loading.value = false
      }
    }
    
    return {
      avvisiBachecaRef,
      showModal,
      modalMode,
      formData,
      formErrors,
      loading,
      openCreateModal,
      openEditModal,
      closeModal,
      saveAvviso,
      deleteAvviso,
      toast,
      store
    }
  }
}
</script>

<template>
  <div>
    <!-- Componente bacheca avvisi con gestione -->
    <AvvisiBacheca 
      ref="avvisiBachecaRef"
      title="🔔 Avvisi Comune"
      subtitle="Gestisci gli avvisi comunali per cittadini e associazioni"
      :canEdit="true"
      :showAddButton="true"
      @add="openCreateModal"
      @edit="openEditModal"
      @delete="deleteAvviso"
    />
    
    <!-- Modale per creare/modificare avviso -->
    <dialog :class="{ 'modal modal-open': showModal, 'modal': !showModal }">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">
          {{ modalMode === 'create' ? '📝 Nuovo Avviso' : '✏️ Modifica Avviso' }}
        </h3>
        
        <form @submit.prevent="saveAvviso" class="space-y-4">
          <!-- Titolo -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Titolo *</span>
            </label>
            <input 
              v-model="formData.titolo"
              type="text" 
              placeholder="Inserisci il titolo dell'avviso" 
              class="input input-bordered"
              :class="{ 'input-error': formErrors.titolo }"
            />
            <label v-if="formErrors.titolo" class="label">
              <span class="label-text-alt text-error">{{ formErrors.titolo }}</span>
            </label>
          </div>
          
          <!-- Categoria -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Categoria</span>
            </label>
            <input 
              v-model="formData.categoria"
              type="text" 
              placeholder="Es: Evento, Manutenzione, Comunicazione..." 
              class="input input-bordered"
            />
          </div>
          
          <!-- Target/Destinatario -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Destinatari *</span>
            </label>
            <select 
              v-model="formData.target"
              class="select select-bordered"
              :class="{ 'select-error': formErrors.target }"
            >
              <option value="all">Tutti (Cittadini e Associazioni)</option>
              <option value="asso">Solo Associazioni</option>
            </select>
            <label v-if="formErrors.target" class="label">
              <span class="label-text-alt text-error">{{ formErrors.target }}</span>
            </label>
          </div>
          
          <!-- Data -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Data *</span>
            </label>
            <input 
              v-model="formData.data"
              type="date" 
              class="input input-bordered"
              :class="{ 'input-error': formErrors.data }"
            />
            <label v-if="formErrors.data" class="label">
              <span class="label-text-alt text-error">{{ formErrors.data }}</span>
            </label>
          </div>
          
          <!-- Messaggio -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Messaggio *</span>
            </label>
            <textarea 
              v-model="formData.messaggio"
              placeholder="Scrivi il contenuto dell'avviso..." 
              class="textarea textarea-bordered h-32"
              :class="{ 'textarea-error': formErrors.messaggio }"
            ></textarea>
            <label v-if="formErrors.messaggio" class="label">
              <span class="label-text-alt text-error">{{ formErrors.messaggio }}</span>
            </label>
          </div>
          
          <!-- Pulsanti -->
          <div class="modal-action">
            <button 
              type="button" 
              @click="closeModal" 
              class="btn"
              :disabled="loading"
            >
              Annulla
            </button>
            <button 
              type="submit" 
              class="btn btn-warning"
              :disabled="loading"
            >
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              {{ modalMode === 'create' ? 'Crea Avviso' : 'Salva Modifiche' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeModal">close</button>
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
