<script>
import AvvisiBacheca from '@/components/AvvisiBacheca.vue'

export default {
  name: 'AvvisiCittadino',
  components: {
    AvvisiBacheca
  }
}
</script>

<template>
  <AvvisiBacheca 
    :title="$t('citizen.notices.title')"
    :subtitle="$t('citizen.notices.subtitle')"
  />
</template>
