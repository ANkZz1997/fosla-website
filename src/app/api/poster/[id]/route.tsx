import { isAdmin } from "@/lib/auth";
import { renderPoster } from "@/lib/format/poster";
import { SAMPLE_JOB } from "@/lib/format/sample";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isSample = id === "sample";
  if (!isSample && !/^[a-f0-9]{12}$/.test(id)) return new Response("Not found", { status: 404 });
  // Only jobs you have actually posted are publicly viewable here; drafts stay private until then.
  const job = isSample ? SAMPLE_JOB : await getStore().getJob(id);
  if (!job) return new Response("Not found", { status: 404 });
  if (!isSample && job.status !== "posted" && !(await isAdmin())) return new Response("Not found", { status: 404 });
  const res = await renderPoster(job);
  const headers = new Headers(res.headers);
  headers.set("cache-control", isSample || job.status === "posted" ? "public, max-age=300" : "private, no-store");
  if (new URL(req.url).searchParams.has("download")) headers.set("content-disposition", `attachment; filename="fosla-${id}.png"`);
  return new Response(res.body, { status: 200, headers });
}
