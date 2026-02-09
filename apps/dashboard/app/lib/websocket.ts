'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRimeStore } from './store';
import { ScreenContext, AgentInfo, Action } from '@shared/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const {
    setConnected,
    setContext,
    updateAgent,
    addAction,
    updateAction,
  } = useRimeStore();

  useEffect(() => {
    // Initialize socket connection
    const socket = io(WS_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to RIME server');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from RIME server');
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnected(false);
    });

    // Context updates
    socket.on('context:update', (context: ScreenContext) => {
      setContext(context);
    });

    // Agent status updates
    socket.on('agent:status', (agent: AgentInfo) => {
      updateAgent(agent);
    });

    // Action events
    socket.on('action:proposed', (action: Action) => {
      addAction(action);
    });

    socket.on('action:updated', (action: Action) => {
      updateAction(action);
    });

    // Workflow completion
    socket.on('workflow:complete', (result) => {
      console.log('Workflow completed:', result);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Cleanup
    return () => {
      socket.disconnect();
    };
  }, [setConnected, setContext, updateAgent, addAction, updateAction]);

  // Helper functions
  const sendIntent = (query: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('intent:submit', {
        query,
        type: 'natural_language',
        userId: 'user',
        sessionId: 'session',
        timestamp: Date.now(),
      });
    }
  };

  const requestContext = () => {
    socketRef.current?.emit('context:request');
  };

  const approveAction = (actionId: string) => {
    socketRef.current?.emit('action:approve', actionId);
  };

  const rejectAction = (actionId: string) => {
    socketRef.current?.emit('action:reject', actionId);
  };

  return {
    socket: socketRef.current,
    sendIntent,
    requestContext,
    approveAction,
    rejectAction,
  };
}
