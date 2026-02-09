'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, XCircle, Activity } from 'lucide-react';

interface ServiceStatus {
  database: 'connected' | 'disconnected';
  redis: 'connected' | 'disconnected';
  screenService: 'connected' | 'disconnected';
  gemini: 'connected' | 'disconnected';
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  version: string;
  services: ServiceStatus;
  uptime: number;
}

export function HealthCheck() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    if (!health) return <Activity className="w-4 h-4 text-muted" />;
    
    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'unhealthy':
        return <XCircle className="w-4 h-4 text-error" />;
      default:
        return <Activity className="w-4 h-4 text-muted" />;
    }
  };

  const getStatusColor = () => {
    if (!health) return 'text-muted';
    
    switch (health.status) {
      case 'healthy':
        return 'text-success';
      case 'degraded':
        return 'text-warning';
      case 'unhealthy':
        return 'text-error';
      default:
        return 'text-muted';
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={checkHealth}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card-hover hover:bg-card transition-colors ${isChecking ? 'animate-pulse' : ''}`}
      >
        {getStatusIcon()}
        <span className={`text-sm capitalize ${getStatusColor()}`}>
          {health?.status || 'checking'}
        </span>
      </button>

      {/* Tooltip */}
      {health && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden group-hover:block absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-xl z-50 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium">System Health</span>
            <span className="text-xs text-muted">v{health.version}</span>
          </div>

          <div className="space-y-2">
            {Object.entries(health.services).map(([service, status]) => (
              <div key={service} className="flex items-center justify-between">
                <span className="text-sm text-muted capitalize">
                  {service.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <div className={`flex items-center gap-1.5 ${status === 'connected' ? 'text-success' : 'text-error'}`}>
                  {status === 'connected' ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span className="text-xs capitalize">{status}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Uptime</span>
              <span>{formatUptime(health.uptime)}</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
