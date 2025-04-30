// src/contexts/WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';


type WebSocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  lastMessage: any | null;
  sendMessage: (event: string, data: any) => void;
  reconnect: () => void;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const { token, isAuthenticated, refreshToken } = useAuth();

  // Use refs for reconnection attempts
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5; // Уменьшаем с 10 до 5
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialReconnectDelay = 1000; // 1 секунда
  const maxReconnectDelay = 30000; // 30 секунд

  // Функция для расчета задержки с экспоненциальным увеличением
  const calculateReconnectDelay = (attempt: number): number => {
    return Math.min(initialReconnectDelay * Math.pow(2, attempt), maxReconnectDelay);
  };

  // Cleanup function
  const cleanupSocket = useCallback(() => {
    if (socket) {
      socket.disconnect();
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message');
      socket.off('appointment_created');
      socket.off('appointment_updated');
      socket.off('customer_created');
      socket.off('document_uploaded');
      socket.off('connect_error');
    }
  }, [socket]);

  // Function to establish WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    // Cleanup any existing socket/
    cleanupSocket();

    // Проверка и сброс счетчика попыток, если он слишком большой
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('Достигнуто максимальное количество попыток подключения, сбрасываем счетчик');
      reconnectAttempts.current = 0;
    }

    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'https://modul301-production.up.railway.app';
    // Get API key from environment variables
    const API_KEY = import.meta.env.VITE_API_KEY || 'BD7FpLQr9X54zHtN6K8ESvcA3m2YgJxW';

    console.log(`[WebSocket] Попытка подключения #${reconnectAttempts.current + 1} к ${wsUrl}`);

    // Create a new socket instance
    const socketInstance = io(wsUrl, {
      auth: {
        token,
        apiKey: API_KEY
      },
      reconnectionAttempts: 0,  // We'll handle reconnection manually
      reconnection: false,      // Disable automatic reconnection
      autoConnect: true,
      timeout: 10000 // 10 second connection timeout
    });

    // Set up event listeners
    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('[WebSocket] Connected successfully');
      reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('[WebSocket] Disconnected');

      // Implement exponential backoff for reconnection
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = calculateReconnectDelay(reconnectAttempts.current);
        console.log(`[WebSocket] Attempting to reconnect in ${delay / 1000} seconds...`);

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current += 1;
          connectWebSocket(); // Вместо socketInstance.connect() вызываем заново всю функцию
        }, delay);
      } else {
        console.error('[WebSocket] Maximum reconnection attempts reached');
        // Добавляем возможность ручного переподключения
        console.log('[WebSocket] WebSocket disabled. Use reconnect() to try again manually');
      }
    });

    // Add message handler
    socketInstance.on('message', (message) => {
      setLastMessage(message);
      console.log('Received message:', message);
    });

    // Add specific event handlers
    socketInstance.on('appointment_created', (data) => {
      console.log('New appointment created:', data);
      setLastMessage({ type: 'appointment_created', data });
    });

    socketInstance.on('appointment_updated', (data) => {
      console.log('Appointment updated:', data);
      setLastMessage({ type: 'appointment_updated', data });
    });

    socketInstance.on('customer_created', (data) => {
      console.log('New customer created:', data);
      setLastMessage({ type: 'customer_created', data });
    });

    socketInstance.on('document_uploaded', (data) => {
      console.log('Document uploaded:', data);
      setLastMessage({ type: 'document_uploaded', data });
    });

    // Handle connection errors
    socketInstance.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);

      // Сообщаем пользователю о проблеме соединения
      if (reconnectAttempts.current >= maxReconnectAttempts / 2) {
        console.warn(`[WebSocket] Experiencing connection issues (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
      }

      // Check if the error might be due to an invalid token
      if (error.message === 'jwt expired' || error.message === 'invalid token') {
        console.log('[WebSocket] Token issue detected, attempting to refresh...');
        refreshToken().then(success => {
          if (success) {
            console.log('[WebSocket] Token refreshed, reconnecting socket...');
            socketInstance.disconnect();
            connectWebSocket();
          }
        });
      }
    });

    // Set the socket in state
    setSocket(socketInstance);

    // Cleanup function
    return () => {
      cleanupSocket();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [token, isAuthenticated, cleanupSocket, refreshToken]);

  // Establish connection when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connectWebSocket();
    }

    return () => {
      cleanupSocket();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isAuthenticated, connectWebSocket, cleanupSocket]);

  // Function to send messages
  const sendMessage = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('Cannot send message: socket is not connected');
    }
  };

  // Function to force reconnection
  const reconnect = () => {
    console.log('[WebSocket] Manual reconnection requested');

    if (socket) {
      socket.disconnect();
    }

    // Принудительно сбрасываем счетчик попыток
    reconnectAttempts.current = 0;

    // Принудительно очищаем таймауты
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Устанавливаем небольшую задержку перед новым подключением
    setTimeout(() => {
      connectWebSocket();
    }, 1000);
  };

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        isConnected,
        lastMessage,
        sendMessage,
        reconnect,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};