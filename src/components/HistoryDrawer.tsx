import React from 'react';
import { History, Clock, Trash2, Calendar, Play, Layers } from 'lucide-react';
import { ProjectHistoryItem } from '../types';

interface HistoryDrawerProps {
  historyItems: ProjectHistoryItem[];
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  historyItems,
  onClearHistory,
  onDeleteItem,
}) => {
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-violet-400" />
          <h3 className="font-heading font-bold text-xs text-white uppercase tracking-wider">
            Riwayat Render & Proyek
          </h3>
        </div>
        {historyItems.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-[11px] text-red-400 hover:text-red-300 font-semibold cursor-pointer"
          >
            Hapus Semua
          </button>
        )}
      </div>

      {historyItems.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-center text-xs text-slate-400 border border-white/5 space-y-2">
          <Clock className="w-8 h-8 text-slate-500 mx-auto opacity-50" />
          <div className="font-semibold text-slate-300">Belum Ada Riwayat</div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Video yang Anda render akan tercatat secara lokal di browser ini.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {historyItems.map((item) => (
            <div
              key={item.id}
              className="glass-card rounded-2xl p-3 border border-white/5 hover:border-violet-500/20 transition flex items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate mb-1">{item.title}</div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{formatDate(item.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Layers className="w-3 h-3" />
                    <span>{item.clipCount} Klip</span>
                  </span>
                  <span className="text-violet-400">{formatTime(item.duration)}</span>
                </div>
              </div>

              <button
                onClick={() => onDeleteItem(item.id)}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 cursor-pointer ml-2"
                title="Hapus dari riwayat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
