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
    // Извлекаем информацию о tenant_id из заголовков запроса
    const requestTenantId = response.config.headers?.['X-Tenant-ID'] ||
                           response.config.headers?.['x-tenant-id'] ||
                           'отсутствует';

    // Проверяем, есть ли информация о tenant_id в ответе
    let responseTenantId = 'отсутствует';
    if (response.data && typeof response.data === 'object') {
      responseTenantId = response.data.tenant_id ||
                         response.data.tenantId ||
                         'отсутствует';
    }

    console.log(`Response [${response.status}]`, {
      url: response.config.url,
      data: response.data,
      headers: response.headers,
      requestTenantId: requestTenantId, // tenant_id, который был отправлен в запросе
      responseTenantId: responseTenantId, // tenant_id, полученный в ответе (если есть)
      authHeader: response.config.headers?.Authorization ? 'присутствует' : 'отсутствует'
    });

    // Дополнительная проверка заголовков ответа на предмет информации о тенанте
    if (response.headers['x-tenant-info'] || response.headers['x-tenant-id']) {
      console.log(`[Response] Обнаружена информация о тенанте в заголовках ответа:`, {
        'x-tenant-info': response.headers['x-tenant-info'],
        'x-tenant-id': response.headers['x-tenant-id']
      });
    }

    return response;
  },
  error => {
    // Информация о tenant_id в запросе, который привел к ошибке
    const requestTenantId = error.config?.headers?.['X-Tenant-ID'] ||
                           error.config?.headers?.['x-tenant-id'] ||
                           'отсутствует';

    console.error('Response Error:', error.response ? {
      status: error.response.status,
      data: error.response.data,
      headers: error.response.headers,
      url: error.config?.url,
      requestTenantId: requestTenantId, // tenant_id, который был отправлен в запросе
      authHeader: error.config?.headers?.Authorization ? 'присутствует' : 'отсутствует'
    } : error.message);

    // Проверка, содержит ли ошибка информацию о тенанте
    if (error.response?.data &&
        (error.response.data.tenant_error ||
         error.response.data.tenantError ||
         (typeof error.response.data === 'string' &&
          error.response.data.includes('tenant')))) {
      console.error('[Response Error] Возможная ошибка, связанная с тенантом:',
                   error.response.data);
    }

    // Добавляем информацию о CORS-ошибках
    if (error.message && error.message.includes('NetworkError') ||
        (error.response === undefined && error.request)) {
      console.error('Возможная CORS-ошибка или проблема с сетью:', error);
      console.error('[Response Error] Детали запроса:', {
        url: error.config?.url,
        method: error.config?.method,
        requestTenantId: requestTenantId,
        requestHeaders: error.config?.headers
      });
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