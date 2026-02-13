<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';

const { t } = useI18n();

const bandi = ref([]);
const isModalOpen = ref(false);
const isEditing = ref(false);
const currentBando = ref({
  titolo: '',
  messaggio: '',
  data_inizio: '',
  data_fine: '',
  link: ''
});

const fetchBandi = async () => {
  try {
    const response = await api.get('/bandi');
    bandi.value = response;
  } catch (error) {
    console.error('Error fetching bandi:', error);
  }
};

const activeBandi = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return bandi.value.filter(bando => {
    const endDate = new Date(bando.data_fine);
    return endDate >= today;
  });
});

const expiredBandi = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return bandi.value.filter(bando => {
    const endDate = new Date(bando.data_fine);
    return endDate < today;
  });
});

const openModal = (bando = null) => {
  if (bando) {
    isEditing.value = true;
    currentBando.value = { ...bando };
    // Format dates for input type="date"
    if (currentBando.value.data_inizio) currentBando.value.data_inizio = currentBando.value.data_inizio.split('T')[0];
    if (currentBando.value.data_fine) currentBando.value.data_fine = currentBando.value.data_fine.split('T')[0];
  } else {
    isEditing.value = false;
    currentBando.value = {
      titolo: '',
      messaggio: '',
      data_inizio: '',
      data_fine: '',
      link: ''
    };
  }
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  currentBando.value = { titolo: '', messaggio: '', data_inizio: '', data_fine: '', link: '' };
};

const saveBando = async () => {
  try {
    if (isEditing.value) {
      await api.put(`/bandi/${currentBando.value._id}`, currentBando.value);
    } else {
      await api.post('/bandi', currentBando.value);
    }
    await fetchBandi();
    closeModal();
  } catch (error) {
    console.error('Error saving bando:', error);
    alert(`Errore durante il salvataggio del bando: ${error.message}`);
  }
};

const isDeleteModalOpen = ref(false);
const bandoToDelete = ref(null);

const confirmDelete = (bando) => {
  bandoToDelete.value = bando;
  isDeleteModalOpen.value = true;
};

const closeDeleteModal = () => {
  isDeleteModalOpen.value = false;
  bandoToDelete.value = null;
};

const executeDelete = async () => {
  if (!bandoToDelete.value) return;
  try {
    await api.delete(`/bandi/${bandoToDelete.value._id}`);
    await fetchBandi();
    closeDeleteModal();
  } catch (error) {
    console.error('Error deleting bando:', error);
    alert(`Errore durante l'eliminazione del bando: ${error.message}`);
  }
};

const activeTab = ref('attivi');

// View Modal Logic
const isViewModalOpen = ref(false);
const bandoToView = ref(null);

const openViewModal = (bando) => {
  bandoToView.value = bando;
  isViewModalOpen.value = true;
};

const closeViewModal = () => {
  isViewModalOpen.value = false;
  bandoToView.value = null;
};

onMounted(() => {
  fetchBandi();
});
</script>

