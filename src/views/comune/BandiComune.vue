<script setup>
import { ref, onMounted } from 'vue';
import api from '../../services/api';

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

onMounted(() => {
  fetchBandi();
});
</script>

<template>
  <div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-primary">Gestione Bandi</h1>
      <button @click="openModal()" class="btn btn-primary">
        + Nuovo Bando
      </button>
    </div>

    <!-- Lista Bandi -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="bando in bandi" :key="bando._id" class="card bg-base-100 shadow-xl border border-base-200">
        <div class="card-body">
          <h2 class="card-title text-accent">{{ bando.titolo }}</h2>
          <p class="text-sm text-gray-500">
            {{ new Date(bando.data_inizio).toLocaleDateString() }} - 
            {{ new Date(bando.data_fine).toLocaleDateString() }}
          </p>
          <p class="truncate">{{ bando.messaggio }}</p>
          <div class="card-actions justify-end mt-4">
            <button @click="openModal(bando)" class="btn btn-sm btn-ghost">Modifica</button>
            <button @click="confirmDelete(bando)" class="btn btn-sm btn-error text-white">Elimina</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="bandi.length === 0" class="text-center py-10">
      <p class="text-gray-500 text-lg">Nessun bando presente.</p>
    </div>

    <!-- Modal creazone/modifica -->
    <div v-if="isModalOpen" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">{{ isEditing ? 'Modifica Bando' : 'Nuovo Bando' }}</h3>
        
        <div class="form-control w-full mb-4">
          <label class="label">
            <span class="label-text">Titolo</span>
          </label>
          <input type="text" v-model="currentBando.titolo" placeholder="Es. Bando assegnazione orti 2025" class="input input-bordered w-full" />
        </div>

        <div class="flex gap-4 mb-4">
          <div class="form-control w-1/2">
            <label class="label">
              <span class="label-text">Data Inizio</span>
            </label>
            <input type="date" v-model="currentBando.data_inizio" class="input input-bordered w-full" />
          </div>
          <div class="form-control w-1/2">
            <label class="label">
              <span class="label-text">Data Fine</span>
            </label>
            <input type="date" v-model="currentBando.data_fine" class="input input-bordered w-full" />
          </div>
        </div>

        <div class="form-control w-full mb-4">
          <label class="label">
            <span class="label-text">Messaggio</span>
          </label>
          <textarea v-model="currentBando.messaggio" class="textarea textarea-bordered h-24" placeholder="Dettagli del bando..."></textarea>
        </div>

        <div class="form-control w-full mb-6">
          <label class="label">
            <span class="label-text">Link (Opzionale)</span>
          </label>
          <input type="text" v-model="currentBando.link" placeholder="https://..." class="input input-bordered w-full" />
        </div>

        <div class="modal-action">
          <button @click="closeModal" class="btn">Annulla</button>
          <button @click="saveBando" class="btn btn-primary">Salva</button>
        </div>
      </div>
    </div>

    <!-- Modal conferma eliminazione -->
    <div v-if="isDeleteModalOpen" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4 text-error">Conferma Eliminazione</h3>
        <p class="py-4">Sei sicuro di voler eliminare il bando "<strong>{{ bandoToDelete?.titolo }}</strong>"? Questa azione non può essere annullata.</p>
        <div class="modal-action">
          <button @click="closeDeleteModal" class="btn">Annulla</button>
          <button @click="executeDelete" class="btn btn-error text-white">Elimina</button>
        </div>
      </div>
    </div>
  </div>
</template>
