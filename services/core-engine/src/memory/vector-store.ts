// ============================================
// RIME Core Engine - Vector Store (Pinecone)
// ============================================

import { Logger } from 'winston';
import { Memory, MemoryQuery, MemoryType } from '../types';
import { GeminiClient } from '../integrations/gemini-client';

export class VectorStore {
  private apiKey: string | undefined;
  private logger: Logger;
  private isInitialized: boolean = false;
  private localStore: Map<string, Memory> = new Map();
  private geminiClient: GeminiClient | null = null;

  constructor(apiKey: string | undefined, logger: Logger) {
    this.apiKey = apiKey;
    this.logger = logger.child({ service: 'vector-store' });
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn('No Pinecone API key provided, using local memory store');
      this.isInitialized = true;
      return;
    }

    try {
      // In production, initialize Pinecone client here
      // const pinecone = new Pinecone({ apiKey: this.apiKey });
      // this.index = pinecone.index(process.env.PINECONE_INDEX_NAME);
      
      this.logger.info('Vector store initialized (using local fallback)');
      this.isInitialized = true;
    } catch (error) {
      this.logger.error('Failed to initialize vector store:', error);
      // Fall back to local store
      this.isInitialized = true;
    }
  }

  isHealthy(): boolean {
    return this.isInitialized;
  }

  async store(memory: Omit<Memory, 'id' | 'embedding'>): Promise<Memory> {
    const id = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate embedding for the content
    let embedding: number[] | undefined;
    try {
      if (this.geminiClient) {
        embedding = await this.geminiClient.generateEmbedding(memory.content);
      }
    } catch (e) {
      this.logger.warn('Failed to generate embedding, storing without');
    }

    const fullMemory: Memory = {
      ...memory,
      id,
      embedding,
    };

    // Store locally (in production, also store in Pinecone)
    this.localStore.set(id, fullMemory);

    this.logger.debug(`Stored memory: ${id}`, { type: memory.type });

    return fullMemory;
  }

  async query(queryParams: MemoryQuery): Promise<Memory[]> {
    const { query, type, limit = 10, threshold = 0.7 } = queryParams;

    this.logger.debug(`Querying memories: ${query}`, { type, limit });

    // For now, use simple text matching (in production, use vector similarity)
    let results = Array.from(this.localStore.values());

    // Filter by type if specified
    if (type) {
      results = results.filter(m => m.type === type);
    }

    // Simple text-based scoring
    const queryWords = query.toLowerCase().split(/\s+/);
    results = results
      .map(memory => ({
        memory,
        score: this.calculateRelevanceScore(memory, queryWords),
      }))
      .filter(({ score }) => score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ memory }) => memory);

    return results;
  }

  async getById(id: string): Promise<Memory | null> {
    return this.localStore.get(id) || null;
  }

  async delete(id: string): Promise<boolean> {
    const existed = this.localStore.has(id);
    this.localStore.delete(id);
    return existed;
  }

  async update(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    const existing = this.localStore.get(id);
    if (!existing) return null;

    const updated: Memory = {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
    };

    this.localStore.set(id, updated);
    return updated;
  }

  // Store user preference
  async storePreference(key: string, value: string, metadata?: Record<string, unknown>): Promise<Memory> {
    return this.store({
      type: 'preference',
      content: `${key}: ${value}`,
      metadata: { key, value, ...metadata },
      timestamp: Date.now(),
      source: 'user',
    });
  }

  // Store code style preference
  async storeCodeStyle(language: string, pattern: string, example: string): Promise<Memory> {
    return this.store({
      type: 'code_style',
      content: `${language}: ${pattern}`,
      metadata: { language, pattern, example },
      timestamp: Date.now(),
      source: 'analysis',
    });
  }

  // Store pattern
  async storePattern(name: string, description: string, context: string): Promise<Memory> {
    return this.store({
      type: 'pattern',
      content: `${name}: ${description}`,
      metadata: { name, description, context },
      timestamp: Date.now(),
      source: 'observation',
    });
  }

  // Store fact
  async storeFact(subject: string, fact: string, confidence: number = 1.0): Promise<Memory> {
    return this.store({
      type: 'fact',
      content: `${subject}: ${fact}`,
      metadata: { subject, confidence },
      timestamp: Date.now(),
      source: 'inference',
    });
  }

  // Get user preferences
  async getPreferences(key?: string): Promise<Memory[]> {
    const query = key || 'preference';
    return this.query({ query, type: 'preference', limit: 20 });
  }

  // Get code style for language
  async getCodeStyle(language: string): Promise<Memory[]> {
    return this.query({ 
      query: `${language} code style`, 
      type: 'code_style', 
      limit: 10 
    });
  }

  // Get relevant patterns
  async getPatterns(context: string): Promise<Memory[]> {
    return this.query({ 
      query: context, 
      type: 'pattern', 
      limit: 10 
    });
  }

  // Clear all memories (use with caution)
  async clear(): Promise<void> {
    this.localStore.clear();
    this.logger.warn('All memories cleared');
  }

  // Get stats
  getStats(): { total: number; byType: Record<MemoryType, number> } {
    const byType: Partial<Record<MemoryType, number>> = {
      preference: 0,
      pattern: 0,
      fact: 0,
      code_style: 0,
    };

    this.localStore.forEach(memory => {
      byType[memory.type] = (byType[memory.type] || 0) + 1;
    });

    return {
      total: this.localStore.size,
      byType: byType as Record<MemoryType, number>,
    };
  }

  private calculateRelevanceScore(memory: Memory, queryWords: string[]): number {
    const content = memory.content.toLowerCase();
    const metadata = JSON.stringify(memory.metadata).toLowerCase();
    
    let matches = 0;
    queryWords.forEach(word => {
      if (content.includes(word)) matches += 2;
      if (metadata.includes(word)) matches += 1;
    });

    // Normalize score (0-1)
    return Math.min(matches / (queryWords.length * 2), 1);
  }
}
