// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import jwtDecode from 'jwt-decode';

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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if token exists and is valid
    const validateToken = async () => {
      if (token) {
        try {
          // Set default headers for all requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // You could also verify the token on the server
          // const response = await axios.get('/api/auth/validate');

          // For now, we'll just decode the token
          const decoded = jwtDecode(token) as User;
          setUser(decoded);
        } catch (error) {
          console.error('Invalid token', error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    validateToken();
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Replace with your actual API endpoint
      const response = await axios.post('/api/auth/login', { email, password });
      const { token: newToken } = response.data;

      localStorage.setItem('token', newToken);
      setToken(newToken);

      // Decode the token to get user information
      const decoded = jwtDecode(newToken) as User;
      setUser(decoded);
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
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
    isAuthenticated: !!user,
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