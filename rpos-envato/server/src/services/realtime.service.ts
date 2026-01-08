import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { cacheService } from './cache.service';

// Event types for real-time sync
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
  STOCK_RESERVED = 'stock:reserved',
  STOCK_RELEASED = 'stock:released',

  // Shift events
  SHIFT_OPENED = 'shift:opened',
  SHIFT_CLOSED = 'shift:closed',
  CASH_MOVEMENT = 'cash:movement',

  // Product events
  PRODUCT_UPDATED = 'product:updated',
  PRODUCT_CREATED = 'product:created',
  PRODUCT_DELETED = 'product:deleted',
  PRICE_CHANGED = 'product:price_changed',

  // Customer events
  CUSTOMER_CREATED = 'customer:created',
  CUSTOMER_UPDATED = 'customer:updated',

  // System events
  SYNC_REQUEST = 'sync:request',
  SYNC_RESPONSE = 'sync:response',
  HEARTBEAT = 'heartbeat',
  TERMINAL_STATUS = 'terminal:status',
}

// Payload interfaces
export interface RealtimePayload {
  event: RealtimeEvent;
  businessId: string;
  terminalId?: string;
  userId?: string;
  data: any;
  timestamp: string;
}

export interface TerminalInfo {
  terminalId: string;
  businessId: string;
  userId: string;
  userName: string;
  socketId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  status: 'online' | 'away' | 'busy';
}

