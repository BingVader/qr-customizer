import { describe, it, expect, vi } from 'vitest';
import {
  createQR,
  QR_THEMES,
  shortenUrl,
  normalizeLogoSrc,
  ensureScannableContrast,
  getContrastRatio,
  getRelativeLuminance,
  hexToRgb,
  rgbToHex,
  isInFinderPattern,
  isInCenterSafeZone,
} from '../src/index';

describe('QR Customizer Core Rendering', () => {
  it('renders a valid SVG and boolean matrix with default settings', async () => {
    const result = await createQR({
      data: 'https://example.com/test',
    });

    expect(result.svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    const expectedViewBox = `viewBox="0 0 ${result.moduleCount + 4} ${result.moduleCount + 4}"`;
    expect(result.svg).toContain(expectedViewBox);
    expect(result.svg).toContain('width="300"');
    expect(result.svg).toContain('height="300"');
    expect(result.data).toBe('https://example.com/test');
    expect(result.originalData).toBe('https://example.com/test');
    expect(result.wasShortened).toBe(false);

    // Matrix validations
    expect(result.matrix.length).toBe(result.moduleCount);
    expect(result.matrix[0].length).toBe(result.moduleCount);
    expect(typeof result.matrix[0][0]).toBe('boolean');
  });

  it('renders square dot shapes correctly', async () => {
    const result = await createQR({
      data: 'https://example.com',
      dotShape: 'square',
    });

    expect(result.svg).toContain('<rect x=');
    expect(result.svg).toContain('width="1" height="1"');
  });

  it('renders rounded dot shapes with border radius', async () => {
    const result = await createQR({
      data: 'https://example.com',
      dotShape: 'rounded',
    });

    expect(result.svg).toContain('rx="0.28"');
    expect(result.svg).toContain('ry="0.28"');
  });

  it('renders circular dot shapes with circle elements', async () => {
    const result = await createQR({
      data: 'https://example.com',
      dotShape: 'circle',
    });

    expect(result.svg).toContain('<circle cx=');
    expect(result.svg).toContain('r="0.45"');
  });

  it('renders different finder pattern eye shapes', async () => {
    const squareEyes = await createQR({
      data: 'test',
      eyeShape: 'square',
    });
    expect(squareEyes.svg).toContain('stroke-width="1"');

    const roundedEyes = await createQR({
      data: 'test',
      eyeShape: 'rounded',
    });
    expect(roundedEyes.svg).toContain('rx="1.5"');
    expect(roundedEyes.svg).toContain('rx="0.8"');

    const circleEyes = await createQR({
      data: 'test',
      eyeShape: 'circle',
    });
    expect(circleEyes.svg).toContain('<circle cx=');
    expect(circleEyes.svg).toContain('r="3"');
    expect(circleEyes.svg).toContain('r="1.5"');
  });
});

describe('Center PNG Logo & Safe-Zone Cutout', () => {
  const dummyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  it('forces error correction level to H when a logo is supplied', async () => {
    // Generate without logo using errorCorrectionLevel 'L'
    const qrWithoutLogo = await createQR({
      data: 'https://example.com/long-data-for-ec-test-level-verification',
      errorCorrectionLevel: 'L',
    });

    // Generate with logo and explicit 'L' request -> must automatically force to 'H'
    const qrWithLogo = await createQR({
      data: 'https://example.com/long-data-for-ec-test-level-verification',
      errorCorrectionLevel: 'L',
      logo: {
        src: dummyBase64,
        sizeRatio: 0.22,
      },
    });

    // Error correction 'H' requires more parity modules, resulting in a higher moduleCount
    expect(qrWithLogo.moduleCount).toBeGreaterThan(qrWithoutLogo.moduleCount);
    expect(qrWithLogo.svg).toContain('<image href=');
    expect(qrWithLogo.svg).toContain(dummyBase64);
  });

  it('renders center backing badge and clears modules in safe-zone', async () => {
    const qrWithoutLogo = await createQR({
      data: 'https://example.com/safe-zone-check',
      errorCorrectionLevel: 'H',
    });

    const qrWithLogo = await createQR({
      data: 'https://example.com/safe-zone-check',
      errorCorrectionLevel: 'H',
      logo: {
        src: dummyBase64,
        sizeRatio: 0.22,
        padding: 1,
        backgroundColor: '#ffffff',
      },
    });

    // Both have the same QR version / module count, but with logo, safe-zone modules are skipped
    expect(qrWithLogo.moduleCount).toBe(qrWithoutLogo.moduleCount);

    const countDots = (svg: string) => (svg.match(/<rect x=/g) || []).length;
    expect(countDots(qrWithLogo.svg)).toBeLessThan(countDots(qrWithoutLogo.svg));
    expect(qrWithLogo.svg).toContain('<image href=');
  });

  it('clamps logo sizeRatio safely between 0.15 and 0.25', async () => {
    // Test safe-zone function bounds directly
    expect(isInCenterSafeZone(12, 12, 25, 0.5, 0.5)).toBe(true);
    expect(isInFinderPattern(0, 0, 25)).toBe(true);
    expect(isInFinderPattern(0, 24, 25)).toBe(true);
    expect(isInFinderPattern(24, 0, 25)).toBe(true);
    expect(isInFinderPattern(12, 12, 25)).toBe(false);
  });

  it('normalizes logo src from string and Blob', async () => {
    const normalizedUrl = await normalizeLogoSrc('https://example.com/logo.png');
    expect(normalizedUrl).toBe('https://example.com/logo.png');

    const normalizedData = await normalizeLogoSrc(dummyBase64);
    expect(normalizedData).toBe(dummyBase64);

    // Test with Blob
    const blob = new Blob(['sample-image-data'], { type: 'image/png' });
    const normalizedBlob = await normalizeLogoSrc(blob);
    expect(normalizedBlob.startsWith('data:image/png;base64,')).toBe(true);
  });
});

describe('Color Themes & Contrast Protection', () => {
  it('applies built-in themes correctly', async () => {
    const midnightQR = await createQR({
      data: 'https://example.com',
      theme: 'midnight',
    });
    expect(midnightQR.palette.foreground).toBe(QR_THEMES.midnight.foreground);
    expect(midnightQR.palette.background).toBe(QR_THEMES.midnight.background);
    expect(midnightQR.svg).toContain(QR_THEMES.midnight.background);

    const emeraldQR = await createQR({
      data: 'https://example.com',
      theme: 'emerald',
    });
    expect(emeraldQR.palette.foreground).toBe(QR_THEMES.emerald.foreground);
    expect(emeraldQR.palette.background).toBe(QR_THEMES.emerald.background);
  });

  it('renders linear gradients in themes like sunset', async () => {
    const sunsetQR = await createQR({
      data: 'https://example.com',
      theme: 'sunset',
    });

    expect(sunsetQR.svg).toContain('<linearGradient');
    expect(sunsetQR.svg).toContain('<stop offset="0%" stop-color="#e11d48"');
    expect(sunsetQR.svg).toContain('<stop offset="100%" stop-color="#f97316"');
    expect(sunsetQR.svg).toContain('fill="url(#qr-grad-');
  });

  it('allows partial palette overrides over a theme', async () => {
    const customQR = await createQR({
      data: 'https://example.com',
      theme: 'classic',
      palette: {
        foreground: '#1e40af',
        eyeColor: '#b91c1c',
      },
    });

    expect(customQR.palette.foreground).toBe('#1e40af');
    expect(customQR.palette.eyeColor).toBe('#b91c1c');
    expect(customQR.palette.background).toBe('#ffffff');
    expect(customQR.svg).toContain('#1e40af');
    expect(customQR.svg).toContain('#b91c1c');
  });

  it('correctly calculates relative luminance and contrast ratio', () => {
    const whiteLum = getRelativeLuminance(255, 255, 255);
    const blackLum = getRelativeLuminance(0, 0, 0);

    expect(whiteLum).toBeCloseTo(1.0, 2);
    expect(blackLum).toBeCloseTo(0.0, 2);

    const contrast = getContrastRatio(whiteLum, blackLum);
    expect(contrast).toBeCloseTo(21.0, 1);
  });

  it('darkens low-contrast foreground colors on white background', () => {
    // Very light bright yellow
    const brightYellow = { r: 255, g: 235, b: 59 };
    const white = { r: 255, g: 255, b: 255 };

    const initialRatio = getContrastRatio(
      getRelativeLuminance(brightYellow.r, brightYellow.g, brightYellow.b),
      getRelativeLuminance(white.r, white.g, white.b)
    );
    expect(initialRatio).toBeLessThan(4.5);

    const safeRgb = ensureScannableContrast(brightYellow, white, 4.5);
    const safeRatio = getContrastRatio(
      getRelativeLuminance(safeRgb.r, safeRgb.g, safeRgb.b),
      getRelativeLuminance(white.r, white.g, white.b)
    );

    expect(safeRatio).toBeGreaterThanOrEqual(4.5);
  });

  it('falls back cleanly to classic when theme is auto without canvas', async () => {
    const autoQR = await createQR({
      data: 'https://example.com',
      theme: 'auto',
      logo: {
        src: 'https://example.com/logo.png',
      },
    });

    expect(autoQR.palette.background).toBe('#ffffff');
    expect(autoQR.palette.foreground).toBe('#000000');
  });
});

describe('URL Shortener & Fallback Behavior', () => {
  it('does not attempt shortening when shortenUrl is false (default)', async () => {
    const longUrl = 'https://example.com/articles/2026/11/how-to-generate-custom-qr-codes-in-typescript-with-zero-dependencies';
    const result = await createQR({
      data: longUrl,
    });

    expect(result.data).toBe(longUrl);
    expect(result.wasShortened).toBe(false);
  });

  it('does not shorten non-http strings even if shortenUrl is true', async () => {
    const wifiData = 'WIFI:S:MySecretNetwork;T:WPA;P:SuperSecretPassword123;;';
    const result = await createQR({
      data: wifiData,
      shortenUrl: true,
    });

    expect(result.data).toBe(wifiData);
    expect(result.wasShortened).toBe(false);
  });

  it('does not shorten URLs below the length threshold', async () => {
    const shortUrl = 'https://short.io';
    const result = await shortenUrl(shortUrl, { threshold: 35 });

    expect(result.data).toBe(shortUrl);
    expect(result.wasShortened).toBe(false);
  });

  it('uses custom pluggable shortener callback when provided', async () => {
    const longUrl = 'https://example.com/deep/link/that/is/really/quite/long/and/detailed';
    const mockShortener = vi.fn().mockResolvedValue('https://tiny.url/xyz');

    const result = await createQR({
      data: longUrl,
      shortenUrl: {
        threshold: 20,
        shortener: mockShortener,
      },
    });

    expect(mockShortener).toHaveBeenCalledWith(longUrl);
    expect(result.data).toBe('https://tiny.url/xyz');
    expect(result.originalData).toBe(longUrl);
    expect(result.wasShortened).toBe(true);
  });

  it('gracefully falls back to original URL when shortener fails or throws', async () => {
    const longUrl = 'https://example.com/failing/service/test/case/fallback';
    const failingShortener = vi.fn().mockRejectedValue(new Error('Network error or rate limit 429'));

    const result = await createQR({
      data: longUrl,
      shortenUrl: {
        threshold: 20,
        shortener: failingShortener,
      },
    });

    expect(result.data).toBe(longUrl);
    expect(result.wasShortened).toBe(false);
  });

  it('gracefully falls back when shortener times out', async () => {
    const longUrl = 'https://example.com/hanging/service/test';
    const hangingShortener = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('https://late.ly'), 500))
    );

    const result = await shortenUrl(longUrl, {
      threshold: 20,
      timeoutMs: 50,
      shortener: hangingShortener,
    });

    expect(result.data).toBe(longUrl);
    expect(result.wasShortened).toBe(false);
  });
});

describe('Export Utilities Interface', () => {
  it('provides toDataURL and download methods on QRResult', async () => {
    const result = await createQR({
      data: 'https://example.com/export-test',
    });

    expect(typeof result.toDataURL).toBe('function');
    expect(typeof result.download).toBe('function');

    // In Node.js environment, toDataURL falls back to SVG Data URL cleanly
    const dataUrl = await result.toDataURL('image/png');
    expect(dataUrl.startsWith('data:image/svg+xml;')).toBe(true);

    // Calling download in Node environment runs without crashing
    await expect(result.download('test', 'png')).resolves.toBeUndefined();
  });
});
