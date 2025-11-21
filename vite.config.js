import { defineConfig } from 'vite'

export default defineConfig({
  // No plugins needed for raw shader imports!
  plugins: [], 
  server: {
    host: true,
    port: 3000
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
})