import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { cacheService } from './cache.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Reliable Real-Time Service with Guaranteed Event Delivery
 *
 * Features:
 * - Event acknowledgment (client must ACK each event)
 * - Event persistence in Redis (survives server restart)
 * - Automatic retry for unacknowledged events
 * - Reconnection handling with event replay
 * - Cross-instance broadcasting via Redis Pub/Sub
 */

// Event types
export enum RealtimeEvent {
  // Connection
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTED = 'reconnected',
  ERROR = 'error',
  ACK = 'ack',

  // Orders
  ORDER_CREATED = 'order:created',
  ORDER_UPDATED = 'order:updated',
  ORDER_COMPLETED = 'order:completed',
  ORDER_CANCELLED = 'order:cancelled',
  ORDER_REFUNDED = 'order:refunded',

  // Payments
  PAYMENT_RECEIVED = 'payment:received',
  PAYMENT_FAILED = 'payment:failed',
  PAYMENT_REFUNDED = 'payment:refunded',

  // Inventory
  STOCK_UPDATED = 'stock:updated',
  STOCK_LOW = 'stock:low',
  STOCK_OUT = 'stock:out',
  STOCK_RESERVED = 'stock:reserved',

  // Products
  PRODUCT_CREATED = 'product:created',
  PRODUCT_UPDATED = 'product:updated',
  PRODUCT_DELETED = 'product:deleted',
  PRICE_CHANGED = 'price:changed',

  // Shifts
  SHIFT_OPENED = 'shift:opened',
  SHIFT_CLOSED = 'shift:closed',
  CASH_MOVEMENT = 'cash:movement',

  // Customers
  CUSTOMER_CREATED = 'customer:created',
  CUSTOMER_UPDATED = 'customer:updated',

  // Sync
  SYNC_REQUEST = 'sync:request',
  SYNC_FULL = 'sync:full',
  SYNC_PARTIAL = 'sync:partial',

  // System
  TERMINAL_STATUS = 'terminal:status',
  HEARTBEAT = 'heartbeat',
  FORCE_LOGOUT = 'force:logout',
}

// Event priority levels
export enum EventPriority {
  CRITICAL = 1,   // Must be delivered (payments, orders)
  HIGH = 2,       // Should be delivered (stock updates)
  NORMAL = 3,     // Best effort (status updates)
  LOW = 4,        // Can be dropped (heartbeats)
}

// Persistent event structure
interface PersistentEvent {
  id: string;
  event: RealtimeEvent;
  businessId: string;
  terminalId?: string;
  targetSocketIds?: string[];
  data: any;
  priority: EventPriority;
  timestamp: number;
  expiresAt: number;
  acked: boolean;
  retryCount: number;
  maxRetries: number;
}

interface TerminalState {
  terminalId: string;
  socketId: string;
  businessId: string;
  userId: string;
  userName: string;
  connectedAt: Date;
  lastEventId: string | null;  // For replay on reconnect
  pendingAcks: Set<string>;    // Events awaiting ACK
  status: 'online' | 'away' | 'busy';
}

// Redis key prefixes
const KEYS = {
  EVENT_QUEUE: 'pos:events:queue:',       // businessId -> sorted set of events
  EVENT_DATA: 'pos:events:data:',         // eventId -> event data
  TERMINAL_STATE: 'pos:terminal:state:',  // terminalId -> state
  LAST_EVENT: 'pos:events:last:',         // businessId:terminalId -> last eventId
  PENDING_ACKS: 'pos:events:pending:',    // socketId -> set of eventIds
};

class ReliableRealtimeService {
  private io: Server | null = null;
  private terminals: Map<string, TerminalState> = new Map();
  private retryIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Configuration
  private readonly EVENT_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly ACK_TIMEOUT = 5000; // 5 seconds
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAY = 2000; // 2 seconds
  private readonly BATCH_SIZE = 50; // Max events per sync

  /**
   * Initialize WebSocket server with reliability features
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      // Connection settings for reliability
      pingTimeout: 30000,
      pingInterval: 10000,
      connectTimeout: 45000,
      // Enable binary transport for efficiency
      transports: ['websocket', 'polling'],
      // Allow reconnection
      allowUpgrades: true,
    });

    // Authentication middleware
    this.io.use(this.authMiddleware.bind(this));

    // Connection handler
    this.io.on('connection', this.handleConnection.bind(this));

    // Subscribe to Redis pub/sub for cross-instance events
    this.subscribeToRedisEvents();

    // Start cleanup job
    this.startCleanupJob();

    console.log('Reliable WebSocket server initialized');
  }

  /**
   * Authentication middleware
   */
  private async authMiddleware(socket: Socket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwt.secret) as any;

