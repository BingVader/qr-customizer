import qrcode from 'qrcode-generator';
import type {
  DotShape,
  ErrorCorrectionLevel,
  EyeShape,
  QRLogoOptions,
  QRThemePalette,
  TypeNumber,
} from './types';

/**
 * Checks whether a module coordinate falls within any of the 3 corner finder patterns (7x7).
 */
export function isInFinderPattern(row: number, col: number, moduleCount: number): boolean {
  // Top-Left eye: [0..6, 0..6]
  if (row < 7 && col < 7) return true;
  // Top-Right eye: [0..6, (moduleCount - 7)..moduleCount - 1]
  if (row < 7 && col >= moduleCount - 7) return true;
  // Bottom-Left eye: [(moduleCount - 7)..moduleCount - 1, 0..6]
  if (row >= moduleCount - 7 && col < 7) return true;
  return false;
}

/**
 * Checks whether a module coordinate falls within the center logo safe-zone cutout.
 */
export function isInCenterSafeZone(
  row: number,
  col: number,
  moduleCount: number,
  sizeRatio: number,
  padding: number
): boolean {
  const center = moduleCount / 2;
  const logoModules = Math.max(3, Math.round(moduleCount * sizeRatio));
  const half = logoModules / 2 + padding;

  const minX = center - half;
  const maxX = center + half;
  const minY = center - half;
  const maxY = center + half;

  return col + 1 > minX && col < maxX && row + 1 > minY && row < maxY;
}

export interface RenderSVGOptions {
  data: string;
  size?: number;
  margin?: number;
  errorCorrectionLevel?: ErrorCorrectionLevel;
  typeNumber?: TypeNumber;
  dotShape?: DotShape;
  eyeShape?: EyeShape;
  palette: QRThemePalette;
  logo?: QRLogoOptions & { src?: string };
}

export interface RenderSVGResult {
  svg: string;
  matrix: boolean[][];
  moduleCount: number;
}

/**
 * Generates an SVG string and raw boolean matrix from input data and customizer options.
 */
