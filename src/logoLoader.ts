/**
 * Normalizes a logo source (File, Blob, PNG URL, or base64 Data URL)
 * into a safe, self-contained URI string ready for embedding into SVG and Canvas.
 *
 * @param src The logo input (string, Blob, or File).
 * @returns A promise resolving to a clean URI string.
 */
export async function normalizeLogoSrc(src: string | Blob | File): Promise<string> {
  if (typeof src === 'string') {
    return src.trim();
  }

  // Handle Blob / File inputs
  if (typeof Blob !== 'undefined' && src instanceof Blob) {
    // In environments with arrayBuffer (Node.js and modern browsers)
    if (typeof src.arrayBuffer === 'function') {
      try {
        const buffer = await src.arrayBuffer();
        const mimeType = src.type || 'image/png';

        if (typeof Buffer !== 'undefined') {
          const base64 = Buffer.from(buffer).toString('base64');
          return `data:${mimeType};base64,${base64}`;
        }

        if (typeof btoa !== 'undefined') {
          const bytes = new Uint8Array(buffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          const base64 = btoa(binary);
          return `data:${mimeType};base64,${base64}`;
        }
      } catch {
        // Fallback to FileReader or URL.createObjectURL below
      }
    }

    // Browser FileReader fallback
    if (typeof FileReader !== 'undefined') {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('FileReader did not return a string result'));
          }
        };
        reader.onerror = () => {
          reject(reader.error || new Error('Failed to read logo File/Blob'));
        };
        reader.readAsDataURL(src);
      });
    }

    // URL.createObjectURL fallback
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      return URL.createObjectURL(src);
    }
  }

  throw new Error(
    'Invalid logo source: Expected a URL string, base64 data URI, Blob, or File.'
  );
}

/**
 * Loads an image from a URL or Data URI into an HTMLImageElement in browser environments.
 *
 * @param src The image source URI.
 * @returns A promise resolving to the loaded HTMLImageElement.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('HTMLImageElement is not available in non-browser environments.'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      resolve(img);
    };

    img.onerror = (err) => {
      reject(new Error(`Failed to load image from source: ${err}`));
    };

    img.src = src;
  });
}
