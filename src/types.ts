export interface VideoClip {
  id: string;
  name: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  color?: string;
  isMuted?: boolean;
  tagline?: string;
  taglineBadge?: string;
  viralScore?: number;
  category?: 'hook' | 'climax' | 'insight' | 'reaction' | 'cta';
  reason?: string;
  suggestedTaglines?: string[];
}

export type OverlayPresetStyle = 'tiktok_yellow' | 'neon_glow' | 'minimal_pill' | 'news_banner' | 'bold_clean';

export interface TextOverlay {
  enabled: boolean;
  text: string;
  position: 'top' | 'middle' | 'bottom';
  fontSize: number; // in px
  textColor: string;
  bgColor: string;
  fontStyle: 'normal' | 'bold' | 'italic';
  presetStyle?: OverlayPresetStyle;
  taglineBadge?: string;
}

export type ColorFilter = 'none' | 'warm' | 'cool' | 'noir' | 'vintage' | 'vibrant' | 'cinema';

export interface AntiCopyrightSettings {
  enabled: boolean;          // Proteksi anti-copyright FB aktif
  flipHorizontal: boolean;   // Mirror horizontal (efektif lolos deteksi bot FB)
  microZoom: boolean;        // Micro-zoom 1.03x (potong margin untuk ubah piksel)
  microSpeed: boolean;       // Micro-speed 1.02x (mengubah tempo & hash audio)
  audioEqShift: boolean;     // Equalizer frekuensi anti-fingerprint Web Audio
  colorShift: boolean;       // Micro color grading (geser histogram warna)
  borderFrame: boolean;      // Border tipis pelindung frame
}

export const DEFAULT_ANTI_COPYRIGHT: AntiCopyrightSettings = {
  enabled: true,
  flipHorizontal: true,
  microZoom: true,
  microSpeed: true,
  audioEqShift: true,
  colorShift: true,
  borderFrame: true,
};

export type ReframeMode = 'smart_auto' | 'speaker' | 'action' | 'center' | 'manual';

export interface ExportSettings {
  resolution: 'original' | '1080p' | '720p' | '480p' | '360p';
  aspectRatio: 'original' | '16:9' | '9:16' | '1:1' | '4:5' | '21:9';
  fitMode: 'crop' | 'blur' | 'letterbox';
  format: 'mp4' | 'webm' | 'gif' | 'mp3';
  crf: number; // 18 - 35
  fps: 24 | 30 | 60;
  playbackSpeed: number;
  muteAudio: boolean;
  filter: ColorFilter;
  overlay: TextOverlay;
  antiCopyright?: AntiCopyrightSettings;
  reframeMode?: ReframeMode;
  reframeSmoothing?: number;
  manualFocalX?: number;
  smartZoom?: boolean; // Subtle Ken Burns dynamic zoom for talking heads
}

export interface SilenceSegment {
  start: number;
  end: number;
  duration: number;
}

export interface SmartCutConfig {
  thresholdDb: number; // e.g. -35 dB
  minSilenceDuration: number; // e.g. 0.4s
  paddingBefore: number; // e.g. 0.1s
  paddingAfter: number; // e.g. 0.1s
}

export type ViralTopic =
  | 'general'
  | 'podcast'
  | 'education'
  | 'business'
  | 'gaming'
  | 'comedy'
  | 'motivation'
  | 'mystery'
  | 'tech'
  | 'action'
  | 'custom';

export type MomentDurationMode = 'adaptive' | 'shorts' | 'medium' | 'extended';

export interface SuggestedTitle {
  title: string;
  hookFormula: string;
  viralReason: string;
  hashtags: string[];
}

export interface ViralMoment {
  id: string;
  title: string;
  tagline: string;
  taglineBadge: string;
  category: 'hook' | 'climax' | 'insight' | 'reaction' | 'cta';
  startTime: number;
  endTime: number;
  viralScore: number; // 0 - 100
  reason: string;
  suggestedTaglines: string[];
}

export interface ProjectHistoryItem {
  id: string;
  title: string;
  createdAt: number;
  duration: number;
  clipCount: number;
  thumbnail?: string;
}

export interface VideoMetadata {
  name: string;
  duration: number;
  width: number;
  height: number;
  sizeBytes: number;
  fileType: string;
  sourceUrl?: string;
  audioSampleRate?: number;
}

