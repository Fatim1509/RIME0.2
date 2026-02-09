'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Health check
export async function checkHealth() {
  return apiRequest<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: number;
    version: string;
    services: Record<string, string>;
    uptime: number;
  }>('/health');
}

// Get current context
export async function getCurrentContext() {
  return apiRequest<{
    screenshot?: string;
    visionAnalysis: {
      application: string;
      windowTitle: string;
      userActivity: string;
      confidence: number;
      visibleText: string[];
      uiElements: Array<{
        type: string;
        text: string;
        bounds: { x: number; y: number; width: number; height: number };
        confidence: number;
      }>;
      codeContext?: {
        language: string;
        fileName: string;
        lineNumber?: number;
        codeSnippet?: string;
        errors: Array<{ message: string; line: number; severity: string }>;
      };
      browserContext?: {
        url: string;
        title: string;
        pageType: string;
      };
      timestamp: number;
    };
    timestamp: number;
    sessionId: string;
  }>('/api/context/current');
}

// Submit intent
export async function submitIntent(query: string, type: string = 'natural_language') {
  return apiRequest<{
    intentId: string;
    actions: Array<{
      id: string;
      agentId: string;
      type: string;
      title: string;
      description: string;
      payload: unknown;
      confidence: number;
      status: string;
      createdAt: number;
    }>;
    message: string;
  }>('/api/intent', {
    method: 'POST',
    body: { query, type },
  });
}

// Get agent statuses
export async function getAgentStatuses() {
  return apiRequest<Array<{
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    status: string;
    currentTask?: string;
    lastActive?: number;
  }>>('/api/agents/status');
}

// Approve action
export async function approveAction(actionId: string) {
  return apiRequest<{
    success: boolean;
    actions: unknown[];
    message?: string;
    error?: string;
  }>(`/api/actions/${actionId}/approve`, {
    method: 'POST',
  });
}

// Reject action
export async function rejectAction(actionId: string) {
  return apiRequest<{
    success: boolean;
    actions: unknown[];
    message?: string;
    error?: string;
  }>(`/api/actions/${actionId}/reject`, {
    method: 'POST',
  });
}

// Query memory
export async function queryMemory(query: string, type?: string, limit: number = 10) {
  const params = new URLSearchParams({ query, limit: limit.toString() });
  if (type) params.append('type', type);
  
  return apiRequest<{
    memories: Array<{
      id: string;
      type: string;
      content: string;
      metadata: Record<string, unknown>;
      timestamp: number;
    }>;
  }>(`/api/memory/query?${params}`);
}

// Process voice command
export async function processVoiceCommand(transcript: string) {
  return apiRequest<{
    intentId: string;
    actions: unknown[];
    message: string;
  }>('/api/voice/command', {
    method: 'POST',
    body: { transcript },
  });
}
