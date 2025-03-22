// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import axios from 'axios';

// Функция инициализации приложения
const initApp = () => {
  // Получаем конфигурацию из window.APP_CONFIG или из env
  const config = (window as any).APP_CONFIG || {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_API_KEY: import.meta.env.VITE_API_KEY,
    VITE_WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL
  };

  // Set default axios base URL for API requests
  axios.defaults.baseURL = config.VITE_API_URL || 'https://modul3-production.up.railway.app';

  // Get API key from configuration
  const API_KEY = config.VITE_API_KEY || 'BD7FpLQr9X54zHtN6K8ESvcA3m2YgJxW';

  // Set default axios headers
  axios.defaults.headers.common['X-API-Key'] = API_KEY;

  // Configure axios to include credentials in requests
  axios.defaults.withCredentials = true;

  // Рендеринг приложения
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Если есть загрузчик конфигурации, дожидаемся его выполнения
if ((window as any).APP_CONFIG) {
  initApp();
} else {
  // Если загрузчика нет, пытаемся дождаться его выполнения
  const checkConfig = () => {
    if ((window as any).APP_CONFIG) {
      initApp();
    } else {
      // Проверяем каждые 100мс, но не более 3 секунд
      setTimeout(checkConfig, 100);
    }
  };

  // Даем 3 секунды на загрузку конфигурации, потом запускаем в любом случае
  setTimeout(() => {
    initApp();
  }, 3000);

  checkConfig();
}