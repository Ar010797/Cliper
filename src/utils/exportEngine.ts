import { ExportSettings, VideoClip } from '../types';
import { calculateDynamicPanAndScan, AutoReframer } from './autoReframing';

let ffmpegInstance: unknown = null;
let ffmpegLoadingPromise: Promise<unknown> | null = null;

/**
 * Initializes and loads ffmpeg.wasm v0.12 via ESM / CDN toBlobURL
 */
export async function getFFmpeg(onStatusUpdate?: (status: string) => void): Promise<unknown> {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoadingPromise) return ffmpegLoadingPromise;

  ffmpegLoadingPromise = (async () => {
    try {
      onStatusUpdate?.('Memuat mesin video FFmpeg.wasm...');
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');

      const ffmpeg = new FFmpeg();

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      onStatusUpdate?.('Mengunduh komponen WASM core...');

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      onStatusUpdate?.('Mesin video FFmpeg siap digunakan!');
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    } catch (err) {
      console.warn('FFmpeg wasm loading encountered an issue, falling back to MediaStream pipeline:', err);
      ffmpegLoadingPromise = null;
      throw err;
    }
  })();

  return ffmpegLoadingPromise;
}

export interface RenderProgress {
  percent: number;
  status: string;
  timeRemaining?: string;
  currentClipIndex?: number;
  totalClips?: number;
}

/**
 * Calculates target width and height based on resolution preset and aspect ratio
 */
export function getOutputDimensions(
  resolution: ExportSettings['resolution'],
  aspectRatio: ExportSettings['aspectRatio'],
  originalWidth: number,
  originalHeight: number
): { width: number; height: number } {
  let baseDimension = 720;
  if (resolution === '1080p') baseDimension = 1080;
  if (resolution === '720p') baseDimension = 720;
  if (resolution === '480p') baseDimension = 480;
  if (resolution === '360p') baseDimension = 360;
  if (resolution === 'original') baseDimension = Math.min(originalHeight || 720, 1080);

  let targetRatio = (originalWidth || 16) / (originalHeight || 9);
  if (aspectRatio === '16:9') targetRatio = 16 / 9;
  if (aspectRatio === '9:16') targetRatio = 9 / 16;
  if (aspectRatio === '1:1') targetRatio = 1;
  if (aspectRatio === '4:5') targetRatio = 4 / 5;
  if (aspectRatio === '21:9') targetRatio = 21 / 9;

  let width = 0;
  let height = 0;

  if (targetRatio >= 1) {
    // Landscape / Square
    height = baseDimension;
    width = Math.round(baseDimension * targetRatio);
  } else {
    // Portrait (e.g. 9:16)
    width = baseDimension;
    height = Math.round(baseDimension / targetRatio);
  }

  // Ensure even dimensions for video codecs
  if (width % 2 !== 0) width++;
  if (height % 2 !== 0) height++;

  return { width, height };
}

/**
 * Applies color filter on Canvas 2D context
 */
export function applyFilterToContext(ctx: CanvasRenderingContext2D, filter: ExportSettings['filter']) {
  switch (filter) {
    case 'warm':
      ctx.filter = 'sepia(0.3) saturate(1.3) brightness(1.05)';
      break;
    case 'cool':
      ctx.filter = 'hue-rotate(185deg) saturate(1.1) brightness(1.02)';
      break;
    case 'noir':
      ctx.filter = 'grayscale(1) contrast(1.25) brightness(0.95)';
      break;
    case 'vintage':
      ctx.filter = 'sepia(0.55) contrast(1.15) brightness(0.9)';
      break;
    case 'vibrant':
      ctx.filter = 'saturate(1.7) contrast(1.1)';
      break;
    case 'cinema':
      ctx.filter = 'contrast(1.2) saturate(1.2) brightness(0.95)';
      break;
    default:
      ctx.filter = 'none';
      break;
  }
}

/**
 * Helper to calculate positioning of video frame inside target dimensions
 */
