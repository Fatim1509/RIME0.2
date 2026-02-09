// ============================================
// RIME Core Engine - Code Agent
// ============================================

import { Logger } from 'winston';
import { BaseAgent } from './base-agent';
import { GeminiClient } from '../integrations/gemini-client';
import { VectorStore } from '../memory/vector-store';
import { UserIntent, ScreenContext, AgentResult, Action, CodeError } from '../types';

export class CodeAgent extends BaseAgent {
  private geminiClient: GeminiClient;
  private vectorStore: VectorStore;

  constructor(geminiClient: GeminiClient, vectorStore: VectorStore, logger: Logger) {
    super(
      {
        id: 'code',
        name: 'Code Agent',
        description: 'Analyzes code, suggests fixes, explains concepts, and generates code',
        capabilities: [
          'error_analysis',
          'code_fix',
          'code_explanation',
          'code_generation',
          'refactoring',
          'style_check',
          'best_practices',
        ],
      },
      logger
    );
    this.geminiClient = geminiClient;
    this.vectorStore = vectorStore;
  }

  async canHandle(intent: UserIntent): Promise<boolean> {
    const triggers = [
      'fix',
      'error',
      'bug',
      'explain',
      'code',
      'function',
      'refactor',
      'optimize',
      'improve',
      'review',
      'debug',
      'syntax',
      'compile',
      'type',
      'import',
      'export',
      'variable',
      'const',
      'let',
      'function',
      'class',
      'component',
      'hook',
      'async',
      'await',
      'promise',
      'callback',
    ];

    return this.hasKeywords(intent.query.toLowerCase(), triggers);
  }

  async getConfidence(intent: UserIntent, context: ScreenContext): Promise<number> {
    let confidence = 0.5;
    const query = intent.query.toLowerCase();

    // Strong code indicators
    if (query.includes('fix') || query.includes('error')) confidence += 0.3;
    if (query.includes('explain') && context.visionAnalysis.codeContext) confidence += 0.3;
    if (query.includes('refactor') || query.includes('optimize')) confidence += 0.2;

    // Context-based confidence
    if (context.visionAnalysis.application === 'vscode') {
      confidence += 0.2;
    }

    if (context.visionAnalysis.codeContext) {
      confidence += 0.2;

      // Higher confidence if there are errors and user is asking for help
      if (context.visionAnalysis.codeContext.errors.length > 0 &&
          (query.includes('fix') || query.includes('error'))) {
        confidence += 0.2;
      }
    }

    // User activity
    if (context.visionAnalysis.userActivity === 'debugging') {
      confidence += 0.15;
    }

    return Math.min(confidence, 1.0);
  }

