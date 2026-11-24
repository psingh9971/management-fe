import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// No env config: the API is always <current host>/api, and the tenant is resolved from the host.
export default defineConfig({
  plugins: [vue()],
  server: {
    // Development only: forward /api/... to the local FastAPI backend.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        // Keep the browser's Host header (e.g. demo.localhost:5173) so the backend can
        // resolve the tenant from the subdomain.
        changeOrigin: false,
      },
    },
  },
})
