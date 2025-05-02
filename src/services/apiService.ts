// src/services/apiService.ts
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import tokenService from './tokenService';
import { useEffect } from 'react';

// Добавляем расширенный интерфейс для AxiosRequestConfig
interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

// Get API key from environment variables
const API_KEY = import.meta.env.VITE_API_KEY || 'BD7FpLQr9X54zHtN6K8ESvcA3m2YgJxW';

// Create a custom axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://modul301-production.up.railway.app/',
  timeout: 50000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
});

api.interceptors.request.use(
  (config) => {
    const token = tokenService.getToken();
    // Получаем tenant_id для анализа
    const tenantId = tokenService.getTenantId();

    // Расширенное логирование для отладки
    console.log(`[API] Подготовка запроса к ${config.url}:`);
    console.log(`[API] - token присутствует:`, !!token);
    console.log(`[API] - token первые 10 символов:`, token ? token.substring(0, 10) + '...' : 'null');
    console.log(`[API] - tenant_id из токена:`, tenantId);
    console.log(`[API] - исходные заголовки:`, config.headers);

    if (token) {
      // Обязательно создаем объект headers, если его нет
      config.headers = config.headers || {};
      // Используем Bearer-схему авторизации
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`[API] Добавлен токен авторизации к запросу: ${config.url}`);

      // Добавляем tenant_id в заголовки, если он есть и не равен 'default'
      if (tenantId && tenantId !== 'default') {
        config.headers['X-Tenant-ID'] = tenantId;
        console.log(`[API] Добавлен tenant_id в заголовки: ${tenantId}`);
      } else {
        console.log(`[API] Не добавляем tenant_id в заголовки: ${tenantId}`);
      }
    } else {
      // Не показываем предупреждение для аутентификационных запросов
      if (config.url && !config.url.includes('/auth/')) {
        console.warn(`[API] ⚠️ Запрос к ${config.url} отправляется без токена авторизации!`);

        // Пробуем получить токен повторно, возможно, он был сохранен, но не загружен в переменную
        const localToken = localStorage.getItem('token');
        if (localToken) {
          console.log('[API] Найден токен в localStorage, пробуем использовать его');
          console.log('[API] - первые 10 символов найденного токена:', localToken.substring(0, 10) + '...');

          // Пробуем декодировать токен для проверки
          try {
            const decodedLocal = jwtDecode(localToken);
            console.log('[API] - декодированный токен из localStorage:', decodedLocal);
            console.log('[API] - tenant_id из токена localStorage:', decodedLocal.tenant_id || 'отсутствует');
          } catch (e) {
            console.error('[API] - ошибка декодирования токена из localStorage:', e);
          }

          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${localToken}`;

          // Пробуем также добавить tenant_id из localStorage токена
          try {
            const decodedLocal = jwtDecode(localToken);
            if (decodedLocal.tenant_id && decodedLocal.tenant_id !== 'default') {
              config.headers['X-Tenant-ID'] = decodedLocal.tenant_id;
              console.log(`[API] Добавлен tenant_id из localStorage токена: ${decodedLocal.tenant_id}`);
            }
          } catch (e) {
            console.error('[API] - не удалось добавить tenant_id из localStorage токена');
          }
        }
      }
    }

    // Проверяем наличие всех необходимых заголовков
    console.log('[API] Итоговые заголовки запроса:', config.headers);
    console.log('[API] Есть ли tenant_id в заголовках:',
      config.headers && (config.headers['X-Tenant-ID'] || config.headers['x-tenant-id'])
        ? 'Да, значение: ' + (config.headers['X-Tenant-ID'] || config.headers['x-tenant-id'])
        : 'Нет'
    );

    return config;
  },
  (error) => {
    console.error('[API] Ошибка в интерцепторе запроса:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Добавляем логирование CORS-ошибок
    if (!error.response) {
      console.error('[API] Возможная CORS-ошибка:', error.message);
      console.error('[API] URL запроса:', originalRequest.url);
      console.error('[API] Заголовки запроса:', originalRequest.headers);
    }

    // If the error is due to an expired token (401) and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Получаем текущий токен
        const currentToken = tokenService.getToken();

        console.log("Attempting to refresh token:", { token: currentToken });

        // Попытка 1: Отправка в теле запроса, как было раньше
        const response = await api.post('/api/auth/refresh',
            { token: currentToken },
            {
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
              }
            } as CustomAxiosRequestConfig
        );

        const { token } = response.data;

        // Update the token
        tokenService.setToken(token);

        // Update authorization header for the original request
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${token}`;
        originalRequest.headers['X-API-Key'] = API_KEY;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh error:", refreshError);

        try {
          // Попытка 2: Использование текущего токена в заголовке Authorization
          const currentToken = tokenService.getToken();

          if (currentToken) {
            console.log("Attempting fallback token refresh method");

            // Создаем новый запрос с токеном в заголовке Authorization
            const response = await axios.post(
              `${import.meta.env.VITE_API_URL || 'https://modul301-production.up.railway.app'}/api/auth/refresh`,
              {},  // Пустое тело
              {
                headers: {
                  'Authorization': `Bearer ${currentToken}`,
                  'X-API-Key': API_KEY,
                  'Content-Type': 'application/json'
                }
              }
            );

            const { token } = response.data;

            // Update the token
            tokenService.setToken(token);

            // Update authorization header for the original request
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            originalRequest.headers['X-API-Key'] = API_KEY;

            // Retry the original request
            return api(originalRequest);
          }
        } catch (fallbackError) {
          console.error("Fallback refresh method failed:", fallbackError);
          // If token refresh fails, redirect to login
          window.location.href = '/login';
          return Promise.reject(fallbackError);
        }

        // If token refresh fails, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // General error handling
    if (error.response?.status === 404) {
      console.error('Resource not found');
    }

    if (error.response?.status === 500) {
      console.error('Server error');
    }

    return Promise.reject(error);
  }
);

// Error parsing helper
const parseError = (error: any): string => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unknown error occurred';
};

// API methods
const apiService = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.get(url, config);
      return response.data;
    } catch (error) {
      console.error(`GET ${url} failed:`, error);
      throw parseError(error);
    }
  },

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`POST ${url} failed:`, error);
      throw parseError(error);
    }
  },

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`PUT ${url} failed:`, error);
      throw parseError(error);
    }
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.delete(url, config);
      return response.data;
    } catch (error) {
      console.error(`DELETE ${url} failed:`, error);
      throw parseError(error);
    }
  },

  // For file uploads
  async upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    try {
      const uploadConfig: AxiosRequestConfig = {
        ...config,
        headers: {
          ...config?.headers,
          'Content-Type': 'multipart/form-data',
          'X-API-Key': API_KEY,
        },
      };

      const response: AxiosResponse<T> = await api.post(url, formData, uploadConfig);
      return response.data;
    } catch (error) {
      console.error(`Upload to ${url} failed:`, error);
      throw parseError(error);
    }
  }
};

// Hook to attach API calls to components
export function useApi() {
  useEffect(() => {
    // This could be used to set up/tear down API-related resources
    return () => {
      // Cleanup if needed
    };
  }, []);

  return apiService;
}

export default apiService;