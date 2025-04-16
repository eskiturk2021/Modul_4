// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import tokenService from '@/services/tokenService';
import apiService from '@/services/apiService';
import userService from '@/services/userService';

// Get API key from environment variables
const API_KEY = import.meta.env.VITE_API_KEY || 'BD7FpLQr9X54zHtN6K8ESvcA3m2YgJxW';

// Добавляем интерфейс для ответа при обновлении токена
interface RefreshTokenResponse {
  token: string;
  // другие поля, если они есть в ответе
}

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshToken: () => Promise<boolean>;
  userEmail: string | null; // Добавили доступ к email пользователя
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(tokenService.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string | null>(userService.getUserEmail());

  // При инициализации проверяем наличие email в URL
  useEffect(() => {
    userService.initializeUserEmail();
    setUserEmail(userService.getUserEmail());
  }, []);

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
                role: decoded.role
              });

              // Если у нас есть email пользователя из токена, и нет из URL/localStorage,
              // сохраняем его в localStorage
              if (decoded.email && !userService.getUserEmail()) {
                userService.setUserEmail(decoded.email);
                setUserEmail(decoded.email);
              }
            }
          }
        } catch (error) {
          console.error('Invalid token', error);
          tokenService.removeToken();
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    validateToken();

    return () => {
    };
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Get API key from environment variables
      // Replace with your actual API endpoint
      const response = await axios.post('/api/auth/login', { email, password }, {
        headers: {
          'X-API-Key': API_KEY
        }
      });
      const { token: newToken } = response.data;

      tokenService.setToken(newToken);
      setToken(newToken);

      // Decode the token to get user information
      const decoded = tokenService.getDecodedToken();
      if (decoded) {
        setUser({
          id: decoded.id,
          username: decoded.username,
          email: decoded.email,
          role: decoded.role
        });

        // Сохраняем email пользователя из токена в localStorage
        if (decoded.email) {
          userService.setUserEmail(decoded.email);
          setUserEmail(decoded.email);
        }
      }
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

              const { token: newToken } = response;
              tokenService.setToken(newToken);
              setToken(newToken);

              // Update axios headers
              axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

              // Update user from new token
              const decoded = tokenService.getDecodedToken();
              if (decoded) {
                  setUser({
                      id: decoded.id,
                      username: decoded.username,
                      email: decoded.email,
                      role: decoded.role
                  });

                  // Обновляем email пользователя, если он изменился
                  if (decoded.email) {
                      userService.setUserEmail(decoded.email);
                      setUserEmail(decoded.email);
                  }
              }

              return true;
          } catch (error) {
              console.error('Standard token refresh failed, trying fallback method', error);

              // Попытка 2: Использование токена в заголовке
              const response = await axios.post<RefreshTokenResponse>(
                `${import.meta.env.VITE_API_URL || 'https://modul3-production.up.railway.app'}/api/auth/refresh`,
                 {},  // Пустое тело
                 {
                   headers: {
                      'Authorization': `Bearer ${currentToken}`,
                      'X-API-Key': API_KEY,
                      'Content-Type': 'application/json'
                   }
                 }
               );

               const { token: newToken } = response.data;
               tokenService.setToken(newToken);
               setToken(newToken);

               // Update axios headers
               axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

               // Update user from new token
               const decoded = tokenService.getDecodedToken();
               if (decoded) {
                   setUser({
                       id: decoded.id,
                       username: decoded.username,
                       email: decoded.email,
                       role: decoded.role
                   });

                   // Обновляем email пользователя, если он изменился
                   if (decoded.email) {
                       userService.setUserEmail(decoded.email);
                       setUserEmail(decoded.email);
                   }
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
    setToken(null);
    setUser(null);
    // Не удаляем email при выходе, чтобы сохранить идентификацию пользователя
    // userService.clearUserEmail();
    // setUserEmail(null);
    // Reset axios headers
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
    //isAuthenticated: !!user, - логин и пароль на главной странице
    isAuthenticated: true,
    refreshToken,
    userEmail // Экспортируем email пользователя
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