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

      <!-- Mobile Navbar Menu (Dropdown)-->
      
      <!-- Mobile Navbar Menu (Cittadino) -->
      <div class="flex-none md:hidden" v-if="store.user?.tipo === 'citt'">
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
          </div>
          <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
             <li>
                <router-link to="/cittadino/orto" active-class="active">🌿 Il tuo Orto</router-link>
             </li>
             <li>
                <router-link to="/cittadino/cerca" active-class="active">🔍 Cerca Orto</router-link>
             </li>
             <li>
                <router-link to="/cittadino/avvisi" active-class="active">🔔 Avvisi</router-link>
             </li>
             <li>
                <a @click="logout" class="text-error font-semibold">🚪 Logout</a>
             </li>
          </ul>
        </div>
      </div>

      <!-- Mobile Navbar Menu (Comune) -->
      <div class="flex-none md:hidden" v-if="store.user?.tipo === 'comu'">
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
          </div>
          <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
             <li>
                <router-link to="/comune/dashboard" active-class="active">📊 Dashboard</router-link>
             </li>
             <li>
                <router-link to="/comune/associazioni" active-class="active">🤝 Associazioni</router-link>
             </li>
             <li>
                <router-link to="/comune/mappa" active-class="active">🗺️ Mappa</router-link>
             </li>
             <li>
                <router-link to="/comune/avvisi" active-class="active">📢 Avvisi</router-link>
             </li>
             <li>
                <a @click="logout" class="text-error font-semibold">🚪 Logout</a>
             </li>
          </ul>
        </div>
      </div>
      
        <!-- Mobile Navbar Menu (Associazione) -->
       <div class="flex-none md:hidden" v-if="store.user?.tipo === 'asso'">
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
          </div>
          <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
             <li>
                <router-link to="/associazione/dashboard" active-class="active">📊 Dashboard</router-link>
             </li>
             <li>
                <router-link to="/associazione/orti" active-class="active">🌿 Orti</router-link>
             </li>
             <li>
                <router-link to="/associazione/avvisi" active-class="active">🔔 Avvisi</router-link>
             </li>
             <li>
                <router-link to="/associazione/bandi" active-class="active">📜 Bandi</router-link>
             </li>
             <li>
                <router-link to="/associazione/richieste" active-class="active">📨 Richieste</router-link>
             </li>
             <li>
                <a @click="logout" class="text-error font-semibold">🚪 Logout</a>
             </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="w-full px-4 flex justify-center items-start pt-10 pb-10">
       <RouterView />
    </div>
  </div>
</template>