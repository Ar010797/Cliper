/**
 * Auto-Reframing & Intelligent Pan-and-Scan Engine
 * Automatically detects the primary subject (speaker, face, or action/motion)
 * in wide/landscape video frames and dynamically calculates smooth camera pan coordinates
 * for 9:16 export and real-time preview, keeping subjects centered at all times.
 */

export type ReframeMode =
  | 'smart_auto'   // Speaker + Action motion balanced
  | 'speaker'      // Focus heavily on speaker face & upper-body
  | 'action'       // Focus heavily on high-energy motion & action
  | 'center'       // Locked at center 50%
  | 'manual';      // Manual focal point set by user

export interface DetectedSubject {
  x: number;          // Normalized 0..1 (horizontal center of subject)
  y: number;          // Normalized 0..1 (vertical center of subject)
  width: number;      // Normalized bounding box width
  height: number;     // Normalized bounding box height
  confidence: number; // 0..1 confidence score
  type: 'speaker' | 'action' | 'center';
  label: string;
}

export interface ReframeCameraState {
  currentFocalX: number; // Smoothed camera X position (0..1)
  currentFocalY: number; // Smoothed camera Y position (0..1)
  targetFocalX: number;  // Instant target X
  targetFocalY: number;  // Instant target Y
  velocity: number;      // Current pan velocity
  subject: DetectedSubject;
}

export interface ReframeConfig {
  mode: ReframeMode;
  smoothing: number;      // 0.05 (very smooth glide) to 0.4 (snappy)
  deadzone: number;       // Ignore small micro-movements (e.g. 0.03)
  manualX?: number;       // For manual mode (0..1)
  manualY?: number;
}

export const DEFAULT_REFRAME_CONFIG: ReframeConfig = {
  mode: 'smart_auto',
  smoothing: 0.12,
  deadzone: 0.025,
};

/**
 * Fast offscreen analyzer for detecting primary subjects in video frames.
 * Uses lightweight computer vision (skin-tone clustering, temporal frame-differencing motion flow,
 * and high-frequency contrast) without external heavy dependencies.
 */
export class AutoReframer {
  private analysisCanvas: HTMLCanvasElement;
  private analysisCtx: CanvasRenderingContext2D | null;
  private prevFrameData: Uint8ClampedArray | null = null;
  private cameraState: ReframeCameraState;
  private config: ReframeConfig;

  // Analysis resolution: small for blazing-fast 60 FPS performance without CPU drop
  private readonly aW = 160;
  private readonly aH = 90;

  constructor(config: Partial<ReframeConfig> = {}) {
    this.config = { ...DEFAULT_REFRAME_CONFIG, ...config };
    this.analysisCanvas = document.createElement('canvas');
    this.analysisCanvas.width = this.aW;
    this.analysisCanvas.height = this.aH;
    this.analysisCtx = this.analysisCanvas.getContext('2d', { willReadFrequently: true });

    this.cameraState = {
      currentFocalX: 0.5,
      currentFocalY: 0.5,
      targetFocalX: 0.5,
      targetFocalY: 0.5,
      velocity: 0,
      subject: {
        x: 0.5,
        y: 0.4,
        width: 0.3,
        height: 0.5,
        confidence: 0.8,
        type: 'speaker',
        label: 'Subjek Terdeteksi',
      },
    };
  }

  public updateConfig(config: Partial<ReframeConfig>) {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): ReframeConfig {
    return { ...this.config };
  }

  public getState(): ReframeCameraState {
    return { ...this.cameraState };
  }

  /**
   * Resets camera to center position (e.g. when seeking or changing video)
   */
  public reset(focalX = 0.5, focalY = 0.5) {
    this.cameraState.currentFocalX = focalX;
    this.cameraState.currentFocalY = focalY;
    this.cameraState.targetFocalX = focalX;
    this.cameraState.targetFocalY = focalY;
    this.cameraState.velocity = 0;
    this.prevFrameData = null;
  }

