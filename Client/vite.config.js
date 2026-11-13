// File: Client/vite.config.js
// Version: 1.0.0
// Description: Vite config — port อ่านจาก ports.env (ผ่าน start.sh), production base = /kuscc-qr/client/
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/kuscc-qr/client/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: parseInt(process.env.PORT_CLIENT) || 5251,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
}))
