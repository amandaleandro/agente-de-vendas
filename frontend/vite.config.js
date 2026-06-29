import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3099',
        changeOrigin: true
      },
      '/qr': {
        target: 'http://localhost:3099',
        changeOrigin: true
      }
    }
  }
})