export function calculateFrameLayout(
  width: number,
  height: number,
  vW: number,
  vH: number,
  fitMode: 'crop' | 'blur' | 'letterbox',
  focalPoint?: { x: number; y: number }
): { fX: number; fY: number; fW: number; fH: number } {
  if (fitMode === 'crop') {
    return calculateDynamicPanAndScan(width, height, vW, vH, focalPoint || { x: 0.5, y: 0.5 });
  } else {
    // blur or letterbox
    const scale = Math.min(width / vW, height / vH);
    const fW = vW * scale;
    const fH = vH * scale;
    return {
      fX: (width - fW) / 2,
      fY: (height - fH) / 2,
      fW,
      fH,
    };
  }
}

/**
 * Wraps text into lines that do not exceed maxWidth
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const result: string[] = [];
  const rawLines = text.split('\n');
  for (const rawLine of rawLines) {
    if (!rawLine.trim()) {
      result.push('');
      continue;
    }
    const words = rawLine.split(' ');
    let curLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const test = `${curLine} ${word}`;
      if (ctx.measureText(test).width <= maxWidth) {
        curLine = test;
      } else {
        result.push(curLine);
        curLine = word;
      }
    }
    result.push(curLine);
  }
  return result;
}

/**
 * Draws caption overlay onto canvas with safe 9:16 positioning that never obscures the video
 */
