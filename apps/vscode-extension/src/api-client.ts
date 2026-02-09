// ============================================
// RIME VS Code Extension - API Client
// ============================================

import axios, { AxiosInstance } from 'axios';

interface IntentResponse {
    intentId: string;
    actions: Array<{
        id: string;
        agentId: string;
        type: string;
        title: string;
        description: string;
        payload: unknown;
        confidence: number;
        status: string;
        createdAt: number;
    }>;
    message: string;
}

interface HealthResponse {
    status: string;
    timestamp: number;
    version: string;
    services: Record<string, string>;
}

export class RimeAPI {
    private client: AxiosInstance;

    constructor(baseURL: string) {
        this.client = axios.create({
            baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    async checkHealth(): Promise<HealthResponse> {
        const response = await this.client.get('/health');
        return response.data;
    }

    async submitIntent(query: string, type: string = 'natural_language'): Promise<IntentResponse> {
        const response = await this.client.post('/api/intent', {
            query,
            type,
        });
        return response.data;
    }

    async getContext(): Promise<{
        screenshot?: string;
        visionAnalysis: unknown;
        timestamp: number;
    }> {
        const response = await this.client.get('/api/context/current');
        return response.data;
    }

    async getAgentStatuses(): Promise<Array<{
        id: string;
        name: string;
        description: string;
        capabilities: string[];
        status: string;
    }>> {
        const response = await this.client.get('/api/agents/status');
        return response.data;
    }

    async approveAction(actionId: string): Promise<{
        success: boolean;
        actions: unknown[];
    }> {
        const response = await this.client.post(`/api/actions/${actionId}/approve`);
        return response.data;
    }

    async rejectAction(actionId: string): Promise<{
        success: boolean;
        actions: unknown[];
    }> {
        const response = await this.client.post(`/api/actions/${actionId}/reject`);
        return response.data;
    }

    async processVoiceCommand(transcript: string): Promise<IntentResponse> {
        const response = await this.client.post('/api/voice/command', {
            transcript,
        });
        return response.data;
    }
}
