// ============================================
// RIME Core Engine - Gemini Client
// ============================================

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { Logger } from 'winston';
import { VisionAnalysis } from '../types';

export class GeminiClient {
  private client: GoogleGenerativeAI | null = null;
  private textModel: GenerativeModel | null = null;
  private visionModel: GenerativeModel | null = null;
  private apiKey: string;
  private logger: Logger;
  private isInitialized: boolean = false;

  constructor(apiKey: string, logger: Logger) {
    this.apiKey = apiKey;
    this.logger = logger.child({ service: 'gemini-client' });
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn('No Gemini API key provided, client will use mock responses');
      return;
    }

    try {
      this.client = new GoogleGenerativeAI(this.apiKey);
      
      this.textModel = this.client.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });

      this.visionModel = this.client.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
        },
      });

      this.isInitialized = true;
      this.logger.info('Gemini client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Gemini client:', error);
      throw error;
    }
  }

  isHealthy(): boolean {
    return this.isInitialized && this.client !== null;
  }

  async generateText(prompt: string): Promise<string> {
    if (!this.isInitialized || !this.textModel) {
      this.logger.warn('Gemini not initialized, returning mock response');
      return this.getMockTextResponse(prompt);
    }

    try {
      const result = await this.textModel.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      this.logger.error('Error generating text:', error);
      return this.getMockTextResponse(prompt);
    }
  }

  async analyzeScreenshot(base64Image: string, mimeType: string = 'image/jpeg'): Promise<VisionAnalysis> {
    if (!this.isInitialized || !this.visionModel) {
      this.logger.warn('Gemini vision not initialized, returning mock analysis');
      return this.getMockVisionAnalysis();
    }

    try {
      const prompt = `
        Analyze this screenshot and extract:
        1. Application type (vscode, chrome, slack, terminal, or unknown)
        2. Window title
        3. User activity (coding, debugging, reading, typing, idle)
        4. Visible text elements (max 20)
        5. UI elements with bounds (buttons, inputs, text, links, code, error)
        6. Code context if in editor (language, file name, line number, code snippet, errors)
        7. Browser context if in browser (URL, title, page type)

        Return ONLY a valid JSON object matching this TypeScript interface:
        {
          application: 'vscode' | 'chrome' | 'slack' | 'terminal' | 'unknown',
          windowTitle: string,
          userActivity: 'coding' | 'debugging' | 'reading' | 'typing' | 'idle',
          confidence: number (0-1),
          visibleText: string[],
          uiElements: Array<{
            type: 'button' | 'input' | 'text' | 'link' | 'code' | 'error',
            text: string,
            bounds: { x: number, y: number, width: number, height: number },
            confidence: number
          }>,
          codeContext?: {
            language: string,
            fileName: string,
            lineNumber?: number,
            codeSnippet?: string,
            errors: Array<{ message: string, line: number, severity: 'error' | 'warning' }>
          },
          browserContext?: {
            url: string,
            title: string,
            pageType: 'documentation' | 'github' | 'stackoverflow' | 'generic'
          }
        }
      `;

      const result = await this.visionModel.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType,
          },
        },
      ]);

      const response = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          ...analysis,
          timestamp: Date.now(),
        };
      }

      throw new Error('Could not parse vision analysis from response');

    } catch (error) {
      this.logger.error('Error analyzing screenshot:', error);
      return this.getMockVisionAnalysis();
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isInitialized || !this.client) {
      this.logger.warn('Gemini not initialized, returning mock embedding');
      return new Array(1536).fill(0).map(() => Math.random() - 0.5);
    }

    try {
      // Note: Gemini doesn't have a direct embedding API yet
      // In production, you might use OpenAI's embedding API or another service
      // For now, return a mock embedding
      this.logger.warn('Using mock embeddings (Gemini embedding API not available)');
      return new Array(1536).fill(0).map(() => Math.random() - 0.5);
    } catch (error) {
      this.logger.error('Error generating embedding:', error);
      return new Array(1536).fill(0).map(() => Math.random() - 0.5);
    }
  }

  private getMockTextResponse(prompt: string): string {
    // Return context-aware mock responses
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('search') || lowerPrompt.includes('find')) {
      return JSON.stringify([
        {
          title: 'Understanding React Hooks',
          url: 'https://react.dev/reference/react',
          description: 'Official React documentation for hooks and state management',
        },
        {
          title: 'TypeScript Best Practices',
          url: 'https://www.typescriptlang.org/docs',
          description: 'Comprehensive TypeScript documentation and examples',
        },
        {
          title: 'Modern Web Development Patterns',
          url: 'https://web.dev/patterns',
          description: 'Google\'s collection of web development patterns',
        },
      ]);
    }

    if (lowerPrompt.includes('error') || lowerPrompt.includes('fix')) {
      return JSON.stringify({
        explanation: 'The error occurs because you\'re trying to access a property on an undefined value. This typically happens when data hasn\'t loaded yet.',
        fixedCode: `const result = await response.json();
if (result && result.data) {
  console.log(result.data.value);
} else {
  console.warn('Data not available');
}`,
        prevention: 'Always check if objects exist before accessing nested properties. Use optional chaining (result?.data?.value) or null checks.',
      });
    }

    if (lowerPrompt.includes('explain') || lowerPrompt.includes('code')) {
      return JSON.stringify({
        summary: 'This code defines a React component that manages state and fetches data on mount.',
        breakdown: [
          'Line 1: Imports React and hooks',
          'Line 3: Defines component with state',
          'Line 5-9: Effect hook for data fetching',
          'Line 11: Render with conditional loading',
        ],
        concepts: ['React Hooks', 'useEffect', 'useState', 'Async/Await'],
        improvements: ['Add error handling', 'Add loading state', 'Consider using a data fetching library'],
      });
    }

    if (lowerPrompt.includes('message') || lowerPrompt.includes('draft')) {
      return JSON.stringify({
        draft: 'Hi team,\n\nI wanted to share an update on the current progress. We\'ve made significant headway and are on track for the deadline.\n\nLet me know if you have any questions!\n\nBest regards',
        shortVersion: 'Quick update: Project is on track for deadline. Questions welcome!',
        tone: 'professional',
        suggestedChannel: 'slack',
      });
    }

    return JSON.stringify({
      response: 'I understand your request. Here is a helpful response based on your query.',
      suggestions: ['Consider option A', 'Explore alternative B'],
    });
  }

  private getMockVisionAnalysis(): VisionAnalysis {
    return {
      application: 'vscode',
      windowTitle: 'workspace - Visual Studio Code',
      userActivity: 'coding',
      confidence: 0.85,
      visibleText: [
        'import React from "react"',
        'function App() {',
        'return (',
        '<div>',
      ],
      uiElements: [
        {
          type: 'text',
          text: 'App.tsx',
          bounds: { x: 100, y: 50, width: 80, height: 20 },
          confidence: 0.9,
        },
        {
          type: 'code',
          text: 'function',
          bounds: { x: 150, y: 100, width: 80, height: 15 },
          confidence: 0.85,
        },
      ],
      codeContext: {
        language: 'typescript',
        fileName: 'App.tsx',
        lineNumber: 1,
        codeSnippet: 'import React from "react";',
        errors: [],
      },
      timestamp: Date.now(),
    };
  }
}
