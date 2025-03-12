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
  const maxReconnectAttempts = 10;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Cleanup any existing socket
    cleanupSocket();

    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:8000';

    // Create a new socket instance
    const socketInstance = io(wsUrl, {
      auth: {
        token
      },
      reconnectionAttempts: 0,  // We'll handle reconnection manually
      autoConnect: true,
      timeout: 10000 // 10 second connection timeout
    });

    // Set up event listeners
    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('WebSocket connected');
      reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');

      // Implement exponential backoff for reconnection
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Cap at 30 seconds
        console.log(`Attempting to reconnect in ${delay / 1000} seconds...`);

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current += 1;
          socketInstance.connect();
        }, delay);
      } else {
        console.error('Maximum reconnection attempts reached');
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
      console.error('WebSocket connection error:', error);

      // Check if the error might be due to an invalid token
      if (error.message === 'jwt expired' || error.message === 'invalid token') {
        console.log('Token issue detected, attempting to refresh...');
        refreshToken().then(success => {
          if (success) {
            console.log('Token refreshed, reconnecting socket...');
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
    if (socket) {
      socket.disconnect();
    }
    reconnectAttempts.current = 0;
    connectWebSocket();
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