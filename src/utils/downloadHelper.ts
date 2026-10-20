/**
 * Universal Download & Save Utility with full support for:
 * - Median.co (formerly GoNative) Android / iOS APK wrappers
 * - Native Android WebView DownloadManager
 * - iOS Safari & WKWebView
 * - Web Share API (Save directly to Android Gallery / Files)
 * - Standard Desktop browsers
 */

declare global {
  interface Window {
    median?: {
      share?: {
        downloadFile?: (options: { url: string; open?: boolean }) => void;
      };
      downloads?: {
        downloadFile?: (options: { url: string; title?: string }) => void;
      };
    };
    gonative?: {
      share?: {
        downloadFile?: (options: { url: string; open?: boolean }) => void;
      };
      downloads?: {
        downloadFile?: (options: { url: string; title?: string }) => void;
      };
    };
  }
}

/**
 * Check if the app is currently running inside Median.co / GoNative / Android WebView
 */
export function isMedianEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = (navigator.userAgent || '').toLowerCase();
  return (
    typeof window.median !== 'undefined' ||
    typeof window.gonative !== 'undefined' ||
    ua.includes('median') ||
    ua.includes('gonative') ||
    ua.includes('wv') || // Android WebView identifier
    (ua.includes('android') && ua.includes('version/'))
  );
}

/**
 * Check if Web Share API with files is supported
 */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
  try {
    const testFile = new File([new Blob([' '], { type: 'video/mp4' })], 'test.mp4', { type: 'video/mp4' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

/**
 * Native Android/iOS share sheet: allows user to save to device gallery, Google Drive, WhatsApp, etc.
 */
export async function shareVideoFile(blob: Blob, filename: string): Promise<boolean> {
  try {
    const ext = filename.endsWith('.webm') ? 'video/webm' : 'video/mp4';
    const file = new File([blob], filename, { type: ext, lastModified: Date.now() });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: filename,
        text: 'Video klip viral hasil ClipRush Pro',
      });
      return true;
    }
  } catch (err: unknown) {
    const error = err as Error;
    if (error?.name !== 'AbortError') {
      console.warn('Web Share failed, falling back:', error);
    }
  }
  return false;
}

/**
 * Upload blob to backend server to obtain an absolute HTTP/HTTPS download URL with Content-Disposition
 * This is critical because Android DownloadManager in Median.co CANNOT download 'blob:' protocol URLs!
 */
export async function uploadToDownloadEndpoint(blob: Blob, filename: string): Promise<string | null> {
  try {
    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const response = await fetch(`/api/upload-temp-video?filename=${encodeURIComponent(cleanName)}`, {
      method: 'POST',
      body: blob,
      headers: {
        'Content-Type': blob.type || 'video/mp4',
      },
    });

    if (!response.ok) {
      console.warn('Failed to upload video to server temp endpoint:', response.statusText);
      return null;
    }

    const data = await response.json();
    if (data.success && data.downloadUrl) {
      // Build absolute URL
      return new URL(data.downloadUrl, window.location.origin).href;
    }
    return null;
  } catch (err) {
    console.warn('Network error uploading video for Median download:', err);
    return null;
  }
}

export interface DownloadResult {
  success: boolean;
  url: string;
  httpUrl?: string;
  isMedian: boolean;
  canShare: boolean;
}

/**
 * Universal safe download trigger:
 * 1. Synchronously initiates local Blob URL download for Desktop & standard browsers
 * 2. Asynchronously uploads to backend to trigger Median.co Bridge & Android DownloadManager via real HTTP/HTTPS URL
 */
export function triggerSafeDownload(
  blob: Blob,
  filename: string,
  onHttpReady?: (httpUrl: string) => void
): DownloadResult {
  const isMedian = isMedianEnvironment();
  const canShare = canShareFiles();

  // 1. Immediate local blob download trigger
  let blobUrl = '';
  try {
    blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = filename;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);

    try {
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    } catch {
      a.click();
    }

    setTimeout(() => {
      try {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(blobUrl);
      } catch {
        // ignore cleanup
      }
    }, 180000); // 3 minutes
  } catch (err) {
    console.error('Local blob download error:', err);
  }

  // 2. Asynchronous HTTP server upload for Median.co & Android native DownloadManager
  uploadToDownloadEndpoint(blob, filename).then((httpUrl) => {
    if (httpUrl) {
      if (onHttpReady) {
        onHttpReady(httpUrl);
      }

      // Check if Median JavaScript Bridge is present
      if (typeof window !== 'undefined') {
        let bridgeInvoked = false;

        if (typeof window.median?.share?.downloadFile === 'function') {
          try {
            window.median.share.downloadFile({ url: httpUrl, open: false });
            bridgeInvoked = true;
          } catch (e) {
            console.warn('Error invoking median.share.downloadFile:', e);
          }
        } else if (typeof window.gonative?.share?.downloadFile === 'function') {
          try {
            window.gonative.share.downloadFile({ url: httpUrl, open: false });
            bridgeInvoked = true;
          } catch (e) {
            console.warn('Error invoking gonative.share.downloadFile:', e);
          }
        }

        // If in Median/WebView or bridge not invoked, also trigger click on real HTTP URL
        // Android WebView's DownloadListener intercepts real HTTP URLs and downloads via DownloadManager!
        if (isMedian || !bridgeInvoked) {
          try {
            const httpLink = document.createElement('a');
            httpLink.style.display = 'none';
            httpLink.href = httpUrl;
            httpLink.download = filename;
            httpLink.target = '_blank';
            document.body.appendChild(httpLink);
            httpLink.click();
            setTimeout(() => {
              if (document.body.contains(httpLink)) {
                document.body.removeChild(httpLink);
              }
            }, 30000);
          } catch (err) {
            console.warn('Error triggering HTTP link download:', err);
          }
        }
      }
    }
  });

  return {
    success: true,
    url: blobUrl,
    isMedian,
    canShare,
  };
}

/**
 * Format bytes to readable string (e.g. 12.4 MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}