  /**
   * Analyzes the current video frame and updates the smoothed camera pan position.
   * Returns the updated camera state.
   */
  public update(videoElement: HTMLVideoElement | HTMLCanvasElement): ReframeCameraState {
    if (this.config.mode === 'center') {
      this.cameraState.targetFocalX = 0.5;
      this.cameraState.targetFocalY = 0.5;
      this.cameraState.currentFocalX = 0.5;
      this.cameraState.currentFocalY = 0.5;
      this.cameraState.subject = {
        x: 0.5,
        y: 0.5,
        width: 0.3,
        height: 0.5,
        confidence: 1.0,
        type: 'center',
        label: 'Kunci Tengah (Center Lock)',
      };
      return this.cameraState;
    }

    if (this.config.mode === 'manual') {
      const targetX = this.config.manualX !== undefined ? this.config.manualX : 0.5;
      const targetY = this.config.manualY !== undefined ? this.config.manualY : 0.5;
      this.cameraState.targetFocalX = targetX;
      this.cameraState.targetFocalY = targetY;
      this.cameraState.currentFocalX = targetX;
      this.cameraState.currentFocalY = targetY;
      this.cameraState.subject = {
        x: targetX,
        y: targetY,
        width: 0.28,
        height: 0.5,
        confidence: 1.0,
        type: 'center',
        label: `Kamera Manual (${Math.round(targetX * 100)}%)`,
      };
      return this.cameraState;
    }

    if (!this.analysisCtx) return this.cameraState;

    try {
      // Draw scaled video frame onto analysis canvas
      this.analysisCtx.drawImage(videoElement, 0, 0, this.aW, this.aH);
      const imgData = this.analysisCtx.getImageData(0, 0, this.aW, this.aH);
      const pixels = imgData.data;

      const detected = this.detectPrimarySubject(pixels);

      // Scene-cut check: if frame difference is huge, snap instantly
      const isSceneCut = this.checkSceneCut(pixels);

      this.cameraState.subject = detected;
      this.cameraState.targetFocalX = detected.x;
      this.cameraState.targetFocalY = detected.y;

      if (isSceneCut) {
        // Snap immediately on scene transition
        this.cameraState.currentFocalX = detected.x;
        this.cameraState.currentFocalY = detected.y;
        this.cameraState.velocity = 0;
      } else {
        // Smooth cinematic pan-and-scan camera interpolation
        const diffX = detected.x - this.cameraState.currentFocalX;
        const diffY = detected.y - this.cameraState.currentFocalY;

        // Apply deadzone to eliminate micro-jitter
        const effectiveDiffX = Math.abs(diffX) < this.config.deadzone ? 0 : diffX;
        const effectiveDiffY = Math.abs(diffY) < this.config.deadzone ? 0 : diffY;

        const alpha = Math.max(0.04, Math.min(0.5, this.config.smoothing));
        this.cameraState.currentFocalX += effectiveDiffX * alpha;
        this.cameraState.currentFocalY += effectiveDiffY * alpha;
      }

      // Clamp camera focal point safely between 0.05 and 0.95
      this.cameraState.currentFocalX = Math.max(0.05, Math.min(0.95, this.cameraState.currentFocalX));
      this.cameraState.currentFocalY = Math.max(0.1, Math.min(0.9, this.cameraState.currentFocalY));

      // Save previous frame buffer for motion analysis
      if (!this.prevFrameData || this.prevFrameData.length !== pixels.length) {
        this.prevFrameData = new Uint8ClampedArray(pixels);
      } else {
        this.prevFrameData.set(pixels);
      }
    } catch {
      // Graceful fallback on canvas taint or read error
    }

    return this.cameraState;
  }

  /**
   * Fast heuristic detection of human speaker and action motion
   */
  private detectPrimarySubject(pixels: Uint8ClampedArray): DetectedSubject {
    let faceWeightSum = 0;
    let faceXSum = 0;
    let faceYSum = 0;
    let minFaceX = this.aW;
    let maxFaceX = 0;
    let minFaceY = this.aH;
    let maxFaceY = 0;

    let motionWeightSum = 0;
    let motionXSum = 0;
    let motionYSum = 0;
    let minMotionX = this.aW;
    let maxMotionX = 0;
    let minMotionY = this.aH;
    let maxMotionY = 0;

    const hasPrev = this.prevFrameData !== null && this.prevFrameData.length === pixels.length;

    // Scan pixel grid with step 2 for speed
    const step = 2;
    for (let y = 0; y < this.aH; y += step) {
      // Prioritize upper 65% of screen for faces / heads
      const faceVerticalWeight = y < this.aH * 0.7 ? 1.4 : 0.6;

      for (let x = 0; x < this.aW; x += step) {
        const idx = (y * this.aW + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];

        // 1. Skin-tone classifier in RGB color space
        const isSkin =
          r > 90 &&
          g > 38 &&
          b > 20 &&
          r > g &&
          r > b &&
          r - g > 12 &&
          Math.abs(r - g) > 10;

        if (isSkin) {
          const w = faceVerticalWeight;
          faceWeightSum += w;
          faceXSum += x * w;
          faceYSum += y * w;
          if (x < minFaceX) minFaceX = x;
          if (x > maxFaceX) maxFaceX = x;
          if (y < minFaceY) minFaceY = y;
          if (y > maxFaceY) maxFaceY = y;
        }

        // 2. Motion flow classifier (frame diff)
        if (hasPrev) {
          const pr = this.prevFrameData![idx];
          const pg = this.prevFrameData![idx + 1];
          const pb = this.prevFrameData![idx + 2];
          const diff = Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb);

          // Substantial motion threshold
          if (diff > 42) {
            motionWeightSum += diff;
            motionXSum += x * diff;
            motionYSum += y * diff;
            if (x < minMotionX) minMotionX = x;
            if (x > maxMotionX) maxMotionX = x;
            if (y < minMotionY) minMotionY = y;
            if (y > maxMotionY) maxMotionY = y;
          }
        }
      }
    }

    const hasFace = faceWeightSum > 35;
    const hasMotion = motionWeightSum > 400;

