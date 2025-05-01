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
  const maxReconnectAttempts = 5; // Уменьшаем с 10 до 5 попыток
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Добавляем флаг, указывающий, что WebSocket сервис недоступен
  const wsServiceUnavailable = useRef(false);

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

    // Если сервис уже был помечен как недоступный, не пытаемся подключаться
    if (wsServiceUnavailable.current) {
      console.log('[WebSocket] Сервис помечен как недоступный, пропускаем подключение');
      return;
    }

    // Cleanup any existing socket
    cleanupSocket();

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
      wsServiceUnavailable.current = false; // Сбрасываем флаг недоступности
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('[WebSocket] Disconnected');

      // Implement exponential backoff for reconnection
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Cap at 30 seconds
        console.log(`[WebSocket] Attempting to reconnect in ${delay / 1000} seconds...`);

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current += 1;

          // Проверка на максимальное количество попыток
          if (reconnectAttempts.current >= maxReconnectAttempts) {
            console.log('[WebSocket] Достигнуто максимальное количество попыток подключения, отмечаем сервис как недоступный');
            wsServiceUnavailable.current = true;
          } else {
            // Пытаемся подключиться снова
            connectWebSocket();
          }
        }, delay);
      } else {
        console.error('[WebSocket] Maximum reconnection attempts reached');
        wsServiceUnavailable.current = true; // Помечаем сервис как недоступный
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

      // Если ошибка 404, значит WebSocket сервис не доступен вообще
      if (error.message.includes('404') || error.message.includes('not found')) {
        console.warn('[WebSocket] Сервис не найден (404), отключаем WebSocket');
        wsServiceUnavailable.current = true;
        return;
      }

      // Если ошибка ERR_INSUFFICIENT_RESOURCES, возможно сервер перегружен
      if (error.message.includes('ERR_INSUFFICIENT_RESOURCES')) {
        console.warn('[WebSocket] Сервер сообщает о недостатке ресурсов, увеличиваем интервал переподключения');
        // В этом случае следующая попытка будет с увеличенной задержкой
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
      console.warn('[WebSocket] Cannot send message: socket is not connected');
    }
  };

  // Function to force reconnection
  const reconnect = () => {
    console.log('[WebSocket] Manual reconnection requested');

    // Сбрасываем флаг недоступности сервиса
    wsServiceUnavailable.current = false;

    if (socket) {
      socket.disconnect();
    }

    // Сбрасываем счетчик попыток
    reconnectAttempts.current = 0;

    // Очищаем таймауты
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