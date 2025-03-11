// src/contexts/WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

type WebSocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  lastMessage: any | null;
  sendMessage: (event: string, data: any) => void;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    // Only connect if user is authenticated
    if (!isAuthenticated || !token) {
      return;
    }

    // Connect to WebSocket server
    const socketInstance = io(import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:8000', {
      auth: {
        token
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true
    });

    // Set up event listeners
    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    });

    socketInstance.on('message', (data) => {
      setLastMessage(data);
      console.log('Received message:', data);
    });

    // Event listeners for real-time updates
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

    // Connect to the WebSocket server
    socketInstance.connect();

    // Save socket instance
    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [token, isAuthenticated]);

  // Function to send messages
  const sendMessage = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.error('Cannot send message: WebSocket not connected');
    }
  };

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, lastMessage, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};