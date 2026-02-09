// ============================================
// RIME Core Engine - Base Agent
// ============================================

import { Logger } from 'winston';
import {
  AgentType,
  AgentInfo,
  AgentStatus,
  UserIntent,
  ScreenContext,
  Action,
  AgentResult,
  ActionType,
  ActionStatus,
} from '../types';

export interface AgentConfig {
  id: AgentType;
  name: string;
  description: string;
  capabilities: string[];
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected status: AgentStatus = 'idle';
  protected currentTask?: string;
  protected lastActive?: number;
  protected logger: Logger;

  constructor(config: AgentConfig, logger: Logger) {
    this.config = config;
    this.logger = logger.child({ agent: config.id });
  }

  // Abstract methods that must be implemented by subclasses
  abstract canHandle(intent: UserIntent): Promise<boolean>;
  abstract execute(intent: UserIntent, context: ScreenContext): Promise<AgentResult>;
  abstract getConfidence(intent: UserIntent, context: ScreenContext): Promise<number>;

  // Get agent information
  getInfo(): AgentInfo {
    return {
      id: this.config.id,
      name: this.config.name,
      description: this.config.description,
      capabilities: this.config.capabilities,
      status: this.status,
      currentTask: this.currentTask,
      lastActive: this.lastActive,
    };
  }

  // Get current status
  getStatus(): AgentStatus {
    return this.status;
  }

  // Set agent status
  protected setStatus(status: AgentStatus, message?: string): void {
    this.status = status;
    if (message) {
      this.currentTask = message;
    }
    if (status === 'idle' || status === 'error') {
      this.currentTask = undefined;
    }
    this.lastActive = Date.now();
    
    this.logger.debug(`Status changed to ${status}`, { message });
  }

  // Create a new action
  protected createAction(
    type: ActionType,
    title: string,
    description: string,
    payload: unknown,
    confidence: number = 0.8,
    dependencies?: string[]
  ): Action {
    return {
      id: `action-${this.config.id}-${Date.now()}`,
      agentId: this.config.id,
      type,
      title,
      description,
      payload,
      confidence,
      status: 'pending',
      dependencies,
      createdAt: Date.now(),
    };
  }

  // Update action status
  protected updateActionStatus(action: Action, status: ActionStatus, error?: string): Action {
    return {
      ...action,
      status,
      error,
      executedAt: status === 'executing' ? Date.now() : action.executedAt,
      completedAt: status === 'completed' || status === 'failed' ? Date.now() : action.completedAt,
    };
  }

  // Log execution start
  protected logExecutionStart(intent: UserIntent): void {
    this.logger.info(`Starting execution for intent: ${intent.query}`, {
      intentId: intent.id,
      userId: intent.userId,
    });
    this.setStatus('working', `Processing: ${intent.query.substring(0, 50)}...`);
  }

  // Log execution completion
  protected logExecutionComplete(intent: UserIntent, success: boolean): void {
    this.logger.info(`Execution ${success ? 'completed' : 'failed'} for intent: ${intent.query}`, {
      intentId: intent.id,
    });
    this.setStatus(success ? 'idle' : 'error');
  }

  // Create success result
  protected createSuccessResult(actions: Action[], message?: string): AgentResult {
    return {
      success: true,
      actions,
      message: message || `Successfully executed ${actions.length} action(s)`,
    };
  }

  // Create error result
  protected createErrorResult(error: string, message?: string): AgentResult {
    this.setStatus('error', error);
    return {
      success: false,
      actions: [],
      error,
      message: message || `Error: ${error}`,
    };
  }

  // Extract keywords from query
  protected extractKeywords(query: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'and', 'but', 'or', 'yet', 'so', 'if', 'because', 'although', 'though', 'while', 'where', 'when', 'that', 'which', 'who', 'whom', 'whose', 'what', 'this', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'being', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could']);
    
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  // Check if query contains any of the given keywords
  protected hasKeywords(query: string, keywords: string[]): boolean {
    const queryWords = this.extractKeywords(query);
    return keywords.some(keyword => 
      queryWords.some(word => word.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(word))
    );
  }
}
