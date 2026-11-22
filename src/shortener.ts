import type { ShortenUrlOptions } from './types';

/**
 * Checks if a string is a valid HTTP or HTTPS URL.
 */
export function isValidHttpUrl(candidate: string): boolean {
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Result of the URL shortening process.
 */
export interface ShortenerResult {
  data: string;
  wasShortened: boolean;
}

/**
 * Default keyless shortener implementation using is.gd.
 */
async function defaultIsGdShortener(url: string, signal: AbortSignal): Promise<string> {
  const endpoint = `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`is.gd returned HTTP status ${response.status}`);
  }

  const json = (await response.json()) as {
    shorturl?: string;
    errorcode?: number;
    errormessage?: string;
  };

  if (json && typeof json.shorturl === 'string' && json.shorturl.length > 0) {
    return json.shorturl;
  }

  throw new Error(json?.errormessage || 'Invalid response from is.gd');
}

/**
 * Handles URL shortening with threshold checks, pluggable shortener support,
 * timeout controls via AbortController, and guaranteed silent fallback.
 *
 * @param data The input text or URL to evaluate.
 * @param shortenOption Shorten option (boolean or custom config).
 * @returns Result object containing final string and shortening status.
 */
export async function shortenUrl(
  data: string,
  shortenOption?: boolean | ShortenUrlOptions
): Promise<ShortenerResult> {
  // If shortening is disabled or not requested, return original immediately
  if (!shortenOption) {
    return { data, wasShortened: false };
  }

  // Only valid HTTP/HTTPS URLs should be shortened
  if (!isValidHttpUrl(data)) {
    return { data, wasShortened: false };
  }

  const config: ShortenUrlOptions = typeof shortenOption === 'object' ? shortenOption : {};
  const threshold = config.threshold ?? 35;
  const timeoutMs = config.timeoutMs ?? 3000;

  // If the URL length does not exceed threshold, keep original URL
  if (data.length <= threshold) {
    return { data, wasShortened: false };
  }

  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    let shortened: string;

    if (config.shortener) {
      // Pluggable custom shortener callback with abort timeout race
      shortened = await Promise.race([
        config.shortener(data),
        new Promise<string>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error(`Shortener timed out after ${timeoutMs}ms`));
          });
        }),
      ]);
    } else {
      // Default keyless fallback
      shortened = await defaultIsGdShortener(data, controller.signal);
    }

    clearTimeout(timeoutTimer);

    if (typeof shortened === 'string' && shortened.trim().length > 0) {
      return {
        data: shortened.trim(),
        wasShortened: true,
      };
    }

    return { data, wasShortened: false };
  } catch {
    // Guaranteed silent fallback on offline, rate-limit, timeout, or network error
    clearTimeout(timeoutTimer);
    return { data, wasShortened: false };
  }
}
