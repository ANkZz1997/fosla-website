import type { RedisClientType } from "redis";
import type { Transport } from "./index";

/**
 * Talks the standard Redis protocol (Redis Cloud, Vercel Redis, any redis:// or rediss:// server).
 * One connection is opened on first use and reused while the serverless instance stays warm.
 */
export class TcpTransport implements Transport {
  private client?: RedisClientType;
  private connecting?: Promise<RedisClientType>;

  constructor(private url: string) {}

  private async connection(): Promise<RedisClientType> {
    if (this.client?.isReady) return this.client;
    this.connecting ??= (async () => {
      const { createClient } = await import("redis");
      const client = createClient({
        url: this.url,
        socket: {
          connectTimeout: 8_000,
          // A wrong password will never start working: stop at once and say so. Other failures get a few quick retries.
          reconnectStrategy: (n: number, cause: Error) =>
            /WRONGPASS|NOAUTH|invalid password|ERR AUTH/i.test(cause?.message ?? "") ? cause : n > 3 ? new Error(`unreachable (${cause?.message ?? "no response"})`) : n * 200,
        },
      }) as RedisClientType;
      // Without a listener, a dropped connection would crash the process instead of failing one request.
      client.on("error", () => {});
      await client.connect();
      this.client = client;
      return client;
    })().catch((err) => {
      this.connecting = undefined; // let the next request try again
      throw err;
    });
    return this.connecting;
  }

  async send(args: (string | number)[]): Promise<unknown> {
    const client = await this.connection();
    return client.sendCommand(args.map(String));
  }

  async close() {
    const c = this.client;
    this.client = undefined;
    this.connecting = undefined;
    if (c?.isOpen) await c.close();
  }
}
