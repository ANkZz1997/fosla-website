import { NextResponse } from "next/server";
import { COOKIE, SESSION_MAX_AGE, checkPassword, newSessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const ok = checkPassword(String(form.get("password") ?? ""));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return NextResponse.redirect(new URL("/admin?error=1", req.url), 303);
  }
  const res = NextResponse.redirect(new URL("/admin", req.url), 303);
  res.cookies.set(COOKIE, newSessionToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_MAX_AGE });
  return res;
}
