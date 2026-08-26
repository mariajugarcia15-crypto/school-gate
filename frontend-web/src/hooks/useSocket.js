// src/hooks/useSocket.js
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

export function useSocket(events = {}) {
  const handlersRef = useRef(events);
  handlersRef.current = events;

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:4000');
    }

    const socket = socketInstance;
    const registered = [];

    Object.entries(handlersRef.current).forEach(([event, handler]) => {
      const wrapped = (...args) => handlersRef.current[event]?.(...args);
      socket.on(event, wrapped);
      registered.push([event, wrapped]);
    });

    return () => {
      registered.forEach(([event, wrapped]) => socket.off(event, wrapped));
    };
  }, []);

  return socketInstance;
}
