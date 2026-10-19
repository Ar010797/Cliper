export interface CobaltResponse {
  status: 'tunnel' | 'redirect' | 'picker' | 'success' | 'error';
  url?: string;
  filename?: string;
  picker?: Array<{
    type: 'video' | 'photo' | 'gif';
    url: string;
    thumb?: string;
  }>;
  text?: string;
  error?: {
    code?: string;
    context?: {
      service?: string;
      limit?: number;
    };
  };
}

export interface YouTubeMetadata {
  id: string;
  title: string;
  thumbnailUrl: string;
  originalUrl: string;
}

export interface VerifiedPresetVideo {
  id: string;
  title: string;
  category: 'shorts' | 'cinematic' | 'podcast' | 'sports';
  aspectRatio: '9:16' | '16:9' | '1:1';
  durationDesc: string;
  url: string;
  thumbnail: string;
  desc: string;
}

export const VERIFIED_PRESET_VIDEOS: VerifiedPresetVideo[] = [
  {
    id: 'preset-action',
    title: 'Sinematik Aksi 16:9 (High Energy 1080p)',
    category: 'cinematic',
    aspectRatio: '16:9',
    durationDesc: '0:15s',
    url: '/samples/cliprush_demo_action.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&auto=format&fit=crop&q=80',
    desc: 'Video aksi dengan ritme audio dinamis, ideal untuk uji potong klip otomatis & highlights.',
  },
  {
    id: 'preset-podcast',
    title: 'Podcast Narasi & Smart Cut (Uji Hening)',
    category: 'podcast',
    aspectRatio: '16:9',
    durationDesc: '0:20s',
    url: '/samples/cliprush_demo_podcast.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80',
    desc: 'Dilengkapi vokal jelas dengan jeda hening antar kalimat untuk menguji fitur Smart Cut & Hapus Jeda.',
  },
  {
    id: 'preset-shorts',
    title: 'Shorts Vertikal 9:16 (TikTok & Reels)',
    category: 'shorts',
    aspectRatio: '9:16',
    durationDesc: '0:10s',
    url: '/samples/cliprush_demo_shorts.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=600&auto=format&fit=crop&q=80',
    desc: 'Format vertikal smartphone khusus pembuatan klip pendek untuk Shorts, Reels, dan TikTok.',
  },
];

export const COBALT_PUBLIC_INSTANCES = [
  { name: 'Cobalt Official (api.cobalt.tools)', url: 'https://api.cobalt.tools' },
  { name: 'Instance Komunitas (wuk.sh)', url: 'https://capi.wuk.sh' },
  { name: 'Server Pribadi (Custom Instance)', url: 'http://localhost:9000' },
];

/**
 * Checks if a given string is a direct link to a video file (.mp4, .webm, .mov, etc.)
 */
export function isDirectVideoUrl(url: string): boolean {
  try {
    const trimmed = url.trim().toLowerCase();
    return (
      /\.(mp4|webm|mov|mkv|m4v)(\?.*)?$/i.test(trimmed) ||
      trimmed.includes('commondatastorage.googleapis.com') ||
      trimmed.includes('upload.wikimedia.org') ||
      trimmed.includes('blob:')
    );
  } catch {
    return false;
  }
}

/**
 * Extracts YouTube Video ID from standard YouTube URL or Shorts URL
 */
export function extractYouTubeId(url: string): string | null {
  try {
    const trimmed = url.trim();
    const shortsMatch = trimmed.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch && watchMatch[1]) return watchMatch[1];

    const youtuBeMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (youtuBeMatch && youtuBeMatch[1]) return youtuBeMatch[1];

    const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch && embedMatch[1]) return embedMatch[1];

    return null;
  } catch {
    return null;
  }
}

/**
 * Gets preview thumbnail and basic metadata from YouTube URL with oEmbed title support
 */
export async function getYouTubeInfoFromUrl(url: string): Promise<YouTubeMetadata | null> {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  let title = `YouTube Video (${videoId})`;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.title) title = data.title;
    }
  } catch {
    // fallback to default title
  }

  return {
    id: videoId,
    title,
    thumbnailUrl,
    originalUrl: url,
  };
}

/**
 * Requests video download link from Cobalt API or returns direct URL if it's already a video link
 */
