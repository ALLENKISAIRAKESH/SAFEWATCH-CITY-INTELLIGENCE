import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SafeWatch System Sentinel] Uncaught runtime exception caught:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleResetState = () => {
    try {
      localStorage.removeItem('safewatch_live_incidents');
      localStorage.removeItem('safewatch_live_audit_logs');
    } catch (_) {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070c14] text-white flex items-center justify-center p-6 font-mono">
          <div className="max-w-md w-full bg-[#0a1120] border border-red-500/40 rounded-2xl p-6 shadow-2xl shadow-red-500/10 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 mx-auto flex items-center justify-center text-red-400">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">SafeWatch Sentinel Recovery</h2>
              <p className="text-xs text-slate-400 mt-1">
                A component render exception was intercepted and contained by the system boundary.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-black/50 border border-white/10 text-[11px] text-red-300 text-left overflow-x-auto max-h-28">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Recover Session
              </button>
              <button
                onClick={this.handleResetState}
                className="py-2.5 px-4 bg-white/10 hover:bg-white/15 text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
