import { promises as fs } from "node:fs";
import path from "node:path";
import type { JobRecord } from "../types";

export interface Store {
  /** False means state is lost between serverless invocations, so dedupe cannot be trusted. */
  persistent: boolean;
  getJob(id: string): Promise<JobRecord | null>;
  saveJob(job: JobRecord): Promise<void>;
  /** Newest first. */
  listJobs(limit: number): Promise<JobRecord[]>;
  /** Atomically claim a cross-site dedupe key. Returns false if another job already holds it. */
  claimKey(key: string, jobId: string): Promise<boolean>;
  getMeta<T>(name: string): Promise<T | null>;
  setMeta(name: string, value: unknown): Promise<void>;
}

const TTL_SECONDS = 60 * 60 * 24 * 90;
const MAX_INDEX = 500;

/** Upstash Redis over its REST API (what the Vercel Marketplace integration provisions). No SDK needed. */
class RedisStore implements Store {
  persistent = true;
  constructor(
    private url: string,
    private token: string,
  ) {}

  private async cmd<T = unknown>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    const body = (await res.json()) as { result?: T; error?: string };
    if (!res.ok || body.error) throw new Error(`Redis ${args[0]} failed: ${body.error ?? res.status}`);
    return body.result as T;
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

  async claimKey(key: string, jobId: string) {
    const r = await this.cmd<string | null>("SET", `fosla:key:${key}`, jobId, "NX", "EX", TTL_SECONDS);
    return r === "OK";
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
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  g.__foslaStore = url && token ? new RedisStore(url, token) : new MemoryStore();
  return g.__foslaStore;
}
