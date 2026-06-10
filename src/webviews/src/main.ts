import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import '@/assets/index.css'
import '@/assets/codicon.css'

createApp(App as Parameters<typeof createApp>[0])
  .use(createPinia())
  .mount('#app')
