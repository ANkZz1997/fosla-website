import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const next = String(form?.get("next") ?? "");
  // Default to the main page. Only same-site paths are allowed, never an external URL.
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const res = NextResponse.redirect(new URL(target, req.url), 303);
  res.cookies.delete(COOKIE);
  return res;
}