<template>
  <div class="container mx-auto p-4">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
      <h1 class="text-3xl font-bold text-primary">{{ $t('comune.tenders.title') }}</h1>
      <button @click="openModal()" class="btn btn-primary w-full sm:w-auto">
        + {{ $t('comune.tenders.new_tender') }}
      </button>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed mb-6 bg-base-100 w-fit tabs-sm">
      <a 
        class="tab" 
        :class="{ 'tab-active': activeTab === 'attivi' }"
        @click="activeTab = 'attivi'"
      >
        {{ $t('comune.tenders.active') }}
      </a>
      <a 
        class="tab" 
        :class="{ 'tab-active': activeTab === 'scaduti' }"
        @click="activeTab = 'scaduti'"
      >
        {{ $t('comune.tenders.expired') }}
      </a>
    </div>

    <!-- Lista Bandi Attivi -->
    <div v-if="activeTab === 'attivi'">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <div 
          v-for="bando in activeBandi" 
          :key="bando._id" 
          class="card bg-base-100 shadow-xl border border-base-200 cursor-pointer hover:shadow-2xl transition-shadow"
          @click="openViewModal(bando)"
        >
          <div class="card-body">
            <h2 class="card-title text-accent">{{ bando.titolo }}</h2>
            <p class="text-sm text-gray-500">
              {{ new Date(bando.data_inizio).toLocaleDateString() }} - 
              {{ new Date(bando.data_fine).toLocaleDateString() }}
            </p>
            <p class="truncate">{{ bando.messaggio }}</p>
            <div class="card-actions justify-end mt-4">
              <button @click.stop="openModal(bando)" class="btn btn-sm btn-ghost">{{ $t('comune.tenders.edit') }}</button>
              <button @click.stop="confirmDelete(bando)" class="btn btn-sm btn-error text-white">{{ $t('comune.tenders.delete') }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State for Active Bandi -->
      <div v-if="activeBandi.length === 0" class="text-center py-10">
        <p class="text-gray-500 text-lg">{{ $t('comune.tenders.no_active') }}</p>
      </div>
    </div>

    <!-- Lista Bandi Scaduti -->
    <div v-if="activeTab === 'scaduti'">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="bando in expiredBandi" 
          :key="bando._id" 
          class="card bg-base-100 shadow-xl border border-base-200 opacity-60 cursor-pointer hover:opacity-80 transition-opacity"
           @click="openViewModal(bando)"
        >
          <div class="card-body">
            <h2 class="card-title text-gray-500">{{ bando.titolo }}</h2>
            <p class="text-sm text-gray-400">
              {{ new Date(bando.data_inizio).toLocaleDateString() }} - 
              {{ new Date(bando.data_fine).toLocaleDateString() }}
            </p>
            <p class="truncate text-gray-400">{{ bando.messaggio }}</p>
          </div>
        </div>
      </div>
      
       <!-- Empty State for Expired Bandi -->
      <div v-if="expiredBandi.length === 0" class="text-center py-10">
        <p class="text-gray-500 text-lg">{{ $t('comune.tenders.no_expired') }}</p>
      </div>
    </div>


    <!-- Modal creazone/modifica -->
    <div v-if="isModalOpen" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">{{ isEditing ? $t('comune.tenders.edit_tender') : $t('comune.tenders.new_tender_title') }}</h3>
        
        <div class="form-control w-full mb-4">
          <label class="label">
            <span class="label-text">{{ $t('comune.tenders.title') }}</span>
          </label>
          <input type="text" v-model="currentBando.titolo" :placeholder="$t('comune.tenders.title_placeholder')" class="input input-bordered w-full" />
        </div>

        <div class="flex gap-4 mb-4">
          <div class="form-control w-1/2">
            <label class="label">
              <span class="label-text">{{ $t('comune.tenders.start_date') }}</span>
            </label>
            <input type="date" v-model="currentBando.data_inizio" class="input input-bordered w-full" />
          </div>
          <div class="form-control w-1/2">
            <label class="label">
              <span class="label-text">{{ $t('comune.tenders.end_date') }}</span>
            </label>
            <input type="date" v-model="currentBando.data_fine" class="input input-bordered w-full" />
          </div>
        </div>

        <div class="form-control w-full mb-4">
          <label class="label">
            <span class="label-text">{{ $t('comune.tenders.message') }}</span>
          </label>
          <textarea v-model="currentBando.messaggio" class="textarea textarea-bordered h-24" :placeholder="$t('comune.tenders.message_placeholder')"></textarea>
        </div>

        <div class="form-control w-full mb-6">
          <label class="label">
            <span class="label-text">{{ $t('comune.tenders.link') }}</span>
          </label>
          <input type="text" v-model="currentBando.link" :placeholder="$t('comune.tenders.link_placeholder')" class="input input-bordered w-full" />
        </div>

        <div class="modal-action">
          <button @click="closeModal" class="btn">{{ $t('comune.tenders.cancel') }}</button>
          <button @click="saveBando" class="btn btn-primary">{{ $t('comune.tenders.save') }}</button>
        </div>
      </div>
    </div>

    <!-- Modal Dettagli -->
    <div v-if="isViewModalOpen" class="modal modal-open" @click.self="closeViewModal">
      <div class="modal-box relative">
        <button @click="closeViewModal" class="btn btn-sm btn-circle absolute right-2 top-2">✕</button>
        <h3 class="font-bold text-xl text-primary mb-2">{{ bandoToView?.titolo }}</h3>
        <p class="text-sm text-gray-500 mb-4">
          {{ $t('comune.tenders.from') }} {{ new Date(bandoToView?.data_inizio).toLocaleDateString() }} 
          {{ $t('comune.tenders.to') }} {{ new Date(bandoToView?.data_fine).toLocaleDateString() }}
        </p>
        <div class="py-4 whitespace-pre-wrap break-words">{{ bandoToView?.messaggio }}</div>
        
        <div v-if="bandoToView?.link" class="mt-4">
          <a :href="bandoToView.link" target="_blank" class="btn btn-outline btn-primary btn-sm">
            {{ $t('comune.tenders.visit_link') }}
          </a>
        </div>
      </div>
    </div>

    <!-- Modal conferma eliminazione -->
    <div v-if="isDeleteModalOpen" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4 text-error">{{ $t('comune.tenders.delete_confirm_title') }}</h3>
        <p class="py-4">{{ $t('comune.tenders.delete_confirm_message', { title: bandoToDelete?.titolo }) }}</p>
        <div class="modal-action">
          <button @click="closeDeleteModal" class="btn">{{ $t('comune.tenders.cancel') }}</button>
          <button @click="executeDelete" class="btn btn-error text-white">{{ $t('comune.tenders.delete') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
