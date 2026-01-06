<script setup>
import { onMounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { store } from './store'
import api from './services/api'

const router = useRouter()

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

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  store.clearUser()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-base-200 font-sans overflow-x-hidden">
    <!-- Navbar -->
    <div class="navbar bg-base-100 shadow-sm w-full">
      <div class="flex-none">
        <router-link to="/" class="btn btn-ghost text-xl text-primary font-bold">Orticello</router-link>
      </div>




      <!--Desktop Menu -->
      <div class="flex-1 flex justify-center">
         <!-- Cittadino Navbar Menu -->
         <ul v-if="store.user?.tipo === 'citt'" class="menu menu-horizontal px-1 gap-2 hidden md:flex">
            <li>
                <router-link to="/cittadino/orto" active-class="active" class="font-medium">
                    🌿 Il tuo Orto
                </router-link>
            </li>
            <li>
                <router-link to="/cittadino/cerca" active-class="active" class="font-medium">
                    🔍 Cerca Orto
                </router-link>
            </li>
            <li>
                <router-link to="/cittadino/avvisi" active-class="active" class="font-medium">
                    🔔 Avvisi
                </router-link>
            </li>
         </ul>
         <!-- Comune Navbar Menu -->
         <ul v-if="store.user?.tipo === 'comu'" class="menu menu-horizontal px-1 gap-2 hidden md:flex">
            <li>
                <router-link to="/comune/dashboard" active-class="active" class="font-medium">
                    📊 Dashboard
                </router-link>
            </li>
            <li>
                <router-link to="/comune/associazioni" active-class="active" class="font-medium">
                    🤝 Associazioni
                </router-link>
            </li>
            <li>
                <router-link to="/comune/mappa" active-class="active" class="font-medium">
                    🗺️ Mappa
                </router-link>
            </li>
            <li>
                <router-link to="/comune/avvisi" active-class="active" class="font-medium">
                    📢 Avvisi
                </router-link>
            </li>
            <li>
                <router-link to="/comune/bandi" active-class="active" class="font-medium">
                    📜 Bandi
                </router-link>
            </li>
         </ul>

         <!-- Associazione Navbar Menu -->
         <ul v-if="store.user?.tipo === 'asso'" class="menu menu-horizontal px-1 gap-2 hidden md:flex">
            <li>
                <router-link to="/associazione/dashboard" active-class="active" class="font-medium">
                    📊 Dashboard
                </router-link>
            </li>
            <li>
                <router-link to="/associazione/orti" active-class="active" class="font-medium">
                    🌿 Orti
                </router-link>
            </li>
            <li>
                <router-link to="/associazione/avvisi" active-class="active" class="font-medium">
                    🔔 Avvisi
                </router-link>
            </li>
             <li>
                <router-link to="/associazione/bandi" active-class="active" class="font-medium">
                     📜 Bandi
                </router-link>
            </li>
            <li>
                <router-link to="/associazione/richieste" active-class="active" class="font-medium">
                     📨 Richieste
                </router-link>
            </li>
         </ul>
      </div>

      <!--Logout-->
      <div class="flex-none gap-4">
        <div v-if="store.isAuthenticated" class="flex items-center gap-4">
            <button @click="logout" class="btn btn-sm btn-error text-white hidden md:inline-flex">Logout</button>
        </div>
      </div>

      <!-- Mobile Dock Navigation -->
      <div v-if="store.isAuthenticated && store.user?.tipo" class="dock md:hidden fixed bottom-4 w-[95%] left-1/2 -translate-x-1/2 z-50 rounded-2xl shadow-2xl bg-base-100/90 backdrop-blur border border-base-200 grid grid-flow-col auto-cols-fr gap-1 p-1 pb-safe">
        
        <!-- Cittadino Dock -->
        <template v-if="store.user?.tipo === 'citt'">
            <router-link to="/cittadino/orto" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
                <span class="text-2xl mb-1">🌿</span>
                <span class="text-[10px] font-medium leading-none">Home</span>
            </router-link>
            
            <router-link to="/cittadino/cerca" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
                <span class="text-2xl mb-1">🔍</span>
                <span class="text-[10px] font-medium leading-none">Cerca</span>
            </router-link>

            <router-link to="/cittadino/avvisi" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
                <span class="text-2xl mb-1">🔔</span>
                <span class="text-[10px] font-medium leading-none">Avvisi</span>
            </router-link>
        </template>

        <!-- Comune Dock -->
         <template v-if="store.user?.tipo === 'comu'">
            <router-link to="/comune/dashboard" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
                <span class="text-2xl mb-1">📊</span>
                <span class="text-[10px] font-medium leading-none">Dash</span>
            </router-link>

            <router-link to="/comune/associazioni" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
                <span class="text-2xl mb-1">🤝</span>
                <span class="text-[10px] font-medium leading-none">Assoc</span>
            </router-link>

            <router-link to="/comune/mappa" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
                <span class="text-2xl mb-1">🗺️</span>
                <span class="text-[10px] font-medium leading-none">Mappa</span>
            </router-link>
            
             <router-link to="/comune/bandi" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
                <span class="text-2xl mb-1">📜</span>
                <span class="text-[10px] font-medium leading-none">Bandi</span>
            </router-link>
        </template>

        <!-- Associazione Dock -->
         <template v-if="store.user?.tipo === 'asso'">
            <router-link to="/associazione/dashboard" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
                 <span class="text-2xl mb-1">📊</span>
                <span class="text-[10px] font-medium leading-none">Dash</span>
            </router-link>

            <router-link to="/associazione/orti" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
                <span class="text-2xl mb-1">🌿</span>
                <span class="text-[10px] font-medium leading-none">Orti</span>
            </router-link>

            <router-link to="/associazione/richieste" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
                <span class="text-2xl mb-1">📨</span>
                <span class="text-[10px] font-medium leading-none">Richieste</span>
            </router-link>
            
            <router-link to="/associazione/bandi" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
                <span class="text-2xl mb-1">📜</span>
                <span class="text-[10px] font-medium leading-none">Bandi</span>
            </router-link>
        </template>

        <!-- Logout Action -->
        <button class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-red-50 text-error transition-colors" @click="logout">
            <span class="text-2xl mb-1">🚪</span>
            <span class="text-[10px] font-medium leading-none">Exit</span>
        </button>

      </div>
    </div>

    <div class="w-full px-4 flex justify-center items-start pt-10 pb-10">
       <RouterView />
    </div>
  </div>
</template>