      socket.data = {
        userId: decoded.id,
        businessId: decoded.business,
        userName: decoded.name,
        role: decoded.role,
        terminalId: socket.handshake.query.terminalId || `terminal-${socket.id}`,
        lastEventId: socket.handshake.query.lastEventId || null,
      };

      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  }

  /**
   * Handle new connection
   */
  private async handleConnection(socket: Socket): Promise<void> {
    const { userId, businessId, userName, terminalId, lastEventId } = socket.data;

    console.log(`Terminal connected: ${terminalId} (User: ${userName}, Socket: ${socket.id})`);

    // Create terminal state
    const terminalState: TerminalState = {
      terminalId,
      socketId: socket.id,
      businessId,
      userId,
      userName,
      connectedAt: new Date(),
      lastEventId,
      pendingAcks: new Set(),
      status: 'online',
    };

    this.terminals.set(socket.id, terminalState);

    // Join business room
    socket.join(`business:${businessId}`);

    // Save terminal state to Redis
    await this.saveTerminalState(terminalState);

    // Send connection confirmation
    socket.emit(RealtimeEvent.CONNECTED, {
      socketId: socket.id,
      terminalId,
      businessId,
      serverTime: new Date().toISOString(),
    });

    // Replay missed events if reconnecting
    if (lastEventId) {
      await this.replayMissedEvents(socket, businessId, lastEventId);
    }

    // Set up event handlers
    this.setupSocketHandlers(socket);

    // Notify other terminals
    this.broadcastToBusiness(businessId, RealtimeEvent.TERMINAL_STATUS, {
      terminalId,
      status: 'connected',
      userName,
    }, socket.id, EventPriority.LOW);

    // Handle disconnection
    socket.on('disconnect', () => this.handleDisconnection(socket));
  }

  /**
   * Handle disconnection
   */
  private async handleDisconnection(socket: Socket): Promise<void> {
    const terminal = this.terminals.get(socket.id);
    if (!terminal) return;

    console.log(`Terminal disconnected: ${terminal.terminalId}`);

    // Clear retry interval if any
    const retryInterval = this.retryIntervals.get(socket.id);
    if (retryInterval) {
      clearInterval(retryInterval);
      this.retryIntervals.delete(socket.id);
    }

    // Remove terminal
    this.terminals.delete(socket.id);

    // Keep state in Redis briefly for reconnection
    await cacheService.set(
      `${KEYS.TERMINAL_STATE}${terminal.terminalId}:disconnected`,
      { ...terminal, disconnectedAt: new Date().toISOString() },
      300 // 5 minutes
    );

    // Notify other terminals
    this.broadcastToBusiness(terminal.businessId, RealtimeEvent.TERMINAL_STATUS, {
      terminalId: terminal.terminalId,
      status: 'disconnected',
      userName: terminal.userName,
    }, undefined, EventPriority.LOW);
  }

  /**
   * Set up socket event handlers
   */
  private setupSocketHandlers(socket: Socket): void {
    const terminal = this.terminals.get(socket.id);
    if (!terminal) return;

    // Handle ACK from client
    socket.on(RealtimeEvent.ACK, async (eventId: string) => {
      await this.handleAck(socket.id, eventId);
    });

    // Handle heartbeat
    socket.on(RealtimeEvent.HEARTBEAT, () => {
      socket.emit(RealtimeEvent.HEARTBEAT, {
        timestamp: Date.now(),
        pendingEvents: terminal.pendingAcks.size,
      });
    });

    // Handle sync request
    socket.on(RealtimeEvent.SYNC_REQUEST, async (data: { fromEventId?: string; types?: string[] }) => {
      await this.handleSyncRequest(socket, data);
    });

    // Handle terminal status update
    socket.on(RealtimeEvent.TERMINAL_STATUS, (data: { status: string }) => {
      if (terminal && data.status) {
        terminal.status = data.status as any;
        this.broadcastToBusiness(terminal.businessId, RealtimeEvent.TERMINAL_STATUS, {
          terminalId: terminal.terminalId,
          status: data.status,
        }, socket.id, EventPriority.LOW);
      }
    });
  }

  /**
   * Handle event acknowledgment
   */
  private async handleAck(socketId: string, eventId: string): Promise<void> {
    const terminal = this.terminals.get(socketId);
    if (!terminal) return;

    // Remove from pending
    terminal.pendingAcks.delete(eventId);

    // Update last received event
    terminal.lastEventId = eventId;

    // Update Redis
    await cacheService.del(`${KEYS.PENDING_ACKS}${socketId}:${eventId}`);
    await cacheService.set(
      `${KEYS.LAST_EVENT}${terminal.businessId}:${terminal.terminalId}`,
      eventId,
      this.EVENT_TTL / 1000
    );

    // Mark event as acked in Redis
    const eventKey = `${KEYS.EVENT_DATA}${eventId}`;
    const event = await cacheService.get<PersistentEvent>(eventKey);
    if (event) {
      event.acked = true;
      await cacheService.set(eventKey, event, this.EVENT_TTL / 1000);
    }
  }

  /**
   * Handle sync request (replay events)
   */
  private async handleSyncRequest(
    socket: Socket,
    data: { fromEventId?: string; types?: string[] }
  ): Promise<void> {
    const { businessId } = socket.data;

    if (data.fromEventId) {
      await this.replayMissedEvents(socket, businessId, data.fromEventId, data.types);
    } else {
      // Full sync - send current state
      socket.emit(RealtimeEvent.SYNC_FULL, {
        timestamp: Date.now(),
        message: 'Full sync requested - fetch data via REST API',
      });
    }
  }

  /**
   * Replay missed events after reconnection
   */
  private async replayMissedEvents(
    socket: Socket,
    businessId: string,
    fromEventId: string,
    filterTypes?: string[]
  ): Promise<void> {
    const queueKey = `${KEYS.EVENT_QUEUE}${businessId}`;

    // Get the timestamp of the last received event
    const fromEvent = await cacheService.get<PersistentEvent>(`${KEYS.EVENT_DATA}${fromEventId}`);
    const fromTimestamp = fromEvent?.timestamp || 0;

    // Get event IDs from sorted set using ZRANGEBYSCORE
    const eventIds = await cacheService.zrangebyscore(
      queueKey,
      fromTimestamp + 1, // Exclude the already-received event
      '+inf',
      this.BATCH_SIZE
    );

    if (eventIds.length === 0) {
      socket.emit(RealtimeEvent.SYNC_PARTIAL, {
        events: [],
        hasMore: false,
        fromEventId,
      });
      return;
    }

    // Fetch full event data for each event ID
    const eventKeys = eventIds.map(id => `${KEYS.EVENT_DATA}${id}`);
    const eventData = await cacheService.mget<PersistentEvent>(eventKeys);

    // Filter out null values and get valid events
    const events: PersistentEvent[] = eventData.filter(
      (e): e is PersistentEvent => e !== null
    );

    // Filter by type if requested
    const filteredEvents = filterTypes
      ? events.filter(e => filterTypes.includes(e.event))
      : events;

    // Send events in batch
    socket.emit(RealtimeEvent.SYNC_PARTIAL, {
      events: filteredEvents.map(e => ({
        id: e.id,
        event: e.event,
        data: e.data,
        timestamp: e.timestamp,
      })),
      hasMore: eventIds.length === this.BATCH_SIZE,
      fromEventId,
    });

    // Add to pending acks for critical/high priority events
    const terminal = this.terminals.get(socket.id);
    if (terminal) {
      filteredEvents.forEach(e => {
        if (e.priority <= EventPriority.HIGH) {
          terminal.pendingAcks.add(e.id);
        }
      });
    }
  }

  // ============ EVENT PUBLISHING ============

  /**
   * Broadcast event to all terminals in a business with guaranteed delivery
   */
  async broadcastToBusiness(
    businessId: string,
    event: RealtimeEvent,
    data: any,
    excludeSocketId?: string,
    priority: EventPriority = EventPriority.NORMAL
  ): Promise<string> {
    const eventId = uuidv4();
    const timestamp = Date.now();

    // Create persistent event
    const persistentEvent: PersistentEvent = {
      id: eventId,
      event,
      businessId,
      data,
      priority,
      timestamp,
      expiresAt: timestamp + this.EVENT_TTL,
      acked: false,
      retryCount: 0,
      maxRetries: priority <= EventPriority.HIGH ? this.MAX_RETRIES : 1,
    };

    // Persist event if critical or high priority
    if (priority <= EventPriority.HIGH) {
      await this.persistEvent(persistentEvent);
    }

    // Build payload
    const payload = {
      id: eventId,
      event,
      data,
      timestamp,
      requiresAck: priority <= EventPriority.HIGH,
    };

    // Emit to local sockets
    if (this.io) {
      if (excludeSocketId) {
        this.io.to(`business:${businessId}`).except(excludeSocketId).emit(event, payload);
      } else {
        this.io.to(`business:${businessId}`).emit(event, payload);
      }
    }

    // Track pending acks for critical events
    if (priority <= EventPriority.HIGH) {
      for (const [socketId, terminal] of this.terminals.entries()) {
        if (terminal.businessId === businessId && socketId !== excludeSocketId) {
          terminal.pendingAcks.add(eventId);
          this.scheduleRetry(socketId, eventId, persistentEvent);
        }
      }
    }

    // Publish to Redis for other instances
    await cacheService.publishEvent(`pos:realtime:${businessId}`, {
      ...payload,
      excludeSocketId,
      sourceInstance: process.env.INSTANCE_ID || 'default',
    });

    return eventId;
  }

  /**
   * Send event to specific terminal with guaranteed delivery
   */
  async sendToTerminal(
    terminalId: string,
    event: RealtimeEvent,
    data: any,
    priority: EventPriority = EventPriority.NORMAL
  ): Promise<string | null> {
    // Find terminal socket
    let targetSocket: Socket | null = null;
    let terminal: TerminalState | null = null;

    for (const [socketId, t] of this.terminals.entries()) {
      if (t.terminalId === terminalId) {
        terminal = t;
        targetSocket = this.io?.sockets.sockets.get(socketId) || null;
        break;
      }
    }

    if (!targetSocket || !terminal) {
      // Terminal offline - persist event for later delivery
      if (priority <= EventPriority.HIGH) {
        const eventId = uuidv4();
        const persistentEvent: PersistentEvent = {
          id: eventId,
          event,
          businessId: terminal?.businessId || '',
          terminalId,
          data,
          priority,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.EVENT_TTL,
          acked: false,
          retryCount: 0,
          maxRetries: this.MAX_RETRIES,
        };
        await this.persistEvent(persistentEvent);
        return eventId;
      }
      return null;
    }

    const eventId = uuidv4();
    const payload = {
      id: eventId,
      event,
      data,
      timestamp: Date.now(),
      requiresAck: priority <= EventPriority.HIGH,
    };

    targetSocket.emit(event, payload);

    if (priority <= EventPriority.HIGH) {
      terminal.pendingAcks.add(eventId);

      const persistentEvent: PersistentEvent = {
        id: eventId,
        event,
        businessId: terminal.businessId,
        terminalId,
        targetSocketIds: [targetSocket.id],
        data,
        priority,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.EVENT_TTL,
        acked: false,
        retryCount: 0,
        maxRetries: this.MAX_RETRIES,
      };

      await this.persistEvent(persistentEvent);
      this.scheduleRetry(targetSocket.id, eventId, persistentEvent);
    }

    return eventId;
  }

  /**
   * Persist event to Redis
   */
  private async persistEvent(event: PersistentEvent): Promise<void> {
    const eventKey = `${KEYS.EVENT_DATA}${event.id}`;
    const queueKey = `${KEYS.EVENT_QUEUE}${event.businessId}`;

    // Store event data with TTL
    await cacheService.set(eventKey, event, this.EVENT_TTL / 1000);

    // Add to business event queue (sorted by timestamp)
    await cacheService.zadd(queueKey, event.timestamp, event.id);

    // Set expiry on the queue key to match event TTL
    await cacheService.expire(queueKey, Math.ceil(this.EVENT_TTL / 1000));
  }

  /**
   * Schedule retry for unacknowledged event
   */
  private scheduleRetry(socketId: string, eventId: string, event: PersistentEvent): void {
    setTimeout(async () => {
      const terminal = this.terminals.get(socketId);
      if (!terminal || !terminal.pendingAcks.has(eventId)) {
        return; // Already acked or terminal disconnected
      }

      const socket = this.io?.sockets.sockets.get(socketId);
      if (!socket) {
        return; // Socket gone
      }

      // Check retry count
      if (event.retryCount >= event.maxRetries) {
        console.warn(`Event ${eventId} exceeded max retries for socket ${socketId}`);
        terminal.pendingAcks.delete(eventId);
        return;
      }

      // Retry
      event.retryCount++;
      console.log(`Retrying event ${eventId} (attempt ${event.retryCount})`);

      socket.emit(event.event, {
        id: event.id,
        event: event.event,
        data: event.data,
        timestamp: event.timestamp,
        requiresAck: true,
        isRetry: true,
        retryCount: event.retryCount,
      });

      // Schedule next retry
      this.scheduleRetry(socketId, eventId, event);
    }, this.ACK_TIMEOUT);
  }

  /**
   * Subscribe to Redis pub/sub for cross-instance events
   */
  private async subscribeToRedisEvents(): Promise<void> {
    // Subscribe to all business channels
    // This would be done dynamically as businesses connect

    // For now, subscribe to a general channel
    await cacheService.subscribe('pos:realtime:broadcast', (message) => {
      // Check if event is from this instance
      if (message.sourceInstance === (process.env.INSTANCE_ID || 'default')) {
        return; // Skip our own events
      }

      // Broadcast to local sockets
      if (this.io && message.businessId) {
        const room = `business:${message.businessId}`;
        if (message.excludeSocketId) {
          this.io.to(room).except(message.excludeSocketId).emit(message.event, message);
        } else {
          this.io.to(room).emit(message.event, message);
        }
      }
    });
  }

  /**
   * Start cleanup job for expired events
   */
  private startCleanupJob(): void {
    setInterval(async () => {
      const now = Date.now();
      const expiredTimestamp = now - this.EVENT_TTL;

      // Cleanup stale connections
      for (const [socketId, terminal] of this.terminals.entries()) {
        // Check for stale pending acks
        if (terminal.pendingAcks.size > 100) {
          console.warn(`Terminal ${terminal.terminalId} has ${terminal.pendingAcks.size} pending acks`);
        }
      }

      // Cleanup expired events from Redis for all active businesses
      const processedBusinesses = new Set<string>();

      for (const terminal of this.terminals.values()) {
        if (!processedBusinesses.has(terminal.businessId)) {
          processedBusinesses.add(terminal.businessId);

          const queueKey = `${KEYS.EVENT_QUEUE}${terminal.businessId}`;

          // Remove expired events from the sorted set
          const removedCount = await cacheService.zremrangebyscore(queueKey, 0, expiredTimestamp);

          if (removedCount > 0) {
            console.log(`Cleaned up ${removedCount} expired events for business ${terminal.businessId}`);
          }
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Save terminal state to Redis
   */
  private async saveTerminalState(terminal: TerminalState): Promise<void> {
    await cacheService.set(
      `${KEYS.TERMINAL_STATE}${terminal.terminalId}`,
      {
        ...terminal,
        pendingAcks: Array.from(terminal.pendingAcks),
      },
      86400 // 24 hours
    );
  }

  // ============ CONVENIENCE METHODS ============

  emitOrderCreated(businessId: string, order: any): Promise<string> {
    return this.broadcastToBusiness(businessId, RealtimeEvent.ORDER_CREATED, order, undefined, EventPriority.CRITICAL);
  }

  emitOrderUpdated(businessId: string, order: any): Promise<string> {
    return this.broadcastToBusiness(businessId, RealtimeEvent.ORDER_UPDATED, order, undefined, EventPriority.HIGH);
  }

  emitOrderCompleted(businessId: string, order: any): Promise<string> {
    return this.broadcastToBusiness(businessId, RealtimeEvent.ORDER_COMPLETED, order, undefined, EventPriority.CRITICAL);
  }

  emitPaymentReceived(businessId: string, payment: any): Promise<string> {
    return this.broadcastToBusiness(businessId, RealtimeEvent.PAYMENT_RECEIVED, payment, undefined, EventPriority.CRITICAL);
  }

  emitStockUpdated(businessId: string, stock: any): Promise<string> {
    const priority = stock.newStock <= stock.minStock ? EventPriority.HIGH : EventPriority.NORMAL;
    const event = stock.newStock === 0
      ? RealtimeEvent.STOCK_OUT
      : stock.newStock <= stock.minStock
        ? RealtimeEvent.STOCK_LOW
        : RealtimeEvent.STOCK_UPDATED;
    return this.broadcastToBusiness(businessId, event, stock, undefined, priority);
  }

  emitProductUpdated(businessId: string, product: any): Promise<string> {
    return this.broadcastToBusiness(businessId, RealtimeEvent.PRODUCT_UPDATED, product, undefined, EventPriority.HIGH);
  }

  emitPriceChanged(businessId: string, product: any): Promise<string> {
    return this.broadcastToBusiness(businessId, RealtimeEvent.PRICE_CHANGED, product, undefined, EventPriority.CRITICAL);
  }

  // ============ STATUS METHODS ============

  getTerminalCount(businessId: string): number {
    let count = 0;
    for (const terminal of this.terminals.values()) {
      if (terminal.businessId === businessId) count++;
    }
    return count;
  }

  getTerminals(businessId: string): TerminalState[] {
    const terminals: TerminalState[] = [];
    for (const terminal of this.terminals.values()) {
      if (terminal.businessId === businessId) {
        terminals.push(terminal);
      }
    }
    return terminals;
  }

  isTerminalOnline(terminalId: string): boolean {
    for (const terminal of this.terminals.values()) {
      if (terminal.terminalId === terminalId) return true;
    }
    return false;
  }
}

export const reliableRealtimeService = new ReliableRealtimeService();
