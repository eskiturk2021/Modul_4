import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    // Отключаем минимизацию для диагностики
    minify: false,
    // Устанавливаем режим генерации для корректной сборки
    rollupOptions: {
      output: {
        // Гарантируем, что файлы будут созданы
        manualChunks: undefined,
      }
    }
  }
})