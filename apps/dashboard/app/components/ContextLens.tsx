'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Monitor, Code2, Globe, MessageSquare, Terminal, 
  FileCode, AlertCircle, Eye, EyeOff, RefreshCw 
} from 'lucide-react';
import { ScreenContext } from '@shared/types';

interface ContextLensProps {
  context: ScreenContext | null;
}

const appIcons: Record<string, React.ReactNode> = {
  vscode: <Code2 className="w-5 h-5" />,
  chrome: <Globe className="w-5 h-5" />,
  slack: <MessageSquare className="w-5 h-5" />,
  terminal: <Terminal className="w-5 h-5" />,
  unknown: <Monitor className="w-5 h-5" />,
};

const activityColors: Record<string, string> = {
  coding: 'text-primary',
  debugging: 'text-error',
  researching: 'text-accent',
  reading: 'text-warning',
  communicating: 'text-success',
  idle: 'text-muted',
  active: 'text-foreground',
};

export function ContextLens({ context }: ContextLensProps) {
  const [showScreenshot, setShowScreenshot] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (!context) {
    return (
      <div className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Context Lens</h2>
          </div>
        </div>
        <div className="panel-content">
          <div className="flex flex-col items-center justify-center h-48 text-muted">
            <Monitor className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Waiting for context...</p>
            <p className="text-xs mt-1">Screen capture will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  const { visionAnalysis, screenshot } = context;
  const appIcon = appIcons[visionAnalysis.application] || appIcons.unknown;
  const activityColor = activityColors[visionAnalysis.userActivity] || 'text-muted';

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Context Lens</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScreenshot(!showScreenshot)}
            className="p-2 hover:bg-card-hover rounded-lg transition-colors"
            title={showScreenshot ? 'Hide screenshot' : 'Show screenshot'}
          >
            {showScreenshot ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={handleRefresh}
            className={`p-2 hover:bg-card-hover rounded-lg transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="panel-content space-y-4">
        {/* Screenshot Preview */}
        {showScreenshot && screenshot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative aspect-video bg-card rounded-lg overflow-hidden border border-border"
          >
            <img
              src={`data:image/jpeg;base64,${screenshot}`}
              alt="Screen capture"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-card/80 backdrop-blur flex items-center justify-center">
                  {appIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{visionAnalysis.windowTitle}</p>
                  <p className={`text-xs capitalize ${activityColor}`}>
                    {visionAnalysis.userActivity}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Application Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-card-hover rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              {appIcon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium capitalize">{visionAnalysis.application}</p>
              <p className="text-xs text-muted">{visionAnalysis.windowTitle}</p>
            </div>
            <div className={`px-2 py-1 text-xs rounded-full bg-card capitalize ${activityColor}`}>
              {visionAnalysis.userActivity}
            </div>
          </div>

          {/* Code Context */}
          {visionAnalysis.codeContext && (
            <div className="p-3 bg-card-hover rounded-lg border-l-2 border-primary">
              <div className="flex items-center gap-2 mb-2">
                <FileCode className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{visionAnalysis.codeContext.fileName}</span>
                <span className="text-xs text-muted">({visionAnalysis.codeContext.language})</span>
              </div>
              
              {visionAnalysis.codeContext.codeSnippet && (
                <pre className="text-xs font-mono text-muted bg-card p-2 rounded overflow-x-auto">
                  {visionAnalysis.codeContext.codeSnippet}
                </pre>
              )}

              {visionAnalysis.codeContext.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {visionAnalysis.codeContext.errors.map((error, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-error">
                      <AlertCircle className="w-3 h-3" />
                      <span>Line {error.line}: {error.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Browser Context */}
          {visionAnalysis.browserContext && (
            <div className="p-3 bg-card-hover rounded-lg border-l-2 border-accent">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">{visionAnalysis.browserContext.title}</span>
              </div>
              <p className="text-xs text-muted truncate">{visionAnalysis.browserContext.url}</p>
              <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-accent/10 text-accent rounded">
                {visionAnalysis.browserContext.pageType}
              </span>
            </div>
          )}

          {/* Confidence */}
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Analysis confidence</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-card rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${visionAnalysis.confidence * 100}%` }}
                />
              </div>
              <span>{Math.round(visionAnalysis.confidence * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
