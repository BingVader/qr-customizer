# qr-customizer

A zero-backend, production-ready, highly customizable and scannable QR code generator for TypeScript and JavaScript. Built on top of `qrcode-generator`, with full support for center PNG logos, high-contrast color themes, automatic logo color extraction with WCAG contrast protection, and optional resilient URL shortening.

---

## Features

- **Center PNG Logo Support**:
  - Safe size ratio capped between 18–24% (`0.22` default) so scanning is never compromised.
  - Automatically forces error correction to `'H'` (High, ~30% recovery capacity) whenever a logo is present.
  - Generates a dedicated center safe-zone cutout and backing contrast badge behind the logo to prevent module collision.
  - Normalizes logo inputs seamlessly from a `File`, `Blob`, PNG URL, or `data:image/png;base64,...` string.
- **Custom Dot & Finder Patterns**:
  - Dot shapes: `'square'`, `'rounded'`, `'circle'`.
  - Corner finder patterns ("eyes"): `'square'`, `'rounded'`, `'circle'` rendered cleanly without per-module seam clutter.
- **Color Themes & Auto Logo Palette**:
  - Built-in accessible palettes: `classic`, `midnight`, `ocean`, `emerald`, and `sunset` (with linear gradient `<defs>`).
  - `theme: 'auto'`: Extracts vibrant dominant brand colors from the PNG logo and applies WCAG contrast protection against the background to guarantee reliable decoding on all mobile cameras.
  - Complete or partial palette overrides for custom brand guidelines.
- **Automatic URL Shortening**:
  - Opt-in (`shortenUrl: true` or configuration object).
  - Validates HTTP(S) protocol and enforces length threshold.
  - Keyless default fallback via `is.gd` with `AbortController` timeout protection (3000ms).
  - Pluggable custom shortener callback `shortener: async (url) => ...`.
  - Guaranteed graceful fallback to original string if offline, rate-limited, or failed.
- **Universal Exports**:
  - Standalone, lightweight `<svg>` output.
  - `toDataURL(type, quality)` and `download(filename, type)` helpers using HTML5 `<canvas>`.
  - Dual ESM + CommonJS distribution with bundled TypeScript type definitions (`.d.ts`).

---

## Installation

```bash
npm install qr-customizer
```

---

## Quick Start

```typescript
import { createQR } from 'qr-customizer';

// 1. Basic QR code
const qr = await createQR({
  data: 'https://github.com/BingVader/qr-customizer',
  size: 300,
});

console.log(qr.svg); // Clean SVG markup string
```

### Center Logo with Auto Color Extraction

```typescript
import { createQR } from 'qr-customizer';

const qr = await createQR({
  data: 'https://example.com/product/12345',
  size: 350,
  dotShape: 'rounded',
  eyeShape: 'rounded',
  logo: {
    src: 'https://example.com/brand-logo.png', // or File / Blob / data URI
    sizeRatio: 0.22,
    borderRadius: 8,
  },
  theme: 'auto', // Extracts scannable palette from the logo
});
```

### Built-in Color Themes & URL Shortening

```typescript
import { createQR } from 'qr-customizer';

const qr = await createQR({
  data: 'https://my-store.com/special-summer-promotions-campaign-page-2026',
  theme: 'sunset', // or 'midnight' | 'ocean' | 'emerald' | 'classic'
  dotShape: 'circle',
  eyeShape: 'circle',
  shortenUrl: true, // Shortens long URL with graceful fallback
});

console.log(`Encoded: ${qr.data} (Was shortened: ${qr.wasShortened})`);

// Export in browser environments
await qr.download('summer-qr', 'png');
```

---

## API Reference

### `createQR(options: QRCustomizerOptions): Promise<QRResult>`

#### Options (`QRCustomizerOptions`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `data` | `string` | **Required** | The string or URL to encode. |
| `size` | `number` | `300` | Width and height in pixels of the rendered SVG. |
| `margin` | `number` | `2` | Quiet zone margin in QR module units. |
| `dotShape` | `'square' \| 'rounded' \| 'circle'` | `'square'` | Shape of individual data dots. |
| `eyeShape` | `'square' \| 'rounded' \| 'circle'` | `'square'` | Shape of corner finder pattern eyes. |
| `theme` | `QRThemeName \| 'auto'` | `'classic'` | Built-in theme name or `'auto'` for logo sampling. |
| `palette` | `Partial<QRThemePalette>` | `undefined` | Custom palette overrides for foreground, background, eye colors, or gradients. |
| `logo` | `QRLogoOptions` | `undefined` | Center PNG logo configuration (forces error correction to `'H'`). |
| `shortenUrl` | `boolean \| ShortenUrlOptions` | `false` | Automatic URL shortening configuration. |
| `errorCorrectionLevel` | `'L' \| 'M' \| 'Q' \| 'H'` | `'M'` (or `'H'` if logo is present) | Reed-Solomon error correction level. |

#### Return Object (`QRResult`)

| Property / Method | Type | Description |
| :--- | :--- | :--- |
| `svg` | `string` | Clean, standalone SVG markup. |
| `data` | `string` | The final encoded string (shortened if applicable). |
| `originalData` | `string` | The input string passed to `options.data`. |
| `wasShortened` | `boolean` | `true` if URL shortening was successfully applied. |
| `palette` | `QRThemePalette` | The resolved colors applied to the QR code. |
| `matrix` | `boolean[][]` | Raw 2D boolean grid (`true` = dark module). |
| `size` | `number` | Width & height in pixels. |
| `moduleCount` | `number` | Module grid width (e.g., 21, 25, 29). |
| `toDataURL(type?, quality?)` | `Promise<string>` | Exports SVG to a base64 Data URL (PNG, JPEG, WebP). |
| `download(filename?, type?)` | `Promise<void>` | Triggers a browser download of the image. |

---

## License

MIT
