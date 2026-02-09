'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, X, Loader2, Clock, Search, Code, MessageSquare, BookOpen, 
  Calendar, FileCode, Terminal, HelpCircle, Filter, ChevronDown 
} from 'lucide-react';
import { Action } from '@shared/types';
import { useRimeStore } from '../lib/store';

interface ActionStreamProps {
  actions: Action[];
}

const actionIcons: Record<string, React.ReactNode> = {
  web_search: <Search className="w-4 h-4" />,
  code_fix: <Code className="w-4 h-4" />,
  code_explain: <BookOpen className="w-4 h-4" />,
  draft_message: <MessageSquare className="w-4 h-4" />,
  schedule_event: <Calendar className="w-4 h-4" />,
  open_file: <FileCode className="w-4 h-4" />,
  run_command: <Terminal className="w-4 h-4" />,
  explain: <HelpCircle className="w-4 h-4" />,
};

const agentColors: Record<string, string> = {
  research: 'border-accent text-accent',
  code: 'border-primary text-primary',
  communication: 'border-success text-success',
  meta: 'border-warning text-warning',
};

export function ActionStream({ actions }: ActionStreamProps) {
  const [filter, setFilter] = useState<string>('all');
  const { approveAction, rejectAction } = useRimeStore();

  // Filter actions
  const filteredActions = actions.filter(action => {
    if (filter === 'all') return true;
    return action.status === filter;
  });

  // Sort by timestamp (newest first)
  const sortedActions = [...filteredActions].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Action Stream</h2>
          <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
            {actions.length}
          </span>
        </div>

        {/* Filter Dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-card-hover hover:bg-card rounded-lg transition-colors">
            <Filter className="w-4 h-4" />
            <span className="capitalize">{filter}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded-lg shadow-xl z-10">
            {['all', 'pending', 'approved', 'rejected', 'executing', 'completed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="w-full px-3 py-2 text-sm text-left hover:bg-card-hover first:rounded-t-lg last:rounded-b-lg capitalize"
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[600px]">
        <AnimatePresence mode="popLayout">
          {sortedActions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-48 text-muted"
            >
              <Terminal className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No actions yet</p>
              <p className="text-xs mt-1">Use the OmniBar to get started</p>
            </motion.div>
          ) : (
            sortedActions.map((action, index) => (
              <ActionItem
                key={action.id}
                action={action}
                index={index}
                onApprove={() => approveAction(action.id)}
                onReject={() => rejectAction(action.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface ActionItemProps {
  action: Action;
  index: number;
  onApprove: () => void;
  onReject: () => void;
}

function ActionItem({ action, index, onApprove, onReject }: ActionItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    pending: { icon: <Clock className="w-4 h-4" />, className: 'text-warning', bgClass: 'bg-warning/10' },
    approved: { icon: <Check className="w-4 h-4" />, className: 'text-success', bgClass: 'bg-success/10' },
    rejected: { icon: <X className="w-4 h-4" />, className: 'text-error', bgClass: 'bg-error/10' },
    executing: { icon: <Loader2 className="w-4 h-4 animate-spin" />, className: 'text-primary', bgClass: 'bg-primary/10' },
    completed: { icon: <Check className="w-4 h-4" />, className: 'text-success', bgClass: 'bg-success/10' },
    failed: { icon: <X className="w-4 h-4" />, className: 'text-error', bgClass: 'bg-error/10' },
  };

  const status = statusConfig[action.status] || statusConfig.pending;
  const agentColor = agentColors[action.agentId] || 'border-muted text-muted';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className={`action-item ${action.status} rounded-lg bg-card-hover`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Agent Icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${agentColor}`}>
            {actionIcons[action.type] || <Terminal className="w-4 h-4" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm">{action.title}</h3>
              <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${status.bgClass} ${status.className}`}>
                {status.icon}
                <span className="capitalize">{action.status}</span>
              </span>
            </div>
            <p className="text-sm text-muted line-clamp-2">{action.description}</p>

            {/* Confidence Badge */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted">
                Confidence: {Math.round(action.confidence * 100)}%
              </span>
              <span className="text-xs text-muted">•</span>
              <span className="text-xs text-muted">
                {new Date(action.createdAt).toLocaleTimeString()}
              </span>
            </div>

            {/* Expanded Content */}
            {isExpanded && action.payload && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 p-3 bg-card rounded-lg"
              >
                <pre className="text-xs font-mono text-muted overflow-x-auto">
                  {JSON.stringify(action.payload, null, 2)}
                </pre>
              </motion.div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {action.status === 'pending' && (
              <>
                <button
                  onClick={onApprove}
                  className="p-2 text-success hover:bg-success/10 rounded-lg transition-colors"
                  title="Approve"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={onReject}
                  className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                  title="Reject"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-muted hover:text-foreground hover:bg-card rounded-lg transition-colors"
              title="Toggle details"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
