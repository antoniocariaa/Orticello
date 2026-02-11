<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { store } from '../store'

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
            {{ $t('nav.your_garden') }}
          </router-link>
        </li>
        <li>
          <router-link to="/cittadino/cerca" active-class="active" class="font-medium">
            {{ $t('nav.search_garden') }}
          </router-link>
        </li>
        <li>
          <button disabled class="font-medium opacity-50 cursor-not-allowed" :title="$t('nav.info_garden_tooltip')">
             {{ $t('nav.info_garden') }}
          </button>
        </li>
        <li>
          <router-link to="/cittadino/avvisi" active-class="active" class="font-medium">
             {{ $t('nav.notices') }}
          </router-link>
        </li>
      </ul>
      <!-- Comune Navbar Menu -->
      <ul v-if="store.user?.tipo === 'comu'" class="menu menu-horizontal px-1 gap-2 hidden md:flex">
        <li>
          <router-link to="/comune/dashboard" active-class="active" class="font-medium">
             {{ $t('nav.dashboard') }}
          </router-link>
        </li>
        <li>
          <router-link to="/comune/associazioni" active-class="active" class="font-medium">
             {{ $t('nav.associations') }}
          </router-link>
        </li>
        <li>
          <router-link to="/comune/mappa" active-class="active" class="font-medium">
             {{ $t('nav.map') }}
          </router-link>
        </li>
        <li>
          <router-link to="/comune/avvisi" active-class="active" class="font-medium">
             {{ $t('nav.comune_notices') }}
          </router-link>
        </li>
        <li>
          <router-link to="/comune/bandi" active-class="active" class="font-medium">
             {{ $t('nav.tenders') }}
          </router-link>
        </li>
      </ul>

      <!-- Associazione Navbar Menu -->
      <ul v-if="store.user?.tipo === 'asso'" class="menu menu-horizontal px-1 gap-2 hidden md:flex">
        <li>
          <router-link to="/associazione/dashboard" active-class="active" class="font-medium">
             {{ $t('nav.dashboard') }}
          </router-link>
        </li>
        <li>
          <router-link to="/associazione/orti" active-class="active" class="font-medium">
             {{ $t('nav.gardens') }}
          </router-link>
        </li>
        <li>
          <router-link to="/associazione/avvisi" active-class="active" class="font-medium">
             {{ $t('nav.notices') }}
          </router-link>
        </li>
        <li>
          <router-link to="/associazione/bandi" active-class="active" class="font-medium">
             {{ $t('nav.tenders') }}
          </router-link>
        </li>
        <li>
          <router-link to="/associazione/richieste" active-class="active" class="font-medium">
             {{ $t('nav.requests') }}
          </router-link>
        </li>
      </ul>
    </div>

    <!--Profile & Language Dropdown-->
    <div class="flex-none gap-4">
      <div v-if="store.isAuthenticated" class="dropdown dropdown-end hidden md:inline-flex">
        <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar placeholder">
          <div class="bg-neutral text-neutral-content rounded-full w-10">
            <span class="text-xl">{{ store.user?.nome ? store.user.nome.charAt(0).toUpperCase() : 'U' }}</span>
          </div>
        </div>
        <ul tabindex="0" class="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
          <li>
            <details open>
              <summary>{{ $t('general.language') }}</summary>
              <ul>
                <li><a @click="changeLanguage('it')" :class="{ active: locale === 'it' }">Italiano</a></li>
                <li><a @click="changeLanguage('en')" :class="{ active: locale === 'en' }">English</a></li>
                <li><a @click="changeLanguage('de')" :class="{ active: locale === 'de' }">Deutsch</a></li>
              </ul>
            </details>
          </li>
          <li><a @click="logout" class="text-error">{{ $t('general.logout') }}</a></li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Mobile Navigation - Cittadino only -->
  <div v-if="store.isAuthenticated && store.user?.tipo === 'citt'" class="md:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-6 pb-safe">
    <div class="relative w-full max-w-sm">
      <!-- Barra principale -->
      <div class="bg-[#7bb77b] rounded-full px-3 py-3 shadow-2xl flex items-center justify-between w-full">
        <!-- Sinistra: Mappa + Info -->
        <div class="flex items-center gap-1.5 flex-1 justify-start">
          <router-link to="/cittadino/cerca" aria-label="Vai alla mappa" class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#95d095] flex items-center justify-center shadow-md hover:bg-[#a5daa5] active:scale-95 transition-all duration-150">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6 fill-white" aria-hidden="true">
              <path d="M12 2a7 7 0 0 0-7 7c0 4.2 4.43 9.53 6.1 11.42a1.2 1.2 0 0 0 1.8 0C14.57 18.53 19 13.2 19 9a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 2.5-2.5A2.5 2.5 0 0 1 12 11.5Z"/>
            </svg>
          </router-link>
          <button type="button" aria-label="Info orto (in arrivo)" title="Info orto (in arrivo)" disabled class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#95d095] flex items-center justify-center shadow-md opacity-50 cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6 fill-white" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 4.25a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 12 6.25ZM13.25 17h-2.5v-6h2.5Z"/>
            </svg>
          </button>
        </div>

        <!-- Spazio centrale -->
        <div class="flex-1"></div>

        <!-- Destra: Avvisi + Profilo/Logout -->
        <div class="flex items-center gap-1.5 flex-1 justify-end">
          <router-link to="/cittadino/avvisi" aria-label="Vai agli avvisi" class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#95d095] flex items-center justify-center shadow-md hover:bg-[#a5daa5] active:scale-95 transition-all duration-150">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6 fill-white" aria-hidden="true">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2z"/>
            </svg>
          </router-link>
          <button type="button" aria-label="Logout" class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#95d095] flex items-center justify-center shadow-md hover:bg-[#a5daa5] active:scale-95 transition-all duration-150" @click="logout">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6 fill-white" aria-hidden="true">
              <path d="M12 2a5 5 0 1 1-5 5 5 5 0 0 1 5-5ZM5 20a7 7 0 0 1 14 0 1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Pulsante centrale Home (emerge dalla barra) -->
      <router-link to="/cittadino/orto" aria-label="Home cittadino" class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[55%] rounded-full bg-[#6ba16b] shadow-2xl flex items-center justify-center hover:bg-[#5d925d] active:scale-95 transition-all duration-150" style="width: min(24vw, 6rem); height: min(24vw, 6rem);">
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
    </template>

    <!-- Logout Action -->
    <button class="dock-item flex flex-col items-center justify-center p-2 rounded-xl hover:bg-red-50 text-error transition-colors" @click="logout">
      <span class="text-2xl mb-1">🚪</span>
      <span class="text-[10px] font-medium leading-none">{{ $t('general.exit') }}</span>
    </button>

  </div>
</template>
