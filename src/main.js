import { createApp } from 'vue'
import App from './App.vue'
import PrimeVue from 'primevue/config'
import Ripple from 'primevue/ripple'
import Preset from '@/composables/stylePreset.js'
import locales from '@/locale/ru.json'

import '@/assets/styles/main.scss'

createApp(App)
    .use(PrimeVue, {
      locale: locales.ru,
      ripple: true,
      theme: {
        preset: Preset,
        options: {
          darkModeSelector: false || "none",
        },
      },
    })
    .directive("ripple", Ripple)
    .mount("#app");