  async execute(intent: UserIntent, context: ScreenContext): Promise<AgentResult> {
    this.logExecutionStart(intent);

    try {
      const query = intent.query.toLowerCase();
      const codeContext = context.visionAnalysis.codeContext;
      const actions: Action[] = [];

      // Determine what type of code assistance to provide
      if (this.shouldFixErrors(query, context)) {
        const fixAction = await this.generateCodeFix(intent, context);
        actions.push(fixAction);
      }

      if (this.shouldExplainCode(query, context)) {
        const explainAction = await this.explainCode(intent, context);
        actions.push(explainAction);
      }

      if (this.shouldRefactor(query, context)) {
        const refactorAction = await this.refactorCode(intent, context);
        actions.push(refactorAction);
      }

      if (this.shouldGenerateCode(query, context)) {
        const generateAction = await this.generateCode(intent, context);
        actions.push(generateAction);
      }

      // If no specific action determined, provide general code assistance
      if (actions.length === 0) {
        const generalAction = await this.provideGeneralAssistance(intent, context);
        actions.push(generalAction);
      }

      this.logExecutionComplete(intent, true);

      return this.createSuccessResult(
        actions,
        `Generated ${actions.length} code-related action(s)`
      );

    } catch (error) {
      this.logExecutionComplete(intent, false);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Code analysis failed',
        'Failed to analyze code'
      );
    }
  }

  private shouldFixErrors(query: string, context: ScreenContext): boolean {
    const fixTriggers = ['fix', 'solve', 'resolve', 'correct', 'debug'];
    const hasErrors = context.visionAnalysis.codeContext?.errors.length > 0;
    return (this.hasKeywords(query, fixTriggers) && hasErrors) ||
           (query.includes('fix this') && hasErrors);
  }

  private shouldExplainCode(query: string, context: ScreenContext): boolean {
    const explainTriggers = ['explain', 'what does', 'how does', 'understand', 'clarify'];
    return this.hasKeywords(query, explainTriggers) && 
           !!context.visionAnalysis.codeContext?.codeSnippet;
  }

  private shouldRefactor(query: string, context: ScreenContext): boolean {
    const refactorTriggers = ['refactor', 'improve', 'optimize', 'clean', 'better', 'simplify'];
    return this.hasKeywords(query, refactorTriggers) &&
           !!context.visionAnalysis.codeContext?.codeSnippet;
  }

  private shouldGenerateCode(query: string, context: ScreenContext): boolean {
    const generateTriggers = ['generate', 'create', 'write', 'implement', 'add', 'make'];
    return this.hasKeywords(query, generateTriggers);
  }

  private async generateCodeFix(intent: UserIntent, context: ScreenContext): Promise<Action> {
    this.logger.info('Generating code fix');

    const errors = context.visionAnalysis.codeContext?.errors || [];
    const codeSnippet = context.visionAnalysis.codeContext?.codeSnippet || '';
    const language = context.visionAnalysis.codeContext?.language || 'javascript';

    const fixPrompt = `
      You are an expert code debugger. Given the following ${language} code with errors:

      \`\`\`${language}
      ${codeSnippet}
      \`\`\`

      Errors:
      ${errors.map(e => `- Line ${e.line}: ${e.message} (${e.severity})`).join('\n')}

      Provide:
      1. Explanation of what's wrong
      2. The corrected code
      3. Steps to prevent this error in the future

      Format as JSON: {"explanation": "...", "fixedCode": "...", "prevention": "..."}
    `;

    let fixResult = {
      explanation: 'Analysis of the error',
      fixedCode: codeSnippet,
      prevention: 'Best practices to avoid this error',
    };

    try {
      const response = await this.geminiClient.generateText(fixPrompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        fixResult = { ...fixResult, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      this.logger.warn('Failed to parse fix result, using fallback');
    }

    return this.createAction(
      'code_fix',
      '🔧 Fix Code Errors',
      `Fixed ${errors.length} error(s) in your ${language} code`,
      {
        originalCode: codeSnippet,
        errors,
        ...fixResult,
        language,
      },
      0.92
    );
  }

  private async explainCode(intent: UserIntent, context: ScreenContext): Promise<Action> {
    this.logger.info('Explaining code');

    const codeSnippet = context.visionAnalysis.codeContext?.codeSnippet || '';
    const language = context.visionAnalysis.codeContext?.language || 'javascript';

    const explainPrompt = `
      You are a code explanation expert. Explain the following ${language} code:

      \`\`\`${language}
      ${codeSnippet}
      \`\`\`

      Provide:
      1. High-level summary of what the code does
      2. Line-by-line breakdown of key parts
      3. Any important concepts or patterns used
      4. Potential improvements or considerations

      Format as JSON: {"summary": "...", "breakdown": [...], "concepts": [...], "improvements": [...]}
    `;

    let explanation = {
      summary: 'This code performs a specific function.',
      breakdown: ['Key operation 1', 'Key operation 2'],
      concepts: ['Concept 1', 'Concept 2'],
      improvements: ['Consider this improvement'],
    };

    try {
      const response = await this.geminiClient.generateText(explainPrompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        explanation = { ...explanation, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      this.logger.warn('Failed to parse explanation, using fallback');
    }

    return this.createAction(
      'code_explain',
      '💡 Code Explanation',
      `Detailed explanation of your ${language} code`,
      {
        code: codeSnippet,
        language,
        ...explanation,
      },
      0.88
    );
  }

  private async refactorCode(intent: UserIntent, context: ScreenContext): Promise<Action> {
    this.logger.info('Refactoring code');

    const codeSnippet = context.visionAnalysis.codeContext?.codeSnippet || '';
    const language = context.visionAnalysis.codeContext?.language || 'javascript';

    const refactorPrompt = `
      You are a code refactoring expert. Refactor the following ${language} code:

      \`\`\`${language}
      ${codeSnippet}
      \`\`\`

      Provide:
      1. Refactored code with improvements
      2. List of changes made and why
      3. Benefits of the refactoring

      Format as JSON: {"refactoredCode": "...", "changes": [...], "benefits": [...]}
    `;

    let refactorResult = {
      refactoredCode: codeSnippet,
      changes: ['Improved readability', 'Better performance'],
      benefits: ['Cleaner code', 'Easier maintenance'],
    };

    try {
      const response = await this.geminiClient.generateText(refactorPrompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        refactorResult = { ...refactorResult, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      this.logger.warn('Failed to parse refactor result, using fallback');
    }

    return this.createAction(
      'code_fix',
      '✨ Refactored Code',
      `Improved version of your ${language} code`,
      {
        originalCode: codeSnippet,
        language,
        ...refactorResult,
      },
      0.85
    );
  }

  private async generateCode(intent: UserIntent, context: ScreenContext): Promise<Action> {
    this.logger.info('Generating new code');

    const query = intent.query;
    const language = context.visionAnalysis.codeContext?.language || 'javascript';

    const generatePrompt = `
      You are a code generation expert. Generate ${language} code for:
      "${query}"

      Provide:
      1. Complete, working code
      2. Explanation of how it works
      3. Usage example

      Format as JSON: {"code": "...", "explanation": "...", "usage": "..."}
    `;

    let generatedResult = {
      code: '// Generated code would appear here',
      explanation: 'This code implements the requested functionality.',
      usage: '// Usage example',
    };

    try {
      const response = await this.geminiClient.generateText(generatePrompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedResult = { ...generatedResult, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      this.logger.warn('Failed to parse generated code, using fallback');
    }

    return this.createAction(
      'code_fix',
      '📝 Generated Code',
      `New ${language} code based on your request`,
      {
        request: query,
        language,
        ...generatedResult,
      },
      0.8
    );
  }

  private async provideGeneralAssistance(intent: UserIntent, context: ScreenContext): Promise<Action> {
    this.logger.info('Providing general code assistance');

    const language = context.visionAnalysis.codeContext?.language || 'javascript';

    return this.createAction(
      'explain',
      '💻 Code Assistant',
      `How can I help with your ${language} code?`,
      {
        suggestions: [
          'Explain this code',
          'Fix errors',
          'Refactor for better performance',
          'Generate new code',
          'Check best practices',
        ],
        language,
      },
      0.6
    );
  }
}
