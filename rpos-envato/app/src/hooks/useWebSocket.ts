import { useEffect, useRef, useState, useCallback } from 'react';
// Temporarily disabled due to import.meta ESM issue on web
// import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store';
import { config } from '@/config';

// Stub Socket type for web compatibility
type Socket = any;

// Real-time event types (must match server RealtimeEvent enum)
export enum RealtimeEvent {
  // Connection events
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',

  // Order events
  ORDER_CREATED = 'order:created',
  ORDER_UPDATED = 'order:updated',
  ORDER_COMPLETED = 'order:completed',
  ORDER_CANCELLED = 'order:cancelled',

  // Payment events
  PAYMENT_RECEIVED = 'payment:received',
  PAYMENT_REFUNDED = 'payment:refunded',

  // Inventory events
  STOCK_UPDATED = 'stock:updated',
  STOCK_LOW = 'stock:low',
  STOCK_OUT = 'stock:out',

  // Product events
  PRODUCT_UPDATED = 'product:updated',
  PRODUCT_CREATED = 'product:created',
  PRODUCT_DELETED = 'product:deleted',

  // Analytics events
  ANALYTICS_UPDATE = 'analytics:update',
  ANALYTICS_DASHBOARD_REFRESH = 'analytics:dashboard:refresh',
  ANALYTICS_METRICS_UPDATE = 'analytics:metrics:update',

  // System events
  HEARTBEAT = 'heartbeat',
  TERMINAL_STATUS = 'terminal:status',
}

export interface RealtimePayload<T = any> {
  event: RealtimeEvent;
  businessId: string;
  terminalId?: string;
  userId?: string;
  data: T;
  timestamp: string;
}

export interface AnalyticsUpdatePayload {
  updateType: 'order' | 'payment' | 'stock' | 'customer';
  metrics?: {
    todaySales?: number;
    todayOrders?: number;
    currentHourSales?: number;
  };
  refreshRequired: boolean;
}

export interface AnalyticsMetricsPayload {
  todaySales: number;
  todayOrders: number;
  currentHourSales: number;
  lastOrderTime: string | null;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  status: ConnectionStatus;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  subscribe: <T = any>(event: RealtimeEvent, callback: (payload: RealtimePayload<T>) => void) => () => void;
  emit: (event: string, data?: any) => void;
}

/**
 * WebSocket hook for real-time updates
 * Connects to the server's Socket.io instance for live data sync
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 3000,
  } = options;

  const { token, isAuthenticated } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const listenersRef = useRef<Map<RealtimeEvent, Set<(payload: any) => void>>>(new Map());

  const connect = useCallback(() => {
    if (socketRef.current?.connected || !isAuthenticated || !token) {
      return;
    }

    setStatus('connecting');

    const socketUrl = config.apiUrl.replace('/api', '');

    // Temporarily disabled for web - socket.io-client has ESM issues
    // socketRef.current = io(socketUrl, {
    //   auth: { token },
    //   transports: ['websocket', 'polling'],
    //   reconnectionAttempts,
    //   reconnectionDelay,
    //   autoConnect: true,
    // });
    console.log('WebSocket disabled for web platform');
    setStatus('disconnected');
    return;

    socketRef.current.on('connect', () => {
      console.log('WebSocket connected');
      setStatus('connected');
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setStatus('disconnected');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      setStatus('error');
    });

    // Set up event listeners for all registered callbacks
    for (const [event, callbacks] of listenersRef.current.entries()) {
      socketRef.current.on(event, (payload: any) => {
        callbacks.forEach((callback) => callback(payload));
      });
    }
  }, [isAuthenticated, token, reconnectionAttempts, reconnectionDelay]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
    }
  }, []);

  const subscribe = useCallback(<T = any>(
    event: RealtimeEvent,
    callback: (payload: RealtimePayload<T>) => void
  ): (() => void) => {
    // Add callback to listeners map
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    // If socket is already connected, add listener directly
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }

    // Return unsubscribe function
    return () => {
      listenersRef.current.get(event)?.delete(callback);
      if (socketRef.current) {
        socketRef.current.off(event, callback);
      }
    };
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Auto-connect on mount if enabled and authenticated
  useEffect(() => {
    if (autoConnect && isAuthenticated) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, isAuthenticated, connect, disconnect]);

  // Reconnect when token changes
  useEffect(() => {
    if (isAuthenticated && token && status === 'disconnected') {
      connect();
    }
  }, [token, isAuthenticated, status, connect]);

  return {
    socket: socketRef.current,
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
    subscribe,
    emit,
  };
}

/**
 * Hook specifically for analytics real-time updates
 * Provides typed callbacks for analytics events
 */
export interface UseAnalyticsRealtimeOptions {
  onMetricsUpdate?: (metrics: AnalyticsMetricsPayload) => void;
  onAnalyticsUpdate?: (payload: AnalyticsUpdatePayload) => void;
  onOrderCompleted?: (orderData: any) => void;
  enabled?: boolean;
}

export function useAnalyticsRealtime(options: UseAnalyticsRealtimeOptions = {}) {
  const {
    onMetricsUpdate,
    onAnalyticsUpdate,
    onOrderCompleted,
    enabled = true,
  } = options;

  const { subscribe, isConnected, status } = useWebSocket({ autoConnect: enabled });

  useEffect(() => {
    if (!enabled) return;

    const unsubscribers: (() => void)[] = [];

    // Subscribe to analytics metrics updates
    if (onMetricsUpdate) {
      const unsub = subscribe<AnalyticsMetricsPayload>(
        RealtimeEvent.ANALYTICS_METRICS_UPDATE,
        (payload) => onMetricsUpdate(payload.data)
      );
      unsubscribers.push(unsub);
    }

    // Subscribe to analytics update notifications
    if (onAnalyticsUpdate) {
      const unsub = subscribe<AnalyticsUpdatePayload>(
        RealtimeEvent.ANALYTICS_UPDATE,
        (payload) => onAnalyticsUpdate(payload.data)
      );
      unsubscribers.push(unsub);
    }

    // Subscribe to order completed events
    if (onOrderCompleted) {
      const unsub = subscribe(
        RealtimeEvent.ORDER_COMPLETED,
        (payload) => onOrderCompleted(payload.data)
      );
      unsubscribers.push(unsub);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [enabled, subscribe, onMetricsUpdate, onAnalyticsUpdate, onOrderCompleted]);

  return {
    isConnected,
    status,
  };
}

export default useWebSocket;
