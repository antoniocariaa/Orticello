<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { store } from '../store'
import HomeCittadino from './cittadino/HomeCittadino.vue'
import HomeAssociazione from './associazione/HomeAssociazione.vue'
import HomeComune from './comune/HomeComune.vue'

const { t } = useI18n()
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
      <p class="mt-4 text-base-content/70">{{ $t('home.loading_profile') }}</p>
    </div>

    <div v-else class="space-y-8">
      
      <!-- Common Welcome Header -->
      <div class="text-center mb-10">
        <h1 class="text-4xl font-bold text-primary mb-2">{{ $t('home.welcome_user', { name: user?.nome }) }}</h1>
        <p class="text-lg text-base-content/80">
          {{ $t('home.current_role') }} 
          <span class="badge badge-primary badge-lg font-semibold capitalize">{{ user?.tipo }}</span>
        </p>
      </div>

      <!-- Dynamic Component Rendering -->
      <component :is="activeComponent" v-if="activeComponent" />
      
      <!-- Empty State if unknown role -->
      <div v-else class="text-center text-error">
        <p>{{ $t('home.unknown_role') }}</p>
      </div>

    </div>
  </div>
</template>
