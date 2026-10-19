import React, { useState } from 'react';
import {
  X,
  Settings,
  Server,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileCode,
  ExternalLink,
} from 'lucide-react';
import { COBALT_PUBLIC_INSTANCES } from '../utils/cobaltApi';
import { downloadSingleFileHtml } from '../utils/singleFileGenerator';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cobaltEndpoint: string;
  setCobaltEndpoint: (url: string) => void;
  cobaltApiKey: string;
  setCobaltApiKey: (key: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  cobaltEndpoint,
  setCobaltEndpoint,
  cobaltApiKey,
  setCobaltApiKey,
}) => {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  if (!isOpen) return null;

  const testEndpoint = async () => {
    setTestStatus('testing');
    setTestMessage('Menghubungi endpoint Cobalt...');
    try {
      const clean = cobaltEndpoint.replace(/\/+$/, '');
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
      if (cobaltApiKey.trim()) {
        headers['Authorization'] = `Bearer ${cobaltApiKey.trim()}`;
      }

      const res = await fetch(`${clean}/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: 'https://youtu.be/dQw4w9WgXcQ' }),
      });
      if (res.ok || res.status === 400 || res.status === 429) {
        setTestStatus('success');
        setTestMessage('Endpoint merespon dengan baik!');
      } else {
        setTestStatus('error');
        setTestMessage(`Server merespon dengan status HTTP ${res.status}`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setTestStatus('error');
      setTestMessage(
        error.message.includes('fetch')
          ? 'Gagal terhubung (diblokir CORS browser atau server offline).'
          : error.message
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/30 text-cyan-300 flex items-center justify-center border border-violet-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-white">Pengaturan Sistem</h3>
              <p className="text-[11px] text-slate-400">Konfigurasi API Cobalt dan preferensi editor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Cobalt API Endpoint */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Endpoint Server Cobalt API
            </label>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Jika server utama mengalami kendala atau terkena limit, Anda bisa mengganti alamat
              endpoint di sini atau memilih alternatif publik di bawah:
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={cobaltEndpoint}
                onChange={(e) => {
                  setCobaltEndpoint(e.target.value);
                  setTestStatus('idle');
                }}
                className="flex-1 text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-violet-500"
                placeholder="https://api.cobalt.tools"
              />
              <button
                onClick={testEndpoint}
                disabled={testStatus === 'testing'}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 transition cursor-pointer"
              >
                {testStatus === 'testing' ? 'Cek...' : 'Tes Ping'}
              </button>
            </div>

            {/* API Key / JWT Token */}
            <div className="pt-2">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                API Key / JWT Token (Opsional jika server memerlukan autentikasi):
              </label>
              <input
                type="password"
                value={cobaltApiKey}
                onChange={(e) => setCobaltApiKey(e.target.value)}
                placeholder="Bearer token atau API Key untuk Cobalt v10..."
                className="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Test response message */}
            {testStatus === 'success' && (
              <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{testMessage}</span>
              </div>
            )}
            {testStatus === 'error' && (
              <div className="text-[11px] text-red-400 flex items-center gap-1.5 pt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{testMessage}</span>
              </div>
            )}

            {/* Public Instances Selector */}
            <div className="pt-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">
                Pilihan Server Publik Populer:
              </span>
              <div className="space-y-1">
                {COBALT_PUBLIC_INSTANCES.map((inst) => (
                  <button
                    key={inst.url}
                    onClick={() => {
                      setCobaltEndpoint(inst.url);
                      setTestStatus('idle');
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition flex items-center justify-between cursor-pointer ${
                      cobaltEndpoint === inst.url
                        ? 'bg-violet-600/30 text-cyan-300 border border-violet-500/30'
                        : 'bg-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{inst.name}</span>
                    <span className="text-[10px] text-slate-500">{inst.url}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Standalone HTML Export */}
          <div className="pt-3 border-t border-white/5 space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Ekspor Versi Standalone Single-File
            </label>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Unduh seluruh aplikasi ClipRush dalam 1 file HTML tunggal untuk dibuka offline di
              browser apapun tanpa server lokal.
            </p>
            <button
              onClick={downloadSingleFileHtml}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileCode className="w-4 h-4" />
              <span>Download Standalone .HTML (Offline)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white transition cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
