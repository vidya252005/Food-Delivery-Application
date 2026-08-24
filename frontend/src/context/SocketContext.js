import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinOrder = (orderId) => {
    socketRef.current?.emit('join:order', orderId);
  };

  const joinUser = (userId) => {
    socketRef.current?.emit('join:user', userId);
  };

  const joinRestaurant = (restaurantId) => {
    socketRef.current?.emit('join:restaurant', restaurantId);
  };

  const onOrderUpdate = (callback) => {
    socketRef.current?.on('order:update', callback);
    return () => socketRef.current?.off('order:update', callback);
  };

  const onDriverLocation = (callback) => {
    socketRef.current?.on('driver:location', callback);
    return () => socketRef.current?.off('driver:location', callback);
  };

  return (
    <SocketContext.Provider value={{
      connected,
      joinOrder,
      joinUser,
      joinRestaurant,
      onOrderUpdate,
      onDriverLocation,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);

export default SocketContext;
