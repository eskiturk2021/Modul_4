// src/contexts/WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import tokenService from '@/services/tokenService';

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