// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import tokenService from '@/services/tokenService';
import apiService from '@/services/apiService';  // добавил ссылку

// Get API key from environment variables
const API_KEY = import.meta.env.VITE_API_KEY || 'BD7FpLQr9X54zHtN6K8ESvcA3m2YgJxW';

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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(tokenService.getToken());
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
                role: decoded.role
              });
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

    // Set up a timer to check token expiration periodically
//  const tokenCheckInterval = setInterval(() => {
//    if (tokenService.shouldRefreshToken()) {
//      refreshToken().catch(error => {
//        console.error('Token refresh failed:', error);
//      });
//    }
//  }, 60000); // Check every minute

    return () => clearInterval(tokenCheckInterval);
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

          // Call API to refresh token using apiService
          const response = await apiService.post('/api/auth/refresh', { token: currentToken });

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
          }

          return true;
        } catch (error) {
          console.error('Token refresh failed', error);
          logout();
          return false;
        }
      };



  const logout = () => {
    tokenService.removeToken();
    setToken(null);
    setUser(null);
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