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
    // Явно указываем директорию вывода
    outDir: 'dist',
    // Убеждаемся, что директория очищается перед сборкой
    emptyOutDir: true,
    // Используем более безопасный режим sourcemap для production
    sourcemap: false,
    // Минимизируем для production и отключаем eval
    minify: 'terser',
    terserOptions: {
      compress: {
        // Отключаем unsafe эвристики
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Добавляем больше логов для диагностики
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
  }
})