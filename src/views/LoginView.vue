<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { store } from '../store'

const router = useRouter()

const form = ref({
  email: '',
  password: ''
})

const loading = ref(false)
const error = ref(null)

const login = async () => {
  loading.value = true
  error.value = null
  try {
    const data = await api.post('/authentication', form.value)

    // Save token
    localStorage.setItem('token', data.token)
    
    // Fetch full user details
    const userId = data.id 
    
    const user = await api.get(`/utenti/${userId}`)
    
    localStorage.setItem('user', JSON.stringify(user))
    store.setUser(user)

    // Redirect to home or dashboard
    router.push('/')
  } catch (err) {
    error.value = err.message
    // Clear token if login fails
    if (localStorage.getItem('token') && !store.isAuthenticated) {
        localStorage.removeItem('token')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="card bg-base-100 shadow-xl w-full max-w-md mx-auto">
    <div class="card-body p-6 sm:p-8">
      <h2 class="card-title text-2xl font-bold text-center justify-center mb-6 text-primary">Bentornato</h2>
      
      <form @submit.prevent="login" class="space-y-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text">Email</span>
          </label>
          <input type="email" v-model="form.email" placeholder="email@esempio.com" class="input input-bordered w-full" required />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Password</span>
          </label>
          <input type="password" v-model="form.password" placeholder="********" class="input input-bordered w-full" required />
          <label class="label">
            <a href="#" class="label-text-alt link link-hover">Password dimenticata?</a>
          </label>
        </div>

        <div v-if="error" role="alert" class="alert alert-error text-sm mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{{ error }}</span>
        </div>

        <div class="form-control mt-6">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner"></span>
            Accedi
          </button>
        </div>
      </form>

      <div class="text-center mt-4">
        <p class="text-sm">Non hai un account? <router-link to="/register" class="link link-primary">Registrati ora</router-link></p>
      </div>
    </div>
  </div>
</template>
