import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ClipRush Caught Error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('cliprush_history');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07070a] text-slate-100 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 sm:p-8 rounded-3xl border border-rose-500/30 text-center shadow-2xl bg-[#0e0e16]/95">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-heading font-bold text-white mb-2">
              Studio Siap Dipulihkan
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Terjadi penyesuaian pada browser. Klik tombol di bawah untuk memuat ulang aplikasi dengan bersih dan melanjutkan pemotongan video.
            </p>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-black/50 border border-white/10 text-left font-mono text-[11px] text-slate-400 mb-6 max-h-24 overflow-y-auto">
                {this.state.error.message || 'Unknown runtime state'}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Muat Ulang Aplikasi & Pulihkan Studio</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
