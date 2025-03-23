import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    // Устанавливаем режим генерации для корректной сборки
    rollupOptions: {
      output: {
        // Гарантируем, что файлы будут созданы
        manualChunks: undefined,
      }
    }
  }
})