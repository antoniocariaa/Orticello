<script setup>
// Cleaned up script, logic moved to MappaComune.vue
</script>

<template>
  <div class="grid grid-cols-1 gap-6">
    <div class="flex justify-between items-center bg-base-100 p-4 rounded-xl shadow-sm">
         <h1 class="text-2xl font-bold text-primary">Dashboard Comune</h1>
    </div>

    <div class="card bg-base-100 shadow-xl border border-base-200">
      <div class="card-body">
        <h2 class="card-title text-warning">🏛️ Panoramica Territorio</h2>
        <p>Monitora l'utilizzo degli orti e le attività nel comune.</p>
        <div class="card-actions justify-end mt-4">
          <button class="btn btn-warning">Vedi Statistiche</button>
        </div>
      </div>
    </div>
  </div>
</template>
