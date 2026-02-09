// ============================================
// RIME Core Engine - Communication Agent
// ============================================

import { Logger } from 'winston';
import { BaseAgent } from './base-agent';
import { GeminiClient } from '../integrations/gemini-client';
import { UserIntent, ScreenContext, AgentResult, Action } from '../types';

export class CommAgent extends BaseAgent {
  private geminiClient: GeminiClient;

  constructor(geminiClient: GeminiClient, logger: Logger) {
    super(
      {
        id: 'communication',
        name: 'Communication Agent',
        description: 'Drafts messages, suggests recipients, and helps with team communication',
        capabilities: [
          'draft_message',
          'suggest_recipients',
          'summarize_conversation',
          'schedule_meeting',
          'email_draft',
        ],
      },
      logger
    );
    this.geminiClient = geminiClient;
  }

  async canHandle(intent: UserIntent): Promise<boolean> {
    const triggers = [
      'tell',
      'ask',
      'message',
      'send',
      'draft',
      'email',
      'slack',
      'notify',
      'inform',
      'update',
      'remind',
      'schedule',
      'meeting',
      'call',
      'chat',
      'dm',
      'direct message',
      'mention',
      'tag',
    ];

    return this.hasKeywords(intent.query.toLowerCase(), triggers);
  }

  async getConfidence(intent: UserIntent, context: ScreenContext): Promise<number> {
    let confidence = 0.5;
    const query = intent.query.toLowerCase();

    // Strong communication indicators
    if (query.includes('tell') || query.includes('ask')) confidence += 0.3;
    if (query.includes('message') || query.includes('send')) confidence += 0.25;
    if (query.includes('slack')) confidence += 0.3;
    if (query.includes('email')) confidence += 0.25;
    if (query.includes('schedule') || query.includes('meeting')) confidence += 0.2;

    // Context-based confidence
    if (context.visionAnalysis.application === 'slack') {
      confidence += 0.3;
    }

    if (context.visionAnalysis.userActivity === 'communicating') {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  async execute(intent: UserIntent, context: ScreenContext): Promise<AgentResult> {
    this.logExecutionStart(intent);

    try {
      const query = intent.query.toLowerCase();
      const actions: Action[] = [];

      // Determine what type of communication assistance to provide
      if (this.shouldDraftMessage(query, context)) {
        const messageAction = await this.draftMessage(intent, context);
        actions.push(messageAction);
      }

      if (this.shouldScheduleMeeting(query, context)) {
        const scheduleAction = await this.scheduleMeeting(intent, context);
        actions.push(scheduleAction);
      }

      if (this.shouldSummarize(query, context)) {
        const summarizeAction = await this.summarizeConversation(intent, context);
        actions.push(summarizeAction);
      }

      // If no specific action determined, provide general communication assistance
      if (actions.length === 0) {
        const generalAction = await this.provideGeneralAssistance(intent, context);
        actions.push(generalAction);
      }

      this.logExecutionComplete(intent, true);

      return this.createSuccessResult(
        actions,
        `Generated ${actions.length} communication action(s)`
      );

    } catch (error) {
      this.logExecutionComplete(intent, false);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Communication processing failed',
        'Failed to process communication request'
      );
    }
  }

  private shouldDraftMessage(query: string, context: ScreenContext): boolean {
    const messageTriggers = ['tell', 'ask', 'message', 'send', 'draft', 'say', 'inform', 'notify'];
    return this.hasKeywords(query, messageTriggers);
  }

  private shouldScheduleMeeting(query: string, context: ScreenContext): boolean {
    const scheduleTriggers = ['schedule', 'meeting', 'call', 'sync', 'discuss', 'set up'];
    return this.hasKeywords(query, scheduleTriggers);
  }

  private shouldSummarize(query: string, context: ScreenContext): boolean {
    const summarizeTriggers = ['summarize', 'summary', 'recap', 'overview', 'brief'];
    return this.hasKeywords(query, summarizeTriggers);
  }

  private async draftMessage(intent: UserIntent, context: ScreenContext): Promise<Action> {
    this.logger.info('Drafting message');

    const query = intent.query;
    
    // Extract recipient and topic from query
    const recipientMatch = query.match(/(?:tell|ask|message|send|to)\s+(\w+)/i);
    const recipient = recipientMatch ? recipientMatch[1] : 'team';

    // Get code context if available for context-aware messaging
    const codeContext = context.visionAnalysis.codeContext;
    const hasErrors = codeContext?.errors.length > 0;

    const draftPrompt = `
      You are a professional communication assistant. Draft a message based on:
      
      Request: "${query}"
      Recipient: ${recipient}
      ${codeContext ? `Code Context: Working on ${codeContext.fileName} (${codeContext.language})` : ''}
      ${hasErrors ? `Status: Currently debugging ${codeContext.errors.length} error(s)` : ''}

      Provide:
      1. Professional message draft
      2. Alternative shorter version
      3. Suggested tone (casual/formal)

      Format as JSON: {"draft": "...", "shortVersion": "...", "tone": "...", "suggestedChannel": "..."}
    `;

    let draftResult = {
      draft: `Hi ${recipient},\n\n${query}\n\nBest regards`,
      shortVersion: query,
      tone: 'professional',
      suggestedChannel: 'slack',
    };

    try {
      const response = await this.geminiClient.generateText(draftPrompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        draftResult = { ...draftResult, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      this.logger.warn('Failed to parse draft result, using fallback');
    }

    return this.createAction(
      'draft_message',
      '✉️ Draft Message',
      `Message draft for ${recipient}`,
      {
        recipient,
        request: query,
        ...draftResult,
        context: codeContext ? {
          file: codeContext.fileName,
          language: codeContext.language,
          hasErrors,
        } : null,
      },
      0.85
    );
  }

  private async scheduleMeeting(intent: UserIntent, context: ScreenContext): Promise<Action> {
    this.logger.info('Scheduling meeting');

    const query = intent.query;

    // Extract participants and topic
    const participantsMatch = query.match(/(?:with|include|invite)\s+(.+?)(?:\s+(?:to|about|for)|$)/i);
    const topicMatch = query.match(/(?:about|for|to\s+discuss)\s+(.+?)(?:\s+(?:at|on|tomorrow|today)|$)/i);

    const participants = participantsMatch 
      ? participantsMatch[1].split(/,\s*|\s+and\s+/).map(p => p.trim())
      : ['team'];
    const topic = topicMatch ? topicMatch[1] : 'Discussion';

    const schedulePrompt = `
      You are a scheduling assistant. Create a meeting plan for:
      
      Topic: ${topic}
      Participants: ${participants.join(', ')}
      Request: "${query}"

      Provide:
      1. Suggested meeting title
      2. Recommended duration
      3. Suggested agenda items
      4. Pre-meeting preparation suggestions

      Format as JSON: {"title": "...", "duration": "...", "agenda": [...], "preparation": [...]}
    `;

    let scheduleResult = {
      title: `Meeting: ${topic}`,
      duration: '30 minutes',
      agenda: ['Introduction', 'Discussion', 'Next steps'],
      preparation: ['Review relevant documents'],
    };

    try {
      const response = await this.geminiClient.generateText(schedulePrompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scheduleResult = { ...scheduleResult, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      this.logger.warn('Failed to parse schedule result, using fallback');
    }

    return this.createAction(
      'schedule_event',
      '📅 Meeting Scheduled',
      `Meeting plan for "${topic}"`,
      {
        topic,
        participants,
        request: query,
        ...scheduleResult,
      },
      0.8
    );
  }

  private async summarizeConversation(intent: UserIntent, context: ScreenContext): Promise<Action> {
    this.logger.info('Summarizing conversation');

    const query = intent.query;

    // In a real implementation, this would fetch conversation history
    // For now, provide a template

    return this.createAction(
      'explain',
      '📋 Conversation Summary',
      'Summary of recent conversation',
      {
        request: query,
        summary: 'Conversation summary would appear here based on message history.',
        keyPoints: [
          'Key point 1',
          'Key point 2',
          'Key point 3',
        ],
        actionItems: [
          { task: 'Action item 1', assignee: 'Person A' },
          { task: 'Action item 2', assignee: 'Person B' },
        ],
        note: 'Connect to Slack/Teams API for real conversation data',
      },
      0.75
    );
  }

  private async provideGeneralAssistance(intent: UserIntent, context: ScreenContext): Promise<Action> {
    this.logger.info('Providing general communication assistance');

    return this.createAction(
      'explain',
      '💬 Communication Assistant',
      'How can I help with your communication?',
      {
        suggestions: [
          'Draft a message to someone',
          'Schedule a meeting',
          'Summarize a conversation',
          'Write an email',
          'Prepare meeting notes',
        ],
        quickActions: [
          { label: 'Message team', action: 'message_team' },
          { label: 'Schedule sync', action: 'schedule_sync' },
          { label: 'Share update', action: 'share_update' },
        ],
      },
      0.6
    );
  }
}
