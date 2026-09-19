import { createServer, type Server } from "node:http";
import { createServer as createTcpServer, type Server as TcpServer } from "node:net";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveRedis } from "@/lib/store/redis-config";
import { RedisStore, getStore } from "@/lib/store";
import { TcpTransport } from "@/lib/store/tcp";
import { SAMPLE_JOB } from "@/lib/format/sample";
import type { JobRecord } from "@/lib/types";

describe("finding the Redis credentials", () => {
  it("uses the names you would paste by hand", () => {
    expect(resolveRedis({ UPSTASH_REDIS_REST_URL: "https://a.upstash.io", UPSTASH_REDIS_REST_TOKEN: "tok" })).toEqual({ kind: "rest", url: "https://a.upstash.io", token: "tok", source: "UPSTASH_REDIS_REST_URL" });
  });
  it("uses Vercel's KV_REST_API_* pair", () => {
    expect(resolveRedis({ KV_REST_API_URL: "https://b.upstash.io", KV_REST_API_TOKEN: "t2", KV_REST_API_READ_ONLY_TOKEN: "ro" })).toMatchObject({ kind: "rest", url: "https://b.upstash.io", token: "t2", source: "KV_REST_API_URL" });
  });
  it("works with any custom prefix and never picks the read-only token", () => {
    expect(resolveRedis({ KV_REDIS_REST_API_URL: "https://c.upstash.io", KV_REDIS_REST_API_READ_ONLY_TOKEN: "ro", KV_REDIS_REST_API_TOKEN: "rw" })).toMatchObject({ kind: "rest", token: "rw" });
  });
  it("uses the standard Redis protocol for a Redis Cloud connection string (KV_REDIS_URL)", () => {
    const url = "redis://default:AbC123xyz@example-12345.db.redis.io:12000";
    expect(resolveRedis({ KV_REDIS_URL: url })).toEqual({ kind: "tcp", url, source: "KV_REDIS_URL" });
  });
  it("still uses HTTPS for an Upstash connection string, deriving the REST endpoint from it", () => {
    expect(resolveRedis({ KV_REDIS_URL: "rediss://default:AbC123xyz@bold-fox-12345.upstash.io:6379" })).toEqual({ kind: "rest", url: "https://bold-fox-12345.upstash.io", token: "AbC123xyz", source: "KV_REDIS_URL" });
  });
  it("decodes a percent-encoded Upstash password", () => {
    expect(resolveRedis({ REDIS_URL: "rediss://default:p%40ss%3Dword@h.upstash.io:6379" })).toMatchObject({ kind: "rest", token: "p@ss=word" });
  });
  it("tolerates quotes around the value", () => {
    expect(resolveRedis({ KV_REDIS_URL: '"redis://default:x@h.db.redis.io:1"' })).toMatchObject({ kind: "tcp", url: "redis://default:x@h.db.redis.io:1" });
  });
  it("prefers explicit REST variables over a connection string", () => {
    expect(resolveRedis({ KV_REDIS_URL: "redis://default:x@h.db.redis.io:1", KV_REST_API_URL: "https://r.upstash.io", KV_REST_API_TOKEN: "y" })).toMatchObject({ kind: "rest", token: "y" });
  });
  it("returns null when nothing usable is configured", () => {
    expect(resolveRedis({})).toBeNull();
    expect(resolveRedis({ SOME_URL: "https://example.com" })).toBeNull();
  });
});

