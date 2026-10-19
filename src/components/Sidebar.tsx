import React from 'react';
import {
  UploadCloud,
  Flame,
  Wand2,
  Film,
  Type,
  Sliders,
  History,
  Settings as SettingsIcon,
  Layers,
  Sparkles,
  Scissors,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export type ActiveTab =
  | 'crop_results'
  | 'intake'
  | 'viral'
  | 'smartcut'
  | 'clips'
  | 'captions'
  | 'export'
  | 'history'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  clipCount: number;
  onOpenExport?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, clipCount, onOpenExport }) => {
  const sections = [
    {
      title: 'HASIL & PROSES CEPAT',
      items: [
        {
          id: 'crop_results' as ActiveTab,
          label: 'Hasil Crop Viral',
          desc: 'Tonton & download klip',
          icon: Flame,
          badge: clipCount > 0 ? `${clipCount} Klip` : 'Auto',
          isSpecial: true,
        },
        {
          id: 'intake' as ActiveTab,
          label: 'Import / Pilih Video',
          desc: 'Upload atau coba sampel',
          icon: UploadCloud,
          badge: null,
          isSpecial: false,
        },
        {
          id: 'viral' as ActiveTab,
          label: 'Studio Auto-Clipper',
          desc: 'AI Hook & Formula Judul',
          icon: Sparkles,
          badge: 'Gemini AI',
          isSpecial: false,
        },
      ],
    },
    {
      title: 'EDITING & TIPOGRAFI',
      items: [
        {
          id: 'smartcut' as ActiveTab,
          label: 'Smart Cut (Hening)',
          desc: 'Potong jeda suara mati',
          icon: Scissors,
          badge: null,
          isSpecial: false,
        },
        {
          id: 'captions' as ActiveTab,
          label: 'Teks & Tegline',
          desc: 'TikTok style & Safe 9:16',
          icon: Type,
          badge: null,
          isSpecial: false,
        },
        {
          id: 'clips' as ActiveTab,
          label: 'Timeline & Urutan',
          desc: 'Susunan urutan klip',
          icon: Layers,
          badge: clipCount > 0 ? `${clipCount}` : null,
          isSpecial: false,
        },
      ],
    },
    {
      title: 'OUTPUT & SISTEM',
      items: [
        {
          id: 'export' as ActiveTab,
          label: 'Export Studio',
          desc: 'Render MP4 / WebM',
          icon: Sliders,
          badge: null,
          isSpecial: false,
        },
        {
          id: 'history' as ActiveTab,
          label: 'Riwayat Proyek',
          desc: 'Log hasil render',
          icon: History,
          badge: null,
          isSpecial: false,
        },
        {
          id: 'settings' as ActiveTab,
          label: 'Pengaturan',
          desc: 'Preferensi & audio',
          icon: SettingsIcon,
          badge: null,
          isSpecial: false,
        },
      ],
    },
  ];

  const mobileNavItems = [
    { id: 'crop_results' as ActiveTab, label: 'Hasil Crop', icon: Flame, badge: '🔥' },
    { id: 'intake' as ActiveTab, label: 'Import', icon: UploadCloud, badge: null },
    { id: 'viral' as ActiveTab, label: 'Clipper AI', icon: Sparkles, badge: null },
    { id: 'captions' as ActiveTab, label: 'Teks', icon: Type, badge: null },
    { id: 'export' as ActiveTab, label: 'Export', icon: Sliders, badge: null },
  ];

  return (
    <>
      {/* Desktop Left Sidebar with Studio Hierarchy */}
      <aside className="hidden lg:flex w-72 border-r border-white/10 glass-panel flex-col p-4 gap-4 select-none z-20 shrink-0 bg-[#09090d]/90 backdrop-blur-2xl">
        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            STUDIO NAVIGATION
          </span>
          <span className="text-[10px] font-mono text-cyan-400 font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            PRO SUITE
          </span>
        </div>

        <nav className="flex flex-col gap-4 flex-1 overflow-y-auto pr-1">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
                {section.title}
              </div>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-left transition-all cursor-pointer group relative ${
                        isActive
                          ? item.isSpecial
                            ? 'bg-gradient-to-r from-amber-500/25 via-rose-500/15 to-transparent text-white border border-amber-500/40 shadow-lg shadow-amber-500/10'
                            : 'bg-gradient-to-r from-violet-600/25 via-indigo-600/15 to-transparent text-white border border-violet-500/40 shadow-lg shadow-violet-500/10'
                          : item.isSpecial
                          ? 'text-amber-300/90 hover:text-amber-200 hover:bg-amber-500/10 border border-amber-500/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                            isActive
                              ? item.isSpecial
                                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                                : 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                              : item.isSpecial
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-white/5 text-slate-400 group-hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex flex-col">
                          <span
                            className={`text-xs font-bold truncate ${
                              isActive
                                ? 'text-white'
                                : item.isSpecial
                                ? 'text-amber-200'
                                : 'text-slate-300'
                            }`}
                          >
                            {item.label}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">
                            {item.desc}
                          </span>
                        </div>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 font-mono ${
                            isActive
                              ? item.isSpecial
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : item.isSpecial
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-white/5 text-slate-400 border border-white/5'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Feature Hint Box */}
        <div className="glass-card rounded-2xl p-3 border border-white/10 bg-gradient-to-br from-[#121020] to-[#0d0d16]">
          <div className="flex items-center gap-2 mb-1 text-amber-300 text-xs font-bold">
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Kliper Viral Pintar</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Video yang Anda masukkan otomatis dipotong pada bagian paling berpotensi viral dengan tegline kontekstual siap tonton.
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Matches mobile layout in user design) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-white/10 flex items-center justify-around px-2 z-40 bg-[#09090f]/95 backdrop-blur-2xl shadow-2xl">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isSpecial = item.id === 'crop_results';

          const handleClick = () => {
            if (item.id === 'export' && onOpenExport) {
              onOpenExport();
            } else {
              setActiveTab(item.id);
            }
          };

          return (
            <button
              key={item.id}
              onClick={handleClick}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl transition-all cursor-pointer relative ${
                isActive
                  ? isSpecial
                    ? 'text-amber-400 font-bold scale-105'
                    : 'text-amber-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-400 shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] tracking-tight truncate max-w-[64px] ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
