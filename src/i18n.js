import { createI18n } from 'vue-i18n'
import it from './locales/it.json'
import en from './locales/en.json'
import de from './locales/de.json'

const i18n = createI18n({
  legacy: false, // You are using Vue 3, so usage of composition API is recommended
  globalInjection: true, // Injects $t globally
  locale: 'it', // set default locale
  fallbackLocale: 'en', // set fallback locale
  messages: {
    it,
    en,
    de
  }
})

export default i18n
