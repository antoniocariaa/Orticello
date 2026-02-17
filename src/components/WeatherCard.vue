<script setup>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CloudSun, CloudRain, Thermometer, Clock, Droplets, Wind, AlertCircle, RefreshCw, Sun, Cloud, CloudSnow, CloudLightning, CloudFog } from 'lucide-vue-next'

const props = defineProps({
  coordinates: {
    type: Array, // [longitude, latitude]
    default: null
  }
})

const { t } = useI18n()
const loading = ref(false)
const error = ref(false)
const weatherData = ref(null)

// WMO Weather interpretation codes -> icon & description
const getWeatherInfo = (code) => {
  if (code === undefined || code === null) return { icon: CloudSun, label: '-' }
  if (code === 0) return { icon: Sun, label: t('citizen.home.weather_clear') }
  if (code <= 3) return { icon: Cloud, label: t('citizen.home.weather_cloudy') }
  if (code <= 49) return { icon: CloudFog, label: t('citizen.home.weather_fog') }
  if (code <= 69) return { icon: CloudRain, label: t('citizen.home.weather_rain') }
  if (code <= 79) return { icon: CloudSnow, label: t('citizen.home.weather_snow') }
  if (code <= 99) return { icon: CloudLightning, label: t('citizen.home.weather_storm') }
  return { icon: CloudSun, label: '-' }
}

const formatTime = (isoString) => {
  if (!isoString) return '-'
  return new Date(isoString).toLocaleString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short'
  })
}

const fetchWeather = async () => {
  if (!props.coordinates || props.coordinates.length < 2) return

  loading.value = true
  error.value = false
  weatherData.value = null

  try {
    const [lng, lat] = props.coordinates
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
    
    const response = await fetch(url)
    if (!response.ok) throw new Error('Weather API error')
    
    const data = await response.json()
    
    if (data.current) {
      weatherData.value = {
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        weatherCode: data.current.weather_code,
        windSpeed: data.current.wind_speed_10m,
        time: data.current.time,
        units: data.current_units || {}
      }
    }
  } catch (err) {
    console.warn('Weather fetch failed', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchWeather)

watch(() => props.coordinates, fetchWeather, { deep: true })
</script>

<template>
  <div class="card bg-base-100 shadow-xl border border-base-200">
    <div class="card-body">
      <h3 class="card-title text-secondary text-lg flex items-center gap-2">
        <CloudSun class="w-5 h-5" /> {{ $t('citizen.home.weather_title') }}
      </h3>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center py-4 gap-2">
        <span class="loading loading-spinner loading-md text-primary"></span>
        <span class="text-sm opacity-70">{{ $t('citizen.home.weather_loading') }}</span>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex flex-col items-center py-4 gap-2 text-error">
        <AlertCircle class="w-8 h-8" />
        <span class="text-sm text-center">{{ $t('citizen.home.weather_error') }}</span>
        <button @click="fetchWeather" class="btn btn-ghost btn-xs gap-1">
          <RefreshCw class="w-3 h-3" /> {{ $t('general.retry') || 'Riprova' }}
        </button>
      </div>

      <!-- No Data -->
      <div v-else-if="!weatherData" class="flex flex-col items-center py-4 gap-2">
        <CloudRain class="w-8 h-8 opacity-40" />
        <span class="text-sm italic opacity-50 text-center">{{ $t('citizen.home.weather_no_data') }}</span>
      </div>

      <!-- Weather Data -->
      <div v-else class="flex flex-col gap-3">
        
        <!-- Main weather info: icon + temperature -->
        <div class="flex items-center gap-4 bg-base-200 rounded-lg p-4">
          <component :is="getWeatherInfo(weatherData.weatherCode).icon" class="w-10 h-10 text-primary flex-shrink-0" />
          <div>
            <div class="text-3xl font-bold">{{ weatherData.temperature }}°C</div>
            <div class="text-sm opacity-70">{{ getWeatherInfo(weatherData.weatherCode).label }}</div>
          </div>
        </div>

        <!-- Details grid -->
        <div class="grid grid-cols-2 gap-2">
          <!-- Humidity -->
          <div class="flex items-center gap-2 bg-base-200 rounded-lg p-2">
            <Droplets class="w-4 h-4 text-info flex-shrink-0" />
            <div>
              <div class="text-xs opacity-60">{{ $t('citizen.home.weather_humidity') }}</div>
              <div class="font-semibold text-sm">{{ weatherData.humidity }}%</div>
            </div>
          </div>
          <!-- Wind -->
          <div class="flex items-center gap-2 bg-base-200 rounded-lg p-2">
            <Wind class="w-4 h-4 text-info flex-shrink-0" />
            <div>
              <div class="text-xs opacity-60">{{ $t('citizen.home.weather_wind') }}</div>
              <div class="font-semibold text-sm">{{ weatherData.windSpeed }} km/h</div>
            </div>
          </div>
        </div>

        <!-- Timestamp -->
        <div class="flex items-center gap-2 text-xs opacity-50">
          <Clock class="w-3 h-3" />
          <span>{{ $t('citizen.home.weather_last_update') }}: {{ formatTime(weatherData.time) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
