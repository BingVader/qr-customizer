/**
 * Error correction level for QR code generation.
 * - 'L': Recovers up to ~7% data loss.
 * - 'M': Recovers up to ~15% data loss (standard default).
 * - 'Q': Recovers up to ~25% data loss.
 * - 'H': Recovers up to ~30% data loss (automatically used when center logo is present).
 */
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

/**
 * QR Code type number (version 1 to 40).
 * 0 indicates automatic type calculation based on data length and error correction level.
 */
export type TypeNumber =
  | 0
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30
  | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40;

/**
 * Shape of individual data modules (dots) in the QR grid.
 * - 'square': Classic sharp QR modules.
 * - 'rounded': Smooth rounded module corners.
 * - 'circle': Dots rendered as circular points.
 */
export type DotShape = 'square' | 'rounded' | 'circle';

/**
 * Shape of the three corner finder patterns ("eyes").
 * - 'square': Sharp modern concentric square finder eyes.
 * - 'rounded': Soft rounded concentric corners for eye outer frames and eyeballs.
 * - 'circle': Smooth circular concentric finder patterns.
 */
export type EyeShape = 'square' | 'rounded' | 'circle';

/**
 * Built-in color theme identifiers.
 */
export type QRThemeName = 'classic' | 'midnight' | 'ocean' | 'emerald' | 'sunset';

/**
 * Linear gradient configuration for QR foreground elements.
 */
export interface QRGradientConfig {
  type?: 'linear';
  direction?: 'to-right' | 'to-bottom' | 'to-bottom-right' | 'to-top-right';
  colorStops: Array<{
    offset: string | number;
    color: string;
  }>;
}

/**
 * Palette configuration defining foreground, background, and eye colors.
 */
export interface QRThemePalette {
  /**
   * Foreground color for data modules.
   */
  foreground: string;
  /**
   * Background color behind modules.
   */
  background: string;
  /**
   * Outer frame color for the 3 finder pattern eyes. Defaults to foreground.
   */
  eyeColor?: string;
  /**
   * Inner eyeball color for the 3 finder pattern eyes. Defaults to eyeColor or foreground.
   */
  eyeBallColor?: string;
  /**
   * Optional linear gradient applied to foreground modules.
   */
  gradient?: QRGradientConfig;
}

/**
 * Center logo options.
 */
export interface QRLogoOptions {
  /**
   * Logo source: File, Blob, PNG URL, or data:image/png;base64,... string.
   */
  src: string | Blob | File;
  /**
   * Size ratio of the logo relative to the QR code module matrix dimension.
   * Default is 0.22 (safe coverage ~18-24%). Automatically clamped between 0.15 and 0.25.
   */
  sizeRatio?: number;
  /**
   * Padding around the logo in QR module units to prevent module collision.
   * Default is 0.75 modules.
   */
  padding?: number;
  /**
   * Corner border radius for the logo badge and clipped logo in SVG units.
   * Defaults to subtle rounded corners.
   */
  borderRadius?: number;
  /**
   * Background color of the safe-zone backing badge directly behind the logo.
   * Defaults to the QR background color.
   */
  backgroundColor?: string;
  /**
   * Whether to clear QR modules in the center safe-zone cutout. Default is true.
   */
  clearEdges?: boolean;
}

/**
 * Custom pluggable function for URL shortening.
 */
export type ShortenerFunction = (url: string) => Promise<string>;

/**
 * Configuration options for automatic URL shortening.
 */
export interface ShortenUrlOptions {
  /**
   * Minimum URL length threshold before attempting shortening.
   * Defaults to 35 characters.
   */
  threshold?: number;
  /**
   * Pluggable shortener callback. If omitted, falls back to default keyless service (is.gd).
   */
  shortener?: ShortenerFunction;
  /**
   * Timeout in milliseconds for shortening request before aborting.
   * Defaults to 3000ms.
   */
  timeoutMs?: number;
}

/**
 * Options passed to `createQR`.
 */
export interface QRCustomizerOptions {
  /**
   * The text or URL data to encode into the QR code.
   */
  data: string;
  /**
   * Rendered SVG width & height in pixels (default 300).
   */
  size?: number;
  /**
   * Quiet zone margin in QR module units around the code (default 2).
   */
  margin?: number;
  /**
   * Error correction level ('L', 'M', 'Q', 'H').
   * If a logo is provided, error correction is automatically forced to 'H' for maximum scannability.
   */
  errorCorrectionLevel?: ErrorCorrectionLevel;
  /**
   * Pre-configured color theme or 'auto' to sample colors from the logo.
   */
  theme?: QRThemeName | 'auto';
  /**
   * Partial or complete palette overrides for custom branding.
   */
  palette?: Partial<QRThemePalette>;
  /**
   * Shape of individual data modules ('square', 'rounded', 'circle'). Default is 'square'.
   */
  dotShape?: DotShape;
  /**
   * Shape of the three corner finder patterns ('square', 'rounded', 'circle'). Default is 'square'.
   */
  eyeShape?: EyeShape;
  /**
   * Optional center PNG logo configuration.
   */
  logo?: QRLogoOptions;
  /**
   * Optional automatic URL shortening. Set to true for default is.gd keyless shortening,
   * or provide a ShortenUrlOptions object for custom behavior.
   * Defaults to false (opt-in).
   */
  shortenUrl?: boolean | ShortenUrlOptions;
  /**
   * QR Code type number (0-40). 0 calculates size automatically.
   */
  typeNumber?: TypeNumber;
}

/**
 * The generated QR code result object.
 */
export interface QRResult {
  /**
   * The complete, standalone SVG markup string.
   */
  svg: string;
  /**
   * The final encoded string in the QR code (shortened if shortening was applied).
   */
  data: string;
  /**
   * The original string provided in options.data.
   */
  originalData: string;
  /**
   * Whether URL shortening was successfully applied to options.data.
   */
  wasShortened: boolean;
  /**
   * The resolved color palette used for rendering.
   */
  palette: QRThemePalette;
  /**
   * The raw 2D boolean module matrix (true = dark module, false = light/space).
   */
  matrix: boolean[][];
  /**
   * The pixel dimension (width and height) of the output SVG.
   */
  size: number;
  /**
   * The QR version module count along one axis (e.g. 21, 25, 29).
   */
  moduleCount: number;
  /**
   * Exports the SVG to a base64 Data URL using an HTML5 Canvas (browser environments).
   */
  toDataURL(type?: 'image/png' | 'image/jpeg' | 'image/webp', quality?: number): Promise<string>;
  /**
   * Triggers a browser download of the QR code as PNG, JPEG, or SVG.
   */
  download(filename?: string, type?: 'png' | 'jpeg' | 'svg', quality?: number): Promise<void>;
}
