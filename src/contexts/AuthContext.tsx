// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios, { AxiosRequestConfig } from 'axios';
import tokenService from '@/services/tokenService';
import apiService from '@/services/apiService';

// Get API key from environment variables
const API_KEY = import.meta.env.VITE_API_KEY || 'BD7FpLQr9X54zHtN6K8ESvcA3m2YgJxW';

// Добавляем интерфейс для ответа при обновлении токена
interface RefreshTokenResponse {
  token: string;
  tenant_id?: string; // Добавили поле tenant_id
}

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
  tenant_id?: string; // Добавили поле tenant_id
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  tenantId: string | null; // Добавили поле tenantId
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshToken: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(tokenService.getToken());
  const [tenantId, setTenantId] = useState<string | null>(null); // Состояние для tenant_id
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if token exists and is valid
    const validateToken = async () => {
      if (token) {
        try {
          // Set default headers for all requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Check if token is still valid
          if (!tokenService.isTokenValid()) {
            console.warn('Token has expired, trying to refresh...');
            const refreshed = await refreshToken();
            if (!refreshed) {
              throw new Error('Token refresh failed');
            }
          } else {
            // Token is valid, get user info from it
            const decoded = tokenService.getDecodedToken();
            if (decoded) {
              setUser({
                id: decoded.id,
                username: decoded.username,
                email: decoded.email,
                role: decoded.role,
                tenant_id: decoded.tenant_id // Устанавливаем tenant_id из токена
              });
              setTenantId(decoded.tenant_id || 'default'); // Устанавливаем tenant_id в состояние
              console.log(`[AUTH] Установлен tenant_id из токена при валидации: ${decoded.tenant_id || 'default'}`);

              // Устанавливаем заголовки tenant_id
              const tenantHeaders = tokenService.getTenantHeaders();
              Object.entries(tenantHeaders).forEach(([key, value]) => {
                axios.defaults.headers.common[key] = value;
              });
              console.log('[AUTH] Установлены глобальные заголовки tenant_id при валидации токена:', tenantHeaders);
            }
          }
        } catch (error) {
          console.error('Invalid token', error);
          tokenService.removeToken();
          setToken(null);
          setUser(null);
          setTenantId(null); // Сбрасываем tenant_id
        }
      }
      setIsLoading(false);
    };

    validateToken();

    return () => {
    };
  }, [token]);

  // Обновленный метод login в AuthContext.tsx
  const login = async (email: string, password: string) => {
    console.log("[AUTH] Начало процесса логина");
    setIsLoading(true);
    try {
      // Исправлено: изменили поле email на username для соответствия ожиданиям бэкенда
      const response = await axios.post('/api/auth/login',
        // Используем URLSearchParams для отправки данных в формате application/x-www-form-urlencoded
        new URLSearchParams({
          'username': email, // email используется как username
          'password': password
        }).toString(),
        {
          headers: {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/x-www-form-urlencoded' // Важно для OAuth2
          }
        } as AxiosRequestConfig
      );

      const { token: newToken, tenant_id } = response.data;

      console.log('[AuthContext] Получены данные после авторизации:', {
        token: newToken ? newToken.substring(0, 10) + '...' : 'отсутствует',
        tenant_id: tenant_id || 'не указан'
      });
      console.log(`[AUTH] Получен ответ логина: token=${newToken ? 'присутствует' : 'отсутствует'}, tenant_id=${tenant_id || 'отсутствует'}`);

      // 1. Сохраняем токен
      tokenService.setToken(newToken);

      // Сохраняем tenant_id из ответа, если он есть
      if (tenant_id) {
        tokenService.setTenantId(tenant_id);
        console.log(`[AUTH] Сохранен tenant_id из ответа API: ${tenant_id}`);
      } else {
        // Если tenant_id отсутствует в ответе, попробуем получить его из токена
        const decoded = tokenService.getDecodedToken();
        if (decoded && decoded.tenant_id) {
          tokenService.setTenantId(decoded.tenant_id);
          console.log(`[AUTH] Сохранен tenant_id из декодированного токена: ${decoded.tenant_id}`);
        } else {
          console.warn('[AUTH] ⚠️ Не удалось получить tenant_id ни из ответа, ни из токена!');
        }
      }

      console.log(`[AUTH] Токен и tenant_id сохранены в tokenService`);

      // 2. Обновляем состояние
      setToken(newToken);

      // Получаем итоговый tenant_id через tokenService для единообразия
      const effectiveTenantId = tokenService.getTenantId();
      setTenantId(effectiveTenantId);

      console.log(`[AUTH] Состояние обновлено: token=${newToken ? 'присутствует' : 'отсутствует'}, tenant_id=${effectiveTenantId || 'отсутствует'}`);

      // 3. Устанавливаем глобальные заголовки
      // Заголовок авторизации
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      console.log('[AUTH] Установлен глобальный заголовок авторизации');

      // Получаем и устанавливаем заголовки tenant_id
      const tenantHeaders = tokenService.getTenantHeaders();
      Object.entries(tenantHeaders).forEach(([key, value]) => {
        axios.defaults.headers.common[key] = value;
      });
      console.log('[AUTH] Установлены глобальные заголовки tenant_id:', tenantHeaders);

      // 4. Декодируем токен для получения данных пользователя
      const decoded = tokenService.getDecodedToken();
      if (decoded) {
        console.log('[AuthContext] Декодирован токен с данными:', {
          id: decoded.id,
          username: decoded.username,
          email: decoded.email,
          role: decoded.role,
          tenant_id: decoded.tenant_id || 'отсутствует'
        });

        // Проверяем наличие tenant_id перед установкой в user
        if (decoded.tenant_id) {
          console.log('[AuthContext] Установлен tenant_id из токена:', decoded.tenant_id);
        } else {
          console.warn('[AuthContext] ⚠️ В токене отсутствует tenant_id!');
        }

        setUser({
          id: decoded.id,
          username: decoded.username,
          email: decoded.email,
          role: decoded.role,
          tenant_id: decoded.tenant_id // Устанавливаем tenant_id из токена
        });

        console.log('[AuthContext] Обновлен объект пользователя:', {
          id: decoded.id,
          username: decoded.username,
          email: decoded.email,
          role: decoded.role,
          tenant_id: decoded.tenant_id || 'отсутствует'
        });
      }

      console.log('[AUTH] Процесс логина завершен успешно');
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async (): Promise<boolean> => {
      try {
          // Получаем текущий токен
          const currentToken = tokenService.getToken();

          if (!currentToken) {
              console.error('Нет токена для обновления');
              return false;
          }

          console.log("Attempting to refresh token in AuthContext:", { token: currentToken });

          // Попытка 1: Стандартный вызов через apiService
          try {
              // Call API to refresh token using apiService
              const response = await apiService.post<RefreshTokenResponse>('/api/auth/refresh', { token: currentToken });

              const { token: newToken, tenant_id } = response;

              // Сохраняем новый токен
              tokenService.setToken(newToken);

              // Сохраняем tenant_id из ответа, если он есть
              if (tenant_id) {
                tokenService.setTenantId(tenant_id);
                console.log(`[AUTH] Сохранен tenant_id из ответа обновления токена: ${tenant_id}`);
              }

              // Получаем итоговый tenant_id
              const effectiveTenantId = tokenService.getTenantId();

              // Обновляем состояние
              setToken(newToken);
              setTenantId(effectiveTenantId);

              // Обновляем заголовки
              axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

              // Получаем и устанавливаем заголовки tenant_id
              const tenantHeaders = tokenService.getTenantHeaders();
              Object.entries(tenantHeaders).forEach(([key, value]) => {
                axios.defaults.headers.common[key] = value;
              });
              console.log('[AUTH] Обновлены глобальные заголовки tenant_id:', tenantHeaders);

              // Обновляем данные пользователя
              const decoded = tokenService.getDecodedToken();
              if (decoded) {
                  setUser({
                      id: decoded.id,
                      username: decoded.username,
                      email: decoded.email,
                      role: decoded.role,
                      tenant_id: decoded.tenant_id // Обновляем tenant_id из токена
                  });
              }

              return true;
          } catch (error) {
              console.error('Standard token refresh failed, trying fallback method', error);

              // Попытка 2: Использование токена в заголовке
              // В методе refreshToken
              const response = await axios.post<RefreshTokenResponse>(
                `${import.meta.env.VITE_API_URL || 'https://modul301-production.up.railway.app'}/api/auth/refresh`,
                {},  // Пустое тело
                {
                  headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'X-API-Key': API_KEY,
                    'Content-Type': 'application/json'
                  }
                } as AxiosRequestConfig
              );

               const { token: newToken, tenant_id } = response.data;

               // Сохраняем новый токен
               tokenService.setToken(newToken);

               // Сохраняем tenant_id из ответа, если он есть
               if (tenant_id) {
                 tokenService.setTenantId(tenant_id);
                 console.log(`[AUTH] Сохранен tenant_id из ответа альтернативного обновления токена: ${tenant_id}`);
               }

               // Получаем итоговый tenant_id
               const effectiveTenantId = tokenService.getTenantId();

               // Обновляем состояние
               setToken(newToken);
               setTenantId(effectiveTenantId);

               // Обновляем заголовки
               axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

               // Получаем и устанавливаем заголовки tenant_id
               const tenantHeaders = tokenService.getTenantHeaders();
               Object.entries(tenantHeaders).forEach(([key, value]) => {
                 axios.defaults.headers.common[key] = value;
               });
               console.log('[AUTH] Обновлены глобальные заголовки tenant_id (альтернативный метод):', tenantHeaders);

               // Обновляем данные пользователя
               const decoded = tokenService.getDecodedToken();
               if (decoded) {
                   setUser({
                       id: decoded.id,
                       username: decoded.username,
                       email: decoded.email,
                       role: decoded.role,
                       tenant_id: decoded.tenant_id // Обновляем tenant_id из токена
                   });
               }

               return true;
          }
      } catch (error) {
          console.error('All token refresh methods failed', error);
          logout();
          return false;
      }
  };

  const logout = () => {
    tokenService.removeToken();
    tokenService.setTenantId(null); // Очищаем tenant_id в localStorage
    setToken(null);
    setUser(null);
    setTenantId(null); // Сбрасываем tenant_id

    // Сбрасываем заголовки
    delete axios.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['X-Tenant-ID'];
    delete axios.defaults.headers.common['x-tenant-id'];
    console.log('[AUTH] Сброшены все заголовки авторизации и tenant_id');
  };

  const value = {
    user,
    token,
    tenantId, // Передаем tenant_id через контекст
    isLoading,
    login,
    logout,
    //isAuthenticated: !!user, - логин и пароль на главной странице
    isAuthenticated: !!user && !!token,
    refreshToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};