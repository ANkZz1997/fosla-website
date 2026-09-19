/** How to reach the database: Upstash's HTTPS API, or a normal Redis connection (Redis Cloud, Vercel Redis, ...). */
export type RedisConfig =
  | { kind: "rest"; url: string; token: string; source: string }
  | { kind: "tcp"; url: string; source: string };

type Env = Record<string, string | undefined>;

/**
 * Finds the database credentials however Vercel named them. In order:
 *  1. UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (what you would paste by hand)
 *  2. <PREFIX>_REST_API_URL + <PREFIX>_REST_API_TOKEN (Vercel's Upstash integration, any prefix)
 *  3. a redis:// or rediss:// connection string (KV_REDIS_URL, KV_URL, REDIS_URL, or any *_URL holding one).
 *     Upstash hosts are reached over HTTPS (their Redis password is also the REST token); every other provider,
 *     such as Redis Cloud, is reached with the standard Redis protocol.
 * Vercel marks these variables "Sensitive" (you can't copy them), but the running app can always read them.
 * Only the variable's NAME is ever reported, never its value.
 */
export function resolveRedis(env: Env = process.env): RedisConfig | null {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return { kind: "rest", url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN, source: "UPSTASH_REDIS_REST_URL" };
  }

  for (const key of Object.keys(env)) {
    const m = key.match(/^(.+)_REST_API_URL$/);
    const token = m && env[`${m[1]}_REST_API_TOKEN`];
    if (m && env[key] && token) return { kind: "rest", url: env[key]!, token, source: key };
  }

  const preferred = ["KV_REDIS_URL", "KV_URL", "REDIS_URL"];
  const others = Object.keys(env).filter((k) => /(^|_)URL$/.test(k) && !preferred.includes(k));
  for (const key of [...preferred, ...others]) {
    const value = env[key]?.trim().replace(/^["']|["']$/g, "");
    if (!value || !/^rediss?:\/\//i.test(value)) continue;
    try {
      const u = new URL(value);
      if (!u.hostname) continue;
      if (u.password && /\.upstash\.io$/i.test(u.hostname)) return { kind: "rest", url: `https://${u.hostname}`, token: decodeURIComponent(u.password), source: key };
      return { kind: "tcp", url: value, source: key };
    } catch {
      /* not a usable URL, try the next one */
    }
  }
  return null;
}
