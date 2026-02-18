<div align="center">
  <img src="./public/logo.png" alt="Orticello Logo" width="200"/>
  
  # Orticello FrontEnd
  
  **Interfaccia utente moderna per la gestione di orti urbani comunitari**

  [![Vue.js](https://img.shields.io/badge/Vue.js-3.5-4FC08D?style=flat&logo=vue.js&logoColor=white)](https://vuejs.org/)
  [![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![DaisyUI](https://img.shields.io/badge/DaisyUI-4.12-5A0EF8?style=flat&logo=daisyui&logoColor=white)](https://daisyui.com/)

  [Documentazione](#-documentazione) • [Caratteristiche](#-caratteristiche-principali) • [Installazione](#-installazione) • [Team](#-team)

</div>

---

## 📖 Descrizione

Orticello FrontEnd è l'interfaccia utente web per il sistema di gestione intelligente degli orti urbani comunitari della città di Trento. L'applicazione fornisce un'esperienza utente moderna e intuitiva per cittadini, associazioni e amministrazioni comunali, facilitando la gestione dei terreni coltivabili, la ricerca di orti disponibili, il monitoraggio ambientale e la comunicazione tra tutti gli attori coinvolti.

### 🎯 Obiettivi

- 🎨 Fornire un'interfaccia moderna e accessibile
- 📱 Garantire un'esperienza responsive su tutti i dispositivi
- 🗺️ Visualizzare mappe interattive degli orti urbani
- 👥 Supportare ruoli utente differenziati (Cittadini, Associazioni, Comuni)
- 🌍 Offrire supporto multilingua completo
- ⚡ Garantire performance elevate e caricamenti rapidi

---

## ✨ Caratteristiche Principali

### 🔐 Autenticazione e Gestione Utenti

- Sistema di login e registrazione sicuro
- Gestione profilo utente personalizzato
- Controllo accessi basato su ruoli (Cittadino, Associazione, Comune)
- Persistenza sessione con token JWT

### 🗺️ Mappe Interattive

- Visualizzazione geospaziale degli orti con **Leaflet**
- Ricerca orti per posizione geografica
- Filtri avanzati per disponibilità e caratteristiche
- Mappa interattiva per gestione comunale

### 🏡 Gestione Orti

**Per Cittadini:**
- Ricerca orti disponibili nelle vicinanze
- Visualizzazione dettagli lotti e caratteristiche
- Consultazione avvisi e comunicazioni

**Per Associazioni:**
- Dashboard gestionale completa
- Amministrazione orti assegnati
- Pubblicazione e gestione avvisi
- Gestione bandi e richieste
- Monitoraggio membri

**Per Comuni:**
- Panoramica completa degli orti urbani
- Gestione associazioni territoriali
- Pubblicazione bandi di assegnazione
- Sistema di comunicazione con i cittadini
- Visualizzazione mappa territoriale

### 🌐 Internazionalizzazione

- Supporto multilingua completo (🇮🇹 Italiano, 🇬🇧 Inglese, 🇩🇪 Tedesco)
- Cambio lingua in tempo reale
- Contenuti localizzati per ogni sezione

### 🎨 UI/UX Moderna

- Design system basato su **TailwindCSS** e **DaisyUI**
- Componenti riutilizzabili e modulari
- Animazioni fluide e transizioni eleganti
- Icone personalizzate con **Lucide Vue**
- Dark mode ready

---

## 🏗️ Architettura

### Stack Tecnologico

```
Framework:        Vue.js 3.5.25 (Composition API)
Build Tool:       Vite 7.2.4
Routing:          Vue Router 4.6.4
UI Framework:     TailwindCSS 3.4 + DaisyUI 4.12
Maps:             Leaflet 1.9.4 + Vue-Leaflet 0.10
i18n:             Vue I18n 11.2.8
Icons:            Lucide Vue Next 0.563
Linting:          ESLint 9.39 + Prettier 3.6
```
---

## 🚀 Installazione

### Prerequisiti

- **Node.js** >= 20.19.0 o >= 22.12.0
- **npm** >= 10.0.0
- Accesso all'[API Backend Orticello](https://github.com/antoniocariaa/OrticelloAPI)

### Setup

```bash
# Clona il repository
git clone https://github.com/your-repo/orticello-frontend.git

# Entra nella directory
cd orticello-frontend

# Installa le dipendenze
npm install

# Configura le variabili d'ambiente
# Crea un file .env nella root del progetto
echo "VITE_API_BASE_URL=http://localhost:8080/api/v1" > .env

# Avvia in modalità sviluppo
npm run dev
```

L'applicazione sarà disponibile su `http://localhost:5173`

### Variabili d'Ambiente

Crea un file `.env` nella root del progetto:

```bash
# URL dell'API Backend
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

### Build per Produzione

```bash
# Compila e minifica per produzione
npm run build

# Anteprima build di produzione
npm run preview
```

I file ottimizzati saranno generati nella cartella `dist/`.

---

## 🛠️ Sviluppo

### Scripts Disponibili

```bash
# Avvia server di sviluppo con hot-reload
npm run dev

# Build per produzione
npm run build

# Anteprima build di produzione
npm run preview

# Linting e fix automatico
npm run lint

# Formattazione codice con Prettier
npm run format
```

---

## 📚 Documentazione

### Routing

L'applicazione utilizza **Vue Router** con protezione delle route tramite guards. Le route sono organizzate per ruolo utente:

- **Public:** `/login`, `/register`
- **Cittadino:** `/cittadino/*`
- **Associazione:** `/associazione/*`
- **Comune:** `/comune/*`


### Internazionalizzazione

```vue
<template>
  <!-- Usa $t per le traduzioni -->
  <h1>{{ $t('welcome.title') }}</h1>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

// Cambia lingua
locale.value = 'en'
</script>
```

---

## 🔒 Sicurezza

- 🔐 Autenticazione JWT con token storage sicuro
- 🛡️ Protected routes con navigation guards
- ✅ Validazione input lato client
- 🔍 Sanitizzazione dati prima dell'invio
- 🚫 Protezione XSS grazie a Vue.js

---

## 👥 Team

Sviluppato con ❤️ da:

- **Ali Raja Faizan**
- **Antonio Caria**
- **Federico Pedron**

---

## 📞 Contatti

Per domande o supporto, apri una issue su GitHub.

---

<div align="center">
  
  **Coltiva il futuro verde delle città!** 🌱🏙️

  [🔙 Torna su](#orticello-frontend)

</div>
