import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// BASE_PATH задаётся в CI для GitHub Pages ('/<repo>/'), локально — корень.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    hmr: { clientPort: 443 },
  },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
})
