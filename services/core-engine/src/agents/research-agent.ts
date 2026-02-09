// ============================================
// RIME Core Engine - Research Agent
// ============================================

import { Logger } from 'winston';
import { BaseAgent } from './base-agent';
import { GeminiClient } from '../integrations/gemini-client';
import { UserIntent, ScreenContext, AgentResult, Action } from '../types';

export class ResearchAgent extends BaseAgent {
  private geminiClient: GeminiClient;

  constructor(geminiClient: GeminiClient, logger: Logger) {
    super(
      {
        id: 'research',
        name: 'Research Agent',
        description: 'Searches the web, documentation, and code repositories for information',
        capabilities: [
          'web_search',
          'documentation_lookup',
          'stackoverflow_search',
          'github_issues_search',
          'code_examples',
        ],
      },
      logger
    );
    this.geminiClient = geminiClient;
  }

  async canHandle(intent: UserIntent): Promise<boolean> {
    const triggers = [
      'search',
      'find',
      'look up',
      'how to',
      'what is',
      'explain',
      'documentation',
      'docs',
      'example',
      'tutorial',
      'guide',
      'reference',
      'stackoverflow',
      'github',
      'issue',
      'error meaning',
      'best practice',
      'pattern',
    ];

    return this.hasKeywords(intent.query.toLowerCase(), triggers);
  }

