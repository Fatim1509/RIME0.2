// ============================================
// RIME Core Engine - Main Server
// ============================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import winston from 'winston';

import { config, validateConfig } from './config';
import { WebSocketHandler } from './websocket-handler';
import { MetaAgent } from './agents/meta-agent';
import { GeminiClient } from './integrations/gemini-client';
import { ScreenCaptureClient } from './context-engine/screen-capture';
import { StateMachine } from './context-engine/state-machine';
import { VectorStore } from './memory/vector-store';

// Initialize logger
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'core-engine' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Express app
const app = express();
const httpServer = createServer(app);

// Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ============================================
// Initialize Services
// ============================================

const geminiClient = new GeminiClient(config.geminiApiKey, logger);
const screenCapture = new ScreenCaptureClient(config.screenServiceUrl, logger);
const stateMachine = new StateMachine(logger);
const vectorStore = new VectorStore(config.pineconeApiKey, logger);
const metaAgent = new MetaAgent(geminiClient, vectorStore, logger);

// ============================================
// WebSocket Handler
// ============================================

const wsHandler = new WebSocketHandler(
  io,
  metaAgent,
  screenCapture,
  stateMachine,
  logger
);

// ============================================
// API Routes
// ============================================

const apiRouter = express.Router();

// Health check
apiRouter.get('/health', async (req, res) => {
  const health = {
    status: 'healthy' as const,
    timestamp: Date.now(),
    version: '0.1.0',
    services: {
      database: 'connected' as const,
      redis: 'connected' as const,
      screenService: 'connected' as const,
      gemini: geminiClient.isHealthy() ? 'connected' as const : 'disconnected' as const,
    },
    uptime: process.uptime(),
  };

  // Check if any service is down
  const disconnectedServices = Object.values(health.services).filter(s => s === 'disconnected');
  if (disconnectedServices.length > 0) {
    health.status = disconnectedServices.length > 2 ? 'unhealthy' : 'degraded';
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Get current context
apiRouter.get('/context/current', async (req, res) => {
  try {
    const context = await screenCapture.getLatestContext();
    res.json(context);
  } catch (error) {
    logger.error('Error getting context:', error);
    res.status(500).json({ error: 'Failed to get context' });
  }
});

// Submit intent
apiRouter.post('/intent', async (req, res) => {
  try {
    const { query, type = 'natural_language', context: userContext } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const intent = {
      id: `intent-${Date.now()}`,
      query,
      type,
      context: userContext || await screenCapture.getLatestContext(),
      userId: req.headers['x-user-id'] as string || 'anonymous',
      sessionId: req.headers['x-session-id'] as string || 'default',
      timestamp: Date.now(),
    };

    const result = await metaAgent.processIntent(intent);
    
    res.json({
      intentId: intent.id,
      actions: result.actions,
      message: result.message,
    });
  } catch (error) {
    logger.error('Error processing intent:', error);
    res.status(500).json({ error: 'Failed to process intent' });
  }
});

// Get agent statuses
apiRouter.get('/agents/status', async (req, res) => {
  try {
    const statuses = metaAgent.getAgentStatuses();
    res.json(statuses);
  } catch (error) {
    logger.error('Error getting agent statuses:', error);
    res.status(500).json({ error: 'Failed to get agent statuses' });
  }
});

// Approve action
apiRouter.post('/actions/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await metaAgent.approveAction(id);
    res.json(result);
  } catch (error) {
    logger.error('Error approving action:', error);
    res.status(500).json({ error: 'Failed to approve action' });
  }
});

// Reject action
apiRouter.post('/actions/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await metaAgent.rejectAction(id);
    res.json(result);
  } catch (error) {
    logger.error('Error rejecting action:', error);
    res.status(500).json({ error: 'Failed to reject action' });
  }
});

// Query memory
apiRouter.get('/memory/query', async (req, res) => {
  try {
    const { query, type, limit = '10' } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const memories = await vectorStore.query({
      query: query as string,
      type: type as any,
      limit: parseInt(limit as string, 10),
    });

    res.json(memories);
  } catch (error) {
    logger.error('Error querying memory:', error);
    res.status(500).json({ error: 'Failed to query memory' });
  }
});

// Voice command
apiRouter.post('/voice/command', async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    // Convert voice to intent
    const intent = {
      id: `voice-${Date.now()}`,
      query: transcript,
      type: 'voice_command' as const,
      context: await screenCapture.getLatestContext(),
      userId: req.headers['x-user-id'] as string || 'anonymous',
      sessionId: req.headers['x-session-id'] as string || 'default',
      timestamp: Date.now(),
    };

    const result = await metaAgent.processIntent(intent);
    
    res.json({
      intentId: intent.id,
      actions: result.actions,
      message: result.message,
    });
  } catch (error) {
    logger.error('Error processing voice command:', error);
    res.status(500).json({ error: 'Failed to process voice command' });
  }
});

// Mount API router
app.use(config.apiPrefix, apiRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ============================================
// Start Server
// ============================================

async function startServer() {
  try {
    // Validate configuration
    validateConfig();

    // Initialize services
    logger.info('Initializing services...');
    
    await geminiClient.initialize();
    logger.info('✓ Gemini client initialized');

    await vectorStore.initialize();
    logger.info('✓ Vector store initialized');

    await metaAgent.initialize();
    logger.info('✓ Meta agent initialized');

    // Start WebSocket handler
    wsHandler.initialize();
    logger.info('✓ WebSocket handler initialized');

    // Start HTTP server
    httpServer.listen(config.port, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🧠 RIME Core Engine                                      ║
║   Recursive Intelligence Multi-Agent Environment           ║
║                                                            ║
║   Version: 0.1.0                                           ║
║   Port: ${config.port}                                         ║
║   Environment: ${config.nodeEnv.padEnd(20)}                          ║
║   Mock Mode: ${config.enableMock ? 'Enabled' : 'Disabled'}                                    ║
║                                                            ║
║   API: http://localhost:${config.port}/api                       ║
║   Health: http://localhost:${config.port}/health                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
