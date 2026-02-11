<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { store } from '../store'
import api from '../services/api'

const router = useRouter()
const { t, locale } = useI18n()

// Form data
const form = ref({
  nome: '',
  email: '',
  telefono: '',
  indirizzo: ''
})

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const loading = ref(false)
const passwordLoading = ref(false)
const error = ref('')
const success = ref('')
const passwordError = ref('')
const passwordSuccess = ref('')

// Delete Account logic
const showDeleteModal = ref(false)
const deleteConfirmationInput = ref('')
const expectedConfirmation = computed(() => t('nav.confirm_deletion_phrase'))
const canDelete = computed(() => deleteConfirmationInput.value === expectedConfirmation.value)

onMounted(() => {
  if (store.user) {
    form.value = { ...store.user }
    // Initialize form with user data, handle potential missing fields
    if (!form.value.telefono) form.value.telefono = ''
    if (!form.value.indirizzo) form.value.indirizzo = ''
  }
})

const updateProfile = async () => {
  loading.value = true
  error.value = ''
  success.value = ''
  
  try {
    const userId = store.user?.id || store.user?._id
    
    if (!userId) throw new Error("User ID not found")

    await api.put(`/utenti/${userId}`, form.value)
    
    store.setUser({ ...store.user, ...form.value })
    success.value = t('success.utente_updated')
  } catch (err) {
    console.error(err)
    error.value = t('errors.updating_utente')
  } finally {
    loading.value = false
  }
}

const updatePassword = async () => {
  passwordLoading.value = true
  passwordError.value = ''
  passwordSuccess.value = ''

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = t('nav.passwords_not_match')
    passwordLoading.value = false
    return
  }

  try {
    const userId = store.user?.id || store.user?._id
    if (!userId) throw new Error("User ID not found")

    await api.put(`/utenti/updatePassword/${userId}`, {
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    })

    passwordSuccess.value = t('nav.password_updated')
    passwordForm.value.oldPassword = ''
    passwordForm.value.newPassword = ''
    passwordForm.value.confirmPassword = ''
  } catch (err) {
    console.error(err)
    passwordError.value = err.message || t('errors.updating_password')
  } finally {
    passwordLoading.value = false
  }
}

const openDeleteModal = () => {
  showDeleteModal.value = true
  deleteConfirmationInput.value = ''
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deleteConfirmationInput.value = ''
}

const deleteAccount = async () => {
  if (!canDelete.value) return

  try {
    const userId = store.user?.id || store.user?._id
    if (!userId) throw new Error("User ID not found")
      
    await api.delete(`/utenti/${userId}`)
    closeDeleteModal()
    logout()
  } catch (err) {
    console.error(err)
    alert(t('errors.deleting_utente'))
  }
}

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
  <div class="container mx-auto p-4 max-w-2xl">
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title text-2xl mb-6">{{ t('general.profile') }}</h2>

        <!-- Language Selection -->
        <div class="form-control w-full max-w-xs mb-6">
          <label class="label">
            <span class="label-text">{{ t('general.language') }}</span>
          </label>
          <div class="join">
            <button 
              class="btn join-item" 
              :class="{ 'btn-primary': locale === 'it' }"
              @click="changeLanguage('it')"
            >🇮🇹 IT</button>
            <button 
              class="btn join-item" 
              :class="{ 'btn-primary': locale === 'en' }"
              @click="changeLanguage('en')"
            >🇬🇧 EN</button>
             <button 
              class="btn join-item" 
              :class="{ 'btn-primary': locale === 'de' }"
              @click="changeLanguage('de')"
            >🇩🇪 DE</button>
          </div>
        </div>

        <div class="divider"></div>

        <!-- User Info Form -->
        <h3 class="text-lg font-bold mb-4">{{ t('nav.user_info') }}</h3>
        
        <form @submit.prevent="updateProfile" class="flex flex-col gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Nome</span>
            </label>
            <input type="text" v-model="form.nome" class="input input-bordered" required />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input type="email" v-model="form.email" class="input input-bordered" required />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Telefono</span>
            </label>
            <input type="tel" v-model="form.telefono" class="input input-bordered" />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">{{ t('nav.address') }}</span>
            </label>
            <input type="text" v-model="form.indirizzo" class="input input-bordered" />
          </div>

          <!-- Messages -->
          <div v-if="error" class="alert alert-error text-sm py-2 mt-2">
            {{ error }}
          </div>
          <div v-if="success" class="alert alert-success text-sm py-2 mt-2">
            {{ success }}
          </div>

          <div class="mt-4">
             <button type="submit" class="btn btn-primary w-full" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner"></span>
              {{ t('nav.save') }}
            </button>
          </div>
        </form>

        <div class="divider"></div>

        <!-- Change Password Form -->
        <h3 class="text-lg font-bold mb-4">{{ t('nav.change_password') }}</h3>
        
        <form @submit.prevent="updatePassword" class="flex flex-col gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">{{ t('nav.current_password') }}</span>
            </label>
            <input type="password" v-model="passwordForm.oldPassword" class="input input-bordered" required />
          </div>

          <div class="form-control">
             <label class="label">
              <span class="label-text">{{ t('nav.new_password') }}</span>
            </label>
            <input type="password" v-model="passwordForm.newPassword" class="input input-bordered" required minlength="8" />
          </div>

          <div class="form-control">
             <label class="label">
              <span class="label-text">{{ t('nav.confirm_password') }}</span>
            </label>
            <input type="password" v-model="passwordForm.confirmPassword" class="input input-bordered" required minlength="8" />
          </div>

           <!-- Password Messages -->
          <div v-if="passwordError" class="alert alert-error text-sm py-2 mt-2">
            {{ passwordError }}
          </div>
          <div v-if="passwordSuccess" class="alert alert-success text-sm py-2 mt-2">
            {{ passwordSuccess }}
          </div>

          <div class="mt-4">
             <button type="submit" class="btn btn-secondary w-full" :disabled="passwordLoading">
              <span v-if="passwordLoading" class="loading loading-spinner"></span>
              {{ t('nav.change_password') }}
            </button>
          </div>
        </form>
        
        <div class="divider"></div>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-4 justify-between mt-4">
          <button @click="logout" class="btn btn-outline flex-1">
            {{ t('general.logout') }}
          </button>
          
          <button @click="openDeleteModal" class="btn btn-error btn-outline flex-1">
            {{ t('nav.delete_account') }}
          </button>
        </div>

      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <dialog class="modal" :class="{ 'modal-open': showDeleteModal }">
      <div class="modal-box">
        <h3 class="font-bold text-lg text-error">{{ t('nav.delete_account') }}</h3>
        <p class="py-4">{{ t('nav.delete_account_confirm') }}</p>
        
        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">
              {{ t('nav.type_to_confirm', { phrase: expectedConfirmation }) }}
            </span>
          </label>
          <input 
            type="text" 
            v-model="deleteConfirmationInput" 
            :placeholder="expectedConfirmation"
            class="input input-bordered w-full" 
            @keyup.enter="deleteAccount"
          />
        </div>

        <div class="modal-action">
          <button class="btn" @click="closeDeleteModal">{{ t('nav.cancel') }}</button>
          <button 
            class="btn btn-error" 
            :disabled="!canDelete" 
            @click="deleteAccount"
          >
            {{ t('nav.confirm') }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDeleteModal">close</button>
      </form>
    </dialog>

  </div>
</template>
