// ============================================
// RIME Core Engine - Screen Capture Client
// ============================================

import { Logger } from 'winston';
import { ScreenContext, VisionAnalysis } from '../types';
import { config } from '../config';

export class ScreenCaptureClient {
  private baseUrl: string;
  private logger: Logger;
  private lastContext: ScreenContext | null = null;
  private cacheExpiry: number = 2000; // 2 seconds
  private lastFetchTime: number = 0;

  constructor(baseUrl: string, logger: Logger) {
    this.baseUrl = baseUrl;
    this.logger = logger.child({ service: 'screen-capture' });
  }

  async getLatestContext(): Promise<ScreenContext> {
    const now = Date.now();
    
    // Return cached context if still valid
    if (this.lastContext && (now - this.lastFetchTime) < this.cacheExpiry) {
      return this.lastContext;
    }

    try {
      // Try to fetch from screen service
      const response = await fetch(`${this.baseUrl}/capture/latest`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Screen service returned ${response.status}`);
      }

      const data = await response.json();
      
      const context: ScreenContext = {
        screenshot: data.screenshot,
        visionAnalysis: data.visionAnalysis || this.createDefaultVisionAnalysis(),
        timestamp: Date.now(),
        sessionId: 'default',
      };

      this.lastContext = context;
      this.lastFetchTime = now;

      return context;

    } catch (error) {
      this.logger.warn('Failed to fetch from screen service, using mock:', error);
      
      // Return mock context if service is unavailable
      const mockContext = this.getMockContext();
      this.lastContext = mockContext;
      this.lastFetchTime = now;
      
      return mockContext;
    }
  }

  async captureScreenshot(): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/capture`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Screen service returned ${response.status}`);
      }

      const data = await response.json();
      return data.screenshot || null;

    } catch (error) {
      this.logger.warn('Failed to capture screenshot:', error);
      return null;
    }
  }

  async getHealth(): Promise<'healthy' | 'unhealthy'> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      });
      return response.ok ? 'healthy' : 'unhealthy';
    } catch {
      return 'unhealthy';
    }
  }

  private createDefaultVisionAnalysis(): VisionAnalysis {
    return {
      application: 'unknown',
      windowTitle: 'Unknown',
      userActivity: 'idle',
      confidence: 0,
      visibleText: [],
      uiElements: [],
      timestamp: Date.now(),
    };
  }

  private getMockContext(): ScreenContext {
    // Return different mock contexts based on scenario
    const scenario = config.mockScenario;

    switch (scenario) {
      case 'coding':
        return this.getCodingMockContext();
      case 'debugging':
        return this.getDebuggingMockContext();
      case 'researching':
        return this.getResearchingMockContext();
      case 'communicating':
        return this.getCommunicatingMockContext();
      default:
        return this.getCodingMockContext();
    }
  }

  private getCodingMockContext(): ScreenContext {
    return {
      visionAnalysis: {
        application: 'vscode',
        windowTitle: 'App.tsx - rime-dashboard',
        userActivity: 'coding',
        confidence: 0.92,
        visibleText: [
          'import React, { useState, useEffect } from "react";',
          'export const Dashboard = () => {',
          'const [loading, setLoading] = useState(false);',
          'return (',
          '<div className="dashboard">',
        ],
        uiElements: [
          { type: 'text', text: 'App.tsx', bounds: { x: 100, y: 50, width: 80, height: 20 }, confidence: 0.95 },
          { type: 'code', text: 'useState', bounds: { x: 200, y: 150, width: 60, height: 15 }, confidence: 0.9 },
        ],
        codeContext: {
          language: 'typescript',
          fileName: 'App.tsx',
          lineNumber: 15,
          codeSnippet: `const [data, setData] = useState<Data | null>(null);`,
          errors: [],
        },
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      sessionId: 'mock-session',
    };
  }

  private getDebuggingMockContext(): ScreenContext {
    return {
      visionAnalysis: {
        application: 'vscode',
        windowTitle: 'api.ts - rime-core',
        userActivity: 'debugging',
        confidence: 0.88,
        visibleText: [
          'TypeError: Cannot read property',
          'of undefined',
          'at fetchData (api.ts:23)',
          'console.log(data.value)',
        ],
        uiElements: [
          { type: 'error', text: 'TypeError', bounds: { x: 50, y: 200, width: 100, height: 20 }, confidence: 0.95 },
          { type: 'text', text: 'api.ts', bounds: { x: 100, y: 50, width: 60, height: 20 }, confidence: 0.9 },
        ],
        codeContext: {
          language: 'typescript',
          fileName: 'api.ts',
          lineNumber: 23,
          codeSnippet: `const result = await response.json();
console.log(result.data.value);`,
          errors: [
            {
              message: "Cannot read property 'value' of undefined",
              line: 23,
              severity: 'error',
            },
          ],
        },
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      sessionId: 'mock-session',
    };
  }

  private getResearchingMockContext(): ScreenContext {
    return {
      visionAnalysis: {
        application: 'chrome',
        windowTitle: 'React useEffect Hook - React Documentation',
        userActivity: 'researching',
        confidence: 0.85,
        visibleText: [
          'useEffect',
          'React Hook that lets you',
          'synchronize a component',
          'with an external system',
        ],
        uiElements: [
          { type: 'text', text: 'useEffect', bounds: { x: 100, y: 100, width: 100, height: 30 }, confidence: 0.95 },
          { type: 'link', text: 'Documentation', bounds: { x: 50, y: 50, width: 120, height: 20 }, confidence: 0.9 },
        ],
        browserContext: {
          url: 'https://react.dev/reference/react/useEffect',
          title: 'React useEffect Hook - React Documentation',
          pageType: 'documentation',
        },
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      sessionId: 'mock-session',
    };
  }

  private getCommunicatingMockContext(): ScreenContext {
    return {
      visionAnalysis: {
        application: 'slack',
        windowTitle: '#general - RIME Team',
        userActivity: 'communicating',
        confidence: 0.9,
        visibleText: [
          '#general',
          'Sarah: Hey team, how is the',
          'progress on the new feature?',
          'John: Working on it!',
        ],
        uiElements: [
          { type: 'text', text: '#general', bounds: { x: 50, y: 50, width: 80, height: 25 }, confidence: 0.95 },
          { type: 'input', text: 'Message #general', bounds: { x: 100, y: 500, width: 400, height: 40 }, confidence: 0.9 },
        ],
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      sessionId: 'mock-session',
    };
  }
}
