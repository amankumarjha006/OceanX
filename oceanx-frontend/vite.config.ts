import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/dimensions': 'http://localhost:8000',
      '/variables': 'http://localhost:8000',
      '/slice': 'http://localhost:8000',
    },
  },
})