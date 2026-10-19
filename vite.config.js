import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createApiMiddleware } from './server/api.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    { name: 'flow-api', configureServer(server) { server.middlewares.use(createApiMiddleware()); }, configurePreviewServer(server) { server.middlewares.use(createApiMiddleware()); } },
    tailwindcss(),
    react()
  ],
})