/** A stand-in for Upstash's REST API: POST a JSON command array, get {"result": ...} back. */
function mockUpstash(token: string) {
  const strings = new Map<string, string>();
  const zsets = new Map<string, Map<string, number>>();
  const log: (string | number)[][] = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const reply = (status: number, obj: unknown) => (res.writeHead(status, { "content-type": "application/json" }), res.end(JSON.stringify(obj)));
      if (req.headers.authorization !== `Bearer ${token}`) return reply(401, { error: "Unauthorized" });
      const [cmd, ...a] = JSON.parse(body) as (string | number)[];
      log.push([cmd, ...a]);
      const name = String(cmd).toUpperCase();
      const k = String(a[0]);
      if (name === "PING") return reply(200, { result: "PONG" });
      if (name === "GET") return reply(200, { result: strings.get(k) ?? null });
      if (name === "MGET") return reply(200, { result: a.map((x) => strings.get(String(x)) ?? null) });
      if (name === "SET") {
        if (a.map(String).includes("NX") && strings.has(k)) return reply(200, { result: null });
        strings.set(k, String(a[1]));
        return reply(200, { result: "OK" });
      }
      if (name === "EXPIRE") return reply(200, { result: strings.has(k) ? 1 : 0 });
      if (name === "ZADD") {
        const z = zsets.get(k) ?? new Map();
        z.set(String(a[2]), Number(a[1]));
        zsets.set(k, z);
        return reply(200, { result: 1 });
      }
      if (name === "ZREMRANGEBYRANK") {
        const z = zsets.get(k) ?? new Map();
        const asc = [...z.entries()].sort((x, y) => x[1] - y[1]);
        const stop = Number(a[2]) < 0 ? asc.length + Number(a[2]) : Number(a[2]);
        asc.slice(Number(a[1]), stop + 1).forEach(([m]) => z.delete(m));
        return reply(200, { result: 0 });
      }
      if (name === "ZREVRANGE") {
        const desc = [...(zsets.get(k) ?? new Map()).entries()].sort((x, y) => y[1] - x[1]).map(([m]) => m);
        return reply(200, { result: desc.slice(Number(a[1]), Number(a[2]) + 1) });
      }
      return reply(400, { error: `ERR unknown command '${cmd}'` });
    });
  });
  return { server, log };
}

