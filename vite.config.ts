import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Используем более безопасный режим sourcemap для production
    sourcemap: mode === 'production' ? false : true,
    // Минимизируем для production и отключаем eval
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: {
      compress: {
        // Отключаем unsafe эвристики
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  // Отключаем быстрый refresh в production режиме
  server: {
    hmr: {
      // Включаем только для разработки
      overlay: mode !== 'production',
    },
  },
}))