/**
 * Reliable download utility for saving video blobs across mobile browsers (Android Chrome, iOS Safari) and Desktop
 */
export function triggerSafeDownload(blob: Blob, filename: string): { success: boolean; url: string } {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);

    // Dispatch synthetic click event
    try {
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    } catch {
      a.click();
    }

    // Retain object URL long enough for mobile download manager to finish reading stream
    setTimeout(() => {
      try {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      } catch {
        // ignore cleanup errors
      }
    }, 120000); // 2 minutes

    return { success: true, url };
  } catch (err) {
    console.error('Failed to trigger download:', err);
    return { success: false, url: '' };
  }
}

/**
 * Format bytes to readable string (e.g. 12.4 MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}
