// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import axios from 'axios';

// Интерцептор для логирования всех запросов
axios.interceptors.request.use(
  config => {
    console.log(`Outgoing Request [${config.method?.toUpperCase()}]`, {
      url: config.url,
      baseURL: config.baseURL,
      headers: config.headers,
      data: config.data,
      params: config.params
    });

    // Проверяем наличие заголовка авторизации
    const hasAuthHeader = config.headers &&
                         (config.headers.Authorization ||
                          config.headers.authorization);

    if (!hasAuthHeader && config.url && !config.url.includes('/auth/')) {
      console.warn(`⚠️ Запрос к ${config.url} отправляется без токена авторизации!`);
    }

    return config;
  },
  error => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Интерцептор для логирования всех ответов
axios.interceptors.response.use(
  response => {
    console.log(`Response [${response.status}]`, {
      url: response.config.url,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  error => {
    console.error('Response Error:', error.response ? {
      status: error.response.status,
      data: error.response.data,
      headers: error.response.headers,
      url: error.config?.url
    } : error.message);

    // Добавляем информацию о CORS-ошибках
    if (error.message && error.message.includes('NetworkError') ||
        (error.response === undefined && error.request)) {
      console.error('Возможная CORS-ошибка или проблема с сетью:', error);
    }

    return Promise.reject(error);
  }
);

// Set default axios base URL for API requests
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://modul301-production.up.railway.app/';

// Get API key from environment variables
const API_KEY = import.meta.env.VITE_API_KEY || 'BD7FpLQr9X54zHtN6K8ESvcA3m2YgJxW';

// Set default axios headers
axios.defaults.headers.common['X-API-Key'] = API_KEY;

// Configure axios to include credentials in requests
axios.defaults.withCredentials = true;

// Проверяем правильность настроек CORS
console.log('[CORS] Проверка настроек для кросс-доменных запросов:');
console.log(`[CORS] Базовый URL API: ${axios.defaults.baseURL}`);
console.log(`[CORS] Включены учетные данные (credentials): ${axios.defaults.withCredentials}`);
console.log(`[CORS] API-ключ: ${API_KEY ? 'Настроен' : 'Не настроен'}`);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);