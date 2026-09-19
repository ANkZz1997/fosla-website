import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { publishJob } from "@/lib/publish";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({ action: z.enum(["post", "mark-posted", "skip", "reset"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const store = getStore();
  const job = await store.getJob((await params).id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  const now = new Date().toISOString();
  switch (parsed.data.action) {
    case "post": {
      const res = await publishJob(job);
      const next = res.ok ? { ...job, status: "posted" as const, postedAt: now, error: undefined } : { ...job, status: "failed" as const, error: res.error };
      await store.saveJob(next);
      return NextResponse.json({ ok: res.ok, error: res.error }, { status: res.ok ? 200 : 502 });
    }
    case "mark-posted":
      await store.saveJob({ ...job, status: "posted", postedAt: now, error: undefined });
      break;
    case "skip":
      await store.saveJob({ ...job, status: "skipped" });
      break;
    case "reset":
      await store.saveJob({ ...job, status: "ready", error: undefined });
      break;
  }
  return NextResponse.json({ ok: true });
}
