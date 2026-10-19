import React from 'react';
import {
  Type,
  Palette,
  Sparkles,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  VolumeX,
  Gauge,
} from 'lucide-react';
import { ColorFilter, ExportSettings, TextOverlay } from '../types';

interface CaptionsAndFiltersProps {
  overlay: TextOverlay;
  setOverlay: React.Dispatch<React.SetStateAction<TextOverlay>>;
  filter: ColorFilter;
  setFilter: (f: ColorFilter) => void;
  exportSettings: ExportSettings;
  setExportSettings: React.Dispatch<React.SetStateAction<ExportSettings>>;
}

export const CaptionsAndFilters: React.FC<CaptionsAndFiltersProps> = ({
  overlay,
  setOverlay,
  filter,
  setFilter,
  exportSettings,
  setExportSettings,
}) => {
  const filterOptions: { id: ColorFilter; name: string; desc: string; previewClass: string }[] = [
    { id: 'none', name: 'Asli (None)', desc: 'Warna standar kamera', previewClass: '' },
    { id: 'warm', name: 'Warm Sunset', desc: 'Nuansa hangat lembut', previewClass: 'sepia-[.3] saturate-150' },
    { id: 'cool', name: 'Cyber Cool', desc: 'Gradasi dingin modern', previewClass: 'hue-rotate-180' },
    { id: 'noir', name: 'Noir B&W', desc: 'Monokrom hitam putih dramatis', previewClass: 'grayscale contrast-125' },
    { id: 'vintage', name: 'Vintage Film', desc: 'Efek film analog nostalgia', previewClass: 'sepia-[.55] contrast-115' },
    { id: 'vibrant', name: 'Vibrant Pop', desc: 'Warna pop pekat menyala', previewClass: 'saturate-200' },
    { id: 'cinema', name: 'Cinematic Teal', desc: 'Kontras grading film bioskop', previewClass: 'contrast-125 saturate-125' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Caption Overlay Editor */}
      <div className="glass-card rounded-2xl p-4 border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-cyan-400" />
            <h3 className="font-heading font-bold text-xs text-white uppercase tracking-wider">
              Teks & Caption Video
            </h3>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <span className="text-[11px] text-slate-400">Aktifkan</span>
            <input
              type="checkbox"
              checked={overlay.enabled}
              onChange={(e) => setOverlay((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="accent-violet-500 rounded"
            />
          </label>
        </div>

        {overlay.enabled && (
          <div className="space-y-3 pt-2">
            {/* Caption Text Input */}
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Isi Teks / Subtitle</label>
              <textarea
                value={overlay.text}
                onChange={(e) => setOverlay((prev) => ({ ...prev, text: e.target.value }))}
                placeholder="Tulis pesan atau caption di sini..."
                rows={2}
                className="w-full text-xs bg-black/40 border border-white/10 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>

            {/* Position Selector */}
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Posisi Vertikal</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                <button
                  onClick={() => setOverlay((prev) => ({ ...prev, position: 'top' }))}
                  className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    overlay.position === 'top' ? 'bg-violet-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <AlignVerticalJustifyStart className="w-3.5 h-3.5" />
                  <span>Atas</span>
                </button>
                <button
                  onClick={() => setOverlay((prev) => ({ ...prev, position: 'middle' }))}
                  className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    overlay.position === 'middle' ? 'bg-violet-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
                  <span>Tengah</span>
                </button>
                <button
                  onClick={() => setOverlay((prev) => ({ ...prev, position: 'bottom' }))}
                  className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    overlay.position === 'bottom' ? 'bg-violet-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <AlignVerticalJustifyEnd className="w-3.5 h-3.5" />
                  <span>Bawah</span>
                </button>
              </div>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[11px] text-slate-300">Ukuran Font</span>
                <span className="font-mono text-cyan-400 text-xs">{overlay.fontSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="64"
                value={overlay.fontSize}
                onChange={(e) =>
                  setOverlay((prev) => ({ ...prev, fontSize: parseInt(e.target.value, 10) }))
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Colors & Style */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Warna Teks</label>
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-1.5">
                  <input
                    type="color"
                    value={overlay.textColor}
                    onChange={(e) => setOverlay((prev) => ({ ...prev, textColor: e.target.value }))}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="font-mono text-[11px] text-slate-300 uppercase">
                    {overlay.textColor}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Latar Belakang Box</label>
                <select
                  value={overlay.bgColor}
                  onChange={(e) => setOverlay((prev) => ({ ...prev, bgColor: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-2 text-slate-200 text-xs focus:outline-none"
                >
                  <option value="rgba(0, 0, 0, 0.85)">Hitam Pekat (85%)</option>
                  <option value="rgba(0, 0, 0, 0.70)">Hitam Transparan (70%)</option>
                  <option value="#dc2626">Merah Breaking News</option>
                  <option value="rgba(124, 58, 237, 0.85)">Ungu Neon</option>
                  <option value="rgba(6, 182, 212, 0.85)">Cyan</option>
                  <option value="transparent">Tanpa Box (Transparan)</option>
                </select>
              </div>
            </div>

            {/* Badge Tegline */}
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Badge Tegline Viral (Opsional)</label>
              <input
                type="text"
                value={overlay.taglineBadge || ''}
                onChange={(e) => setOverlay((prev) => ({ ...prev, taglineBadge: e.target.value }))}
                placeholder="Contoh: 🔥 VIRAL HOOK, ⚠️ JANGAN SKIP, 💡 RAHASIA"
                className="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Viral Preset Quick Buttons */}
            <div>
              <label className="text-[11px] text-slate-300 block mb-1.5">Preset Gaya Viral Cepat:</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setOverlay((prev) => ({
                      ...prev,
                      textColor: '#fde047',
                      bgColor: 'rgba(0, 0, 0, 0.85)',
                      fontStyle: 'bold',
                      presetStyle: 'tiktok_yellow',
                      taglineBadge: prev.taglineBadge || '🔥 VIRAL HOOK',
                    }))
                  }
                  className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-bold text-amber-300 text-center cursor-pointer"
                >
                  🟡 TikTok Yellow
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setOverlay((prev) => ({
                      ...prev,
                      textColor: '#38bdf8',
                      bgColor: 'rgba(15, 23, 42, 0.9)',
                      fontStyle: 'bold',
                      presetStyle: 'neon_glow',
                      taglineBadge: prev.taglineBadge || '⚡ CYBER CLIMAX',
                    }))
                  }
                  className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-[11px] font-bold text-cyan-300 text-center cursor-pointer"
                >
                  💎 Cyber Glow
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Color Grading & Filters */}
      <div className="glass-card rounded-2xl p-4 border border-white/5 space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-violet-400" />
          <h3 className="font-heading font-bold text-xs text-white uppercase tracking-wider">
            Filter Warna & Grading
          </h3>
        </div>

        <div className="space-y-1.5">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setFilter(opt.id);
                setExportSettings((prev) => ({ ...prev, filter: opt.id }));
              }}
              className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                filter === opt.id
                  ? 'bg-violet-600/30 border-cyan-400 text-white shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300'
              }`}
            >
              <div>
                <div className="text-xs font-bold">{opt.name}</div>
                <div className="text-[10px] text-slate-400">{opt.desc}</div>
              </div>
              <div
                className={`w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-pink-500 ${opt.previewClass}`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Speed & Audio Modifiers */}
      <div className="glass-card rounded-2xl p-4 border border-white/5 space-y-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-emerald-400" />
          <h3 className="font-heading font-bold text-xs text-white uppercase tracking-wider">
            Audio & Kecepatan Export
          </h3>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-300 flex items-center gap-2">
            <VolumeX className="w-4 h-4 text-red-400" />
            <span>Bisukan Audio Hasil Export (Mute)</span>
          </span>
          <input
            type="checkbox"
            checked={exportSettings.muteAudio}
            onChange={(e) =>
              setExportSettings((prev) => ({ ...prev, muteAudio: e.target.checked }))
            }
            className="accent-violet-500 rounded"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300">Kecepatan Video Permanen Saat Export</span>
            <span className="font-mono text-emerald-400 font-bold">
              {exportSettings.playbackSpeed}x
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[0.5, 0.75, 1.0, 1.25, 1.5].map((spd) => (
              <button
                key={spd}
                onClick={() => setExportSettings((prev) => ({ ...prev, playbackSpeed: spd }))}
                className={`py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  exportSettings.playbackSpeed === spd
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