  async getConfidence(intent: UserIntent, context: ScreenContext): Promise<number> {
    let confidence = 0.5;
    const query = intent.query.toLowerCase();

    // Strong indicators
    if (query.includes('search') || query.includes('find')) confidence += 0.3;
    if (query.includes('documentation') || query.includes('docs')) confidence += 0.3;
    if (query.includes('how to') || query.includes('tutorial')) confidence += 0.2;
    if (query.includes('stackoverflow')) confidence += 0.3;
    if (query.includes('github')) confidence += 0.2;

    // Context-based confidence
    if (context.visionAnalysis.browserContext?.pageType === 'documentation') {
      confidence += 0.2;
    }

    // Reduce confidence if code context is strong (Code Agent should handle)
    if (context.visionAnalysis.codeContext && 
        (query.includes('fix') || query.includes('error'))) {
      confidence -= 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  async execute(intent: UserIntent, context: ScreenContext): Promise<AgentResult> {
    this.logExecutionStart(intent);

    try {
      const query = intent.query;
      const actions: Action[] = [];

      // Determine what type of research to perform
      if (this.shouldSearchWeb(query, context)) {
        const webSearchAction = await this.performWebSearch(query, context);
        actions.push(webSearchAction);
      }

      if (this.shouldSearchDocs(query, context)) {
        const docsAction = await this.searchDocumentation(query, context);
        actions.push(docsAction);
      }

      if (this.shouldSearchStackOverflow(query, context)) {
        const soAction = await this.searchStackOverflow(query, context);
        actions.push(soAction);
      }

      if (this.shouldSearchGitHub(query, context)) {
        const githubAction = await this.searchGitHub(query, context);
        actions.push(githubAction);
      }

      // If no specific search type, do a general web search
      if (actions.length === 0) {
        const generalSearch = await this.performWebSearch(query, context);
        actions.push(generalSearch);
      }

      this.logExecutionComplete(intent, true);

      return this.createSuccessResult(
        actions,
        `Found ${actions.length} relevant resource(s) for your query`
      );

    } catch (error) {
      this.logExecutionComplete(intent, false);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Research failed',
        'Failed to complete research'
      );
    }
  }

  private shouldSearchWeb(query: string, context: ScreenContext): boolean {
    const webTriggers = ['search', 'find', 'look up', 'what is', 'how does'];
    return this.hasKeywords(query.toLowerCase(), webTriggers);
  }

  private shouldSearchDocs(query: string, context: ScreenContext): boolean {
    const docTriggers = ['documentation', 'docs', 'reference', 'api', 'guide'];
    return this.hasKeywords(query.toLowerCase(), docTriggers) ||
           context.visionAnalysis.browserContext?.pageType === 'documentation';
  }

  private shouldSearchStackOverflow(query: string, context: ScreenContext): boolean {
    const soTriggers = ['stackoverflow', 'error', 'bug', 'issue', 'problem'];
    return this.hasKeywords(query.toLowerCase(), soTriggers);
  }

  private shouldSearchGitHub(query: string, context: ScreenContext): boolean {
    const ghTriggers = ['github', 'repo', 'repository', 'source code', 'implementation'];
    return this.hasKeywords(query.toLowerCase(), ghTriggers);
  }

  private async performWebSearch(query: string, context: ScreenContext): Promise<Action> {
    this.logger.info(`Performing web search for: ${query}`);

    // Use Gemini to generate search results (in production, use Serper API or similar)
    const searchPrompt = `
      You are a research assistant. Given the user query "${query}", 
      provide 3-5 relevant search results with titles, URLs, and brief descriptions.
      Format as JSON array: [{"title": "...", "url": "...", "description": "..."}]
    `;

    let searchResults = [];
    try {
      const response = await this.geminiClient.generateText(searchPrompt);
      // Try to parse JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        searchResults = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      this.logger.warn('Failed to parse search results, using fallback');
      searchResults = this.getFallbackSearchResults(query);
    }

    return this.createAction(
      'web_search',
      '🔍 Web Search Results',
      `Found ${searchResults.length} relevant resources for "${query}"`,
      {
        query,
        results: searchResults,
        source: 'web',
      },
      0.85
    );
  }

  private async searchDocumentation(query: string, context: ScreenContext): Promise<Action> {
    this.logger.info(`Searching documentation for: ${query}`);

    // Extract technology/framework from context
    const tech = this.extractTechnology(context);

    const docsPrompt = `
      You are a documentation assistant. Given the query "${query}" 
      ${tech ? `about ${tech}` : ''}, provide relevant documentation links 
      and code examples. Format as JSON: {"links": [...], "examples": [...]}
    `;

    let docsResult = { links: [], examples: [] };
    try {
      const response = await this.geminiClient.generateText(docsPrompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        docsResult = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      this.logger.warn('Failed to parse docs results, using fallback');
      docsResult = this.getFallbackDocs(query, tech);
    }

    return this.createAction(
      'explain',
      '📚 Documentation & Examples',
      `Found documentation and code examples for "${query}"`,
      {
        query,
        technology: tech,
        ...docsResult,
      },
      0.8
    );
  }

  private async searchStackOverflow(query: string, context: ScreenContext): Promise<Action> {
    this.logger.info(`Searching Stack Overflow for: ${query}`);

    const soPrompt = `
      You are a Stack Overflow researcher. Given the error/query "${query}",
      provide 2-3 relevant Stack Overflow answers with explanations.
      Format as JSON array: [{"title": "...", "answer": "...", "code": "..."}]
    `;

    let soResults = [];
    try {
      const response = await this.geminiClient.generateText(soPrompt);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        soResults = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      this.logger.warn('Failed to parse SO results, using fallback');
      soResults = this.getFallbackSO(query);
    }

    return this.createAction(
      'web_search',
      '💬 Stack Overflow Solutions',
      `Found ${soResults.length} relevant solutions`,
      {
        query,
        results: soResults,
        source: 'stackoverflow',
      },
      0.82
    );
  }

  private async searchGitHub(query: string, context: ScreenContext): Promise<Action> {
    this.logger.info(`Searching GitHub for: ${query}`);

    const ghPrompt = `
      You are a GitHub researcher. Given the query "${query}",
      suggest 2-3 relevant repositories or code examples.
      Format as JSON array: [{"repo": "...", "description": "...", "stars": "..."}]
    `;

    let ghResults = [];
    try {
      const response = await this.geminiClient.generateText(ghPrompt);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        ghResults = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      this.logger.warn('Failed to parse GitHub results, using fallback');
      ghResults = this.getFallbackGitHub(query);
    }

    return this.createAction(
      'web_search',
      '🐙 GitHub Resources',
      `Found ${ghResults.length} relevant repositories`,
      {
        query,
        results: ghResults,
        source: 'github',
      },
      0.78
    );
  }

  private extractTechnology(context: ScreenContext): string | null {
    const lang = context.visionAnalysis.codeContext?.language;
    if (lang) return lang;

    const url = context.visionAnalysis.browserContext?.url || '';
    if (url.includes('react')) return 'React';
    if (url.includes('vue')) return 'Vue';
    if (url.includes('angular')) return 'Angular';
    if (url.includes('nodejs') || url.includes('node.js')) return 'Node.js';
    if (url.includes('python')) return 'Python';
    if (url.includes('typescript')) return 'TypeScript';

    return null;
  }

  private getFallbackSearchResults(query: string): any[] {
    return [
      {
        title: `Search results for "${query}"`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        description: 'Google search results for your query',
      },
      {
        title: 'Related Documentation',
        url: 'https://developer.mozilla.org',
        description: 'MDN Web Docs - comprehensive web development resource',
      },
    ];
  }

  private getFallbackDocs(query: string, tech: string | null): any {
    return {
      links: [
        { title: 'Official Documentation', url: '#' },
        { title: 'API Reference', url: '#' },
      ],
      examples: [
        { title: 'Basic Example', code: '// Example code would appear here' },
      ],
    };
  }

  private getFallbackSO(query: string): any[] {
    return [
      {
        title: 'Related Stack Overflow Question',
        answer: 'Check Stack Overflow for community solutions to similar problems.',
        code: '// See Stack Overflow for code examples',
      },
    ];
  }

  private getFallbackGitHub(query: string): any[] {
    return [
      {
        repo: 'example/repository',
        description: 'Relevant example repository',
        stars: '1k+',
      },
    ];
  }
}
