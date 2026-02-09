// ============================================
// RIME Core Engine - Configuration
// ============================================

import dotenv from 'dotenv';
import { AppConfig } from './types';

// Load environment variables
dotenv.config({ path: '../../infrastructure/.env' });

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    console.warn(`Warning: Environment variable ${key} is not set`);
    return '';
  }
  return value;
}

function getEnvVarAsBool(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function getEnvVarAsInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const config: AppConfig = {
  // Server
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: getEnvVarAsInt('PORT', 3001),
  apiPrefix: getEnvVar('API_PREFIX', '/api'),

  // Gemini AI
  geminiApiKey: getEnvVar('GEMINI_API_KEY', ''),
  geminiModel: getEnvVar('GEMINI_MODEL', 'gemini-2.0-flash-exp'),
  geminiVisionModel: getEnvVar('GEMINI_VISION_MODEL', 'gemini-2.0-flash-exp'),

  // Screen Service
  screenServiceUrl: getEnvVar('SCREEN_SERVICE_URL', 'http://localhost:8000'),

  // Database
  databaseUrl: getEnvVar('DATABASE_URL', 'postgresql://rime:password@localhost:5432/rime'),

  // Redis
  redisUrl: getEnvVar('REDIS_URL', 'redis://localhost:6379'),

  // Pinecone
  pineconeApiKey: getEnvVar('PINECONE_API_KEY'),
  pineconeEnvironment: getEnvVar('PINECONE_ENVIRONMENT', 'us-east-1'),
  pineconeIndexName: getEnvVar('PINECONE_INDEX_NAME', 'rime-memory'),

  // Mock Mode
  enableMock: getEnvVarAsBool('ENABLE_MOCK', true),
  mockScenario: getEnvVar('MOCK_SCENARIO', 'coding'),

  // Logging
  logLevel: getEnvVar('LOG_LEVEL', 'debug'),

  // Security
  jwtSecret: getEnvVar('JWT_SECRET', 'default-jwt-secret-change-in-production'),
  corsOrigin: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
};

// Validate critical configuration
export function validateConfig(): void {
  const criticalVars = ['GEMINI_API_KEY'];
  const missing = criticalVars.filter(varName => !process.env[varName] && !config.enableMock);
  
  if (missing.length > 0) {
    console.warn('⚠️  Missing critical environment variables:', missing.join(', '));
    console.warn('   Running in mock mode or some features may not work.');
  }
}

export default config;
