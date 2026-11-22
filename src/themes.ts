import type { QRThemeName, QRThemePalette } from './types';
import { loadImage } from './logoLoader';

/**
 * Built-in high-contrast color themes.
 */
export const QR_THEMES: Record<QRThemeName, QRThemePalette> = {
  classic: {
    foreground: '#000000',
    background: '#ffffff',
    eyeColor: '#000000',
    eyeBallColor: '#000000',
  },
  midnight: {
    foreground: '#38bdf8',
    background: '#0f172a',
    eyeColor: '#38bdf8',
    eyeBallColor: '#0284c7',
  },
  ocean: {
    foreground: '#0369a1',
    background: '#f0f9ff',
    eyeColor: '#075985',
    eyeBallColor: '#0284c7',
  },
  emerald: {
    foreground: '#047857',
    background: '#f0fdf4',
    eyeColor: '#065f46',
    eyeBallColor: '#10b981',
  },
  sunset: {
    foreground: '#e11d48',
    background: '#fff1f2',
    eyeColor: '#be123c',
    eyeBallColor: '#f97316',
    gradient: {
      type: 'linear',
      direction: 'to-bottom-right',
      colorStops: [
        { offset: '0%', color: '#e11d48' },
        { offset: '100%', color: '#f97316' },
      ],
    },
  },
};

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Converts a hex color string to RGB.
 */
export function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

/**
 * Converts RGB components to 6-digit hex color string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  const toHex = (c: number) => clamp(c).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Computes standard WCAG 2.1 relative luminance for an RGB color.
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Computes WCAG contrast ratio between two luminance values (1.0 to 21.0).
 */
export function getContrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Enforces scannable contrast by adjusting the foreground color against the background.
 * For light backgrounds (e.g. white), bright colors are safely darkened towards black
 * until the minimum contrast ratio (default 4.5:1) is achieved, preserving color hue.
 */
export function ensureScannableContrast(
  fg: RGB,
  bg: RGB = { r: 255, g: 255, b: 255 },
  minContrast: number = 4.5
): RGB {
  const bgLum = getRelativeLuminance(bg.r, bg.g, bg.b);
  const fgLum = getRelativeLuminance(fg.r, fg.g, fg.b);

  if (getContrastRatio(fgLum, bgLum) >= minContrast) {
    return fg;
  }

  // Darken foreground towards black for light backgrounds
  if (bgLum >= 0.5) {
    let low = 0;
    let high = 1;
    let best = { r: 0, g: 0, b: 0 };

    for (let i = 0; i < 10; i++) {
      const mid = (low + high) / 2;
      const testRgb: RGB = {
        r: Math.round(fg.r * mid),
        g: Math.round(fg.g * mid),
        b: Math.round(fg.b * mid),
      };
      const testLum = getRelativeLuminance(testRgb.r, testRgb.g, testRgb.b);
      const ratio = getContrastRatio(testLum, bgLum);

      if (ratio >= minContrast) {
        best = testRgb;
        low = mid; // Try to keep as much original brightness as possible
      } else {
        high = mid; // Darken more
      }
    }
    return best;
  }

  // Brighten foreground towards white for dark backgrounds
  let low = 0;
  let high = 1;
  let best = { r: 255, g: 255, b: 255 };

  for (let i = 0; i < 10; i++) {
    const mid = (low + high) / 2;
    const testRgb: RGB = {
      r: Math.round(fg.r + (255 - fg.r) * mid),
      g: Math.round(fg.g + (255 - fg.g) * mid),
      b: Math.round(fg.b + (255 - fg.b) * mid),
    };
    const testLum = getRelativeLuminance(testRgb.r, testRgb.g, testRgb.b);
    const ratio = getContrastRatio(testLum, bgLum);

    if (ratio >= minContrast) {
      best = testRgb;
      high = mid; // Try to stay closer to original
    } else {
      low = mid; // Brighten more
    }
  }
  return best;
}

/**
 * Extracts a scannable palette from a PNG logo in browser environments
 * using an offscreen canvas sampling routine.
 */
export async function extractAutoPalette(logoSrc: string): Promise<QRThemePalette> {
  // If not in a browser environment or canvas is unavailable, fall back cleanly
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return { ...QR_THEMES.classic };
  }

  try {
    const canvas = document.createElement('canvas');
    const size = 48;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { ...QR_THEMES.classic };
    }

    const img = await loadImage(logoSrc);
    ctx.drawImage(img, 0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const pixels = imgData.data;

    let bestRgb: RGB | null = null;
    let maxScore = -1;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      // Skip transparent or semi-transparent pixels
      if (a < 128) continue;

      // Skip near-whites and extreme blacks
      if (r > 245 && g > 245 && b > 245) continue;
      if (r < 15 && g < 15 && b < 15) continue;

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC;

      // Favor saturated, distinctive brand colors
      const score = saturation * (a / 255);
      if (score > maxScore) {
        maxScore = score;
        bestRgb = { r, g, b };
      }
    }

    // If no distinct saturated color was found, fallback to classic
    if (!bestRgb) {
      return { ...QR_THEMES.classic };
    }

    // Default auto background is crisp white (#ffffff) for optimal scanner compatibility
    const bgRgb: RGB = { r: 255, g: 255, b: 255 };
    const safeFgRgb = ensureScannableContrast(bestRgb, bgRgb, 4.5);
    const fgHex = rgbToHex(safeFgRgb.r, safeFgRgb.g, safeFgRgb.b);

    return {
      foreground: fgHex,
      background: '#ffffff',
      eyeColor: fgHex,
      eyeBallColor: fgHex,
    };
  } catch {
    return { ...QR_THEMES.classic };
  }
}

/**
 * Resolves the final palette by combining theme choice, logo color extraction,
 * and optional custom palette overrides.
 */
export async function resolveTheme(
  theme?: QRThemeName | 'auto',
  paletteOverride?: Partial<QRThemePalette>,
  logoSrc?: string
): Promise<QRThemePalette> {
  let basePalette: QRThemePalette;

  if (theme === 'auto' && logoSrc) {
    basePalette = await extractAutoPalette(logoSrc);
  } else if (theme && theme in QR_THEMES) {
    basePalette = { ...QR_THEMES[theme as QRThemeName] };
  } else {
    basePalette = { ...QR_THEMES.classic };
  }

  // Merge palette overrides
  const resolved: QRThemePalette = {
    foreground: paletteOverride?.foreground ?? basePalette.foreground,
    background: paletteOverride?.background ?? basePalette.background,
    eyeColor: paletteOverride?.eyeColor ?? basePalette.eyeColor ?? basePalette.foreground,
    eyeBallColor:
      paletteOverride?.eyeBallColor ??
      basePalette.eyeBallColor ??
      paletteOverride?.eyeColor ??
      basePalette.foreground,
    gradient: paletteOverride?.gradient ?? basePalette.gradient,
  };

  return resolved;
}