export function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  overlay: ExportSettings['overlay'],
  width: number,
  height: number,
  frameLayout?: { fX: number; fY: number; fW: number; fH: number; isPortrait?: boolean }
) {
  if (!overlay.enabled || !overlay.text.trim()) return;

  ctx.save();
  ctx.filter = 'none';

  const isPortrait = height > width;
  const fontStyle = overlay.fontStyle === 'italic' ? 'italic ' : '';
  const fontWeight = overlay.fontStyle === 'bold' ? 'bold ' : '700 ';

  // Proportional font sizing: in 9:16, keep font compact and neat so it doesn't overwhelm
  let fontSize = Math.max(16, Math.round((overlay.fontSize / 720) * (isPortrait ? width : height)));
  if (isPortrait) {
    fontSize = Math.min(fontSize, Math.round(width * 0.052));
  }
  fontSize = Math.max(14, fontSize);

  ctx.font = `${fontStyle}${fontWeight}${fontSize}px 'Plus Jakarta Sans', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxTextWidth = Math.round(width * 0.84);
  const lines = wrapText(ctx, overlay.text, maxTextWidth);

  // Determine Y position carefully to NEVER cover the video, especially in 9:16
  let y = height * 0.85;

  if (isPortrait && frameLayout && (frameLayout.fY > 30)) {
    // 9:16 with letterbox or blur: video sits in the middle
    // Upper margin is 0 to frameLayout.fY
    // Lower margin is (frameLayout.fY + frameLayout.fH) to height
    const topMarginHeight = frameLayout.fY;
    const bottomMarginStart = frameLayout.fY + frameLayout.fH;
    const bottomMarginHeight = height - bottomMarginStart;

    if (overlay.position === 'top') {
      // Place in top safe header area
      y = Math.max(fontSize * 1.5, topMarginHeight * 0.52);
    } else if (overlay.position === 'bottom') {
      // Place in bottom safe footer area
      y = bottomMarginStart + bottomMarginHeight * 0.48;
    } else {
      // If 'middle' was selected, do NOT block center of video! Place in bottom safe footer
      y = bottomMarginStart + bottomMarginHeight * 0.48;
    }
  } else if (isPortrait) {
    // 9:16 crop mode (full height)
    if (overlay.position === 'top') {
      y = height * 0.12; // safe top zone
    } else if (overlay.position === 'middle') {
      y = height * 0.74; // safe lower third (never blocking face in center)
    } else {
      y = height * 0.84; // safe bottom zone
    }
  } else {
    // Landscape / Square
    if (overlay.position === 'top') y = height * 0.13;
    if (overlay.position === 'middle') y = height * 0.5;
    if (overlay.position === 'bottom') y = height * 0.86;
  }

  // Draw optional tagline badge (e.g. 🔥 VIRAL HOOK)
  if (overlay.taglineBadge) {
    const badgeFontSize = Math.max(11, Math.round(fontSize * 0.45));
    ctx.save();
    ctx.font = `bold ${badgeFontSize}px 'Plus Jakarta Sans', sans-serif`;
    const badgeMetrics = ctx.measureText(overlay.taglineBadge);
    const bW = badgeMetrics.width + badgeFontSize * 1.8;
    const bH = badgeFontSize * 2;
    const bY = y - (lines.length * fontSize * 0.7) - bH * 0.6;

    ctx.fillStyle = '#f59e0b'; // amber
    ctx.beginPath();
    ctx.roundRect(width / 2 - bW / 2, bY - bH / 2, bW, bH, bH / 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.fillText(overlay.taglineBadge, width / 2, bY + 1);
    ctx.restore();
  }

  const lineHeight = fontSize * 1.35;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, idx) => {
    const textY = startY + idx * lineHeight;
    const metrics = ctx.measureText(line);
    const textWidth = metrics.width;
    const paddingX = Math.round(fontSize * 0.65);
    const paddingY = Math.round(fontSize * 0.32);

    // Background box
    if (overlay.bgColor && overlay.bgColor !== 'transparent') {
      ctx.fillStyle = overlay.bgColor;
      ctx.beginPath();
      ctx.roundRect(
        width / 2 - textWidth / 2 - paddingX,
        textY - fontSize / 2 - paddingY,
        textWidth + paddingX * 2,
        fontSize + paddingY * 2,
        Math.min(10, fontSize * 0.35)
      );
      ctx.fill();
    }

    // TikTok style thick black outline stroke for maximum readability
    if (overlay.presetStyle === 'tiktok_yellow') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(3, fontSize * 0.15);
      ctx.lineJoin = 'round';
      ctx.strokeText(line, width / 2, textY);
    }

    // Text with soft shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = overlay.presetStyle === 'neon_glow' ? 14 : 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = overlay.textColor || '#ffffff';
    ctx.fillText(line, width / 2, textY);
  });

  ctx.restore();
}

/**
 * Renders video frame with full effects:
 * - FitMode (blur, crop, letterbox)
 * - Color filter
 * - Anti-Copyright Facebook Shield (Horizontal mirror, micro-zoom, color shift, border)
 * - Text overlay & Tagline (drawn upright, never flipped, in safe zone)
 */
export function renderVideoFrameWithEffects(
  ctx: CanvasRenderingContext2D,
  videoElement: HTMLVideoElement,
  width: number,
  height: number,
  settings: ExportSettings,
  clipTagline?: string,
  clipBadge?: string,
  focalPoint?: { x: number; y: number }
) {
  const vW = videoElement.videoWidth || 1280;
  const vH = videoElement.videoHeight || 720;
  const anti = settings.antiCopyright;
  const isAntiEnabled = Boolean(anti?.enabled);
  const isFlipped = isAntiEnabled && Boolean(anti?.flipHorizontal);
  const hasMicroZoom = isAntiEnabled && Boolean(anti?.microZoom);
  const hasColorShift = isAntiEnabled && Boolean(anti?.colorShift);
  const hasBorder = isAntiEnabled && Boolean(anti?.borderFrame);

  let frameLayout = calculateFrameLayout(width, height, vW, vH, settings.fitMode, focalPoint);

  if (hasMicroZoom) {
    const zoom = 1.03;
    const dW = frameLayout.fW * (zoom - 1);
    const dH = frameLayout.fH * (zoom - 1);
    frameLayout = {
      fX: frameLayout.fX - dW / 2,
      fY: frameLayout.fY - dH / 2,
      fW: frameLayout.fW * zoom,
      fH: frameLayout.fH * zoom,
    };
  }

  // Draw video background & foreground with optional horizontal flip
  ctx.save();
  if (isFlipped) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  // Color filter + micro color shift for anti-copyright
  const getFilterString = () => {
    let f = '';
    switch (settings.filter) {
      case 'warm': f = 'sepia(0.3) saturate(1.3) brightness(1.05)'; break;
      case 'cool': f = 'hue-rotate(185deg) saturate(1.1) brightness(1.02)'; break;
      case 'noir': f = 'grayscale(1) contrast(1.25) brightness(0.95)'; break;
      case 'vintage': f = 'sepia(0.55) contrast(1.15) brightness(0.9)'; break;
      case 'vibrant': f = 'saturate(1.7) contrast(1.1)'; break;
      case 'cinema': f = 'contrast(1.2) saturate(1.2) brightness(0.95)'; break;
      default: f = ''; break;
    }
    if (hasColorShift) {
      f = (f ? f + ' ' : '') + 'contrast(1.04) saturate(1.06) brightness(1.01)';
    }
    return f || 'none';
  };

  if (settings.fitMode === 'blur') {
    ctx.save();
    try {
      ctx.filter = 'blur(12px) brightness(0.55)';
    } catch {
      // Fallback on browsers that don't support ctx.filter
    }
    ctx.drawImage(videoElement, -width * 0.1, -height * 0.1, width * 1.2, height * 1.2);
    ctx.restore();

    ctx.save();
    try {
      const fStr = getFilterString();
      if (fStr !== 'none') ctx.filter = fStr;
    } catch {
      // ignore
    }
    ctx.drawImage(videoElement, frameLayout.fX, frameLayout.fY, frameLayout.fW, frameLayout.fH);
    ctx.restore();
  } else if (settings.fitMode === 'crop') {
    ctx.save();
    ctx.filter = getFilterString();
    ctx.drawImage(videoElement, frameLayout.fX, frameLayout.fY, frameLayout.fW, frameLayout.fH);
    ctx.restore();
  } else {
    // letterbox
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.filter = getFilterString();
    ctx.drawImage(videoElement, frameLayout.fX, frameLayout.fY, frameLayout.fW, frameLayout.fH);
    ctx.restore();
  }

  // Restore transformation so overlay & border are NOT flipped
  ctx.restore();

  // Draw optional anti-copyright safe boundary frame
  if (hasBorder) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = Math.max(2, Math.round(width * 0.0035));
    ctx.strokeRect(3, 3, width - 6, height - 6);
    ctx.restore();
  }

  // Draw text overlay in safe zone (upright, crystal clear, never covering video)
  const effectiveOverlay = {
    ...settings.overlay,
    text: clipTagline || settings.overlay.text,
    taglineBadge: clipBadge || settings.overlay.taglineBadge,
  };

  drawTextOverlay(ctx, effectiveOverlay, width, height, {
    ...frameLayout,
    isPortrait: height > width,
  });
}

/**
 * Renders video clips into an exported video file
 */
export async function renderClipsToVideo(
  videoElement: HTMLVideoElement,
  clips: VideoClip[],
  settings: ExportSettings,
  onProgress: (p: RenderProgress) => void
): Promise<{ blob: Blob; filename: string }> {
  if (clips.length === 0) {
    throw new Error('Tidak ada klip yang dipilih untuk diexport.');
  }

  // Calculate total duration of all clips
  const totalClipsDuration = clips.reduce((acc, c) => acc + (c.endTime - c.startTime), 0);
  const effectiveDuration = totalClipsDuration / (settings.playbackSpeed || 1);

  const { width, height } = getOutputDimensions(
    settings.resolution,
    settings.aspectRatio,
    videoElement.videoWidth || 1280,
    videoElement.videoHeight || 720
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false })!;

  // Setup audio stream with persistent AudioContext to prevent InvalidStateError
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  // Retrieve or create persistent AudioContext on videoElement
  type ExtendedVideo = HTMLVideoElement & {
    __exportAudioCtx?: AudioContext;
    __exportAudioSource?: MediaElementAudioSourceNode;
  };
  const extVideo = videoElement as ExtendedVideo;

  let audioCtx = extVideo.__exportAudioCtx;
  if (!audioCtx || audioCtx.state === 'closed') {
    try {
      audioCtx = new AudioContextClass();
      extVideo.__exportAudioCtx = audioCtx;
    } catch (e) {
      console.warn('Could not create AudioContext:', e);
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {}
  }

  let sourceNode = extVideo.__exportAudioSource;
  if (audioCtx && !sourceNode) {
    try {
      sourceNode = audioCtx.createMediaElementSource(videoElement);
      extVideo.__exportAudioSource = sourceNode;
    } catch (e) {
      console.warn('Could not create MediaElementSource (might already exist):', e);
    }
  }

  let mediaDest: MediaStreamAudioDestinationNode | null = null;
  let recorderGain: GainNode | null = null;

  if (audioCtx && sourceNode) {
    try {
      mediaDest = audioCtx.createMediaStreamDestination();
      recorderGain = audioCtx.createGain();
      // Only mute if user requested muteAudio in settings
      recorderGain.gain.value = settings.muteAudio ? 0 : 1;

      // Facebook Anti-Copyright Audio Protection:
      // Inaudible EQ tilt & harmonic dispersion to break Content ID fingerprinting
      let finalAudioSource: AudioNode = sourceNode;
      if (settings.antiCopyright?.enabled && settings.antiCopyright.audioEqShift) {
        try {
          const hpFilter = audioCtx.createBiquadFilter();
          hpFilter.type = 'highpass';
          hpFilter.frequency.value = 75;

          const peakFilter = audioCtx.createBiquadFilter();
          peakFilter.type = 'peaking';
          peakFilter.frequency.value = 2800;
          peakFilter.gain.value = 1.8;
          peakFilter.Q.value = 1.0;

          sourceNode.connect(hpFilter);
          hpFilter.connect(peakFilter);
          finalAudioSource = peakFilter;
        } catch (filterErr) {
          console.warn('Anti-copyright audio EQ filter setup fallback:', filterErr);
        }
      }

      finalAudioSource.connect(recorderGain);
      recorderGain.connect(mediaDest);
      // NOTE: We deliberately do NOT connect to audioCtx.destination
      // so background rendering does not blast the user's laptop speakers!
    } catch (e) {
      console.warn('Audio node connection issue:', e);
    }
  }

  const canvasStream = canvas.captureStream(settings.fps || 30);
  const audioTracks = mediaDest ? mediaDest.stream.getAudioTracks() : [];
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioTracks,
  ]);

  // Determine container format
  let mimeType = 'video/webm;codecs=vp9,opus';
  if (settings.format === 'mp4') {
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2')) {
      mimeType = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    }
  }

  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  const bitrates = {
    original: 8000000,
    '1080p': 6000000,
    '720p': 3500000,
    '480p': 1800000,
    '360p': 1000000,
  };
  const videoBitsPerSecond = bitrates[settings.resolution] || 3500000;

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
    videoBitsPerSecond,
  });

  const recordedChunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  const recordingCompletePromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(recordedChunks, { type: mimeType }));
    };
  });

  recorder.start(100);

  const autoReframer = new AutoReframer({
    mode: settings.reframeMode || 'smart_auto',
    smoothing: settings.reframeSmoothing || 0.12,
    manualX: settings.manualFocalX,
  });

  const prevMuted = videoElement.muted;
  const prevVolume = videoElement.volume;
  let renderedSecondsAccum = 0;

  try {
    for (let cIdx = 0; cIdx < clips.length; cIdx++) {
      const clip = clips[cIdx];
      const clipDuration = Math.max(0.1, clip.endTime - clip.startTime);
      autoReframer.reset(0.5, 0.5);

      // Adjust gain for clip-specific mute setting
      if (recorderGain) {
        recorderGain.gain.value = (settings.muteAudio || clip.isMuted) ? 0 : 1;
      }

      // CRITICAL FOR AUDIO: videoElement MUST NOT be muted for Web Audio to receive signal!
      videoElement.muted = false;
      videoElement.volume = 1;
      videoElement.currentTime = clip.startTime;
      const antiSpeed = (settings.antiCopyright?.enabled && settings.antiCopyright.microSpeed) ? 1.02 : 1.0;
      videoElement.playbackRate = (settings.playbackSpeed || 1) * antiSpeed;

      // Wait for seeked & ready state
      await new Promise<void>((res) => {
        let settled = false;
        const onReady = () => {
          if (settled) return;
          settled = true;
          videoElement.removeEventListener('seeked', onReady);
          videoElement.removeEventListener('canplay', onReady);
          res();
        };
        videoElement.addEventListener('seeked', onReady);
        videoElement.addEventListener('canplay', onReady);
        setTimeout(onReady, 500);
      });

      // Attempt playing unmuted video
      let playSucceeded = false;
      try {
        await videoElement.play();
        playSucceeded = !videoElement.paused;
      } catch {
        playSucceeded = false;
      }

      const drawCurrentFrame = () => {
        let focalPoint = { x: 0.5, y: 0.5 };
        if (settings.aspectRatio === '9:16' && settings.fitMode === 'crop') {
          const cam = autoReframer.update(videoElement);
          focalPoint = { x: cam.currentFocalX, y: cam.currentFocalY };
        }

        renderVideoFrameWithEffects(
          ctx,
          videoElement,
          width,
          height,
          settings,
          clip.tagline,
          clip.taglineBadge,
          focalPoint
        );
      };

      if (playSucceeded) {
        // High quality real-time playback loop
        while (!videoElement.paused && videoElement.currentTime < clip.endTime) {
          drawCurrentFrame();

          const currentProgInClip = Math.max(0, videoElement.currentTime - clip.startTime);
          const totalProgressSec = renderedSecondsAccum + currentProgInClip;
          const pct = Math.min(99, Math.round((totalProgressSec / totalClipsDuration) * 100));

          onProgress({
            percent: pct,
            status: `Merender klip ${cIdx + 1} dari ${clips.length} (${pct}%)...`,
            timeRemaining: `${Math.max(1, Math.round(((totalClipsDuration - totalProgressSec) / (settings.playbackSpeed || 1))))}s`,
            currentClipIndex: cIdx + 1,
            totalClips: clips.length,
          });

          await new Promise((r) => requestAnimationFrame(r));
        }
      } else {
        // Fallback discrete time-stepping loop
        const fps = settings.fps || 30;
        const step = 1 / fps;
        let t = clip.startTime;

        while (t < clip.endTime) {
          videoElement.currentTime = t;
          await new Promise<void>((r) => {
            const onSeek = () => {
              videoElement.removeEventListener('seeked', onSeek);
              r();
            };
            videoElement.addEventListener('seeked', onSeek);
            setTimeout(r, 60);
          });

          drawCurrentFrame();

          const currentProgInClip = t - clip.startTime;
          const totalProgressSec = renderedSecondsAccum + currentProgInClip;
          const pct = Math.min(99, Math.round((totalProgressSec / totalClipsDuration) * 100));

          onProgress({
            percent: pct,
            status: `Merender presisi klip ${cIdx + 1}/${clips.length}... (${pct}%)`,
            timeRemaining: `${Math.max(1, Math.round(totalClipsDuration - totalProgressSec))}s`,
            currentClipIndex: cIdx + 1,
            totalClips: clips.length,
          });

          t += step;
          await new Promise((r) => setTimeout(r, 1000 / fps));
        }
      }

      videoElement.pause();
      renderedSecondsAccum += clipDuration;
    }
  } finally {
    videoElement.pause();
    videoElement.playbackRate = 1;
    videoElement.muted = prevMuted;
    videoElement.volume = prevVolume;

    // Disconnect ephemeral recorder nodes
    if (recorderGain && sourceNode) {
      try {
        sourceNode.disconnect(recorderGain);
        recorderGain.disconnect();
      } catch {}
    }

    try {
      recorder.stop();
    } catch {}
  }

  onProgress({
    percent: 100,
    status: 'Finalisasi file video...',
    timeRemaining: '0s',
  });

  const outputBlob = await recordingCompletePromise;

  // Clean filename
  const timestamp = new Date().toISOString().slice(0, 10);
  const ext = settings.format === 'mp4' ? 'mp4' : settings.format === 'webm' ? 'webm' : 'mp4';
  const filename = `cliprush_${timestamp}_${clips.length}clips.${ext}`;

  return { blob: outputBlob, filename };
}