export async function requestCobaltVideo(
  videoUrl: string,
  quality: '1080' | '720' | '480' | '360' = '720',
  instanceUrl: string = 'https://api.cobalt.tools',
  apiKeyOrJwt?: string
): Promise<string> {
  const trimmed = videoUrl.trim();

  // If already a direct video link, return it immediately!
  if (isDirectVideoUrl(trimmed)) {
    return trimmed;
  }

  const cleanEndpoint = instanceUrl.replace(/\/+$/, '');
  
  const payload = {
    url: trimmed,
    videoQuality: quality,
    downloadMode: 'auto',
    youtubeVideoCodec: 'h264',
  };

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  if (apiKeyOrJwt && apiKeyOrJwt.trim()) {
    headers['Authorization'] = `Bearer ${apiKeyOrJwt.trim()}`;
  }

  try {
    const response = await fetch(`${cleanEndpoint}/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errMsg = `Server merespon dengan status ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.error?.code) {
          const code = errJson.error.code;
          if (code.includes('jwt.missing') || code.includes('auth')) {
            errMsg =
              'Server Cobalt ini memerlukan autentikasi API Key / JWT Token. Silakan gunakan tombol unduh cepat 1-klik di bawah.';
          } else if (code.includes('youtube') || code.includes('disabled')) {
            errMsg =
              'Pengunduhan YouTube dinonaktifkan pada instance publik ini oleh kebijakan YouTube.';
          } else {
            errMsg = `Cobalt Error: ${code}`;
          }
        }
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }

    const data: CobaltResponse = await response.json();

    if (data.status === 'error') {
      const errCode = data.error?.code || 'error.unknown';
      if (errCode.includes('jwt.missing') || errCode.includes('auth')) {
        throw new Error(
          'Server Cobalt ini memerlukan token JWT / API Key. Silakan gunakan tombol unduh cepat 1-klik di bawah.'
        );
      }
      if (errCode.includes('youtube') || errCode.includes('disabled')) {
        throw new Error(
          'Pengunduhan YouTube dinonaktifkan pada server publik ini karena pembatasan resmi dari YouTube.'
        );
      }
      throw new Error(`Cobalt Error: ${errCode}`);
    }

    if (data.url) {
      return data.url;
    }

    if (data.picker && data.picker.length > 0 && data.picker[0].url) {
      return data.picker[0].url;
    }

    throw new Error('Tidak ditemukan URL video dalam respon Cobalt API.');
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'TypeError' && error.message.toLowerCase().includes('fetch')) {
      throw new Error(
        `Gagal terhubung ke endpoint Cobalt (${cleanEndpoint}). Kemungkinan server memblokir CORS browser atau sedang offline.`
      );
    }
    throw error;
  }
}

/**
 * Resolves any video link (Direct MP4, Cloud storage, Hosted Sample, YouTube) through backend
 */
export async function resolveVideoLinkOnServer(
  url: string,
  quality: string = '720',
  customCobaltEndpoint?: string
): Promise<{
  success: boolean;
  type?: string;
  streamUrl?: string;
  directUrl?: string;
  title?: string;
  thumbnail?: string;
  isYouTube?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/resolve-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, quality, customCobaltEndpoint }),
    });
    return await res.json();
  } catch (err: unknown) {
    const error = err as Error;
    return {
      success: false,
      error: `Gagal menghubungi server ClipRush: ${error.message}`,
    };
  }
}

/**
 * Downloads a video from a direct URL into a Blob with real-time progress and server proxy fallback
 */
export async function downloadVideoBlobWithProgress(
  url: string,
  onProgress: (percent: number, loadedBytes: number, totalBytes: number) => void
): Promise<Blob> {
  const readStream = async (res: Response): Promise<Blob> => {
    const contentLength = res.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!res.body) {
      return await res.blob();
    }

    const reader = res.body.getReader();
    const chunks: BlobPart[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value as unknown as BlobPart);
        loaded += value.length;
        const pct = total > 0 ? Math.round((loaded / total) * 100) : 50;
        onProgress(pct, loaded, total);
      }
    }

    const mime = res.headers.get('content-type') || 'video/mp4';
    return new Blob(chunks, { type: mime });
  };

  // If local / relative URL, fetch directly
  if (url.startsWith('/') || url.startsWith('blob:')) {
    const response = await fetch(url);
    if (response.ok) {
      return await readStream(response);
    }
  }

  // Try direct fetch first for public CDNs
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await readStream(response);
    }
  } catch {
    // Direct fetch failed (likely CORS), try our backend streaming proxy
  }

  // Fallback via our backend proxy stream
  try {
    const proxyUrl = `/api/proxy-stream?url=${encodeURIComponent(url)}`;
    const proxyResponse = await fetch(proxyUrl);
    if (proxyResponse.ok) {
      return await readStream(proxyResponse);
    }
  } catch (err) {
    console.warn('Backend proxy stream fallback error:', err);
  }

  throw new Error('Gagal mengunduh video dari tautan tersebut. Pastikan tautan aktif dan dapat diakses.');
}
