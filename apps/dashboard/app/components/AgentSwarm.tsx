'use client';

import { motion } from 'framer-motion';
import { Search, Code, MessageSquare, Cpu, Activity, CheckCircle, AlertCircle, Power } from 'lucide-react';
import { AgentInfo } from '@shared/types';

interface AgentSwarmProps {
  agents: AgentInfo[];
}

const agentConfig: Record<string, { icon: React.ReactNode; color: string; description: string }> = {
  research: {
    icon: <Search className="w-5 h-5" />,
    color: 'text-accent bg-accent/10',
    description: 'Web search & documentation',
  },
  code: {
    icon: <Code className="w-5 h-5" />,
    color: 'text-primary bg-primary/10',
    description: 'Code analysis & fixes',
  },
  communication: {
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'text-success bg-success/10',
    description: 'Messaging & scheduling',
  },
  meta: {
    icon: <Cpu className="w-5 h-5" />,
    color: 'text-warning bg-warning/10',
    description: 'Orchestration & coordination',
  },
};

export function AgentSwarm({ agents }: AgentSwarmProps) {
  // Default agents if none provided
  const displayAgents: AgentInfo[] = agents.length > 0 ? agents : [
    { id: 'research', name: 'Research Agent', description: 'Web search & documentation', capabilities: ['web_search', 'docs'], status: 'idle' },
    { id: 'code', name: 'Code Agent', description: 'Code analysis & fixes', capabilities: ['fix', 'explain'], status: 'idle' },
    { id: 'communication', name: 'Comm Agent', description: 'Messaging & scheduling', capabilities: ['draft', 'schedule'], status: 'idle' },
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Agent Swarm</h2>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-success" />
          <span className="text-xs text-muted">
            {displayAgents.filter(a => a.status !== 'offline').length} active
          </span>
        </div>
      </div>

      <div className="panel-content space-y-3">
        {displayAgents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative"
          >
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card-hover hover:bg-card transition-colors cursor-pointer">
              {/* Agent Icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${agentConfig[agent.id]?.color || 'text-muted bg-muted/10'}`}>
                {agentConfig[agent.id]?.icon || <Cpu className="w-5 h-5" />}
              </div>

              {/* Agent Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm">{agent.name}</h3>
                  <StatusBadge status={agent.status} />
                </div>
                <p className="text-xs text-muted truncate">
                  {agent.currentTask || agentConfig[agent.id]?.description || agent.description}
                </p>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                {agent.status === 'working' && (
                  <div className="w-2 h-2 rounded-full bg-primary animate-agent-pulse" />
                )}
                <ChevronIcon />
              </div>
            </div>

            {/* Expanded Info (shown on hover) */}
            <div className="hidden group-hover:block absolute left-0 right-0 top-full mt-1 p-3 bg-card border border-border rounded-lg shadow-xl z-10">
              <p className="text-xs text-muted mb-2">Capabilities:</p>
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.map((cap, i) => (
                  <span key={i} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                    {cap}
                  </span>
                ))}
              </div>
              {agent.lastActive && (
                <p className="text-xs text-muted mt-2">
                  Last active: {new Date(agent.lastActive).toLocaleTimeString()}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs = {
    idle: { icon: <CheckCircle className="w-3 h-3" />, className: 'text-success bg-success/10' },
    working: { icon: <Activity className="w-3 h-3 animate-pulse" />, className: 'text-primary bg-primary/10' },
    error: { icon: <AlertCircle className="w-3 h-3" />, className: 'text-error bg-error/10' },
    offline: { icon: <Power className="w-3 h-3" />, className: 'text-muted bg-muted/10' },
  };

  const config = configs[status as keyof typeof configs] || configs.offline;

  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${config.className}`}>
      {config.icon}
      {status}
    </span>
  );
}

function ChevronIcon() {
  return (
    <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
