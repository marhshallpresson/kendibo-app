import React from 'react';
import { watchup } from '../services/watchup';

interface Props {
  screen: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  crashed: boolean;
}

/** Screen-level crash boundary — reports to WatchUp, never whitescreens. */
export class WatchupErrorBoundary extends React.Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string }): void {
    try {
      watchup.captureException(error, { screen: this.props.screen, componentStack: info.componentStack });
      void watchup.flush();
    } catch {
      /* fail open */
    }
  }

  render(): React.ReactNode {
    if (this.state.crashed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
