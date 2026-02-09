// ============================================
// RIME Core Engine - Meta Agent (Orchestrator)
// ============================================

import { Logger } from 'winston';
import { BaseAgent } from './base-agent';
import { ResearchAgent } from './research-agent';
import { CodeAgent } from './code-agent';
import { CommAgent } from './comm-agent';
import { GeminiClient } from '../integrations/gemini-client';
import { VectorStore } from '../memory/vector-store';
import {
  AgentType,
  UserIntent,
  ScreenContext,
  Action,
  AgentResult,
  AgentInfo,
  ActionStatus,
} from '../types';

interface AgentConfidence {
  agent: BaseAgent;
  confidence: number;
  canHandle: boolean;
}

interface PendingAction {
  action: Action;
  intent: UserIntent;
  executingAgent: BaseAgent;
}

export class MetaAgent {
  private agents: Map<AgentType, BaseAgent> = new Map();
  private pendingActions: Map<string, PendingAction> = new Map();
  private geminiClient: GeminiClient;
  private vectorStore: VectorStore;
  private logger: Logger;

  constructor(geminiClient: GeminiClient, vectorStore: VectorStore, logger: Logger) {
    this.geminiClient = geminiClient;
    this.vectorStore = vectorStore;
    this.logger = logger.child({ agent: 'meta' });
  }

  async initialize(): Promise<void> {
    // Initialize all agents
    this.agents.set('research', new ResearchAgent(this.geminiClient, this.logger));
    this.agents.set('code', new CodeAgent(this.geminiClient, this.vectorStore, this.logger));
    this.agents.set('communication', new CommAgent(this.geminiClient, this.logger));

    this.logger.info(`Initialized ${this.agents.size} agents`);
  }

  // Process user intent and orchestrate agents
  async processIntent(intent: UserIntent): Promise<AgentResult> {
    this.logger.info(`Processing intent: ${intent.query}`, { intentId: intent.id });

    try {
      // Get context if not provided
      const context = intent.context || await this.getDefaultContext();

      // Query all agents for their confidence scores
      const agentConfidences = await this.queryAgents(intent, context);

      // Filter agents that can handle this intent
      const capableAgents = agentConfidences.filter(ac => ac.canHandle && ac.confidence > 0.3);

      if (capableAgents.length === 0) {
        return {
          success: false,
          actions: [],
          message: 'No agent could handle this request. Try rephrasing your query.',
        };
      }

      // Sort by confidence (highest first)
      capableAgents.sort((a, b) => b.confidence - a.confidence);

      this.logger.info(`Selected ${capableAgents.length} agents`, {
        agents: capableAgents.map(ac => ({ id: ac.agent.getInfo().id, confidence: ac.confidence })),
      });

      // Execute top agents (up to 3)
      const topAgents = capableAgents.slice(0, 3);
      const results: AgentResult[] = [];

      // Execute independent agents in parallel
      const independentAgents = topAgents.filter(ac => ac.agent.getInfo().id !== 'code');
      const parallelResults = await Promise.all(
        independentAgents.map(ac => this.executeAgent(ac.agent, intent, context))
      );
      results.push(...parallelResults);

      // Execute code agent sequentially if selected (it might depend on research)
      const codeAgentResult = topAgents.find(ac => ac.agent.getInfo().id === 'code');
      if (codeAgentResult) {
        // Enhance context with research results if available
        const researchResult = results.find(r => 
          r.actions.some(a => a.agentId === 'research')
        );
        if (researchResult) {
          context.visionAnalysis = {
            ...context.visionAnalysis,
            visibleText: [
              ...context.visionAnalysis.visibleText,
              ...(researchResult.metadata?.searchResults as string[] || []),
            ],
          };
        }

        const codeResult = await this.executeAgent(codeAgentResult.agent, intent, context);
        results.push(codeResult);
      }

      // Combine all actions
      const allActions = results.flatMap(r => r.actions);

      // Store pending actions for approval workflow
      allActions.forEach(action => {
        const executingAgent = this.agents.get(action.agentId);
        if (executingAgent) {
          this.pendingActions.set(action.id, {
            action,
            intent,
            executingAgent,
          });
        }
      });

      // Check for conflicts and resolve them
      const resolvedActions = this.resolveConflicts(allActions);

      return {
        success: true,
        actions: resolvedActions,
        message: `Generated ${resolvedActions.length} action(s) for your approval`,
      };

    } catch (error) {
      this.logger.error('Error processing intent:', error);
      return {
        success: false,
        actions: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to process your request',
      };
    }
  }

