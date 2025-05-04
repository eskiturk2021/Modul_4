// src/contexts/WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import tokenService from '../services/tokenService'; // путь подстрой под свою структуру


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
  const { token, isAuthenticated, refreshToken, tenantId } = useAuth();

  // Use refs for reconnection attempts
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5; // Уменьшаем с 10 до 5 попыток
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Добавляем флаг, указывающий, что WebSocket сервис недоступен
  const wsServiceUnavailable = useRef(false);

  // Cleanup function
  const cleanupSocket = useCallback(() => {
    if (socket) {
      console.log('[WebSocket] Очистка соединения:', socket.id);
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
      console.log('[WebSocket] Пропуск подключения: не аутентифицирован или нет токена');
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
    console.log('[WebSocket] Опции подключения:', {
      auth: { token: token ? `${token.substring(0, 10)}...` : 'отсутствует', apiKey: API_KEY ? 'настроен' : 'отсутствует' },
      reconnectionAttempts: 0,
      reconnection: false,
      autoConnect: true,
      timeout: 10000
    });

    // Create a new socket instance
    const socketInstance = io(wsUrl, {
      auth: {
        token,
        apiKey: API_KEY,
        tenant_id: tokenService.getTenantId()
      },
      reconnectionAttempts: 0,  // We'll handle reconnection manually
      reconnection: false,      // Disable automatic reconnection
      autoConnect: true,
      timeout: 10000 // 10 second connection timeout
    });

    console.log('[WebSocket] Создан экземпляр Socket.IO, ожидание подключения...');

    // Set up event listeners
    socketInstance.on('connect', () => {
      console.log('[WebSocket] Успешное подключение! Socket ID:', socketInstance.id);
      setIsConnected(true);
      reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
      wsServiceUnavailable.current = false; // Сбрасываем флаг недоступности
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[WebSocket] Отключение. Причина:', reason);
      setIsConnected(false);

      // Implement exponential backoff for reconnection
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Cap at 30 seconds
        console.log(`[WebSocket] Попытка переподключения через ${delay / 1000} секунд...`);

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
      console.log('[WebSocket] Получено сообщение:', message);
      setLastMessage(message);
    });

    // Add specific event handlers
    socketInstance.on('appointment_created', (data) => {
      console.log('[WebSocket] Новая запись создана:', data);
      setLastMessage({ type: 'appointment_created', data });
    });

    socketInstance.on('appointment_updated', (data) => {
      console.log('[WebSocket] Запись обновлена:', data);
      setLastMessage({ type: 'appointment_updated', data });
    });

    socketInstance.on('customer_created', (data) => {
      console.log('[WebSocket] Новый клиент создан:', data);
      setLastMessage({ type: 'customer_created', data });
    });

    socketInstance.on('document_uploaded', (data) => {
      console.log('[WebSocket] Документ загружен:', data);
      setLastMessage({ type: 'document_uploaded', data });
    });

    // Handle connection errors
    socketInstance.on('connect_error', (error) => {
      console.error('[WebSocket] Ошибка подключения:', error);
      console.log('[WebSocket] Детали ошибки:', {
        message: error.message,
        type: error.type,
        description: error.description
      });

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

    // Проверка соединения через ping-pong
    socketInstance.io.on("ping", () => {
      console.log("[WebSocket] Получен ping от сервера");
    });

    socketInstance.io.on("reconnect_attempt", (attempt) => {
      console.log(`[WebSocket] Попытка переподключения Socket.IO #${attempt}`);
    });

    socketInstance.io.on("reconnect_error", (error) => {
      console.error('[WebSocket] Ошибка переподключения Socket.IO:', error);
    });

    socketInstance.io.on("reconnect_failed", () => {
      console.error('[WebSocket] Не удалось переподключить Socket.IO');
    });

    // Добавляем логирование для low-level транспорта
    socketInstance.io.engine.on("upgrade", (transport) => {
      console.log(`[WebSocket] Транспорт обновлен до: ${transport.name}`);
    });

    socketInstance.io.engine.on("open", () => {
      console.log(`[WebSocket] Engine.IO соединение открыто (transport: ${socketInstance.io.engine.transport.name})`);
    });

    socketInstance.io.engine.on("close", (reason) => {
      console.log(`[WebSocket] Engine.IO соединение закрыто: ${reason}`);
    });

    socketInstance.io.engine.on("packet", (packet) => {
      console.log(`[WebSocket] Engine.IO пакет: тип=${packet.type}`);
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
  const tenantId = tokenService.getTenantId(); // Явно получаем tenant_id

  if (isAuthenticated && tenantId && tenantId !== 'default') {
    console.log('[WebSocket] Пользователь аутентифицирован, инициируем подключение WebSocket');
    connectWebSocket();
  } else {
    console.log('[WebSocket] WebSocket не подключается — isAuthenticated:', isAuthenticated, 'tenantId:', tenantId);
  }

  return () => {
    console.log('[WebSocket] Эффект очистки: отключение сокета');
    cleanupSocket();
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  };
}, [isAuthenticated, token]);

  // Function to send messages
  const sendMessage = (event: string, data: any) => {
    if (socket && isConnected) {
      console.log(`[WebSocket] Отправка сообщения. Событие: ${event}, Данные:`, data);
      socket.emit(event, data);
    } else {
      console.warn('[WebSocket] Невозможно отправить сообщение: сокет не подключен');
    }
  };

  // Function to force reconnection
  const reconnect = () => {
    console.log('[WebSocket] Запрошено ручное переподключение');

    // Сбрасываем флаг недоступности сервиса
    wsServiceUnavailable.current = false;

    if (socket) {
      console.log('[WebSocket] Отключение текущего сокета перед переподключением');
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
    console.log('[WebSocket] Ожидание 1 секунду перед новым подключением...');
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