describe("RedisStore over Upstash's HTTPS API", () => {
  let server: Server;
  let url: string;
  let log: (string | number)[][];
  const job = (id: string, createdAt: string): JobRecord => ({ ...SAMPLE_JOB, id, createdAt });

  beforeAll(async () => {
    const m = mockUpstash("secret-token");
    server = m.server;
    log = m.log;
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => server.close());

  it("pings with the right token and rejects a wrong one with a clear error", async () => {
    await expect(RedisStore.rest(url, "secret-token").ping()).resolves.toBeUndefined();
    await expect(RedisStore.rest(url, "wrong").ping()).rejects.toThrow(/Unauthorized/);
  });

  it("saves jobs, lists them newest first and reads them back", async () => {
    const s = RedisStore.rest(url, "secret-token");
    await s.saveJob(job("aaaaaaaaaaaa", "2026-09-18T00:00:00Z"));
    await s.saveJob(job("bbbbbbbbbbbb", "2026-09-19T00:00:00Z"));
    await s.saveJob(job("cccccccccccc", "2026-09-17T00:00:00Z"));
    expect((await s.listJobs(2)).map((j) => j.id)).toEqual(["bbbbbbbbbbbb", "aaaaaaaaaaaa"]);
    expect((await s.getJob("cccccccccccc"))?.id).toBe("cccccccccccc");
    expect(await s.getJob("dddddddddddd")).toBeNull();
    expect(await s.listJobs(10)).toHaveLength(3);
  });

  it("claims a dedupe key once, with a TTL, and can make the claim permanent", async () => {
    const s = RedisStore.rest(url, "secret-token");
    expect(await s.claimKey("job|x|", "id1", 900)).toBe(true);
    expect(await s.claimKey("job|x|", "id2", 900)).toBe(false);
    const set = log.filter((c) => c[0] === "SET" && String(c[1]).endsWith("job|x|"));
    expect(set[0]).toEqual(["SET", "fosla:key:job|x|", "id1", "NX", "EX", 900]);
    await s.renewKey("job|x|");
    expect(log.some((c) => c[0] === "EXPIRE" && c[1] === "fosla:key:job|x|")).toBe(true);
  });

  it("stores and returns run metadata", async () => {
    const s = RedisStore.rest(url, "secret-token");
    expect(await s.getMeta("lastRun")).toBeNull();
    await s.setMeta("lastRun", { created: 7 });
    expect(await s.getMeta<{ created: number }>("lastRun")).toEqual({ created: 7 });
  });

  it("reports which variable it is using, without exposing the token", () => {
    const s = RedisStore.rest(url, "secret-token", "KV_REDIS_URL");
    expect(s.describe()).toBe("Redis via KV_REDIS_URL");
    expect(s.describe()).not.toContain("secret-token");
  });
});


/** A stand-in Redis server speaking the real wire protocol (RESP), with password login. */
function mockRedisTcp(password: string) {
  const strings = new Map<string, string>();
  const zsets = new Map<string, Map<string, number>>();
  const bulk = (v: string | null) => (v === null ? "$-1\r\n" : `$${Buffer.byteLength(v)}\r\n${v}\r\n`);
  const arr = (a: (string | null)[]) => `*${a.length}\r\n${a.map(bulk).join("")}`;

  const server = createTcpServer((socket) => {
    let buf = Buffer.alloc(0);
    let authed = false;
    socket.on("error", () => {});
    // RESP lengths are BYTE counts, so parse the raw buffer, never a decoded string.
    const CRLF = Buffer.from("\r\n");
    const parse = (): string[] | null => {
      if (buf.length === 0 || buf[0] !== 0x2a) return null; // "*"
      const head = buf.indexOf(CRLF);
      if (head < 0) return null;
      const n = Number(buf.subarray(1, head).toString());
      let pos = head + 2;
      const args: string[] = [];
      for (let i = 0; i < n; i++) {
        const lenEnd = buf.indexOf(CRLF, pos);
        if (lenEnd < 0) return null;
        const len = Number(buf.subarray(pos + 1, lenEnd).toString());
        if (buf.length < lenEnd + 2 + len + 2) return null;
        args.push(buf.subarray(lenEnd + 2, lenEnd + 2 + len).toString("utf8"));
        pos = lenEnd + 2 + len + 2;
      }
      buf = buf.subarray(pos);
      return args;
    };
    socket.on("data", (d) => {
      buf = Buffer.concat([buf, d as Buffer]);
      for (let args = parse(); args; args = parse()) if (args.length) socket.write(handle(args));
    });
    const handle = (args: string[]): string => {
      const name = args[0].toUpperCase();
      if (name === "AUTH") {
        const pw = args[args.length - 1];
        if (pw !== password) return "-WRONGPASS invalid username-password pair or user is disabled.\r\n";
        authed = true;
        return "+OK\r\n";
      }
      if (name === "HELLO") {
        // HELLO [protover [AUTH username password]]: how current clients log in.
        const at = args.findIndex((x) => x.toUpperCase() === "AUTH");
        if (at >= 0) {
          if (args[at + 2] !== password) return "-WRONGPASS invalid username-password pair or user is disabled.\r\n";
          authed = true;
        }
        return `*14\r\n${["server", "redis", "version", "7.2.0"].map(bulk).join("")}${bulk("proto")}:2\r\n${bulk("id")}:1\r\n${["mode", "standalone", "role", "master", "modules"].map(bulk).join("")}*0\r\n`;
      }
      if (name === "CLIENT") return "+OK\r\n";
      if (!authed) return "-NOAUTH Authentication required.\r\n";
      const k = args[1];
      switch (name) {
        case "PING": return "+PONG\r\n";
        case "GET": return bulk(strings.get(k) ?? null);
        case "MGET": return arr(args.slice(1).map((x) => strings.get(x) ?? null));
        case "SET": {
          if (args.slice(3).map((x) => x.toUpperCase()).includes("NX") && strings.has(k)) return "$-1\r\n";
          strings.set(k, args[2]);
          return "+OK\r\n";
        }
        case "EXPIRE": return strings.has(k) ? ":1\r\n" : ":0\r\n";
        case "ZADD": { const z = zsets.get(k) ?? new Map(); z.set(args[3], Number(args[2])); zsets.set(k, z); return ":1\r\n"; }
        case "ZREMRANGEBYRANK": {
          const z = zsets.get(k) ?? new Map();
          const asc = [...z.entries()].sort((x, y) => x[1] - y[1]);
          const stop = Number(args[3]) < 0 ? asc.length + Number(args[3]) : Number(args[3]);
          asc.slice(Number(args[2]), stop + 1).forEach(([m]) => z.delete(m));
          return ":0\r\n";
        }
        case "ZREVRANGE": {
          const desc = [...(zsets.get(k) ?? new Map()).entries()].sort((x, y) => y[1] - x[1]).map(([m]) => m);
          return arr(desc.slice(Number(args[2]), Number(args[3]) + 1));
        }
        default: return `-ERR unknown command '${args[0]}'\r\n`;
      }
    };
  });
  return server;
}

describe("RedisStore over a normal Redis connection (Redis Cloud style)", () => {
  let server: TcpServer;
  let port: number;
  const open: TcpTransport[] = [];
  const store = (pw = "pw-123") => {
    const t = new TcpTransport(`redis://default:${pw}@127.0.0.1:${port}`);
    open.push(t);
    return new RedisStore(t, "KV_REDIS_URL");
  };
  const job = (id: string, createdAt: string): JobRecord => ({ ...SAMPLE_JOB, id, createdAt });

  beforeAll(async () => {
    server = mockRedisTcp("pw-123");
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    port = (server.address() as AddressInfo).port;
  });
  afterAll(async () => {
    await Promise.all(open.map((t) => t.close()));
    server.close();
  });

  it("logs in with the password from the connection string and pings", async () => {
    await expect(store().ping()).resolves.toBeUndefined();
  });

  it("reports a wrong password clearly instead of hanging", async () => {
    await expect(store("wrong").ping()).rejects.toThrow(/Redis PING failed/i);
  });

  it("saves, lists newest first, reads back, claims once and stores metadata", async () => {
    const s = store();
    await s.saveJob(job("aaaaaaaaaaaa", "2026-09-18T00:00:00Z"));
    await s.saveJob(job("bbbbbbbbbbbb", "2026-09-19T00:00:00Z"));
    expect((await s.listJobs(5)).map((j) => j.id)).toEqual(["bbbbbbbbbbbb", "aaaaaaaaaaaa"]);
    expect((await s.getJob("aaaaaaaaaaaa"))?.id).toBe("aaaaaaaaaaaa");
    expect(await s.getJob("zzzzzzzzzzzz")).toBeNull();
    expect(await s.claimKey("job|tcp|", "id1", 900)).toBe(true);
    expect(await s.claimKey("job|tcp|", "id2", 900)).toBe(false);
    await s.renewKey("job|tcp|");
    await s.setMeta("lastRun", { created: 3 });
    expect(await s.getMeta<{ created: number }>("lastRun")).toEqual({ created: 3 });
  });

  it("fails fast when the server is unreachable, so a page never hangs", async () => {
    const t = new TcpTransport("redis://default:x@127.0.0.1:1");
    open.push(t);
    const started = Date.now();
    await expect(new RedisStore(t).ping()).rejects.toThrow(/Redis PING failed/);
    expect(Date.now() - started).toBeLessThan(5000);
  });

  it("getStore() picks the standard-Redis connection from KV_REDIS_URL and it works end to end", async () => {
    const before = { ...process.env };
    process.env.KV_REDIS_URL = `redis://default:pw-123@127.0.0.1:${port}`;
    for (const k of ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"]) delete process.env[k];
    delete (globalThis as { __foslaStore?: unknown }).__foslaStore;
    try {
      const s = getStore();
      expect(s.persistent).toBe(true);
      expect(s.describe()).toBe("Redis via KV_REDIS_URL");
      await expect(s.ping()).resolves.toBeUndefined();
      await s.saveJob(job("eeeeeeeeeeee", "2026-09-20T00:00:00Z"));
      expect((await s.getJob("eeeeeeeeeeee"))?.id).toBe("eeeeeeeeeeee");
    } finally {
      delete (globalThis as { __foslaStore?: unknown }).__foslaStore;
      process.env = before;
    }
  });
});
