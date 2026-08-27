import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 rounded-xl bg-zinc-950 border border-rose-500/30 text-zinc-200 flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto my-12">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-100">
              {this.props.fallbackTitle || 'Component Error'}
            </h3>
            <p className="text-xs text-zinc-400">
              An unexpected error occurred while rendering this section.
            </p>
          </div>

          {this.state.error && (
            <div className="w-full p-3 rounded bg-zinc-900 border border-zinc-800 text-left overflow-x-auto max-h-36">
              <p className="text-[11px] font-mono text-rose-400 break-all">
                {this.state.error.message}
              </p>
            </div>
          )}

          <Button
            size="sm"
            onClick={this.handleReset}
            className="bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1.5 h-8"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload View
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
