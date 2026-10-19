import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Putar / Jeda video (Play / Pause)' },
    { key: 'S', desc: 'Bagi klip pada posisi playhead (Split Clip)' },
    { key: 'I', desc: 'Pangkas awal klip ke posisi playhead (Trim IN)' },
    { key: 'O', desc: 'Pangkas akhir klip ke posisi playhead (Trim OUT)' },
    { key: '← / →', desc: 'Maju / Mundur 1 frame (± 1/30 detik)' },
    { key: 'J / L', desc: 'Maju / Mundur cepat (1 detik)' },
    { key: 'K', desc: 'Jeda video (Pause)' },
    { key: 'Delete / Backspace', desc: 'Hapus klip yang sedang aktif' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-600/30 text-violet-300 flex items-center justify-center border border-violet-500/30">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-white">Keyboard Shortcuts</h3>
              <p className="text-[11px] text-slate-400">Pintasan keyboard untuk editor pro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 divide-y divide-white/5 space-y-2">
          {shortcuts.map((sc, i) => (
            <div key={i} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
              <span className="text-slate-300">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded-lg bg-black/50 border border-white/15 text-cyan-300 font-mono text-[11px] shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-white/10 bg-black/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
