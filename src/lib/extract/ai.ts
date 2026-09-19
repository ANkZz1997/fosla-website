import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { env } from "../config";
import type { JobDetails } from "../types";

const Schema = z.object({
  organization: z.string().nullable(),
  totalVacancies: z.string().nullable(),
  payScale: z.string().nullable(),
  applicationMode: z.string().nullable(),
  postWise: z.array(z.object({ post: z.string(), seats: z.number().nullable(), breakup: z.string().nullable() })),
  dates: z.array(z.object({ label: z.string(), value: z.string() })),
  age: z.array(z.object({ label: z.string(), value: z.string() })),
  fees: z.array(z.object({ label: z.string(), value: z.string() })),
  qualification: z.array(z.object({ label: z.string(), value: z.string() })),
  summary: z.string().nullable(),
});

const SYSTEM = `You extract structured facts from an Indian government job / exam notification page for a cyber cafe's WhatsApp channel.
Rules:
- Use only what the page says. If a field is not stated, return null or an empty array. Never guess seat counts or dates.
- postWise: one entry per post/discipline with its seat count; put the category split (UR/SC/ST/OBC/EWS...) in "breakup" like "UR 12 · SC 4 · ST 2".
- dates: application start, last date, fee last date, exam/admit card/interview dates - keep the page's own date text.
- summary: one plain-English sentence on who can apply (education level, age range, region). No hype.
- Ignore ads, "join our Telegram/WhatsApp" text, and the source site's own promotions.`;

/** Pages longer than this are skipped rather than silently cut off, so the model never answers from half a page. */
const MAX_CHARS = 80_000;

let client: Anthropic | undefined;

export const aiEnabled = () => !!env.aiKey;

export async function aiExtract(title: string, pageText: string): Promise<Partial<JobDetails> | null> {
  if (!aiEnabled() || pageText.length > MAX_CHARS) return null;
  client ??= new Anthropic({ apiKey: env.aiKey });
  try {
    const res = await client.messages.parse({
      model: env.aiModel,
      max_tokens: 8000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(Schema) },
      messages: [{ role: "user", content: `Title: ${title}\n\nPage text:\n${pageText}` }],
    });
    const out = res.parsed_output;
    if (!out) return null;
    return {
      organization: out.organization ?? undefined,
      totalVacancies: out.totalVacancies ?? undefined,
      payScale: out.payScale ?? undefined,
      applicationMode: out.applicationMode ?? undefined,
      postWise: out.postWise.map((p) => ({ post: p.post, seats: p.seats ?? undefined, breakup: p.breakup ?? undefined })),
      dates: out.dates,
      age: out.age,
      fees: out.fees,
      qualification: out.qualification,
      summary: out.summary ?? undefined,
    };
  } catch (err) {
    console.error("[ai] extraction failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
