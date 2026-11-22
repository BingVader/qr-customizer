import type { QRCustomizerOptions, QRResult } from './types';
import { shortenUrl } from './shortener';
import { normalizeLogoSrc } from './logoLoader';
import { resolveTheme, QR_THEMES } from './themes';
import { renderQRCodeSVG } from './svgRenderer';
import { toDataURL, download } from './exportUtils';

/**
 * Generates a customizable, scannable QR code with optional center PNG logo,
 * multiple color themes + automatic contrast extraction, and optional URL shortening.
 *
 * @param options Configuration options for data, styling, logo, and shortening.
 * @returns Promise resolving to a QRResult with SVG, raw matrix, and export helpers.
 */
export async function createQR(options: QRCustomizerOptions): Promise<QRResult> {
  if (!options || typeof options.data !== 'string') {
    throw new Error('createQR requires an options object with a valid "data" string.');
  }

  // 1. URL Shortening (opt-in with safe fallback)
  const { data: encodedData, wasShortened } = await shortenUrl(
    options.data,
    options.shortenUrl
  );

  // 2. Center logo source normalization
  let normalizedLogo: (typeof options.logo & { src: string }) | undefined;
  if (options.logo && options.logo.src) {
    const safeSrc = await normalizeLogoSrc(options.logo.src);
    normalizedLogo = {
      ...options.logo,
      src: safeSrc,
    };
  }

  // 3. Theme and palette resolution (including 'auto' contrast extraction)
  const palette = await resolveTheme(
    options.theme,
    options.palette,
    normalizedLogo?.src
  );

  // 4. SVG and raw matrix rendering
  const { svg, matrix, moduleCount } = renderQRCodeSVG({
    data: encodedData,
    size: options.size,
    margin: options.margin,
    errorCorrectionLevel: options.errorCorrectionLevel,
    typeNumber: options.typeNumber,
    dotShape: options.dotShape,
    eyeShape: options.eyeShape,
    palette,
    logo: normalizedLogo,
  });

  const exportDimension = options.size ?? 600;

  // 5. Construct QRResult object
  const result: QRResult = {
    svg,
    data: encodedData,
    originalData: options.data,
    wasShortened,
    palette,
    matrix,
    size: options.size ?? 300,
    moduleCount,
    toDataURL(type = 'image/png', quality = 0.92) {
      return toDataURL(svg, type, quality, exportDimension, exportDimension);
    },
    download(filename = 'qrcode', type = 'png', quality = 0.92) {
      return download(svg, filename, type, quality, exportDimension, exportDimension);
    },
  };

  return result;
}

// Public exports
export { QR_THEMES } from './themes';
export * from './types';
export { shortenUrl } from './shortener';
export { normalizeLogoSrc } from './logoLoader';
export { toDataURL, download } from './exportUtils';
export {
  resolveTheme,
  extractAutoPalette,
  ensureScannableContrast,
  getContrastRatio,
  getRelativeLuminance,
  hexToRgb,
  rgbToHex,
} from './themes';
export {
  renderQRCodeSVG,
  isInFinderPattern,
  isInCenterSafeZone,
} from './svgRenderer';
