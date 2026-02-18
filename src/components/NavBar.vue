<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { store } from '../store'
import { FilePlus, Sprout, Search, Bell, Home, Users, MapPin, FileText } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  store.clearUser()
  router.push('/login')
}

const changeLanguage = (lang) => {
  locale.value = lang
}
</script>

<template>
  <!-- Navbar Desktop - Solo desktop -->
  <div v-if="!route.meta.hideNavbar" class="navbar bg-base-100 shadow-sm w-full hidden md:flex">
    <div class="flex-none">
      <router-link to="/" class="btn btn-ghost text-xl text-primary font-bold">{{ $t('general.brand') }}</router-link>
    </div>

    <!--Desktop Menu -->
    <div class="flex-1 flex justify-center">
      <!-- Cittadino Navbar Menu -->
      <ul v-if="store.user?.tipo === 'citt'" class="menu menu-horizontal px-1 gap-2 hidden md:flex">
        <li>
          <router-link to="/cittadino/orto" active-class="active" class="font-medium">
            <Sprout class="w-4 h-4" />
            {{ $t('nav.your_garden') }}
          </router-link>
        </li>
        <li>
          <router-link to="/cittadino/cerca" active-class="active" class="font-medium">
            <Search class="w-4 h-4" />
            {{ $t('nav.search_garden') }}
          </router-link>
        </li>
        <li>
          <router-link to="/cittadino/avvisi" active-class="active" class="font-medium">
            <Bell class="w-4 h-4" /> 
            {{ $t('nav.notices') }}
          </router-link>
        </li>
      </ul>
      <!-- Comune Navbar Menu -->
      <ul v-if="store.user?.tipo === 'comu'" class="menu menu-horizontal px-1 gap-2 hidden md:flex">
        <li>
          <router-link to="/comune/dashboard" active-class="active" class="font-medium">
            <Home class="w-4 h-4" />
             {{ $t('nav.dashboard') }}
          </router-link>
        </li>
        <li>
          <router-link to="/comune/associazioni" active-class="active" class="font-medium">
            <Users class="w-4 h-4" />
            {{ $t('nav.associations') }}
          </router-link>
        </li>
        <li>
          <router-link to="/comune/mappa" active-class="active" class="font-medium">
            <MapPin class="w-4 h-4" />
            {{ $t('nav.map') }}
          </router-link>
        </li>
        <li>
          <router-link to="/comune/avvisi" active-class="active" class="font-medium">
            <Bell class="w-4 h-4" />
            {{ $t('nav.comune_notices') }}
          </router-link>
        </li>
        <li>
          <router-link to="/comune/bandi" active-class="active" class="font-medium">
            <FileText class="w-4 h-4" />
            {{ $t('nav.tenders') }}
          </router-link>
        </li>
      </ul>

      <!-- Associazione Navbar Menu -->
      <ul v-if="store.user?.tipo === 'asso'" class="menu menu-horizontal px-1 gap-2 hidden md:flex">
        <li>
          <router-link to="/associazione/dashboard" active-class="active" class="font-medium">
            <Home class="w-4 h-4" />
            {{ $t('nav.dashboard') }}
          </router-link>
        </li>
        <li>
          <router-link to="/associazione/orti" active-class="active" class="font-medium">
            <Sprout class="w-4 h-4" />
             {{ $t('nav.gardens') }}
          </router-link>
        </li>
        <li>
          <router-link to="/associazione/avvisi" active-class="active" class="font-medium">
            <Bell class="w-4 h-4" />
             {{ $t('nav.notices') }}
          </router-link>
        </li>
        <li>
          <router-link to="/associazione/bandi" active-class="active" class="font-medium">
            <FileText class="w-4 h-4" />
            {{ $t('nav.tenders') }}
          </router-link>
        </li>
        <li>
          <router-link to="/associazione/richieste" active-class="active" class="font-medium">
            <FilePlus class="w-4 h-4" />
            {{ $t('nav.requests') }}
          </router-link>
        </li>
        <li>
          <router-link to="/associazione/membri" active-class="active" class="font-medium">
            <Users class="w-4 h-4" />
            {{ $t('nav.members') }}
          </router-link>
        </li>
      </ul>
    </div>

    <!--Profile & Language Dropdown-->
    <div class="flex-none gap-4">
      <div v-if="store.isAuthenticated" class="dropdown dropdown-end hidden md:inline-flex">
        <router-link to="/profile">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar placeholder">
            <div class="bg-neutral text-neutral-content rounded-full w-10">
              <span class="text-xl">{{ store.user?.nome ? store.user.nome.charAt(0).toUpperCase() : 'U' }}</span>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>

  <!-- Mobile Navigation - Cittadino only -->
  <div v-if="store.isAuthenticated && store.user?.tipo === 'citt'" class="md:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-6 pb-safe">
    <div class="relative" style="width: fit-content; max-width: calc(100vw - 3rem);">
      <!-- Barra principale -->
      <div class="bg-[#7bb77b] rounded-full pl-[calc(min(24vw,6rem)+0.75rem)] pr-3 py-3 shadow-2xl flex items-center gap-1.5">
        <!-- Pulsanti in fila: Mappa, Avvisi, Logout -->
        <router-link to="/cittadino/cerca" aria-label="Vai alla mappa" class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#95d095] flex items-center justify-center shadow-md hover:bg-[#a5daa5] active:scale-95 transition-all duration-150">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6 fill-white" aria-hidden="true">
            <path d="M12 2a7 7 0 0 0-7 7c0 4.2 4.43 9.53 6.1 11.42a1.2 1.2 0 0 0 1.8 0C14.57 18.53 19 13.2 19 9a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 2.5-2.5A2.5 2.5 0 0 1 12 11.5Z"/>
          </svg>
        </router-link>
        <router-link to="/cittadino/avvisi" aria-label="Vai agli avvisi" class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#95d095] flex items-center justify-center shadow-md hover:bg-[#a5daa5] active:scale-95 transition-all duration-150">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6 fill-white" aria-hidden="true">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2z"/>
          </svg>
        </router-link>
        <router-link to="/profile" aria-label="Vai al profilo" class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#95d095] flex items-center justify-center shadow-md hover:bg-[#a5daa5] active:scale-95 transition-all duration-150">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6 fill-white" aria-hidden="true">
            <path d="M12 2a5 5 0 1 1-5 5 5 5 0 0 1 5-5ZM5 20a7 7 0 0 1 14 0 1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z"/>
          </svg>
        </router-link>
      </div>

      <!-- Pulsante Home a sinistra (emerge dalla barra) -->
      <router-link to="/cittadino/orto" aria-label="Home cittadino" class="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-[#6ba16b] shadow-2xl flex items-center justify-center hover:bg-[#5d925d] active:scale-95 transition-all duration-150" style="width: min(24vw, 6rem); height: min(24vw, 6rem);">
        <img src="/favicon.png" alt="Home" class="w-3/5 h-3/5 object-contain" />
      </router-link>
    </div>
  </div>

  <!-- Mobile Dock Navigation - other ruoli -->
  <div v-else-if="store.isAuthenticated && store.user?.tipo" class="dock md:hidden fixed bottom-4 w-[95%] left-1/2 -translate-x-1/2 z-50 rounded-2xl shadow-2xl bg-base-100/90 backdrop-blur border border-base-200 grid grid-flow-col auto-cols-fr gap-1 p-1 pb-safe">

    <!-- Comune Dock -->
    <template v-if="store.user?.tipo === 'comu'">
      <router-link to="/comune/dashboard" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
        <span class="text-2xl mb-1">📊</span>
        <span class="text-[10px] font-medium leading-none">{{ $t('nav.dash_short') }}</span>
      </router-link>

      <router-link to="/comune/associazioni" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
        <span class="text-2xl mb-1">🤝</span>
        <span class="text-[10px] font-medium leading-none">{{ $t('nav.assoc_short') }}</span>
      </router-link>

      <router-link to="/comune/mappa" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
        <span class="text-2xl mb-1">🗺️</span>
        <span class="text-[10px] font-medium leading-none">{{ $t('nav.map_short') }}</span>
      </router-link>

      <router-link to="/comune/bandi" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
        <span class="text-2xl mb-1">📜</span>
        <span class="text-[10px] font-medium leading-none">{{ $t('nav.tenders_short') }}</span>
      </router-link>

      <router-link to="/profile" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
        <span class="text-2xl mb-1">👤</span>
        <span class="text-[10px] font-medium leading-none">{{ $t('nav.profile_short') }}</span>
      </router-link>
    </template>

    <!-- Associazione Dock -->
    <template v-if="store.user?.tipo === 'asso'">
      <router-link to="/associazione/dashboard" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
        <span class="text-2xl mb-1">📊</span>
        <span class="text-[10px] font-medium leading-none">{{ $t('nav.dash_short') }}</span>
      </router-link>

      <router-link to="/associazione/orti" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
        <span class="text-2xl mb-1">🌿</span>
        <span class="text-[10px] font-medium leading-none">{{ $t('nav.gardens_short') }}</span>
      </router-link>

      <router-link to="/associazione/richieste" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
        <span class="text-2xl mb-1">📨</span>
        <span class="text-[10px] font-medium leading-none">{{ $t('nav.requests_short') }}</span>
      </router-link>

      <router-link to="/associazione/bandi" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
        <span class="text-2xl mb-1">📜</span>
        <span class="text-[10px] font-medium leading-none">{{ $t('nav.tenders_short') }}</span>
      </router-link>

      <router-link to="/associazione/membri" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
        <span class="text-2xl mb-1">👥</span>
        <span class="text-[10px] font-medium leading-none">{{ $t('nav.members_short') }}</span>
      </router-link>

      <router-link to="/profile" class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-colors" active-class="bg-primary/10 text-primary">
        <span class="text-2xl mb-1">👤</span>
        <span class="text-[10px] font-medium leading-none">{{ $t('nav.profile_short') }}</span>
      </router-link>
    </template>

  </div>
</template>
