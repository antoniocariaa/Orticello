<script>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { store } from '@/store'
import api from '@/services/api'
import AvvisiBacheca from '@/components/AvvisiBacheca.vue'
import { Plus, Pencil } from 'lucide-vue-next'

export default {
  name: 'AvvisiComune',
  components: {
    AvvisiBacheca,
    Plus,
    Pencil
  },
  setup() {
    const { t } = useI18n()
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
        errors.titolo = t('comune.notices.title_error')
      }
      
      if (!formData.value.messaggio.trim()) {
        errors.messaggio = t('comune.notices.message_error')
      }
      
      if (!formData.value.data) {
        errors.data = t('comune.notices.date_error')
      }
      
      if (!formData.value.target) {
        errors.target = t('comune.notices.recipient_error')
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
          showToast(t('comune.notices.created_success'), 'success')
        } else {
          await api.put(`/avvisi/${currentAvviso.value._id}`, payload)
          showToast(t('comune.notices.updated_success'), 'success')
        }
        
        closeModal()
        // Ricarica gli avvisi
        if (avvisiBachecaRef.value) {
          avvisiBachecaRef.value.loadAvvisi()
        }
      } catch (error) {
        console.error('Errore salvataggio avviso:', error)
        showToast(error.message || t('comune.notices.error'), 'error')
      } finally {
        loading.value = false
      }
    }
    
    // Elimina avviso
    const deleteAvviso = async (avviso) => {
      if (!confirm(t('comune.notices.delete_confirm', { title: avviso.titolo }))) {
        return
      }
      
      loading.value = true
      try {
        await api.delete(`/avvisi/${avviso._id}`)
        showToast(t('comune.notices.deleted_success'), 'success')
        
        // Ricarica gli avvisi
        if (avvisiBachecaRef.value) {
          avvisiBachecaRef.value.loadAvvisi()
        }
      } catch (error) {
        console.error('Errore eliminazione avviso:', error)
        showToast(error.message || t('comune.notices.error'), 'error')
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
      :title="$t('comune.notices.title')"
      :subtitle="$t('comune.notices.subtitle')"
      :canEdit="true"
      :showAddButton="true"
      @add="openCreateModal"
      @edit="openEditModal"
      @delete="deleteAvviso"
    />
    
    <!-- Modale per creare/modificare avviso -->
    <dialog :class="{ 'modal modal-open': showModal, 'modal': !showModal }">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
          <template v-if="modalMode === 'create'">
              <Plus class="w-6 h-6" /> {{ $t('comune.notices.new_notice') }}
          </template>
          <template v-else>
              <Pencil class="w-6 h-6" /> {{ $t('comune.notices.edit_notice') }}
          </template>
        </h3>
        
        <form @submit.prevent="saveAvviso" class="space-y-4">
          <!-- Titolo -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">{{ $t('comune.notices.title_required') }}</span>
            </label>
            <input 
              v-model="formData.titolo"
              type="text" 
              :placeholder="$t('comune.notices.title_placeholder')" 
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
              <span class="label-text">{{ $t('comune.notices.category') }}</span>
            </label>
            <input 
              v-model="formData.categoria"
              type="text" 
              :placeholder="$t('comune.notices.category_placeholder')" 
              class="input input-bordered"
            />
          </div>
          
          <!-- Target/Destinatario -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">{{ $t('comune.notices.recipients') }}</span>
            </label>
            <select 
              v-model="formData.target"
              class="select select-bordered"
              :class="{ 'select-error': formErrors.target }"
            >
              <option value="all">{{ $t('comune.notices.all') }}</option>
              <option value="asso">{{ $t('comune.notices.associations_only') }}</option>
            </select>
            <label v-if="formErrors.target" class="label">
              <span class="label-text-alt text-error">{{ formErrors.target }}</span>
            </label>
          </div>
          
          <!-- Data -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">{{ $t('comune.notices.date') }}</span>
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
              <span class="label-text">{{ $t('comune.notices.message') }}</span>
            </label>
            <textarea 
              v-model="formData.messaggio"
              :placeholder="$t('comune.notices.message_placeholder')" 
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
              {{ $t('comune.notices.cancel') }}
            </button>
            <button 
              type="submit" 
              class="btn btn-warning"
              :disabled="loading"
            >
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              {{ modalMode === 'create' ? $t('comune.notices.create') : $t('comune.notices.save_changes') }}
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
