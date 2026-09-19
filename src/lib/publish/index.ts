import { env } from "../config";
import { buildPost } from "../format/caption";
import { renderPoster } from "../format/poster";
import type { JobRecord } from "../types";

export interface PublishResult {
  ok: boolean;
  error?: string;
}

export const canPublish = () => env.publishMode === "bridge" && !!env.bridgeUrl && !!env.bridgeToken;

/**
 * Hands the poster + text to the WhatsApp bridge, a small always-on service you host (see bridge/README.md).
 * WhatsApp has no official API for posting to Channels, and Vercel functions cannot hold the WhatsApp Web
 * connection open, so the bridge is the piece that actually talks to WhatsApp.
 */
export async function publishJob(job: JobRecord): Promise<PublishResult> {
  if (!canPublish()) return { ok: false, error: "Bridge is not configured (PUBLISH_MODE=bridge, BRIDGE_URL, BRIDGE_TOKEN)." };
  try {
    const { short, full } = buildPost(job);
    const png = Buffer.from(await (await renderPoster(job)).arrayBuffer());
    const res = await fetch(`${env.bridgeUrl}/post`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.bridgeToken}`, "content-type": "application/json" },
      body: JSON.stringify({ id: job.id, caption: short, text: full, imageBase64: png.toString("base64"), mimetype: "image/png" }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return { ok: false, error: `Bridge replied ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
