// ============================================
// RIME Core Engine - Type Definitions
// ============================================

export type AgentType = 'research' | 'code' | 'communication' | 'meta';

export type ActivityType = 
  | 'idle' 
  | 'active' 
  | 'coding' 
  | 'debugging' 
  | 'researching' 
  | 'reading' 
  | 'communicating';

export type ActionType = 
  | 'web_search' 
  | 'code_fix' 
  | 'code_explain' 
  | 'draft_message' 
  | 'schedule_event' 
  | 'open_file' 
  | 'run_command' 
  | 'explain';

export type ActionStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'executing' 
  | 'completed' 
  | 'failed';

export type AgentStatus = 'idle' | 'working' | 'error' | 'offline';

// ============================================
// Vision Analysis Types
// ============================================

export interface VisionAnalysis {
  application: 'vscode' | 'chrome' | 'slack' | 'terminal' | 'unknown';
  windowTitle: string;
  userActivity: ActivityType;
  confidence: number;
  visibleText: string[];
  uiElements: UIElement[];
  codeContext?: CodeContext;
  browserContext?: BrowserContext;
  timestamp: number;
}

export interface UIElement {
  type: 'button' | 'input' | 'text' | 'link' | 'code' | 'error';
  text: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

export interface CodeContext {
  language: string;
  fileName: string;
  lineNumber?: number;
  codeSnippet?: string;
  errors: CodeError[];
}

export interface CodeError {
  message: string;
  line: number;
  severity: 'error' | 'warning';
}

export interface BrowserContext {
  url: string;
  title: string;
  pageType: 'documentation' | 'github' | 'stackoverflow' | 'generic';
}

// ============================================
// Screen Context Types
// ============================================

export interface ScreenContext {
  screenshot?: string; // base64 encoded
  visionAnalysis: VisionAnalysis;
  timestamp: number;
  sessionId: string;
}

// ============================================
// Intent Types
// ============================================

export interface UserIntent {
  id: string;
  query: string;
  type: IntentType;
  context?: ScreenContext;
  userId: string;
  sessionId: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type IntentType = 
  | 'natural_language'
  | 'voice_command'
  | 'hotkey_trigger'
  | 'contextual_suggestion'
  | 'error_detected';

// ============================================
// Action Types
// ============================================

export interface Action {
  id: string;
  agentId: AgentType;
  type: ActionType;
  title: string;
  description: string;
  payload: unknown;
  confidence: number;
  status: ActionStatus;
  dependencies?: string[];
  createdAt: number;
  executedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface AgentResult {
  success: boolean;
  actions: Action[];
  message?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Agent Types
// ============================================

export interface AgentInfo {
  id: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  status: AgentStatus;
  currentTask?: string;
  lastActive?: number;
}

export interface AgentCapability {
  name: string;
  description: string;
  triggers: string[];
}

// ============================================
// Memory Types
// ============================================

export type MemoryType = 'preference' | 'pattern' | 'fact' | 'code_style';

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  timestamp: number;
  source: string;
}

export interface MemoryQuery {
  query: string;
  type?: MemoryType;
  limit?: number;
  threshold?: number;
}

// ============================================
// WebSocket Event Types
// ============================================

export interface ServerToClientEvents {
  'context:update': (context: ScreenContext) => void;
  'agent:status': (agent: AgentInfo) => void;
  'action:proposed': (action: Action) => void;
  'action:updated': (action: Action) => void;
  'workflow:complete': (result: AgentResult) => void;
  'error': (error: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
  'intent:submit': (intent: UserIntent) => void;
  'action:approve': (actionId: string) => void;
  'action:reject': (actionId: string) => void;
  'context:request': () => void;
  'ping': () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  sessionId: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface IntentRequest {
  query: string;
  type?: IntentType;
  context?: Partial<ScreenContext>;
}

export interface IntentResponse {
  intentId: string;
  actions: Action[];
  message: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  version: string;
  services: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
    screenService: 'connected' | 'disconnected';
    gemini: 'connected' | 'disconnected';
  };
  uptime: number;
}

// ============================================
// State Machine Types
// ============================================

export interface StateTransition {
  from: ActivityType;
  to: ActivityType;
  trigger: string;
  timestamp: number;
}

export interface UserState {
  currentActivity: ActivityType;
  previousActivity: ActivityType;
  activityStartTime: number;
  transitions: StateTransition[];
  predictions: string[];
}

// ============================================
// Configuration Types
// ============================================

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  geminiApiKey: string;
  geminiModel: string;
  geminiVisionModel: string;
  screenServiceUrl: string;
  databaseUrl: string;
  redisUrl: string;
  pineconeApiKey?: string;
  pineconeEnvironment?: string;
  pineconeIndexName?: string;
  enableMock: boolean;
  mockScenario: string;
  logLevel: string;
  jwtSecret: string;
  corsOrigin: string;
}
