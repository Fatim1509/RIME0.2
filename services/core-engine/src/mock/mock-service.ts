// ============================================
// RIME Core Engine - Mock Service
// ============================================

import { Logger } from 'winston';
import {
  UserIntent,
  ScreenContext,
  AgentResult,
  Action,
  VisionAnalysis,
  ActivityType,
} from '../types';

export class MockService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child({ service: 'mock' });
  }

  generateMockIntentResponse(intent: UserIntent): AgentResult {
    this.logger.info(`Generating mock response for intent: ${intent.query}`);

    const query = intent.query.toLowerCase();

    if (query.includes('fix') || query.includes('error')) {
      return this.getErrorFixResponse();
    }

    if (query.includes('explain')) {
      return this.getCodeExplainResponse();
    }

    if (query.includes('search') || query.includes('find')) {
      return this.getSearchResponse();
    }

    if (query.includes('tell') || query.includes('message')) {
      return this.getMessageResponse();
    }

    return this.getDefaultResponse();
  }

  generateMockVisionAnalysis(): VisionAnalysis {
    return {
      application: 'vscode',
      windowTitle: 'App.tsx - rime-dashboard',
      userActivity: 'coding',
      confidence: 0.9,
      visibleText: [
        'import React, { useState } from "react";',
        'export const Dashboard = () => {',
        'const [loading, setLoading] = useState(false);',
      ],
      uiElements: [
        {
          type: 'text',
          text: 'App.tsx',
          bounds: { x: 100, y: 50, width: 80, height: 20 },
          confidence: 0.95,
        },
        {
          type: 'code',
          text: 'useState',
          bounds: { x: 200, y: 150, width: 60, height: 15 },
          confidence: 0.9,
        },
      ],
      codeContext: {
        language: 'typescript',
        fileName: 'App.tsx',
        lineNumber: 15,
        codeSnippet: 'const [data, setData] = useState<Data | null>(null);',
        errors: [],
      },
      timestamp: Date.now(),
    };
  }

  generateMockScreenContext(): ScreenContext {
    return {
      visionAnalysis: this.generateMockVisionAnalysis(),
      timestamp: Date.now(),
      sessionId: 'mock-session',
    };
  }

  private getErrorFixResponse(): AgentResult {
    return {
      success: true,
      actions: [
        {
          id: 'mock-action-1',
          agentId: 'code',
          type: 'code_fix',
          title: '🔧 Fix Type Error',
          description: 'Fixed the TypeError in your code by adding proper null checks',
          payload: {
            originalCode: `const value = data.property;`,
            fixedCode: `const value = data?.property;`,
            explanation: 'Using optional chaining prevents errors when data might be null or undefined',
          },
          confidence: 0.95,
          status: 'pending',
          createdAt: Date.now(),
        },
        {
          id: 'mock-action-2',
          agentId: 'research',
          type: 'web_search',
          title: '📚 Optional Chaining Documentation',
          description: 'Learn more about optional chaining in JavaScript/TypeScript',
          payload: {
            url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining',
          },
          confidence: 0.8,
          status: 'pending',
          createdAt: Date.now(),
        },
      ],
      message: 'Found and fixed the error in your code',
    };
  }

  private getCodeExplainResponse(): AgentResult {
    return {
      success: true,
      actions: [
        {
          id: 'mock-action-3',
          agentId: 'code',
          type: 'code_explain',
          title: '💡 Code Explanation',
          description: 'Detailed explanation of the useEffect hook in your code',
          payload: {
            summary: 'This useEffect hook fetches data when the component mounts',
            breakdown: [
              'The empty dependency array [] means it runs once on mount',
              'setLoading(true) shows loading state',
              'fetchData() retrieves the data',
              'setData() updates state with results',
            ],
            concepts: ['React Hooks', 'useEffect', 'Data Fetching', 'Side Effects'],
          },
          confidence: 0.92,
          status: 'pending',
          createdAt: Date.now(),
        },
      ],
      message: 'Here is an explanation of your code',
    };
  }

  private getSearchResponse(): AgentResult {
    return {
      success: true,
      actions: [
        {
          id: 'mock-action-4',
          agentId: 'research',
          type: 'web_search',
          title: '🔍 Search Results',
          description: 'Found 5 relevant resources for your query',
          payload: {
            results: [
              {
                title: 'React Documentation - Hooks API',
                url: 'https://react.dev/reference/react',
                description: 'Official React documentation',
              },
              {
                title: 'Understanding useEffect',
                url: 'https://overreacted.io/a-complete-guide-to-useeffect/',
                description: 'In-depth guide by Dan Abramov',
              },
            ],
          },
          confidence: 0.88,
          status: 'pending',
          createdAt: Date.now(),
        },
      ],
      message: 'Found relevant resources for your search',
    };
  }

  private getMessageResponse(): AgentResult {
    return {
      success: true,
      actions: [
        {
          id: 'mock-action-5',
          agentId: 'communication',
          type: 'draft_message',
          title: '✉️ Draft Message',
          description: 'Drafted a message for your team',
          payload: {
            recipient: 'team',
            draft: 'Hi team,\n\nQuick update: I\'ve fixed the bug we discussed earlier. The issue was related to null pointer exceptions when accessing nested properties.\n\nThe fix is now ready for review. Let me know if you have any questions!\n\nBest regards',
            shortVersion: 'Bug fix ready for review!',
          },
          confidence: 0.85,
          status: 'pending',
          createdAt: Date.now(),
        },
      ],
      message: 'Drafted a message for your team',
    };
  }

  private getDefaultResponse(): AgentResult {
    return {
      success: true,
      actions: [
        {
          id: 'mock-action-default',
          agentId: 'meta',
          type: 'explain',
          title: '🤖 RIME Assistant',
          description: 'How can I help you today?',
          payload: {
            suggestions: [
              'Fix errors in your code',
              'Explain how something works',
              'Search for documentation',
              'Draft a message',
            ],
          },
          confidence: 0.7,
          status: 'pending',
          createdAt: Date.now(),
        },
      ],
      message: 'Here are some things I can help with',
    };
  }
}
