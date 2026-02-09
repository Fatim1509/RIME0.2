'use client';

import { create } from 'zustand';
import { 
  ScreenContext, 
  AgentInfo, 
  Action, 
  UserIntent,
  HealthCheckResponse 
} from '@shared/types';

interface RimeState {
  // Connection
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Context
  context: ScreenContext | null;
  setContext: (context: ScreenContext) => void;

  // Agents
  agents: AgentInfo[];
  setAgents: (agents: AgentInfo[]) => void;
  updateAgent: (agent: AgentInfo) => void;

  // Actions
  actions: Action[];
  setActions: (actions: Action[]) => void;
  addAction: (action: Action) => void;
  updateAction: (action: Action) => void;
  approveAction: (actionId: string) => void;
  rejectAction: (actionId: string) => void;

  // Health
  health: HealthCheckResponse | null;
  setHealth: (health: HealthCheckResponse) => void;

  // Intent submission
  submitIntent: (query: string) => Promise<void>;
}

export const useRimeStore = create<RimeState>((set, get) => ({
  // Connection
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  // Context
  context: null,
  setContext: (context) => set({ context }),

  // Agents
  agents: [],
  setAgents: (agents) => set({ agents }),
  updateAgent: (agent) => set((state) => ({
    agents: state.agents.map((a) => (a.id === agent.id ? agent : a)),
  })),

  // Actions
  actions: [],
  setActions: (actions) => set({ actions }),
  addAction: (action) => set((state) => ({ 
    actions: [...state.actions, action] 
  })),
  updateAction: (action) => set((state) => ({
    actions: state.actions.map((a) => (a.id === action.id ? action : a)),
  })),
  approveAction: async (actionId) => {
    try {
      const response = await fetch(`/api/actions/${actionId}/approve`, {
        method: 'POST',
      });
      if (response.ok) {
        const result = await response.json();
        if (result.actions) {
          result.actions.forEach((action: Action) => {
            get().updateAction(action);
          });
        }
      }
    } catch (error) {
      console.error('Failed to approve action:', error);
    }
  },
  rejectAction: async (actionId) => {
    try {
      const response = await fetch(`/api/actions/${actionId}/reject`, {
        method: 'POST',
      });
      if (response.ok) {
        const result = await response.json();
        if (result.actions) {
          result.actions.forEach((action: Action) => {
            get().updateAction(action);
          });
        }
      }
    } catch (error) {
      console.error('Failed to reject action:', error);
    }
  },

  // Health
  health: null,
  setHealth: (health) => set({ health }),

  // Intent submission
  submitIntent: async (query: string) => {
    try {
      const intent: Partial<UserIntent> = {
        query,
        type: 'natural_language',
        userId: 'user',
        sessionId: 'session',
      };

      const response = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intent),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.actions) {
          result.actions.forEach((action: Action) => {
            get().addAction(action);
          });
        }
      }
    } catch (error) {
      console.error('Failed to submit intent:', error);
    }
  },
}));
