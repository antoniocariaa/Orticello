<script setup>
import { computed } from 'vue'
import { store } from '../store'
import HomeCittadino from './cittadino/HomeCittadino.vue'
import HomeAssociazione from './associazione/HomeAssociazione.vue'
import HomeComune from './comune/HomeComune.vue'

const user = computed(() => store.user)

const activeComponent = computed(() => {
  if (!user.value) return null
  switch (user.value.tipo) {
    case 'citt': return HomeCittadino
    case 'asso': return HomeAssociazione
    case 'comu': return HomeComune
    default: return null
  }
})
</script>

<template>
  <div class="w-full max-w-4xl mx-auto">
    
    <!-- Loading State -->
    <div v-if="!store.isAuthenticated && !user" class="text-center mt-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="mt-4 text-base-content/70">Caricamento profilo...</p>
    </div>

    <div v-else class="space-y-8">
      
      <!-- Common Welcome Header -->
      <div class="text-center mb-10">
        <h1 class="text-4xl font-bold text-primary mb-2">Bentornato, {{ user?.nome }}!</h1>
        <p class="text-lg text-base-content/80">
          Il tuo ruolo attuale è: 
          <span class="badge badge-primary badge-lg font-semibold capitalize">{{ user?.tipo }}</span>
        </p>
      </div>

      <!-- Dynamic Component Rendering -->
      <component :is="activeComponent" v-if="activeComponent" />
      
      <!-- Empty State if unknown role -->
      <div v-else class="text-center text-error">
        <p>Ruolo utente non riconosciuto</p>
      </div>

    </div>
  </div>
</template>