class RealtimeService {
  private io: Server | null = null;
  private terminals: Map<string, TerminalInfo> = new Map();
  private businessRooms: Map<string, Set<string>> = new Map(); // businessId -> Set of socketIds

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, config.jwt.secret) as any;

        socket.data.userId = decoded.id;
        socket.data.businessId = decoded.business;
        socket.data.userName = decoded.name;
        socket.data.role = decoded.role;
        socket.data.terminalId = socket.handshake.query.terminalId || `terminal-${socket.id}`;

        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => this.handleConnection(socket));

    console.log('WebSocket server initialized');
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket): void {
    const { userId, businessId, userName, terminalId } = socket.data;

    console.log(`Terminal connected: ${terminalId} (User: ${userName})`);

    // Register terminal
    const terminalInfo: TerminalInfo = {
      terminalId,
      businessId,
      userId,
      userName,
      socketId: socket.id,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      status: 'online',
    };

    this.terminals.set(socket.id, terminalInfo);

    // Join business room
    socket.join(`business:${businessId}`);

    // Track business room membership
    if (!this.businessRooms.has(businessId)) {
      this.businessRooms.set(businessId, new Set());
    }
    this.businessRooms.get(businessId)!.add(socket.id);

    // Send connection confirmation
    socket.emit(RealtimeEvent.CONNECTED, {
      terminalId,
      businessId,
      connectedAt: terminalInfo.connectedAt.toISOString(),
      activeTerminals: this.getBusinessTerminals(businessId).length,
    });

    // Notify other terminals
    this.broadcastToBusiness(businessId, RealtimeEvent.TERMINAL_STATUS, {
      terminalId,
      status: 'connected',
      userName,
    }, socket.id);

    // Set up event handlers
    this.setupEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => this.handleDisconnection(socket));
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnection(socket: Socket): void {
    const { businessId, terminalId, userName } = socket.data;

    console.log(`Terminal disconnected: ${terminalId}`);

    // Remove terminal
    this.terminals.delete(socket.id);

    // Remove from business room tracking
    this.businessRooms.get(businessId)?.delete(socket.id);

    // Notify other terminals
    this.broadcastToBusiness(businessId, RealtimeEvent.TERMINAL_STATUS, {
      terminalId,
      status: 'disconnected',
      userName,
    });
  }

  /**
   * Set up event handlers for a socket
   */
  private setupEventHandlers(socket: Socket): void {
    // Heartbeat
    socket.on(RealtimeEvent.HEARTBEAT, () => {
      const terminal = this.terminals.get(socket.id);
      if (terminal) {
        terminal.lastHeartbeat = new Date();
      }
      socket.emit(RealtimeEvent.HEARTBEAT, { timestamp: new Date().toISOString() });
    });

    // Sync request
    socket.on(RealtimeEvent.SYNC_REQUEST, async (data) => {
      const { businessId } = socket.data;
      // Client can request sync of specific data types
      const syncData = await this.getSyncData(businessId, data.types || ['all']);
      socket.emit(RealtimeEvent.SYNC_RESPONSE, syncData);
    });

    // Terminal status update
    socket.on(RealtimeEvent.TERMINAL_STATUS, (data) => {
      const terminal = this.terminals.get(socket.id);
      if (terminal && data.status) {
        terminal.status = data.status;
        this.broadcastToBusiness(socket.data.businessId, RealtimeEvent.TERMINAL_STATUS, {
          terminalId: terminal.terminalId,
          status: data.status,
          userName: terminal.userName,
        }, socket.id);
      }
    });
  }

  // ============ BROADCAST METHODS ============

  /**
   * Broadcast event to all terminals in a business
   */
  broadcastToBusiness(
    businessId: string,
    event: RealtimeEvent,
    data: any,
    excludeSocketId?: string
  ): void {
    if (!this.io) return;

    const payload: RealtimePayload = {
      event,
      businessId,
      data,
      timestamp: new Date().toISOString(),
    };

    if (excludeSocketId) {
      this.io.to(`business:${businessId}`).except(excludeSocketId).emit(event, payload);
    } else {
      this.io.to(`business:${businessId}`).emit(event, payload);
    }

    // Also publish to Redis for multi-instance support
    cacheService.publishEvent(`pos:events:${businessId}`, payload);
  }

  /**
   * Send event to a specific terminal
   */
  sendToTerminal(socketId: string, event: RealtimeEvent, data: any): void {
    if (!this.io) return;

    const terminal = this.terminals.get(socketId);
    if (!terminal) return;

    this.io.to(socketId).emit(event, {
      event,
      businessId: terminal.businessId,
      terminalId: terminal.terminalId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // ============ EVENT EMITTERS ============

  /**
   * Emit order event
   */
  emitOrderEvent(
    businessId: string,
    event: RealtimeEvent,
    order: { id: string; number: number; status: string; total: number; [key: string]: any }
  ): void {
    this.broadcastToBusiness(businessId, event, {
      orderId: order.id,
      orderNumber: order.number,
      status: order.status,
      total: order.total,
    });
  }

  /**
   * Emit stock update event
   */
  emitStockUpdate(
    businessId: string,
    productId: string,
    productName: string,
    previousStock: number,
    newStock: number,
    minStock: number
  ): void {
    const event = newStock === 0
      ? RealtimeEvent.STOCK_OUT
      : newStock <= minStock
        ? RealtimeEvent.STOCK_LOW
        : RealtimeEvent.STOCK_UPDATED;

    this.broadcastToBusiness(businessId, event, {
      productId,
      productName,
      previousStock,
      newStock,
      minStock,
      alert: newStock <= minStock,
    });
  }

  /**
   * Emit payment event
   */
  emitPaymentEvent(
    businessId: string,
    event: RealtimeEvent,
    payment: { orderId: string; amount: number; method: string }
  ): void {
    this.broadcastToBusiness(businessId, event, payment);
  }

  /**
   * Emit shift event
   */
  emitShiftEvent(
    businessId: string,
    event: RealtimeEvent,
    shift: { id: string; userId: string; userName: string; terminalId?: string }
  ): void {
    this.broadcastToBusiness(businessId, event, shift);
  }

  /**
   * Emit product update
   */
  emitProductUpdate(
    businessId: string,
    event: RealtimeEvent,
    product: { id: string; name: string; price?: number; stock?: number }
  ): void {
    this.broadcastToBusiness(businessId, event, product);
  }

  // ============ UTILITY METHODS ============

  /**
   * Get all terminals for a business
   */
  getBusinessTerminals(businessId: string): TerminalInfo[] {
    const terminals: TerminalInfo[] = [];
    for (const terminal of this.terminals.values()) {
      if (terminal.businessId === businessId) {
        terminals.push(terminal);
      }
    }
    return terminals;
  }

  /**
   * Get terminal by ID
   */
  getTerminal(terminalId: string): TerminalInfo | undefined {
    for (const terminal of this.terminals.values()) {
      if (terminal.terminalId === terminalId) {
        return terminal;
      }
    }
    return undefined;
  }

  /**
   * Check if terminal is online
   */
  isTerminalOnline(terminalId: string): boolean {
    return !!this.getTerminal(terminalId);
  }

  /**
   * Get connected terminal count for business
   */
  getTerminalCount(businessId: string): number {
    return this.businessRooms.get(businessId)?.size || 0;
  }

  /**
   * Get sync data for a business
   */
  private async getSyncData(
    businessId: string,
    types: string[]
  ): Promise<Record<string, any>> {
    const syncData: Record<string, any> = {
      timestamp: new Date().toISOString(),
    };

    // This would fetch latest data from cache/database
    // Simplified for now
    if (types.includes('all') || types.includes('terminals')) {
      syncData.terminals = this.getBusinessTerminals(businessId).map((t) => ({
        terminalId: t.terminalId,
        userName: t.userName,
        status: t.status,
        lastHeartbeat: t.lastHeartbeat.toISOString(),
      }));
    }

    return syncData;
  }

  /**
   * Cleanup stale connections
   */
  cleanupStaleConnections(maxIdleMs = 120000): void {
    const now = Date.now();

    for (const [socketId, terminal] of this.terminals.entries()) {
      if (now - terminal.lastHeartbeat.getTime() > maxIdleMs) {
        console.log(`Cleaning up stale terminal: ${terminal.terminalId}`);

        // Disconnect socket
        const socket = this.io?.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      }
    }
  }

  /**
   * Get Socket.io server instance
   */
  getIO(): Server | null {
    return this.io;
  }
}

export const realtimeService = new RealtimeService();