    let targetX = 0.5;
    let targetY = 0.45;
    let width = 0.35;
    let height = 0.5;
    let confidence = 0.75;
    let type: 'speaker' | 'action' | 'center' = 'center';
    let label = 'Subjek Utama';

    if (this.config.mode === 'action' && hasMotion) {
      targetX = motionXSum / motionWeightSum / this.aW;
      targetY = motionYSum / motionWeightSum / this.aH;
      width = Math.max(0.2, (maxMotionX - minMotionX) / this.aW);
      height = Math.max(0.3, (maxMotionY - minMotionY) / this.aH);
      confidence = Math.min(0.98, 0.7 + (motionWeightSum / 4000) * 0.25);
      type = 'action';
      label = `Aksi Gerakan (${Math.round(confidence * 100)}%)`;
    } else if (hasFace && (this.config.mode === 'speaker' || !hasMotion || faceWeightSum > 80)) {
      targetX = faceXSum / faceWeightSum / this.aW;
      targetY = faceYSum / faceWeightSum / this.aH;
      width = Math.max(0.22, (maxFaceX - minFaceX) / this.aW);
      height = Math.max(0.3, (maxFaceY - minFaceY) / this.aH);
      confidence = Math.min(0.99, 0.78 + (faceWeightSum / 600) * 0.2);
      type = 'speaker';
      label = `Pembicara Aktif (${Math.round(confidence * 100)}%)`;
    } else if (hasFace && hasMotion) {
      // Blend 60% face, 40% motion
      const fX = faceXSum / faceWeightSum / this.aW;
      const fY = faceYSum / faceWeightSum / this.aH;
      const mX = motionXSum / motionWeightSum / this.aW;
      const mY = motionYSum / motionWeightSum / this.aH;
      targetX = fX * 0.65 + mX * 0.35;
      targetY = fY * 0.65 + mY * 0.35;
      width = 0.32;
      height = 0.52;
      confidence = 0.92;
      type = 'speaker';
      label = `Pembicara & Aksi (92%)`;
    } else {
      // Natural center with slight rule-of-thirds upper offset
      targetX = 0.5;
      targetY = 0.45;
      confidence = 0.8;
      type = 'center';
      label = 'Pusat Video (Center)';
    }

    return {
      x: Math.max(0.1, Math.min(0.9, targetX)),
      y: Math.max(0.15, Math.min(0.85, targetY)),
      width: Math.min(0.8, width),
      height: Math.min(0.85, height),
      confidence,
      type,
      label,
    };
  }

  /**
   * Checks if an abrupt shot cut happened between consecutive frames
   */
  private checkSceneCut(pixels: Uint8ClampedArray): boolean {
    if (!this.prevFrameData || this.prevFrameData.length !== pixels.length) return false;
    let totalDiff = 0;
    const sampleCount = Math.floor(pixels.length / 16);
    for (let i = 0; i < pixels.length; i += 16) {
      totalDiff += Math.abs(pixels[i] - this.prevFrameData[i]);
    }
    const avgDiff = totalDiff / sampleCount;
    return avgDiff > 55; // Large global luminance jump
  }
}

/**
 * Calculates pan-and-scan crop placement taking dynamic focal point into account.
 * When converting wide 16:9 to vertical 9:16, keeps the subject perfectly centered!
 */
export function calculateDynamicPanAndScan(
  targetWidth: number,
  targetHeight: number,
  sourceWidth: number,
  sourceHeight: number,
  focalPoint: { x: number; y: number } = { x: 0.5, y: 0.5 }
): {
  fX: number;
  fY: number;
  fW: number;
  fH: number;
  cropWindow: { x: number; y: number; width: number; height: number };
} {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const cW = sourceWidth * scale;
  const cH = sourceHeight * scale;

  // Horizontal pan boundaries:
  // If cW > targetWidth, we pan fX so that focalPoint.x * cW is at targetWidth / 2
  const minFX = targetWidth - cW;
  const maxFX = 0;
  const idealFX = targetWidth / 2 - focalPoint.x * cW;
  const fX = Math.min(maxFX, Math.max(minFX, idealFX));

  // Vertical pan boundaries (usually 0 if aspect ratio is taller than source):
  const minFY = targetHeight - cH;
  const maxFY = 0;
  const idealFY = targetHeight / 2 - focalPoint.y * cH;
  const fY = Math.min(maxFY, Math.max(minFY, idealFY));

  // Calculate the corresponding crop window in original source coordinates
  const cropWInSource = targetWidth / scale;
  const cropHInSource = targetHeight / scale;
  const cropXInSource = Math.max(0, Math.min(sourceWidth - cropWInSource, -fX / scale));
  const cropYInSource = Math.max(0, Math.min(sourceHeight - cropHInSource, -fY / scale));

  return {
    fX,
    fY,
    fW: cW,
    fH: cH,
    cropWindow: {
      x: cropXInSource,
      y: cropYInSource,
      width: cropWInSource,
      height: cropHInSource,
    },
  };
}