export function renderQRCodeSVG(options: RenderSVGOptions): RenderSVGResult {
  const hasLogo = !!options.logo && !!options.logo.src;

  // When a logo is present, error correction is strictly upgraded to 'H' (High ~30% recovery)
  const ecLevel: ErrorCorrectionLevel = hasLogo ? 'H' : options.errorCorrectionLevel ?? 'M';

  // Instantiate QR Code Generator (type 0 = auto calculation)
  const qr = qrcode(options.typeNumber ?? 0, ecLevel);
  qr.addData(options.data);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const margin = options.margin ?? 2;
  const totalGridSize = moduleCount + margin * 2;
  const pixelSize = options.size ?? 300;
  const dotShape = options.dotShape ?? 'square';
  const eyeShape = options.eyeShape ?? 'square';
  const palette = options.palette;

  // Build raw boolean matrix
  const matrix: boolean[][] = [];
  for (let r = 0; r < moduleCount; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < moduleCount; c++) {
      row.push(qr.isDark(r, c));
    }
    matrix.push(row);
  }

  // Safe-zone logo configuration
  const rawSizeRatio = options.logo?.sizeRatio ?? 0.22;
  // Safely clamp logo size ratio between 0.15 and 0.25 (keeps area around 18-24% safe coverage)
  const sizeRatio = Math.min(Math.max(rawSizeRatio, 0.15), 0.25);
  const logoPadding = options.logo?.padding ?? 0.75;
  const clearEdges = options.logo?.clearEdges ?? true;

  // Setup gradient definition if present
  let gradientDef = '';
  let fgFill = palette.foreground;
  const gradientId = `qr-grad-${Math.random().toString(36).substring(2, 9)}`;

  if (palette.gradient && palette.gradient.colorStops?.length > 0) {
    fgFill = `url(#${gradientId})`;
    let x1 = '0%';
    let y1 = '0%';
    let x2 = '100%';
    let y2 = '0%';

    switch (palette.gradient.direction) {
      case 'to-bottom':
        x1 = '0%';
        y1 = '0%';
        x2 = '0%';
        y2 = '100%';
        break;
      case 'to-bottom-right':
        x1 = '0%';
        y1 = '0%';
        x2 = '100%';
        y2 = '100%';
        break;
      case 'to-top-right':
        x1 = '0%';
        y1 = '100%';
        x2 = '100%';
        y2 = '0%';
        break;
      case 'to-right':
      default:
        x1 = '0%';
        y1 = '0%';
        x2 = '100%';
        y2 = '0%';
        break;
    }

    const stops = palette.gradient.colorStops
      .map((stop) => {
        const offsetStr = typeof stop.offset === 'number' ? `${stop.offset * 100}%` : stop.offset;
        return `<stop offset="${offsetStr}" stop-color="${stop.color}" />`;
      })
      .join('');

    gradientDef = `<linearGradient id="${gradientId}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`;
  }

  // Render individual data dots
  const dotsSvg: string[] = [];
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!qr.isDark(r, c)) continue;

      // Skip modules inside finder pattern eyes
      if (isInFinderPattern(r, c, moduleCount)) continue;

      // Skip modules inside center logo safe-zone
      if (hasLogo && clearEdges && isInCenterSafeZone(r, c, moduleCount, sizeRatio, logoPadding)) {
        continue;
      }

      const mx = c + margin;
      const my = r + margin;

      if (dotShape === 'circle') {
        const cx = (mx + 0.5).toFixed(2);
        const cy = (my + 0.5).toFixed(2);
        dotsSvg.push(`<circle cx="${cx}" cy="${cy}" r="0.45" fill="${fgFill}" />`);
      } else if (dotShape === 'rounded') {
        const x = (mx + 0.05).toFixed(2);
        const y = (my + 0.05).toFixed(2);
        dotsSvg.push(
          `<rect x="${x}" y="${y}" width="0.90" height="0.90" rx="0.28" ry="0.28" fill="${fgFill}" />`
        );
      } else {
        // square
        dotsSvg.push(`<rect x="${mx}" y="${my}" width="1" height="1" fill="${fgFill}" />`);
      }
    }
  }

  // Render finder pattern eyes cleanly without per-module clutter
  const eyeColor = palette.eyeColor || palette.foreground;
  const eyeBallColor = palette.eyeBallColor || eyeColor;

  const eyePositions = [
    { x: margin, y: margin }, // Top-Left
    { x: margin + moduleCount - 7, y: margin }, // Top-Right
    { x: margin, y: margin + moduleCount - 7 }, // Bottom-Left
  ];

  const eyesSvg: string[] = [];
  for (const pos of eyePositions) {
    if (eyeShape === 'circle') {
      // Concentric circles: 7x7 outer ring + 3x3 inner eyeball
      const cx = (pos.x + 3.5).toFixed(2);
      const cy = (pos.y + 3.5).toFixed(2);
      // Outer ring with stroke width 1 at radius 3 (outer bound 3.5, inner bound 2.5)
      eyesSvg.push(
        `<circle cx="${cx}" cy="${cy}" r="3" fill="none" stroke="${eyeColor}" stroke-width="1" />`
      );
      // Inner solid eyeball of radius 1.5 (diameter 3)
      eyesSvg.push(`<circle cx="${cx}" cy="${cy}" r="1.5" fill="${eyeBallColor}" />`);
    } else if (eyeShape === 'rounded') {
      // Concentric rounded rectangles: 7x7 outer frame + 3x3 inner eyeball
      eyesSvg.push(
        `<rect x="${pos.x + 0.5}" y="${pos.y + 0.5}" width="6" height="6" fill="none" stroke="${eyeColor}" stroke-width="1" rx="1.5" ry="1.5" />`
      );
      eyesSvg.push(
        `<rect x="${pos.x + 2}" y="${pos.y + 2}" width="3" height="3" fill="${eyeBallColor}" rx="0.8" ry="0.8" />`
      );
    } else {
      // Classic square concentric eyes: 7x7 outer frame + 3x3 inner eyeball
      eyesSvg.push(
        `<rect x="${pos.x + 0.5}" y="${pos.y + 0.5}" width="6" height="6" fill="none" stroke="${eyeColor}" stroke-width="1" />`
      );
      eyesSvg.push(
        `<rect x="${pos.x + 2}" y="${pos.y + 2}" width="3" height="3" fill="${eyeBallColor}" />`
      );
    }
  }

  // Render center safe-zone badge and logo if present
  let logoSvg = '';
  let clipDef = '';

  if (hasLogo && options.logo?.src) {
    const center = moduleCount / 2;
    const logoModules = Math.max(3, Math.round(moduleCount * sizeRatio));
    const badgeSize = logoModules + logoPadding * 2;
    const badgeX = center + margin - badgeSize / 2;
    const badgeY = center + margin - badgeSize / 2;
    const badgeBg = options.logo.backgroundColor || palette.background;
    const badgeRadius =
      options.logo.borderRadius !== undefined
        ? options.logo.borderRadius
        : (badgeSize * 0.15);

    // Backing badge behind the logo for contrast & isolation from data modules
    const badgeElement = `<rect x="${badgeX.toFixed(2)}" y="${badgeY.toFixed(2)}" width="${badgeSize.toFixed(2)}" height="${badgeSize.toFixed(2)}" fill="${badgeBg}" rx="${badgeRadius.toFixed(2)}" ry="${badgeRadius.toFixed(2)}" />`;

    // Logo image placement
    const logoX = center + margin - logoModules / 2;
    const logoY = center + margin - logoModules / 2;
    const clipId = `qr-logo-clip-${Math.random().toString(36).substring(2, 9)}`;

    if (options.logo.borderRadius) {
      clipDef = `<clipPath id="${clipId}"><rect x="${logoX.toFixed(2)}" y="${logoY.toFixed(2)}" width="${logoModules.toFixed(2)}" height="${logoModules.toFixed(2)}" rx="${options.logo.borderRadius.toFixed(2)}" ry="${options.logo.borderRadius.toFixed(2)}" /></clipPath>`;
      logoSvg = `${badgeElement}<image href="${options.logo.src}" x="${logoX.toFixed(2)}" y="${logoY.toFixed(2)}" width="${logoModules.toFixed(2)}" height="${logoModules.toFixed(2)}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${clipId})" />`;
    } else {
      logoSvg = `${badgeElement}<image href="${options.logo.src}" x="${logoX.toFixed(2)}" y="${logoY.toFixed(2)}" width="${logoModules.toFixed(2)}" height="${logoModules.toFixed(2)}" preserveAspectRatio="xMidYMid meet" />`;
    }
  }

  // Construct complete SVG
  const defsContent = [gradientDef, clipDef].filter(Boolean).join('');
  const defsTag = defsContent ? `<defs>${defsContent}</defs>` : '';

  const svgMarkup = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalGridSize} ${totalGridSize}" width="${pixelSize}" height="${pixelSize}" shape-rendering="geometricPrecision">`,
    defsTag,
    `<rect width="100%" height="100%" fill="${palette.background}" />`,
    dotsSvg.join(''),
    eyesSvg.join(''),
    logoSvg,
    `</svg>`,
  ].join('');

  return {
    svg: svgMarkup,
    matrix,
    moduleCount,
  };
}
