import { loadImage } from './logoLoader';

/**
 * Converts an SVG markup string into a raster base64 Data URL (PNG, JPEG, WebP)
 * using an HTML5 Canvas.
 *
 * @param svg The SVG markup string.
 * @param type The image MIME type (default 'image/png').
 * @param quality Compression quality for JPEG/WebP between 0 and 1 (default 0.92).
 * @param width Target canvas raster width (default 600px).
 * @param height Target canvas raster height (default 600px).
 * @returns Promise resolving to the base64 data URL string.
 */
export async function toDataURL(
  svg: string,
  type: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
  quality: number = 0.92,
  width: number = 600,
  height: number = 600
): Promise<string> {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    // Graceful fallback in non-browser / headless environments
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire 2D canvas context for QR export.');
  }

  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const img = await loadImage(svgDataUrl);

  // If exporting as JPEG, fill with white background first to avoid black transparency
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL(type, quality);
}

/**
 * Initiates a browser download of the QR code in PNG, JPEG, or SVG format.
 *
 * @param svg The SVG markup string.
 * @param filename File name without or with extension (default 'qrcode').
 * @param type File format ('png', 'jpeg', or 'svg').
 * @param quality Compression quality for raster formats (default 0.92).
 * @param width Raster export width (default 600px).
 * @param height Raster export height (default 600px).
 */
export async function download(
  svg: string,
  filename: string = 'qrcode',
  type: 'png' | 'jpeg' | 'svg' = 'png',
  quality: number = 0.92,
  width: number = 600,
  height: number = 600
): Promise<void> {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  let downloadUrl: string;
  let cleanFilename = filename;

  if (type === 'svg') {
    if (!cleanFilename.toLowerCase().endsWith('.svg')) {
      cleanFilename += '.svg';
    }
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    downloadUrl = URL.createObjectURL(blob);
  } else {
    const ext = type === 'jpeg' ? '.jpg' : '.png';
    if (!cleanFilename.toLowerCase().endsWith(ext)) {
      cleanFilename += ext;
    }
    const mime = type === 'jpeg' ? 'image/jpeg' : 'image/png';
    downloadUrl = await toDataURL(svg, mime, quality, width, height);
  }

  const anchor = document.createElement('a');
  anchor.download = cleanFilename;
  anchor.href = downloadUrl;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  if (type === 'svg') {
    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 150);
  }
}
