/**
 * Generates an interactive synthetic sample video file in-memory using Canvas & Web Audio.
 * Features 4 animated scenes with alternating voice/sound bursts and clear silence pauses
 * so users can immediately test Smart Cut, Silence Detection, Waveform Timeline, and Export!
 */
export async function createDemoSampleVideo(): Promise<{ blob: Blob; filename: string }> {
  const width = 1280;
  const height = 720;
  const fps = 30;
  const durationSec = 8;
  const totalFrames = fps * durationSec;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Web Audio synthetic sound generation
  const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtxClass();
  const dest = audioCtx.createMediaStreamDestination();

  // Create oscillator and gain for beeps and voice synthesis
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(320, audioCtx.currentTime);

  // Filter to make it sound like robotic speech
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, audioCtx.currentTime);
  filter.Q.setValueAtTime(4, audioCtx.currentTime);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  // Setup sound bursts & silences:
  // 0 - 2.8s: Sound ON (Scene 1: Introduction)
  // 2.8 - 4.2s: SILENCE (1.4s pause)
  // 4.2 - 8.0s: Sound ON (Scene 2: Viral Climax & CTA)
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  const now = audioCtx.currentTime;

  // Sound burst 1
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.setValueAtTime(0.3, now + 2.7);
  gain.gain.setValueAtTime(0.0001, now + 2.8); // Silence starts

  // Sound burst 2
  gain.gain.setValueAtTime(0.0001, now + 4.1);
  gain.gain.setValueAtTime(0.35, now + 4.2);
  gain.gain.setValueAtTime(0.35, now + 7.9);
  gain.gain.setValueAtTime(0.0001, now + 8.0);

  osc.start(now);

  const canvasStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  let mimeType = 'video/webm;codecs=vp9,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/mp4';
    }
  }

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
    videoBitsPerSecond: 3000000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingDone = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/mp4' }));
    };
  });

  recorder.start();

  // Render loop
  const startTime = performance.now();
  for (let frame = 0; frame <= totalFrames; frame++) {
    const curSec = frame / fps;

    // Background gradient animation
    const grad = ctx.createLinearGradient(0, 0, width, height);
    if (curSec < 3.5) {
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#4338ca');
    } else if (curSec < 5.5) {
      // Silence zone
      grad.addColorStop(0, '#18181b');
      grad.addColorStop(1, '#27272a');
    } else if (curSec < 9.0) {
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(1, '#059669');
    } else if (curSec < 10.8) {
      // Silence zone
      grad.addColorStop(0, '#18181b');
      grad.addColorStop(1, '#27272a');
    } else {
      grad.addColorStop(0, '#701a75');
      grad.addColorStop(1, '#d946ef');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Animated dynamic orb
    const orbX = width / 2 + Math.cos(curSec * 2.5) * 220;
    const orbY = height / 2 + Math.sin(curSec * 2.5) * 80;
    const orbGrad = ctx.createRadialGradient(orbX, orbY, 10, orbX, orbY, 140);
    orbGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    orbGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.6)');
    orbGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(orbX, orbY, 140, 0, Math.PI * 2);
    ctx.fill();

    // Scene badge & title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';

    let sceneLabel = '';
    let isSilent = false;
    if (curSec < 3.5) {
      sceneLabel = 'SEGMEN 1: PENGANTAR (SUARA AKTIF)';
    } else if (curSec < 5.5) {
      sceneLabel = '⚠️ JEDA HENING #1 (2 Detik Hening)';
      isSilent = true;
    } else if (curSec < 9.0) {
      sceneLabel = 'SEGMEN 2: PRESENTASI FITUR (SUARA AKTIF)';
    } else if (curSec < 10.8) {
      sceneLabel = '⚠️ JEDA HENING #2 (1.8 Detik Hening)';
      isSilent = true;
    } else {
      sceneLabel = 'SEGMEN 3: KESIMPULAN / OUTRO';
    }

    ctx.fillText(sceneLabel, width / 2, 280);

    // Subtitle description
    ctx.font = '24px sans-serif';
    ctx.fillStyle = isSilent ? '#f87171' : '#a5f3fc';
    const sub = isSilent
      ? 'Mode Smart Cut akan mendeteksi jeda ini dan memotongnya otomatis!'
      : 'ClipRush Audio Detector aktif menganalisis RMS gelombang suara.';
    ctx.fillText(sub, width / 2, 340);

    // Timecode box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.roundRect(width / 2 - 180, 420, 360, 70, 16);
    ctx.fill();

    ctx.fillStyle = '#f3f4f6';
    ctx.font = 'bold 32px monospace';
    ctx.fillText(`TIMECODE: ${curSec.toFixed(2)}s / ${durationSec}.00s`, width / 2, 468);

    // Audio level meter indicator
    ctx.fillStyle = isSilent ? '#ef4444' : '#10b981';
    ctx.fillRect(width / 2 - 150, 520, isSilent ? 20 : 300, 12);

    // Snappy frame progression for instant sample video creation
    await new Promise((r) => setTimeout(r, 8));
  }

  recorder.stop();
  try {
    osc.stop();
    await audioCtx.close();
  } catch {
    // ignore
  }

  const resultBlob = await recordingDone;
  return {
    blob: resultBlob,
    filename: 'cliprush_demo_sample.mp4',
  };
}
