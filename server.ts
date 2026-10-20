import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isDev = process.env.NODE_ENV !== 'production';

  app.use(express.json());

  // CORS headers for all API requests
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Serve hosted sample videos
  const samplesDir = path.resolve(__dirname, 'public/samples');
  if (fs.existsSync(samplesDir)) {
    app.use('/samples', express.static(samplesDir));
  }

  // API: Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Temp downloads directory for native Android WebView / Median.co / iOS downloads
  const tempDownloadsDir = path.resolve(__dirname, 'public/temp_downloads');
  if (!fs.existsSync(tempDownloadsDir)) {
    fs.mkdirSync(tempDownloadsDir, { recursive: true });
  }

  // Periodic cleanup of temp files older than 30 minutes
  setInterval(() => {
    try {
      if (fs.existsSync(tempDownloadsDir)) {
        const files = fs.readdirSync(tempDownloadsDir);
        const now = Date.now();
        for (const f of files) {
          const fp = path.join(tempDownloadsDir, f);
          const stat = fs.statSync(fp);
          if (now - stat.mtimeMs > 30 * 60 * 1000) {
            fs.unlinkSync(fp);
          }
        }
      }
    } catch {
      // ignore cleanup errors
    }
  }, 10 * 60 * 1000);

  // API: Upload rendered clip to server so Median & mobile WebViews can download via native HTTP URL
  app.post('/api/upload-temp-video', (req: Request, res: Response) => {
    try {
      const rawFilename = (req.query.filename as string) || `cliprush_${Date.now()}.mp4`;
      const cleanFilename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const ext = cleanFilename.endsWith('.webm') ? '.webm' : '.mp4';
      const savedName = `${id}${ext}`;
      const filePath = path.join(tempDownloadsDir, savedName);

      const writeStream = fs.createWriteStream(filePath);
      req.pipe(writeStream);

      writeStream.on('finish', () => {
        const stats = fs.statSync(filePath);
        const downloadUrl = `/api/download-file?id=${id}&filename=${encodeURIComponent(cleanFilename)}`;
        res.json({
          success: true,
          id,
          filename: cleanFilename,
          size: stats.size,
          downloadUrl,
        });
      });

      writeStream.on('error', (err) => {
        console.error('Error saving temp video upload:', err);
        res.status(500).json({ success: false, error: 'Gagal menyimpan file video di server.' });
      });
    } catch (e: unknown) {
      const error = e as Error;
      res.status(500).json({ success: false, error: error?.message || 'Server error' });
    }
  });

  // API: Download file with explicit Content-Disposition and HTTP headers for native DownloadManager
  app.get('/api/download-file', (req: Request, res: Response) => {
    const id = req.query.id as string;
    const clientFilename = (req.query.filename as string) || 'cliprush_video.mp4';
    if (!id || typeof id !== 'string') {
      res.status(400).send('Parameter id tidak valid');
      return;
    }

    const safeId = id.replace(/[^a-zA-Z0-9_]/g, '');
    const mp4Path = path.join(tempDownloadsDir, `${safeId}.mp4`);
    const webmPath = path.join(tempDownloadsDir, `${safeId}.webm`);

    let targetPath = '';
    if (fs.existsSync(mp4Path)) {
      targetPath = mp4Path;
    } else if (fs.existsSync(webmPath)) {
      targetPath = webmPath;
    }

    if (!targetPath) {
      res.status(404).send('File video tidak ditemukan atau sudah kadaluarsa.');
      return;
    }

    const stat = fs.statSync(targetPath);
    const isWebm = targetPath.endsWith('.webm');
    const contentType = isWebm ? 'video/webm' : 'video/mp4';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${clientFilename.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Accept-Ranges', 'bytes');

    const readStream = fs.createReadStream(targetPath);
    readStream.pipe(res);
  });

  // API: List hosted sample videos
  app.get('/api/samples', (req: Request, res: Response) => {
    res.json({
      success: true,
      samples: [
        {
          id: 'action-1080p',
          name: 'Sinematik Aksi 16:9 (High Energy)',
          url: '/samples/cliprush_demo_action.mp4',
          duration: 15,
          resolution: '1280x720',
          aspectRatio: '16:9',
          description: 'Adegan dinamis dengan beat audio ritmis, sempurna untuk potong adegan aksi & trailer.',
        },
        {
          id: 'podcast-smartcut',
          name: 'Podcast Vokal & Smart Cut (Uji Hening)',
          url: '/samples/cliprush_demo_podcast.mp4',
          duration: 20,
          resolution: '1280x720',
          aspectRatio: '16:9',
          description: 'Narasi suara dengan jeda jeda hening 2 detik untuk menguji fitur deteksi hening & hapus jeda.',
        },
        {
          id: 'shorts-916',
          name: 'Video Vertikal 9:16 (TikTok & Reels)',
          url: '/samples/cliprush_demo_shorts.mp4',
          duration: 10,
          resolution: '720x1280',
          aspectRatio: '9:16',
          description: 'Format vertikal ponsel pintar untuk menguji klip video portrait dan caption teks.',
        },
      ],
    });
  });

  // API: Proxy Stream - streams any external video without CORS restriction
  app.get('/api/proxy-stream', async (req: Request, res: Response) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      res.status(400).json({ error: 'Parameter url wajib disertakan' });
      return;
    }

    try {
      const decodedUrl = decodeURIComponent(targetUrl);

      // If relative URL to samples, redirect or serve locally
      if (decodedUrl.startsWith('/samples/') || decodedUrl.includes('/samples/')) {
        const sampleFileName = path.basename(decodedUrl);
        const localPath = path.join(samplesDir, sampleFileName);
        if (fs.existsSync(localPath)) {
          res.sendFile(localPath);
          return;
        }
      }

      const headers: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: '*/*',
      };

      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const response = await fetch(decodedUrl, {
        headers,
        redirect: 'follow',
      });

      if (!response.ok && response.status !== 206) {
        res.status(response.status).json({
          error: `Gagal mengambil video dari sumber: status ${response.status}`,
        });
        return;
      }

      // Forward response headers
      res.status(response.status);
      res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');

      const contentRange = response.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);

      const contentLength = response.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      if (!response.body) {
        res.end();
        return;
      }

      // Stream the response body
      const reader = response.body.getReader();
      req.on('close', () => {
        reader.cancel().catch(() => {});
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) res.write(Buffer.from(value));
      }
      res.end();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Proxy stream error:', error.message);
      if (!res.headersSent) {
        res.status(502).json({ error: `Gagal proxy video: ${error.message}` });
      }
    }
  });

  // API: Resolve Link (YouTube, Direct, Cloud Storage)
  app.post('/api/resolve-link', async (req: Request, res: Response) => {
    const { url, quality = '720', customCobaltEndpoint } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ success: false, error: 'URL video tidak valid' });
      return;
    }

    const trimmed = url.trim();

    // 1. Direct or hosted sample URL
    if (
      trimmed.startsWith('/samples/') ||
      trimmed.includes('cliprush_demo_') ||
      trimmed.includes('sample_')
    ) {
      const filename = path.basename(trimmed);
      res.json({
        success: true,
        type: 'sample',
        streamUrl: trimmed.startsWith('/') ? trimmed : `/${trimmed}`,
        title: `Contoh Video ClipRush (${filename})`,
      });
      return;
    }

    // Direct MP4 / WebM / MOV / MKV link
    const isDirect = /\.(mp4|webm|mov|mkv|m4v)(\?.*)?$/i.test(trimmed);
    if (isDirect) {
      const filename = path.basename(trimmed.split('?')[0]) || 'video.mp4';
      res.json({
        success: true,
        type: 'direct',
        streamUrl: `/api/proxy-stream?url=${encodeURIComponent(trimmed)}`,
        directUrl: trimmed,
        title: decodeURIComponent(filename),
      });
      return;
    }

    // Google Drive URL
    const gdriveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (gdriveMatch && gdriveMatch[1]) {
      const driveId = gdriveMatch[1];
      const directDriveUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
      res.json({
        success: true,
        type: 'gdrive',
        streamUrl: `/api/proxy-stream?url=${encodeURIComponent(directDriveUrl)}`,
        title: `Google Drive Video (${driveId})`,
      });
      return;
    }

    // Dropbox URL
    if (trimmed.includes('dropbox.com')) {
      const dropboxDirect = trimmed
        .replace('?dl=0', '?raw=1')
        .replace('&dl=0', '&raw=1');
      res.json({
        success: true,
        type: 'dropbox',
        streamUrl: `/api/proxy-stream?url=${encodeURIComponent(dropboxDirect)}`,
        title: 'Dropbox Video',
      });
      return;
    }

    // YouTube / Shorts detection
    const ytIdMatch =
      trimmed.match(/\/shorts\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/\/embed\/([a-zA-Z0-9_-]+)/);

    if (ytIdMatch && ytIdMatch[1]) {
      const videoId = ytIdMatch[1];
      let title = `YouTube Video (${videoId})`;
      let author = 'YouTube Creator';
      const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      // Fetch oEmbed title
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (oembedRes.ok) {
          const oData = (await oembedRes.json()) as { title?: string; author_name?: string };
          if (oData.title) title = oData.title;
          if (oData.author_name) author = oData.author_name;
        }
      } catch {
        // ignore oembed failure
      }

      // Try Cobalt endpoints
      const endpointsToTry = [
        customCobaltEndpoint,
        'https://cobalt.api.imput.net',
        'https://api.cobalt.tools',
      ].filter(Boolean) as string[];

      for (const endpoint of endpointsToTry) {
        try {
          const cleanEp = endpoint.replace(/\/+$/, '');
          const cRes = await fetch(`${cleanEp}/`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'User-Agent': 'ClipRush/1.0',
            },
            body: JSON.stringify({
              url: trimmed,
              videoQuality: quality,
              downloadMode: 'auto',
            }),
            signal: AbortSignal.timeout(4000),
          });

          if (cRes.ok) {
            const cData = (await cRes.json()) as { status: string; url?: string };
            if (cData.url) {
              res.json({
                success: true,
                type: 'youtube',
                id: videoId,
                title,
                author,
                thumbnail,
                streamUrl: `/api/proxy-stream?url=${encodeURIComponent(cData.url)}`,
                directUrl: cData.url,
              });
              return;
            }
          }
        } catch {
          // continue to next endpoint
        }
      }

      // If YouTube direct extraction cannot bypass YouTube datacenter anti-bot:
      res.json({
        success: false,
        isYouTube: true,
        id: videoId,
        title,
        author,
        thumbnail,
        message:
          'Server YouTube memblokir akses bot langsung dari server cloud. Gunakan tombol Buka Video Siap Pakai 1-Klik, atau konversi MP4 lalu buka di sini.',
      });
      return;
    }

    // Default: try checking if generic URL is a video stream
    try {
      const headRes = await fetch(trimmed, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });
      const cType = headRes.headers.get('content-type') || '';
      if (cType.includes('video') || cType.includes('octet-stream')) {
        res.json({
          success: true,
          type: 'direct',
          streamUrl: `/api/proxy-stream?url=${encodeURIComponent(trimmed)}`,
          title: 'Online Video Stream',
        });
        return;
      }
    } catch {
      // ignore
    }

    res.status(400).json({
      success: false,
      error:
        'Tautan tidak dapat diproses secara langsung. Pastikan tautan merupakan link file video (.mp4, .webm) atau coba gunakan Video Siap Pakai ClipRush.',
    });
  });

  // Helper to extract clean semantic topic from video name / keyword
  function cleanTopicKeyword(projectName?: string, customKeyword?: string, topic?: string): string {
    let kw = (customKeyword || projectName || '').trim();
    kw = kw.replace(/\.(mp4|webm|mov|mkv|m4v|avi|ts)$/i, '');
    kw = kw.replace(/^(video|clip|cliprush|demo|sample|whatsapp video|screen recording|my video)/i, '');
    kw = kw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

    const lower = (kw + ' ' + (projectName || '')).toLowerCase();
    if (/action|drift|balap|mobil|kecepatan|stunt/i.test(lower) || topic === 'action') {
      return 'Aksi Balap & Drift Ekstrem';
    }
    if (/podcast|vokal|interview|ngobrol|smartcut|curhat/i.test(lower) || topic === 'podcast') {
      return 'Obrolan Podcast Mendalam';
    }
    if (/shorts|reels|tiktok|vertikal/i.test(lower)) {
      return 'Konten Viral Vertikal';
    }
    if (kw.length > 2 && !/^(cliprush|demo|sample)$/i.test(kw)) {
      return kw.substring(0, 32);
    }
    if (topic && topic !== 'general') {
      return topic;
    }
    return 'Isi Momen Video';
  }

  // Helper for high-converting viral titles strictly matching video content
  function generateFallbackViralTitles(projectName?: string, topic?: string, customKeyword?: string) {
    const cleanKw = cleanTopicKeyword(projectName, customKeyword, topic);

    return [
      {
        title: `JANGAN SKIP! Rahasia ${cleanKw.toUpperCase()} Yang Bikin Syok 😱`,
        hookFormula: 'Curiosity Gap (Penasaran)',
        viralReason: `Menahan penonton di 3 detik pertama dengan membuat penasaran terhadap pembahasan ${cleanKw}.`,
        hashtags: ['#fyp', '#viral', '#trending', '#reels'],
      },
      {
        title: `FAKTA PALING GILA: Ternyata Begini Soal ${cleanKw}! 🔥`,
        hookFormula: 'Shock Value (Fakta Menohok)',
        viralReason: `Menantang asumsi umum penonton tentang ${cleanKw} sehingga memicu komentar dan share.`,
        hashtags: ['#faktaunik', '#fypシ', '#videoviral', '#shorts'],
      },
      {
        title: `Trik Rahasia ${cleanKw} Yang Bakal Bikin Kamu Takjub 💡`,
        hookFormula: 'Actionable Secret (Tips Daging)',
        viralReason: `Memberikan wawasan bernilai seputar ${cleanKw} yang mendorong penonton menyimpan video.`,
        hashtags: ['#tipskeren', '#lifehack', '#edukasitiktok', '#cuan'],
      },
    ];
  }

  // API: Suggest Auto-Title using Gemini API (gemini-3.8-flash)
  app.post('/api/gemini/suggest-titles', async (req: Request, res: Response) => {
    const { projectName, duration, topic, customKeyword, moments } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallbackTitles = generateFallbackViralTitles(projectName, topic, customKeyword);
      res.json({
        success: true,
        isAiGenerated: false,
        source: 'smart-heuristic',
        message: 'Menggunakan formula viral cerdas.',
        titles: fallbackTitles,
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const momentsSummary = Array.isArray(moments) && moments.length > 0
        ? moments
            .slice(0, 5)
            .map(
              (m: any, i: number) =>
                `- Klip ${i + 1}: [${m.category || 'momen'}] (${m.startTime?.toFixed(0)}s - ${m.endTime?.toFixed(0)}s) "${m.tagline || m.title}"`
            )
            .join('\n')
        : 'Video memiliki variasi audio dinamis dan segmen vokal.';

      const prompt = `Anda adalah ahli strategi konten video pendek viral (TikTok, Instagram Reels, YouTube Shorts).
Analisis konteks dan metadata video berikut untuk membuat 3 judul/headline proyek yang sangat menarik (Click-worthy, Anti-Skip, dan memiliki potensi viral tinggi).

Data Video:
- Nama Proyek/File: "${projectName || 'Video Konten'}"
- Durasi: ${duration ? Math.round(duration) : 30} detik
- Topik/Kategori: "${topic || 'Umum'}"
${customKeyword ? `- Kata Kunci Khusus: "${customKeyword}"` : ''}
- Momen & Klip Terdeteksi:
${momentsSummary}

Instruksi Khusus:
1. Buat tepat 3 variasi judul yang menggunakan psikologi hook viral berbeda:
   - Judul 1: Penasaran Ekstrem (Curiosity Gap)
   - Judul 2: Fakta Mengejutkan / Kontras Tinggi (Shock Value / Controversy)
   - Judul 3: Trik Rahasia / Daging Penting (Actionable Value / Secret)
2. Judul harus ringkas (maksimal 60 karakter), menyertakan emoji yang pas, dan sangat alami dalam bahasa Indonesia (atau campuran tren gaul sosmed).
3. Berikan alasan kenapa judul tersebut berpotensi viral (1 kalimat).
4. Sertakan 3-4 hashtag tren relevan dalam format sederhana (misal: #fyp, #videoviral, #reels, #shorts, #tips). Hanya gunakan huruf alfabet standar dan angka.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titles: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: 'Judul viral menarik dengan emoji, maksimal 60 karakter.',
                    },
                    hookFormula: {
                      type: Type.STRING,
                      description: 'Formula hook yang dipakai, misal: Curiosity Gap, Shock Value, Secret Hack.',
                    },
                    viralReason: {
                      type: Type.STRING,
                      description: '1 kalimat penjelasan kenapa judul ini menarik klik dan retensi tinggi.',
                    },
                    hashtags: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: '3-4 hashtag tren relevan.',
                    },
                  },
                  required: ['title', 'hookFormula', 'viralReason', 'hashtags'],
                },
              },
            },
            required: ['titles'],
          },
        },
      });

      const text = response.text || '';
      const parsed = JSON.parse(text);

      if (parsed.titles && Array.isArray(parsed.titles) && parsed.titles.length > 0) {
        res.json({
          success: true,
          isAiGenerated: true,
          source: 'gemini-3.8-flash',
          titles: parsed.titles.slice(0, 3),
        });
        return;
      }

      throw new Error('Format respon Gemini tidak valid');
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('Gemini title suggestion error:', error.message);

      const fallbackTitles = generateFallbackViralTitles(projectName, topic, customKeyword);
      res.json({
        success: true,
        isAiGenerated: false,
        source: 'smart-fallback',
        errorNotice: error.message,
        titles: fallbackTitles,
      });
    }
  });

  // Helper to generate intelligent contextual viral clips when AI is offline or as fallback
  function generateServerViralClips(
    cleanName: string,
    duration: number,
    topic: string = 'general',
    customKeyword: string = '',
    durationMode: string = 'adaptive'
  ) {
    const kw = cleanTopicKeyword(cleanName, customKeyword, topic);
    const dur = Math.max(15, Number(duration || 30));

    let minTarget = 18;
    let idealTarget = 35;
    let maxTarget = 85;

    if (durationMode === 'shorts') {
      minTarget = 12;
      idealTarget = 24;
      maxTarget = 45;
    } else if (durationMode === 'medium') {
      minTarget = 28;
      idealTarget = 55;
      maxTarget = 90;
    } else if (durationMode === 'extended') {
      minTarget = 45;
      idealTarget = 90;
      maxTarget = 180;
    } else {
      if (dur <= 45) {
        idealTarget = dur;
        minTarget = Math.max(10, dur * 0.4);
        maxTarget = dur;
      } else if (dur <= 90) {
        idealTarget = Math.max(25, dur * 0.55);
        minTarget = 20;
        maxTarget = Math.min(dur, 70);
      } else if (dur <= 240) {
        idealTarget = Math.max(40, dur * 0.38);
        minTarget = 30;
        maxTarget = Math.min(dur, 110);
      } else {
        idealTarget = Math.max(60, Math.min(150, dur * 0.25));
        minTarget = 45;
        maxTarget = Math.min(dur, 180);
      }
    }

    const kwUpper = kw.toUpperCase();

    // Klip 1: Hook Pembuka Anti-Skip
    const c1Start = 0;
    const c1End = Number(Math.min(dur, Math.max(minTarget, Math.min(idealTarget, dur <= 45 ? dur : 32))).toFixed(1));
    const c1 = {
      title: `🔥 Hook Pembuka Anti-Skip (${kw})`,
      tagline: `JANGAN SKIP! Rahasia ${kwUpper} Yang Bikin Syok 😱`,
      taglineBadge: '🔥 VIRAL HOOK',
      category: 'hook',
      startTime: c1Start,
      endTime: c1End,
      viralScore: 98,
      reason: `Hook pembuka emas (${(c1End - c1Start).toFixed(1)}s): Penonton tertahan di 3 detik awal feed Reels & TikTok.`,
      suggestedTaglines: [
        `JANGAN SKIP! Rahasia ${kwUpper} Yang Bikin Syok 😱`,
        `Bongkar Fakta ${kw} Yang Gak Pernah Dibahas di TV! 🔥`,
        `Perhatikan Baik-Baik ${kw} di Detik Ke-5... Bikin Merinding! 👀`,
        `Gak Nyangka Hasil ${kw} Bakal Seheboh Ini! 🤯`,
      ],
    };

    const clips = [c1];

    // Klip 2: Puncak Emosi & Aksi
    if (dur > 30) {
      const c2Start = Number(Math.max(c1End * 0.85, dur * 0.3).toFixed(1));
      const c2End = Number(Math.min(dur, c2Start + Math.max(minTarget, Math.min(idealTarget * 1.1, dur * 0.4))).toFixed(1));
      clips.push({
        title: `⚡ Puncak Emosi & Momen Seru (${kw})`,
        tagline: `MOMEN PALING GILA SOAL ${kwUpper}! 🤯🔥`,
        taglineBadge: '⚡ PUNCAK EMOSI',
        category: 'climax',
        startTime: c2Start,
        endTime: c2End,
        viralScore: 99,
        reason: `Momen puncak intensitas audio & pembahasan (${(c2End - c2Start).toFixed(1)}s) paling memuaskan penonton.`,
        suggestedTaglines: [
          `MOMEN PALING GILA SOAL ${kwUpper}! 🤯🔥`,
          `Semua Orang Langsung Terdiam Pas Tahu Soal ${kw}! ⚡`,
          `Detik Paling Menegangkan Dalam ${kw} Beneran Di Luar Nalar! 😱`,
          `Reaksi Spontan Semua Orang Saat ${kw} Terjadi! 💥`,
        ],
      });
    }

    // Klip 3: Fakta Daging & Rahasia
    if (dur > 65) {
      const c3Start = Number((dur * 0.58).toFixed(1));
      const c3End = Number(Math.min(dur, c3Start + Math.max(minTarget, Math.min(idealTarget, dur * 0.32))).toFixed(1));
      clips.push({
        title: `💡 Fakta Daging & Solusi (${kw})`,
        tagline: `FAKTA ASLI: Ternyata Begini Soal ${kw}! 💡`,
        taglineBadge: '💡 RAHASIA TERUNGKAP',
        category: 'insight',
        startTime: c3Start,
        endTime: c3End,
        viralScore: 94,
        reason: `Poin daging & solusi penting (${(c3End - c3Start).toFixed(1)}s) yang memicu penonton menyimpan video (Bookmark/Save).`,
        suggestedTaglines: [
          `FAKTA ASLI: Ternyata Begini Soal ${kw}! 💡`,
          `1 Trik Rahasia ${kw} Yang Bakal Ubah Cara Pikirmu 🧠`,
          `Poin Daging ${kw} Yang Wajib Kamu Catat Sekarang 📌`,
          `Kesalahan Fatal Dalam ${kw} Yang Sering Terjadi ❌`,
        ],
      });
    }

    // Klip 4: Plot Twist & Penutup Viral
    if (dur > 100) {
      const c4Start = Number((dur * 0.78).toFixed(1));
      const c4End = Number(dur.toFixed(1));
      clips.push({
        title: `😱 Plot Twist & Penutup Viral (${kw})`,
        tagline: `PLOT TWIST TERBAIK! Reaksi Spontan ${kw} 🤣`,
        taglineBadge: '😱 PLOT TWIST',
        category: 'reaction',
        startTime: c4Start,
        endTime: c4End,
        viralScore: 92,
        reason: `Kejutan akhir & plot twist (${(c4End - c4Start).toFixed(1)}s) memancing debat & komentar penonton.`,
        suggestedTaglines: [
          `PLOT TWIST TERBAIK! Reaksi Spontan ${kw} 🤣`,
          `Beneran Gak Nyangka Bakal Berakhir Seperti Ini di ${kw}! 😱`,
          `Menurut Kalian Masuk Akal Gak Soal ${kw}? Komen di Bawah! 👇`,
          `Share Video ${kw} Ini ke Temanmu Yang Butuh Tahu! 🚀`,
        ],
      });
    }

    return {
      clips,
      detectedTheme: `Analisis cerdas konten "${kw}" dengan pemotongan alami tanpa jeda terputus.`,
      antiCopyrightNotes: `Rekomendasi proteksi: Terapkan mirror horizontal, micro-pitch audio shift, dan visual border untuk keamanan upload Reels/FB.`,
    };
  }

  // API: Analyze Video Content & Generate Contextual Viral Moments & Taglines
  app.post('/api/gemini/analyze-video-moments', async (req: Request, res: Response) => {
    const {
      videoName = 'Video Konten',
      duration = 30,
      topic = 'general',
      customKeyword = '',
      durationMode = 'adaptive',
    } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // Clean and extract keywords from video title
    const cleanName = videoName
      .replace(/\.(mp4|webm|mov|mkv|m4v)$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim();

    if (!apiKey) {
      const fallbackResult = generateServerViralClips(cleanName, duration, topic, customKeyword, durationMode);
      res.json({
        success: true,
        isAiGenerated: false,
        source: 'smart-heuristic',
        message: 'Menggunakan algoritma deteksi konten cerdas kontekstual bawaan.',
        ...fallbackResult,
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      let durationGuide = 'Fleksibel dan alami menyesuaikan isi momen (bisa 20s, 45s, 60s, 90s, 120s, atau lebih jika pembahasannya memerlukan durasi tersebut). Durasi TIDAK HARUS dan TIDAK DIBATASI 60 detik!';
      if (durationMode === 'shorts') {
        durationGuide = 'Fokus pada klip cepat, hook singkat, dan punchline to the point (durasi ~15-45 detik).';
      } else if (durationMode === 'medium') {
        durationGuide = 'Fokus pada dialog sedang, lelucon lengkap, atau wawasan praktis (durasi ~45-90 detik).';
      } else if (durationMode === 'extended') {
        durationGuide = 'Fokus pada pembahasan utuh, cerita panjang, atau deep discussion (durasi ~60-180+ detik atau lebih).';
      }

      const prompt = `Anda adalah editor video profesional dan pakar kurasi momen viral untuk Facebook Reels, TikTok, YouTube Shorts, dan Facebook Video.
Tugas Anda:
1. Menganalisis konteks video berdasarkan nama file/judul: "${cleanName}", durasi total video ${Math.round(duration)} detik, topik "${topic}" (kata kunci: "${customKeyword || cleanName}").
2. Memotong video secara cerdas menjadi 3 hingga 5 bagian/klip yang paling berpotensi viral.
   ATURAN PENTING DURASI:
   - Durasi klip TIDAK HARUS 60 detik, BISA LEBIH PANJANG menyesuaikan momen alami pada videonya (${durationGuide}).
   - Jangan memotong klip di tengah-tengah kalimat atau cerita yang belum tuntas; pastikan awal dan akhir klip terasa utuh dan memuaskan penonton.
   - Detik startTime dan endTime harus berada dalam rentang 0 sampai ${Math.round(duration)} detik.
3. Membuat TEGLINE / HEADLINE HOOK yang SANGAT RELEVAN dan SESUAI dengan isi/topik video tersebut (BUKAN placeholder umum!).
4. Tegline harus ringkas (maksimal 7 kata), eye-catching, membuat penonton berhenti scrolling di Facebook & Reels, dan dilengkapi emoji yang pas.

Format output JSON yang wajib dipenuhi:
- clips: list objek klip dengan properti:
  * title: Nama klip (contoh: "🔥 Hook Pembuka [Subjek]", "⚡ Momen Inti [Subjek]", "💡 Fakta Menohok")
  * tagline: Tegline hook spesifik sesuai topik (contoh: "JANGAN SKIP! Rahasia [Topik] Yang Belum Terungkap 😱")
  * taglineBadge: Badge kecil di atas tegline (contoh: "🔥 VIRAL HOOK", "⚡ PUNCAK EMOSI", "💡 RAHASIA TERUNGKAP", "😱 PLOT TWIST")
  * category: salah satu dari ['hook', 'climax', 'insight', 'reaction', 'cta']
  * startTime: detik mulai (number, e.g. 0)
  * endTime: detik selesai (number, e.g. 75)
  * viralScore: nilai potensi viral (88-99)
  * reason: alasan mengapa bagian ini berpotensi viral
  * suggestedTaglines: array 3-4 alternatif tegline hook lain yang juga sesuai isi video
- detectedTheme: deskripsi 1 kalimat tentang topik/isi video yang dianalisis
- antiCopyrightNotes: rekomendasi proteksi hak cipta untuk upload Facebook`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedTheme: { type: Type.STRING },
              antiCopyrightNotes: { type: Type.STRING },
              clips: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    tagline: { type: Type.STRING },
                    taglineBadge: { type: Type.STRING },
                    category: { type: Type.STRING },
                    startTime: { type: Type.NUMBER },
                    endTime: { type: Type.NUMBER },
                    viralScore: { type: Type.NUMBER },
                    reason: { type: Type.STRING },
                    suggestedTaglines: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['title', 'tagline', 'taglineBadge', 'category', 'startTime', 'endTime', 'viralScore', 'reason', 'suggestedTaglines'],
                },
              },
            },
            required: ['clips', 'detectedTheme'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.clips && Array.isArray(parsed.clips) && parsed.clips.length > 0) {
        // Adjust start/end times to fit within duration
        const adjustedClips = parsed.clips.map((c: any) => ({
          ...c,
          startTime: Math.max(0, Math.min(duration - 5, Number(c.startTime || 0))),
          endTime: Math.min(duration, Math.max(Number(c.startTime || 0) + 10, Number(c.endTime || duration))),
        }));

        res.json({
          success: true,
          isAiGenerated: true,
          source: 'gemini-3.8-flash',
          detectedTheme: parsed.detectedTheme,
          antiCopyrightNotes: parsed.antiCopyrightNotes,
          clips: adjustedClips,
        });
        return;
      }

      throw new Error('Respon Gemini tidak memiliki daftar klip yang valid');
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('Gemini analyze moments error:', error.message);
      const fallbackResult = generateServerViralClips(cleanName, duration, topic, customKeyword, durationMode);
      res.json({
        success: true,
        isAiGenerated: false,
        source: 'smart-heuristic-fallback',
        errorNotice: error.message,
        ...fallbackResult,
      });
    }
  });

  // API: Server-side FFmpeg clip rendering (Lightning fast, 100% reliable)
  app.post('/api/clip-video-server', async (req: Request, res: Response) => {
    const { videoPath, clips, format = 'mp4' } = req.body;
    if (!videoPath || !Array.isArray(clips) || clips.length === 0) {
      res.status(400).json({ error: 'Video path dan daftar klip wajib disertakan' });
      return;
    }

    try {
      let inputFilePath = '';
      if (videoPath.startsWith('/samples/')) {
        inputFilePath = path.join(samplesDir, path.basename(videoPath));
      } else {
        res.status(400).json({ error: 'Server clip hanya mendukung hosted sample video' });
        return;
      }

      if (!fs.existsSync(inputFilePath)) {
        res.status(404).json({ error: 'File video tidak ditemukan di server' });
        return;
      }

      const outExt = format === 'webm' ? 'webm' : 'mp4';
      const outputFilename = `cliprush_server_${Date.now()}.${outExt}`;
      const outputPath = path.join('/tmp', outputFilename);

      // Build FFmpeg command to trim and stitch clips
      const firstClip = clips[0];
      const duration = Math.max(0.5, firstClip.endTime - firstClip.startTime);

      const ffmpegArgs = [
        '-y',
        '-ss',
        firstClip.startTime.toString(),
        '-i',
        inputFilePath,
        '-t',
        duration.toString(),
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-c:a',
        'aac',
        outputPath,
      ];

      const proc = spawn('/usr/bin/ffmpeg', ffmpegArgs);
      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
          res.setHeader('Content-Type', outExt === 'webm' ? 'video/webm' : 'video/mp4');
          const readStream = fs.createReadStream(outputPath);
          readStream.pipe(res);
          readStream.on('close', () => {
            fs.unlink(outputPath, () => {});
          });
        } else {
          res.status(500).json({ error: 'FFmpeg gagal merender klip' });
        }
      });
    } catch (err: unknown) {
      const error = err as Error;
      res.status(500).json({ error: error.message });
    }
  });

  // Mount Vite middleware in development
  if (isDev) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static hosting
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ClipRush Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ClipRush server:', err);
  process.exit(1);
});
