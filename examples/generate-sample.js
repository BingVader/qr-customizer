import { createQR } from '../dist/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Generating QR sample files...');

  const sampleLogo =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  // 1. Classic theme with center logo
  const qrLogo = await createQR({
    data: 'https://github.com/BingVader/qr-customizer',
    size: 400,
    dotShape: 'rounded',
    eyeShape: 'rounded',
    logo: {
      src: sampleLogo,
      sizeRatio: 0.22,
      borderRadius: 8,
    },
    theme: 'classic',
  });
  fs.writeFileSync(path.join(__dirname, 'sample-logo.svg'), qrLogo.svg);
  console.log('Saved: examples/sample-logo.svg');

  // 2. Sunset theme with gradient
  const qrSunset = await createQR({
    data: 'https://github.com/BingVader/qr-customizer',
    size: 400,
    theme: 'sunset',
    dotShape: 'circle',
    eyeShape: 'circle',
  });
  fs.writeFileSync(path.join(__dirname, 'sample-sunset.svg'), qrSunset.svg);
  console.log('Saved: examples/sample-sunset.svg');

  // 3. Midnight theme
  const qrMidnight = await createQR({
    data: 'https://github.com/BingVader/qr-customizer',
    size: 400,
    theme: 'midnight',
    dotShape: 'square',
    eyeShape: 'square',
  });
  fs.writeFileSync(path.join(__dirname, 'sample-midnight.svg'), qrMidnight.svg);
  console.log('Saved: examples/sample-midnight.svg');

  console.log('\nAll sample SVGs generated successfully in the examples/ folder!');
}

main().catch(console.error);
