'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { OmniBar } from './components/OmniBar';
import { AgentSwarm } from './components/AgentSwarm';
import { ActionStream } from './components/ActionStream';
import { ContextLens } from './components/ContextLens';
import { HealthCheck } from './components/HealthCheck';
import { VoiceControl } from './components/VoiceControl';
import { useRimeStore } from './lib/store';
import { useWebSocket } from './lib/websocket';
import { Cpu, Zap, Brain, Activity } from 'lucide-react';

export default function Dashboard() {
  const [showOmniBar, setShowOmniBar] = useState(false);
  const { isConnected, context, agents, actions } = useRimeStore();
  useWebSocket();

  // Keyboard shortcut for OmniBar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + Space
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        setShowOmniBar(true);
      }
      // Escape to close
      if (e.code === 'Escape') {
        setShowOmniBar(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gradient">RIME</h1>
                <p className="text-xs text-muted">Recursive Intelligence Multi-Agent Environment</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-6">
              <HealthCheck />
              
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <div className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
                <span className="text-sm text-muted">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Quick Actions */}
              <button
                onClick={() => setShowOmniBar(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Command</span>
                <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-white/20 rounded">
                  ⌘⇧Space
                </kbd>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Context & Agents */}
          <div className="lg:col-span-4 space-y-6">
            {/* Context Lens */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ContextLens context={context} />
            </motion.div>

            {/* Agent Swarm */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <AgentSwarm agents={agents} />
            </motion.div>

            {/* Voice Control */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <VoiceControl />
            </motion.div>
          </div>

          {/* Right Column - Action Stream */}
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="h-full"
            >
              <ActionStream actions={actions} />
            </motion.div>
          </div>
        </div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <StatCard
            icon={<Cpu className="w-5 h-5" />}
            label="Active Agents"
            value={agents.filter(a => a.status !== 'offline').length}
            color="primary"
          />
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Pending Actions"
            value={actions.filter(a => a.status === 'pending').length}
            color="warning"
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="Completed Today"
            value={actions.filter(a => a.status === 'completed').length}
            color="success"
          />
          <StatCard
            icon={<Brain className="w-5 h-5" />}
            label="Context Updates"
            value={context ? Math.floor(Date.now() / 1000) % 100 : 0}
            color="accent"
          />
        </motion.div>
      </main>

      {/* OmniBar */}
      <OmniBar isOpen={showOmniBar} onClose={() => setShowOmniBar(false)} />

      {/* Footer */}
      <footer className="border-t border-border mt-8 py-4">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm text-muted">
            <p>RIME v0.1.0 - AI as infrastructure, not feature</p>
            <div className="flex items-center gap-4">
              <span>Mock Mode: {process.env.NODE_ENV === 'development' ? 'On' : 'Off'}</span>
              <a
                href="https://github.com/rime-ai/rime"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'primary' | 'success' | 'warning' | 'accent';
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    accent: 'text-accent bg-accent/10',
  };

  return (
    <div className="panel p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}
