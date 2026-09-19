import { promises as fs } from "node:fs";
import path from "node:path";
import type { JobRecord } from "../types";
import { resolveRedis } from "./redis-config";
import { TcpTransport } from "./tcp";

/** Sends one Redis command and returns its reply. */
export interface Transport {
  send(args: (string | number)[]): Promise<unknown>;
}

export interface Store {
  /** False means state is lost between serverless invocations, so dedupe cannot be trusted. */
  persistent: boolean;
  /** Human-readable description for the dashboard, never containing secrets. */
  describe(): string;
  /** Throws if the database cannot be reached with the configured credentials. */
  ping(): Promise<void>;
  getJob(id: string): Promise<JobRecord | null>;
  saveJob(job: JobRecord): Promise<void>;
  /** Newest first. */
  listJobs(limit: number): Promise<JobRecord[]>;
  /**
   * Atomically claim a cross-site dedupe key. Returns false if another job already holds it.
   * A short ttl makes the claim expire by itself if the run dies before the job is saved; call renewKey once it is.
   */
  claimKey(key: string, jobId: string, ttlSeconds?: number): Promise<boolean>;
  /** Make a claim permanent (for the normal retention period). */
  renewKey(key: string): Promise<void>;
  getMeta<T>(name: string): Promise<T | null>;
  setMeta(name: string, value: unknown): Promise<void>;
}

const TTL_SECONDS = 60 * 60 * 24 * 90;
const MAX_INDEX = 500;

/** Upstash's HTTPS API: POST a JSON command array, get {"result": ...} back. */
export class RestTransport implements Transport {
  constructor(
    private url: string,
    private token: string,
  ) {}

  async send(args: (string | number)[]): Promise<unknown> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string };
    if (!res.ok || body.error) throw new Error(`Redis ${args[0]} failed: ${body.error ?? res.status}`);
    return body.result;
  }
}

/** The job storage logic, independent of how the database is reached (Upstash HTTPS or a normal Redis connection). */
export class RedisStore implements Store {
  persistent = true;
  constructor(
    private transport: Transport,
    private source = "UPSTASH_REDIS_REST_URL",
  ) {}

  static rest(url: string, token: string, source?: string) {
    return new RedisStore(new RestTransport(url, token), source);
  }

  describe() {
    return `Redis via ${this.source}`;
  }

  private async cmd<T = unknown>(...args: (string | number)[]): Promise<T> {
    try {
      return (await this.transport.send(args)) as T;
    } catch (err) {
      // Keep the failing command's name, so the dashboard can say what went wrong.
      throw err instanceof Error && /^Redis \w+ failed/.test(err.message) ? err : new Error(`Redis ${args[0]} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async ping() {
    const r = await this.cmd<string>("PING");
    if (String(r).toUpperCase() !== "PONG") throw new Error(`Unexpected reply to PING: ${String(r)}`);
  }

  async getJob(id: string) {
    const raw = await this.cmd<string | null>("GET", `fosla:job:${id}`);
    return raw ? (JSON.parse(raw) as JobRecord) : null;
  }

  async saveJob(job: JobRecord) {
    await this.cmd("SET", `fosla:job:${job.id}`, JSON.stringify(job), "EX", TTL_SECONDS);
    await this.cmd("ZADD", "fosla:idx", Date.parse(job.createdAt), job.id);
    await this.cmd("ZREMRANGEBYRANK", "fosla:idx", 0, -(MAX_INDEX + 1));
  }

  async listJobs(limit: number) {
    const ids = await this.cmd<string[]>("ZREVRANGE", "fosla:idx", 0, limit - 1);
    if (!ids.length) return [];
    const raws = await this.cmd<(string | null)[]>("MGET", ...ids.map((i) => `fosla:job:${i}`));
    return raws.filter((r): r is string => !!r).map((r) => JSON.parse(r) as JobRecord);
  }

  async claimKey(key: string, jobId: string, ttlSeconds = TTL_SECONDS) {
    const r = await this.cmd<string | null>("SET", `fosla:key:${key}`, jobId, "NX", "EX", ttlSeconds);
    return r === "OK";
  }

  async renewKey(key: string) {
    await this.cmd("EXPIRE", `fosla:key:${key}`, TTL_SECONDS);
  }

  async getMeta<T>(name: string) {
    const raw = await this.cmd<string | null>("GET", `fosla:meta:${name}`);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setMeta(name: string, value: unknown) {
    await this.cmd("SET", `fosla:meta:${name}`, JSON.stringify(value));
  }
}

interface Snapshot {
  jobs: Record<string, JobRecord>;
  keys: Record<string, string>;
  meta: Record<string, unknown>;
}

/** In-memory store, mirrored to .data/store.json when running locally so `next dev` restarts keep state. */
class MemoryStore implements Store {
  persistent: boolean;
  private snap: Snapshot = { jobs: {}, keys: {}, meta: {} };
  private loaded = false;
  private file = path.join(process.cwd(), ".data", "store.json");
  private useFile = !process.env.VERCEL;

  constructor() {
    // On Vercel the memory is per-instance and short-lived, so it is not a real store.
    this.persistent = this.useFile;
  }

  describe() {
    return this.useFile ? "local file (.data/store.json)" : "temporary memory (no Redis found)";
  }

  async ping() {
    if (!this.persistent) throw new Error("No Redis credentials found in the environment variables");
  }

  private async load() {
    if (this.loaded) return;
    this.loaded = true;
    if (!this.useFile) return;
    try {
      this.snap = JSON.parse(await fs.readFile(this.file, "utf8"));
    } catch {
      /* first run */
    }
  }

  private async flush() {
    if (!this.useFile) return;
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(this.snap));
  }

  async getJob(id: string) {
    await this.load();
    return this.snap.jobs[id] ?? null;
  }
  async saveJob(job: JobRecord) {
    await this.load();
    this.snap.jobs[job.id] = job;
    await this.flush();
  }
  async listJobs(limit: number) {
    await this.load();
    return Object.values(this.snap.jobs)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
  async claimKey(key: string, jobId: string) {
    await this.load();
    if (this.snap.keys[key]) return false;
    this.snap.keys[key] = jobId;
    await this.flush();
    return true;
  }

  async renewKey() {
    /* claims never expire in the local file store */
  }
  async getMeta<T>(name: string) {
    await this.load();
    return (this.snap.meta[name] as T) ?? null;
  }
  async setMeta(name: string, value: unknown) {
    await this.load();
    this.snap.meta[name] = value;
    await this.flush();
  }
}

const g = globalThis as unknown as { __foslaStore?: Store };

export function getStore(): Store {
  if (g.__foslaStore) return g.__foslaStore;
  const redis = resolveRedis();
  g.__foslaStore = !redis
    ? new MemoryStore()
    : redis.kind === "rest"
      ? RedisStore.rest(redis.url, redis.token, redis.source)
      : new RedisStore(new TcpTransport(redis.url), redis.source);
  return g.__foslaStore;
}
