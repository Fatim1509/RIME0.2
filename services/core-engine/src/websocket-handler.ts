// ============================================
// RIME Core Engine - WebSocket Handler
// ============================================

import { Server, Socket } from 'socket.io';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  UserIntent,
  ScreenContext,
} from './types';
import { MetaAgent } from './agents/meta-agent';
import { ScreenCaptureClient } from './context-engine/screen-capture';
import { StateMachine } from './context-engine/state-machine';

export class WebSocketHandler {
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private metaAgent: MetaAgent;
  private screenCapture: ScreenCaptureClient;
  private stateMachine: StateMachine;
  private logger: Logger;
  private connectedSockets: Map<string, Socket> = new Map();
  private contextInterval: NodeJS.Timeout | null = null;

  constructor(
    io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    metaAgent: MetaAgent,
    screenCapture: ScreenCaptureClient,
    stateMachine: StateMachine,
    logger: Logger
  ) {
    this.io = io;
    this.metaAgent = metaAgent;
    this.screenCapture = screenCapture;
    this.stateMachine = stateMachine;
    this.logger = logger;
  }

  initialize(): void {
    this.io.on('connection', this.handleConnection.bind(this));
    this.startContextBroadcast();
    this.logger.info('WebSocket handler initialized');
  }

  private handleConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>): void {
    const sessionId = uuidv4();
    const userId = (socket.handshake.headers['x-user-id'] as string) || 'anonymous';
    
    socket.data = { userId, sessionId };
    this.connectedSockets.set(socket.id, socket);

    this.logger.info(`Client connected: ${socket.id}, Session: ${sessionId}, User: ${userId}`);

    // Send initial connection success
    socket.emit('agent:status', {
      id: 'meta',
      name: 'RIME Orchestrator',
      description: 'Main coordination agent',
      capabilities: ['intent_processing', 'workflow_management'],
      status: 'idle',
    });

    // Handle intent submission
    socket.on('intent:submit', this.handleIntentSubmit.bind(this, socket));

    // Handle action approval
    socket.on('action:approve', this.handleActionApprove.bind(this, socket));

    // Handle action rejection
    socket.on('action:reject', this.handleActionReject.bind(this, socket));

    // Handle context request
    socket.on('context:request', this.handleContextRequest.bind(this, socket));

    // Handle ping
    socket.on('ping', () => {
      socket.emit('agent:status', {
        id: 'meta',
        name: 'RIME Orchestrator',
        description: 'Main coordination agent',
        capabilities: ['intent_processing', 'workflow_management'],
        status: 'idle',
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      this.logger.info(`Client disconnected: ${socket.id}`);
      this.connectedSockets.delete(socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      this.logger.error(`Socket error for ${socket.id}:`, error);
    });
  }

  private async handleIntentSubmit(socket: Socket, intentData: Omit<UserIntent, 'id' | 'timestamp'>): Promise<void> {
    try {
      this.logger.info(`Processing intent from ${socket.id}: ${intentData.query}`);

      const intent: UserIntent = {
        ...intentData,
        id: `intent-${Date.now()}`,
        timestamp: Date.now(),
      };

      // Update agent status to working
      this.io.emit('agent:status', {
        id: 'meta',
        name: 'RIME Orchestrator',
        description: 'Main coordination agent',
        capabilities: ['intent_processing', 'workflow_management'],
        status: 'working',
        currentTask: `Processing: ${intent.query.substring(0, 50)}...`,
      });

      // Process the intent
      const result = await this.metaAgent.processIntent(intent);

      // Emit proposed actions to all connected clients
      result.actions.forEach((action, index) => {
        setTimeout(() => {
          this.io.emit('action:proposed', action);
        }, index * 100); // Stagger actions
      });

      // Update agent status back to idle
      this.io.emit('agent:status', {
        id: 'meta',
        name: 'RIME Orchestrator',
        description: 'Main coordination agent',
        capabilities: ['intent_processing', 'workflow_management'],
        status: 'idle',
      });

      // Emit workflow complete
      if (result.success) {
        this.io.emit('workflow:complete', result);
      }

    } catch (error) {
      this.logger.error('Error handling intent:', error);
      socket.emit('error', {
        message: 'Failed to process intent',
        code: 'INTENT_PROCESSING_ERROR',
      });
    }
  }

  private async handleActionApprove(socket: Socket, actionId: string): Promise<void> {
    try {
      this.logger.info(`Action approved: ${actionId}`);
      const result = await this.metaAgent.approveAction(actionId);
      
      if (result.success && result.actions.length > 0) {
        result.actions.forEach(action => {
          this.io.emit('action:updated', action);
        });
      }
    } catch (error) {
      this.logger.error('Error approving action:', error);
      socket.emit('error', {
        message: 'Failed to approve action',
        code: 'ACTION_APPROVAL_ERROR',
      });
    }
  }

  private async handleActionReject(socket: Socket, actionId: string): Promise<void> {
    try {
      this.logger.info(`Action rejected: ${actionId}`);
      const result = await this.metaAgent.rejectAction(actionId);
      
      if (result.success && result.actions.length > 0) {
        result.actions.forEach(action => {
          this.io.emit('action:updated', action);
        });
      }
    } catch (error) {
      this.logger.error('Error rejecting action:', error);
      socket.emit('error', {
        message: 'Failed to reject action',
        code: 'ACTION_REJECTION_ERROR',
      });
    }
  }

  private async handleContextRequest(socket: Socket): Promise<void> {
    try {
      const context = await this.screenCapture.getLatestContext();
      socket.emit('context:update', context);
    } catch (error) {
      this.logger.error('Error getting context:', error);
      socket.emit('error', {
        message: 'Failed to get context',
        code: 'CONTEXT_ERROR',
      });
    }
  }

  private startContextBroadcast(): void {
    // Broadcast context updates every 5 seconds
    this.contextInterval = setInterval(async () => {
      try {
        if (this.connectedSockets.size > 0) {
          const context = await this.screenCapture.getLatestContext();
          
          // Update state machine
          this.stateMachine.updateState(context.visionAnalysis);
          
          // Broadcast to all connected clients
          this.io.emit('context:update', context);

          // Check for automatic suggestions
          await this.checkForSuggestions(context);
        }
      } catch (error) {
        this.logger.error('Error broadcasting context:', error);
      }
    }, 5000);

    this.logger.info('Context broadcast started (5s interval)');
  }

  private async checkForSuggestions(context: ScreenContext): Promise<void> {
    // Check for errors in code context
    if (context.visionAnalysis.codeContext?.errors.length) {
      const errors = context.visionAnalysis.codeContext.errors;
      const hasErrors = errors.some(e => e.severity === 'error');
      
      if (hasErrors && this.stateMachine.getCurrentState() === 'debugging') {
        // Check if we've been debugging for more than 2 minutes
        const debugTime = this.stateMachine.getStateDuration();
        
        if (debugTime > 2 * 60 * 1000) {
          // Suggest help
          this.io.emit('action:proposed', {
            id: `suggestion-${Date.now()}`,
            agentId: 'code',
            type: 'code_fix',
            title: '🔧 Fix detected errors',
            description: `Found ${errors.length} error(s) in your code. Would you like help fixing them?`,
            payload: { errors },
            confidence: 0.9,
            status: 'pending',
            createdAt: Date.now(),
          });
        }
      }
    }

    // Check for documentation reading
    if (context.visionAnalysis.browserContext?.pageType === 'documentation') {
      const readTime = this.stateMachine.getStateDuration();
      
      if (readTime > 30 * 1000) {
        // Suggest summary
        this.io.emit('action:proposed', {
          id: `suggestion-${Date.now()}`,
          agentId: 'research',
          type: 'explain',
          title: '📚 Summarize documentation',
          description: `You've been reading "${context.visionAnalysis.browserContext.title}" for a while. Want a summary?`,
          payload: { url: context.visionAnalysis.browserContext.url },
          confidence: 0.7,
          status: 'pending',
          createdAt: Date.now(),
        });
      }
    }
  }

  stop(): void {
    if (this.contextInterval) {
      clearInterval(this.contextInterval);
      this.contextInterval = null;
    }
    
    this.connectedSockets.forEach(socket => {
      socket.disconnect(true);
    });
    this.connectedSockets.clear();
    
    this.logger.info('WebSocket handler stopped');
  }
}
