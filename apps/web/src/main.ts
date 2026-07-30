import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './app.vue'
import router from './router'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/index.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
