<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()
const user = ref(null)
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  const token = localStorage.getItem('token')
  const storedUser = localStorage.getItem('user')

  if (!token || !storedUser) {
    router.push('/login')
    return
  }

  const { id } = JSON.parse(storedUser)

  try {
    user.value = await api.get(`/utenti/${id}`)
  } catch (err) {
    if (err.message.includes('401') || err.message.includes('403')) {
        logout()
    } else {
        error.value = err.message
    }
  } finally {
    loading.value = false
  }
})

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<template>
  <div class="card bg-base-100 shadow-xl w-full max-w-lg mx-auto">
    <div class="card-body text-center p-6 sm:p-8">
      <div v-if="loading" class="loading loading-spinner loading-lg text-primary mx-auto"></div>
      
      <div v-else-if="error" class="alert alert-error">
        <span>{{ error }}</span>
        <button @click="logout" class="btn btn-sm btn-outline">Logout</button>
      </div>

      <div v-else>
        <h2 class="text-3xl font-bold mb-4 text-primary">Ciao, {{ user.nome }}!</h2>
        <p class="mb-6">Bentornato su Orticello.</p>
        
        <button @click="logout" class="btn btn-secondary">
          Logout
        </button>
      </div>
    </div>
  </div>
</template>
