<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()

const form = ref({
  nome: '',
  cognome: '',
  email: '',
  password: '',
  telefono: '',
  indirizzo: '',
  codicefiscale: ''
})

const loading = ref(false)
const error = ref(null)

const register = async () => {
  loading.value = true
  error.value = null
  try {
    await api.post('/utenti', form.value)

    // Redirect to login after successful registration
    router.push('/login?registered=true')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="card bg-base-100 shadow-xl w-full max-w-lg mx-auto">
    <div class="card-body p-6 sm:p-8">
      <h2 class="card-title text-2xl font-bold text-center justify-center mb-6 text-primary">Crea un Account</h2>
      
      <form @submit.prevent="register" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
            <label class="label">
                <span class="label-text">Nome</span>
            </label>
            <input type="text" v-model="form.nome" placeholder="Mario" class="input input-bordered w-full" required />
            </div>
            
            <div class="form-control">
            <label class="label">
                <span class="label-text">Cognome</span>
            </label>
            <input type="text" v-model="form.cognome" placeholder="Rossi" class="input input-bordered w-full" required />
            </div>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Email</span>
          </label>
          <input type="email" v-model="form.email" placeholder="mario.rossi@esempio.com" class="input input-bordered w-full" required />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Password</span>
          </label>
          <input type="password" v-model="form.password" placeholder="********" class="input input-bordered w-full" required />
        </div>

        <div class="form-control">
            <label class="label">
                <span class="label-text">Codice Fiscale</span>
            </label>
            <input type="text" v-model="form.codicefiscale" placeholder="RSSMRA80A01H501U" class="input input-bordered w-full" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
            <label class="label">
                <span class="label-text">Telefono</span>
            </label>
            <input type="tel" v-model="form.telefono" placeholder="+39 333 1234567" class="input input-bordered w-full" />
            </div>
            
             <div class="form-control">
            <label class="label">
                <span class="label-text">Indirizzo</span>
            </label>
            <input type="text" v-model="form.indirizzo" placeholder="Via Roma 1" class="input input-bordered w-full" />
            </div>
        </div>

        <div v-if="error" role="alert" class="alert alert-error text-sm mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{{ error }}</span>
        </div>

        <div class="form-control mt-6">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner"></span>
            Registrati
          </button>
        </div>
      </form>

      <div class="text-center mt-4">
        <p class="text-sm">Hai già un account? <router-link to="/login" class="link link-primary">Accedi qui</router-link></p>
      </div>
    </div>
  </div>
</template>
