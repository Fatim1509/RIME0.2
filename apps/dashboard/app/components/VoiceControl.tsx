'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Settings } from 'lucide-react';
import { useRimeStore } from '../lib/store';

export function VoiceControl() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { submitIntent } = useRimeStore();
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if Web Speech API is available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const results = event.results;
        const current = results[results.length - 1];
        const transcriptText = current[0].transcript;
        setTranscript(transcriptText);

        // Check for wake word
        if (transcriptText.toLowerCase().includes('hey rime')) {
          setWakeWordActive(true);
          // Extract command after wake word
          const command = transcriptText.toLowerCase().split('hey rime')[1]?.trim();
          if (command) {
            handleVoiceCommand(command);
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current?.start();
        }
      };
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [isListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setWakeWordActive(false);
      setTranscript('');
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleVoiceCommand = async (command: string) => {
    await submitIntent(command);
    setTranscript('');
    setWakeWordActive(false);
  };

  // Mock voice visualization
  const VoiceWave = () => (
    <div className="flex items-center justify-center gap-1 h-8">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-primary rounded-full"
          animate={{
            height: isListening ? [8, 24, 8] : 8,
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Voice Control</h2>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-card-hover rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="panel-content">
        {/* Main Voice Button */}
        <div className="flex flex-col items-center py-6">
          <button
            onClick={toggleListening}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? 'bg-primary text-white animate-pulse-glow'
                : 'bg-card-hover text-muted hover:text-foreground'
            }`}
          >
            {isListening ? (
              <Mic className="w-8 h-8" />
            ) : (
              <MicOff className="w-8 h-8" />
            )}
            
            {/* Ripple effect when listening */}
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                <span className="absolute inset-[-8px] rounded-full border-2 border-primary/30" />
              </>
            )}
          </button>

          <p className="mt-4 text-sm text-muted">
            {isListening ? 'Listening...' : 'Click to enable voice'}
          </p>

          {isListening && (
            <div className="mt-4">
              <VoiceWave />
            </div>
          )}
        </div>

        {/* Transcript */}
        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-card-hover rounded-lg"
            >
              <p className="text-xs text-muted mb-1">Heard:</p>
              <p className="text-sm">{transcript}</p>
              {wakeWordActive && (
                <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                  Wake word detected!
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-3"
            >
              <div className="p-3 bg-card-hover rounded-lg">
                <p className="text-sm font-medium mb-2">Voice Commands</p>
                <ul className="space-y-1 text-xs text-muted">
                  <li className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">"Hey Rime"</span>
                    <span>Wake word</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">"Fix this error"</span>
                    <span>Debug code</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">"Explain this"</span>
                    <span>Code explanation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">"Search docs"</span>
                    <span>Find documentation</span>
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-between p-3 bg-card-hover rounded-lg">
                <span className="text-sm">Continuous listening</span>
                <button
                  onClick={() => {}}
                  className="w-10 h-5 bg-primary rounded-full relative"
                >
                  <span className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Privacy Note */}
        <p className="mt-4 text-xs text-muted text-center">
          Voice data is processed locally. No audio is stored on servers.
        </p>
      </div>
    </div>
  );
}
