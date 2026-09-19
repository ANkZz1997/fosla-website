import { NextResponse } from "next/server";
import { verifyCron } from "@/lib/auth";
import { runPipeline } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Called by Vercel Cron (daily) and by the GitHub Actions workflow (every 30 min). */
export async function GET(req: Request) {
  if (!verifyCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runPipeline());
}
