import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    Components({
      dts: false,
      resolvers: [
        ElementPlusResolver({
          directives: true,
          importStyle: 'css',
        }),
      ],
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      '/healthz': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
})