  // Approve and execute an action
  async approveAction(actionId: string): Promise<AgentResult> {
    const pending = this.pendingActions.get(actionId);
    
    if (!pending) {
      return {
        success: false,
        actions: [],
        error: 'Action not found or already processed',
      };
    }

    this.logger.info(`Approving action: ${actionId}`);

    try {
      // Update action status
      const updatedAction: Action = {
        ...pending.action,
        status: 'executing' as ActionStatus,
        executedAt: Date.now(),
      };

      // Execute the action
      const result = await pending.executingAgent.execute(
        pending.intent,
        pending.intent.context || await this.getDefaultContext()
      );

      // Mark action as completed
      const completedAction: Action = {
        ...updatedAction,
        status: 'completed' as ActionStatus,
        completedAt: Date.now(),
      };

      // Remove from pending
      this.pendingActions.delete(actionId);

      return {
        success: true,
        actions: [completedAction, ...result.actions],
        message: 'Action executed successfully',
      };

    } catch (error) {
      this.logger.error(`Error executing action ${actionId}:`, error);
      
      const failedAction: Action = {
        ...pending.action,
        status: 'failed' as ActionStatus,
        error: error instanceof Error ? error.message : 'Execution failed',
        completedAt: Date.now(),
      };

      this.pendingActions.delete(actionId);

      return {
        success: false,
        actions: [failedAction],
        error: error instanceof Error ? error.message : 'Execution failed',
      };
    }
  }

  // Reject an action
  async rejectAction(actionId: string): Promise<AgentResult> {
    const pending = this.pendingActions.get(actionId);
    
    if (!pending) {
      return {
        success: false,
        actions: [],
        error: 'Action not found or already processed',
      };
    }

    this.logger.info(`Rejecting action: ${actionId}`);

    const rejectedAction: Action = {
      ...pending.action,
      status: 'rejected' as ActionStatus,
      completedAt: Date.now(),
    };

    this.pendingActions.delete(actionId);

    return {
      success: true,
      actions: [rejectedAction],
      message: 'Action rejected',
    };
  }

  // Get all agent statuses
  getAgentStatuses(): AgentInfo[] {
    return Array.from(this.agents.values()).map(agent => agent.getInfo());
  }

  // Get specific agent
  getAgent(type: AgentType): BaseAgent | undefined {
    return this.agents.get(type);
  }

  // Query all agents for their confidence
  private async queryAgents(intent: UserIntent, context: ScreenContext): Promise<AgentConfidence[]> {
    const promises = Array.from(this.agents.values()).map(async agent => {
      const [canHandle, confidence] = await Promise.all([
        agent.canHandle(intent),
        agent.getConfidence(intent, context),
      ]);

      return {
        agent,
        confidence,
        canHandle,
      };
    });

    return Promise.all(promises);
  }

  // Execute a single agent
  private async executeAgent(agent: BaseAgent, intent: UserIntent, context: ScreenContext): Promise<AgentResult> {
    try {
      return await agent.execute(intent, context);
    } catch (error) {
      this.logger.error(`Error executing agent ${agent.getInfo().id}:`, error);
      return {
        success: false,
        actions: [],
        error: error instanceof Error ? error.message : 'Agent execution failed',
      };
    }
  }

  // Resolve conflicts between actions
  private resolveConflicts(actions: Action[]): Action[] {
    // Group actions by type
    const grouped = actions.reduce((acc, action) => {
      if (!acc[action.type]) {
        acc[action.type] = [];
      }
      acc[action.type].push(action);
      return acc;
    }, {} as Record<string, Action[]>);

    const resolved: Action[] = [];

    // For each type, keep only the highest confidence action
    Object.values(grouped).forEach(group => {
      if (group.length === 1) {
        resolved.push(group[0]);
      } else {
        // Sort by confidence and take the highest
        group.sort((a, b) => b.confidence - a.confidence);
        resolved.push(group[0]);
        
        this.logger.info(`Resolved conflict: kept ${group[0].id} (confidence: ${group[0].confidence})`);
      }
    });

    // Sort by confidence
    return resolved.sort((a, b) => b.confidence - a.confidence);
  }

  // Get default context
  private async getDefaultContext(): Promise<ScreenContext> {
    return {
      visionAnalysis: {
        application: 'unknown',
        windowTitle: 'Unknown',
        userActivity: 'idle',
        confidence: 0,
        visibleText: [],
        uiElements: [],
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      sessionId: 'default',
    };
  }
}
