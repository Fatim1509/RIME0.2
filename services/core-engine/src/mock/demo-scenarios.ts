// ============================================
// RIME Core Engine - Demo Scenarios
// ============================================

import { ScreenContext, VisionAnalysis, UserIntent, AgentResult } from '../types';

export interface DemoScenario {
  name: string;
  description: string;
  context: ScreenContext;
  intent: UserIntent;
  expectedResult: AgentResult;
}

export const demoScenarios: Record<string, DemoScenario> = {
  errorFix: {
    name: 'Error Fix Scenario',
    description: 'VS Code with React TypeScript error',
    context: {
      visionAnalysis: {
        application: 'vscode',
        windowTitle: 'Component.tsx - my-project',
        userActivity: 'debugging',
        confidence: 0.92,
        visibleText: [
          'TypeError: Cannot read property',
          "'map' of undefined",
          'const items = data.map(item =>',
        ],
        uiElements: [
          {
            type: 'error',
            text: 'TypeError',
            bounds: { x: 50, y: 200, width: 100, height: 20 },
            confidence: 0.95,
          },
        ],
        codeContext: {
          language: 'typescript',
          fileName: 'Component.tsx',
          lineNumber: 15,
          codeSnippet: `const items = data.map(item => <Item key={item.id} {...item} />);`,
          errors: [
            {
              message: "Cannot read property 'map' of undefined",
              line: 15,
              severity: 'error',
            },
          ],
        },
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      sessionId: 'demo-error-fix',
    },
    intent: {
      id: 'demo-intent-1',
      query: 'fix this error',
      type: 'natural_language',
      userId: 'demo-user',
      sessionId: 'demo-error-fix',
      timestamp: Date.now(),
    },
    expectedResult: {
      success: true,
      actions: [
        {
          id: 'demo-action-1',
          agentId: 'code',
          type: 'code_fix',
          title: '🔧 Fix Type Error',
          description: 'Add null check before calling map()',
          payload: {
            originalCode: `const items = data.map(item => <Item key={item.id} {...item} />);`,
            fixedCode: `const items = data?.map(item => <Item key={item.id} {...item} />) ?? [];`,
            explanation: 'Using optional chaining (?.) and nullish coalescing (??) ensures safe access',
          },
          confidence: 0.95,
          status: 'pending',
          createdAt: Date.now(),
        },
      ],
      message: 'Fixed the TypeError in your code',
    },
  },

  codeReview: {
    name: 'Code Review Scenario',
    description: 'VS Code with useEffect hook to review',
    context: {
      visionAnalysis: {
        application: 'vscode',
        windowTitle: 'useData.ts - my-project',
        userActivity: 'coding',
        confidence: 0.88,
        visibleText: [
          'useEffect(() => {',
          'fetch("/api/data")',
          '.then(res => res.json())',
          '.then(setData)',
          '}, [])',
        ],
        uiElements: [
          {
            type: 'code',
            text: 'useEffect',
            bounds: { x: 100, y: 100, width: 80, height: 20 },
            confidence: 0.9,
          },
        ],
        codeContext: {
          language: 'typescript',
          fileName: 'useData.ts',
          lineNumber: 10,
          codeSnippet: `useEffect(() => {
  fetch("/api/data")
    .then(res => res.json())
    .then(setData);
}, []);`,
          errors: [],
        },
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      sessionId: 'demo-code-review',
    },
    intent: {
      id: 'demo-intent-2',
      query: 'explain this useEffect',
      type: 'natural_language',
      userId: 'demo-user',
      sessionId: 'demo-code-review',
      timestamp: Date.now(),
    },
    expectedResult: {
      success: true,
      actions: [
        {
          id: 'demo-action-2',
          agentId: 'code',
          type: 'code_explain',
          title: '💡 useEffect Explanation',
          description: 'How this data fetching effect works',
          payload: {
            summary: 'This effect fetches data from an API when the component mounts',
            breakdown: [
              'Empty dependency array [] means run once on mount',
              'fetch() makes the HTTP request',
              '.then() chains handle the async response',
              'setData updates component state with results',
            ],
            improvements: [
              'Add error handling with .catch()',
              'Add loading state management',
              'Consider using async/await for readability',
              'Add cleanup for component unmount',
            ],
          },
          confidence: 0.92,
          status: 'pending',
          createdAt: Date.now(),
        },
      ],
      message: 'Here is an explanation of the useEffect hook',
    },
  },

  research: {
    name: 'Research Scenario',
    description: 'Chrome on StackOverflow looking for solutions',
    context: {
      visionAnalysis: {
        application: 'chrome',
        windowTitle: 'How to use React hooks - Stack Overflow',
        userActivity: 'researching',
        confidence: 0.85,
        visibleText: [
          'useState vs useReducer',
          'When should I use one over the other?',
          'Best practices for state management',
        ],
        uiElements: [
          {
            type: 'text',
            text: 'Stack Overflow',
            bounds: { x: 50, y: 50, width: 120, height: 25 },
            confidence: 0.95,
          },
        ],
        browserContext: {
          url: 'https://stackoverflow.com/questions/react-hooks',
          title: 'How to use React hooks - Stack Overflow',
          pageType: 'stackoverflow',
        },
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      sessionId: 'demo-research',
    },
    intent: {
      id: 'demo-intent-3',
      query: 'search for useReducer examples',
      type: 'natural_language',
      userId: 'demo-user',
      sessionId: 'demo-research',
      timestamp: Date.now(),
    },
    expectedResult: {
      success: true,
      actions: [
        {
          id: 'demo-action-3',
          agentId: 'research',
          type: 'web_search',
          title: '🔍 useReducer Examples',
          description: 'Found 5 relevant resources',
          payload: {
            results: [
              {
                title: 'React useReducer Hook Guide',
                url: 'https://react.dev/reference/react/useReducer',
                description: 'Official React documentation',
              },
              {
                title: 'useReducer vs useState',
                url: 'https://blog.reactjs.org',
                description: 'When to use each hook',
              },
            ],
          },
          confidence: 0.88,
          status: 'pending',
          createdAt: Date.now(),
        },
      ],
      message: 'Found relevant resources for useReducer',
    },
  },

  communication: {
    name: 'Communication Scenario',
    description: 'Slack open, need to message team about bug fix',
    context: {
      visionAnalysis: {
        application: 'slack',
        windowTitle: '#dev-team - Slack',
        userActivity: 'communicating',
        confidence: 0.9,
        visibleText: [
          '#dev-team',
          'Sarah: Has anyone seen the bug in production?',
          'Mike: Looking into it now',
        ],
        uiElements: [
          {
            type: 'text',
            text: '#dev-team',
            bounds: { x: 50, y: 50, width: 100, height: 25 },
            confidence: 0.95,
          },
          {
            type: 'input',
            text: 'Message #dev-team',
            bounds: { x: 100, y: 500, width: 400, height: 40 },
            confidence: 0.9,
          },
        ],
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      sessionId: 'demo-communication',
    },
    intent: {
      id: 'demo-intent-4',
      query: 'tell the team I fixed the bug',
      type: 'natural_language',
      userId: 'demo-user',
      sessionId: 'demo-communication',
      timestamp: Date.now(),
    },
    expectedResult: {
      success: true,
      actions: [
        {
          id: 'demo-action-4',
          agentId: 'communication',
          type: 'draft_message',
          title: '✉️ Bug Fix Update',
          description: 'Drafted message for #dev-team',
          payload: {
            recipient: '#dev-team',
            draft: 'Hey team! 👋\n\nGood news - I\'ve fixed the production bug we were seeing. The issue was a race condition in the data fetching logic.\n\nThe fix has been deployed to staging and is ready for testing. Let me know if you see any issues!\n\nThanks!',
            shortVersion: 'Bug fix deployed to staging! 🎉',
            tone: 'casual',
          },
          confidence: 0.87,
          status: 'pending',
          createdAt: Date.now(),
        },
      ],
      message: 'Drafted a message for your team',
    },
  },
};

export function getDemoScenario(name: string): DemoScenario | null {
  return demoScenarios[name] || null;
}

export function getAllDemoScenarios(): DemoScenario[] {
  return Object.values(demoScenarios);
}

export function getDemoScenarioNames(): string[] {
  return Object.keys(demoScenarios);
}
