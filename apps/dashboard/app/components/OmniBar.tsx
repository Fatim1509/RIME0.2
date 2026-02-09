'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, MessageSquare, Code, BookOpen, X, Sparkles, Mic } from 'lucide-react';
import { useRimeStore } from '../lib/store';

interface OmniBarProps {
  isOpen: boolean;
  onClose: () => void;
}

const suggestions = [
  { icon: <Zap className="w-4 h-4" />, label: 'Fix this error', query: 'fix this error' },
  { icon: <Code className="w-4 h-4" />, label: 'Explain this code', query: 'explain this code' },
  { icon: <BookOpen className="w-4 h-4" />, label: 'Search documentation', query: 'search docs for' },
  { icon: <MessageSquare className="w-4 h-4" />, label: 'Draft a message', query: 'tell the team' },
];

export function OmniBar({ isOpen, onClose }: OmniBarProps) {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { submitIntent } = useRimeStore();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    await submitIntent(query);
    setQuery('');
    onClose();
  };

  const handleSuggestionClick = (suggestionQuery: string) => {
    setQuery(suggestionQuery);
    inputRef.current?.focus();
  };

  const toggleVoice = () => {
    setIsListening(!isListening);
    // In production, this would use Web Speech API
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
        setQuery('Hey Rime, ');
        inputRef.current?.focus();
      }, 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* OmniBar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed inset-x-4 top-[20%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50"
          >
            <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* Input */}
              <form onSubmit={handleSubmit} className="flex items-center gap-3 p-4 border-b border-border">
                <Search className="w-5 h-5 text-muted" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What would you like RIME to do?"
                  className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
                />
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`p-2 rounded-lg transition-colors ${
                    isListening ? 'bg-primary text-white animate-pulse' : 'hover:bg-card-hover'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-card-hover rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </form>

              {/* Voice Wave Animation */}
              {isListening && (
                <div className="px-4 py-3 bg-primary/5 border-b border-border">
                  <div className="flex items-center justify-center gap-2">
                    <div className="voice-wave">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="voice-wave-bar" />
                      ))}
                    </div>
                    <span className="text-sm text-primary">Listening...</span>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {!query && (
                <div className="p-4">
                  <p className="text-sm text-muted mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Quick Actions
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion.query)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-card-hover transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          {suggestion.icon}
                        </div>
                        <span className="text-sm">{suggestion.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Commands */}
              {!query && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted mb-2">Recent</p>
                  <div className="space-y-1">
                    {['Fix TypeError in api.ts', 'Explain useEffect hook', 'Search for React docs'].map((cmd, i) => (
                      <button
                        key={i}
                        onClick={() => setQuery(cmd)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-card-hover transition-colors text-left text-sm text-muted"
                      >
                        <Search className="w-4 h-4" />
                        {cmd}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="px-4 py-2 bg-card-hover border-t border-border flex items-center justify-between text-xs text-muted">
                <div className="flex items-center gap-4">
                  <span>↑↓ Navigate</span>
                  <span>↵ Select</span>
                  <span>Esc Close</span>
                </div>
                <span>RIME AI</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
