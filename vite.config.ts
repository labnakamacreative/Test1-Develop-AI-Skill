import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// On GitHub Pages the app is served from /<repo-name>/, so the production
// build needs that base path. Local `npm run dev` stays at root (/).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Test1-Develop-AI-Skill/' : '/',
  plugins: [react()],
}))
