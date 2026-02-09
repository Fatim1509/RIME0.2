// ============================================
// RIME Core Engine - Activity State Machine
// ============================================

import { Logger } from 'winston';
import { ActivityType, VisionAnalysis, UserState, StateTransition } from '../types';

export class StateMachine {
  private currentState: ActivityType = 'idle';
  private previousState: ActivityType = 'idle';
  private stateStartTime: number = Date.now();
  private transitions: StateTransition[] = [];
  private predictions: string[] = [];
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child({ service: 'state-machine' });
  }

  updateState(visionAnalysis: VisionAnalysis): ActivityType {
    const detectedActivity = visionAnalysis.userActivity;
    const now = Date.now();

    // Check if state should transition
    if (detectedActivity !== this.currentState) {
      this.transitionTo(detectedActivity, 'vision_analysis', now);
    }

    // Generate predictions based on current state
    this.updatePredictions();

    return this.currentState;
  }

  transitionTo(newState: ActivityType, trigger: string, timestamp: number = Date.now()): void {
    if (newState === this.currentState) return;

    // Record transition
    const transition: StateTransition = {
      from: this.currentState,
      to: newState,
      trigger,
      timestamp,
    };

    this.transitions.push(transition);
    
    // Keep only last 50 transitions
    if (this.transitions.length > 50) {
      this.transitions = this.transitions.slice(-50);
    }

    this.logger.info(`State transition: ${this.currentState} -> ${newState}`, { trigger });

    // Update state
    this.previousState = this.currentState;
    this.currentState = newState;
    this.stateStartTime = timestamp;

    // Clear predictions on state change
    this.predictions = [];
  }

  getCurrentState(): ActivityType {
    return this.currentState;
  }

  getPreviousState(): ActivityType {
    return this.previousState;
  }

  getStateDuration(): number {
    return Date.now() - this.stateStartTime;
  }

  getTransitions(): StateTransition[] {
    return [...this.transitions];
  }

  getPredictions(): string[] {
    return [...this.predictions];
  }

  getUserState(): UserState {
    return {
      currentActivity: this.currentState,
      previousActivity: this.previousState,
      activityStartTime: this.stateStartTime,
      transitions: this.getTransitions(),
      predictions: this.getPredictions(),
    };
  }

  private updatePredictions(): void {
    const stateDuration = this.getStateDuration();
    const newPredictions: string[] = [];

    switch (this.currentState) {
      case 'debugging':
        // If debugging for more than 2 minutes, suggest help
        if (stateDuration > 2 * 60 * 1000) {
          newPredictions.push('user_may_need_help');
          newPredictions.push('suggest_code_fix');
        }
        if (stateDuration > 5 * 60 * 1000) {
          newPredictions.push('suggest_research');
        }
        break;

      case 'coding':
        // If coding for a while, might need a break or review
        if (stateDuration > 30 * 60 * 1000) {
          newPredictions.push('suggest_break');
          newPredictions.push('suggest_code_review');
        }
        break;

      case 'researching':
        // If researching for a while, might want to apply knowledge
        if (stateDuration > 10 * 60 * 1000) {
          newPredictions.push('suggest_return_to_coding');
        }
        break;

      case 'reading':
        // If reading docs for a while, suggest summary
        if (stateDuration > 30 * 1000) {
          newPredictions.push('suggest_documentation_summary');
        }
        break;

      case 'communicating':
        // If communicating for a while, might need to return to work
        if (stateDuration > 15 * 60 * 1000) {
          newPredictions.push('suggest_return_to_work');
        }
        break;

      case 'idle':
        // If idle for a while, user might have stepped away
        if (stateDuration > 10 * 60 * 1000) {
          newPredictions.push('user_away');
        }
        break;
    }

    // Check for common patterns
    this.detectPatterns(newPredictions);

    this.predictions = newPredictions;
  }

  private detectPatterns(predictions: string[]): void {
    // Detect coding -> researching -> coding pattern (common learning cycle)
    const recentTransitions = this.transitions.slice(-5);
    
    const hasCodingToResearch = recentTransitions.some(
      t => t.from === 'coding' && t.to === 'researching'
    );
    const hasResearchToCoding = recentTransitions.some(
      t => t.from === 'researching' && t.to === 'coding'
    );

    if (hasCodingToResearch && hasResearchToCoding) {
      predictions.push('learning_cycle_detected');
    }

    // Detect frequent debugging (might indicate deeper issue)
    const debugTransitions = this.transitions.filter(t => t.to === 'debugging');
    if (debugTransitions.length > 5) {
      predictions.push('frequent_debugging');
      predictions.push('suggest_code_review');
    }

    // Detect context switching (might indicate distraction)
    const uniqueStates = new Set(this.transitions.slice(-10).map(t => t.to));
    if (uniqueStates.size > 4) {
      predictions.push('frequent_context_switching');
      predictions.push('suggest_focus_mode');
    }
  }

  // Check if a prediction is active
  hasPrediction(prediction: string): boolean {
    return this.predictions.includes(prediction);
  }

  // Get time spent in each state (for analytics)
  getStateAnalytics(): Record<ActivityType, number> {
    const analytics: Partial<Record<ActivityType, number>> = {};
    
    // Initialize all states to 0
    const states: ActivityType[] = ['idle', 'active', 'coding', 'debugging', 'researching', 'reading', 'communicating'];
    states.forEach(state => analytics[state] = 0);

    // Calculate time spent in each state from transitions
    let currentStateTime = this.stateStartTime;
    
    for (let i = this.transitions.length - 1; i >= 0; i--) {
      const transition = this.transitions[i];
      const timeInState = currentStateTime - transition.timestamp;
      analytics[transition.to] = (analytics[transition.to] || 0) + timeInState;
      currentStateTime = transition.timestamp;
    }

    // Add current state time
    analytics[this.currentState] = (analytics[this.currentState] || 0) + this.getStateDuration();

    return analytics as Record<ActivityType, number>;
  }

  // Reset state machine
  reset(): void {
    this.currentState = 'idle';
    this.previousState = 'idle';
    this.stateStartTime = Date.now();
    this.transitions = [];
    this.predictions = [];
    this.logger.info('State machine reset');
  }
}
