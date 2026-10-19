import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-3 rounded-2xl glass-panel shadow-2xl border flex items-center gap-3 text-xs max-w-sm transition-all duration-300 ${
            t.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/80 text-emerald-100'
              : t.type === 'error'
              ? 'border-red-500/40 bg-red-950/80 text-red-100'
              : 'border-violet-500/40 bg-violet-950/80 text-violet-100'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {t.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
          {t.type === 'info' && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}

          <span className="flex-1 font-medium">{t.message}</span>

          <button
            onClick={() => onDismiss(t.id)}
            className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
