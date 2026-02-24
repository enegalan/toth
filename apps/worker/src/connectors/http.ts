const USER_AGENT =
  'Toth/1.0 (catalog ingestion; +https://github.com/toth)';

const DEFAULT_HEADERS: HeadersInit = {
  'User-Agent': USER_AGENT,
  Accept: 'application/json, application/xml, text/xml, */*',
};

export const DELAY_BETWEEN_PAGES_MS = 1500;
export const DELAY_BETWEEN_BOOK_PAGES_MS = 400;

export function connectorFetchOptions(): RequestInit {
  return { headers: DEFAULT_HEADERS };
}

const DEFAULT_FETCH_TIMEOUT_MS = 30_000;

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  opts: {
    maxRetries?: number;
    retryOn429?: boolean;
    retryOnNetworkError?: boolean;
    delayMs?: number;
    timeoutMs?: number;
  } = {},
): Promise<Response> {
  const maxRetries = opts.maxRetries ?? 3;
  const retryOn429 = opts.retryOn429 !== false;
  const retryOnNetworkError = opts.retryOnNetworkError !== false;
  const delayMs = opts.delayMs ?? 0;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const headers = { ...DEFAULT_HEADERS, ...(options.headers as Record<string, string>) };
  let lastRes: Response | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const wait =
        lastRes?.status === 429 && retryOn429
          ? Math.min(1000 * 2 ** attempt, 30_000)
          : Math.min(500 * 2 ** attempt, 10_000);
      await sleep(wait);
    }
    if (delayMs > 0 && attempt === 0) await sleep(delayMs);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      lastRes = res;
      lastError = null;
      if (res.status !== 429 || !retryOn429 || attempt === maxRetries)
        return res;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      lastRes = null;
      if (!retryOnNetworkError || attempt === maxRetries) throw err;
    }
  }
  if (lastError) throw lastError;
  return lastRes!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function delayBetweenPages(ms: number): Promise<void> {
  return sleep(ms);
}

/** Throttle: wait before next request to avoid rate limits. */
export async function throttle(ms: number): Promise<void> {
  return sleep(ms);
}
