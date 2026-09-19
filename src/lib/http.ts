const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export class HttpError extends Error {
  constructor(
    public status: number,
    url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
  }
}

/** GET a page as text with a browser-like UA, a timeout and one retry on 5xx/network errors. */
export async function fetchText(url: string, opts: { timeoutMs?: number; retries?: number } = {}): Promise<string> {
  const { timeoutMs = 15_000, retries = 1 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": UA, accept: "text/html,application/xml,application/rss+xml,*/*;q=0.8", "accept-language": "en-IN,en;q=0.9" },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
        cache: "no-store",
      });
      if (!res.ok) {
        const err = new HttpError(res.status, url);
        // 4xx (including 429 bot-blocks) won't get better on an immediate retry.
        if (res.status < 500) throw err;
        lastErr = err;
        continue;
      }
      return await res.text();
    } catch (err) {
      if (err instanceof HttpError) throw err;
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
