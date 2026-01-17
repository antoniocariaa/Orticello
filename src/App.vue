<script setup>
import { computed, onMounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { store } from './store'
import api from './services/api'
import NavBar from './components/NavBar.vue'
import OfflineIndicator from './components/OfflineIndicator.vue'

const router = useRouter()

const isCittadino = computed(() => store.user?.tipo === 'citt')

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  store.clearUser()
  router.push('/login')
}

onMounted(async () => {
  const token = localStorage.getItem('token')
  const storedUser = localStorage.getItem('user')

  if (token && storedUser) {
    //Restore session immediately to prevent redirect
    const parsedUser = JSON.parse(storedUser)
    store.setUser(parsedUser)
    
    //Verify/Update session in background
    if (parsedUser.id) {
        try {
          const user = await api.get(`/utenti/${parsedUser.id}`)
          //Update store and localStorage with latest data
          store.setUser(user)
          localStorage.setItem('user', JSON.stringify(user))
        } catch (err) {
          console.error('Session update failed', err)
          // Only logout if it's strictly an auth error (401/403)
          if (err.message.includes('401') || err.message.includes('403')) {
              logout()
          }
        }
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-base-200 font-sans overflow-x-hidden">
    <!-- Indicatore stato offline/online -->
    <OfflineIndicator />
    
    <NavBar />

     <div class="w-full px-4 flex justify-center items-start pt-10 pb-10" :class="{ 'pb-28 md:pb-10': isCittadino }">
       <RouterView />
    </div>
  </div>
</template>