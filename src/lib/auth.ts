import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./config";

export const COOKIE = "fosla_admin";
const WEEK = 60 * 60 * 24 * 7;

const sign = (payload: string) => createHmac("sha256", env.sessionSecret).update(payload).digest("hex");

const safeEqual = (a: string, b: string) => {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
};

/** The dashboard stays locked (not open) until ADMIN_PASSWORD is set. */
export const adminConfigured = () => !!env.adminPassword && !!env.sessionSecret;

export const checkPassword = (pw: string) => adminConfigured() && safeEqual(pw, env.adminPassword);

export function newSessionToken() {
  const exp = String(Math.floor(Date.now() / 1000) + WEEK);
  return `${exp}.${sign(exp)}`;
}

export const SESSION_MAX_AGE = WEEK;

export function verifySessionToken(token: string | undefined) {
  if (!token || !adminConfigured()) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, sign(exp));
}

export async function isAdmin() {
  return verifySessionToken((await cookies()).get(COOKIE)?.value);
}

/** For cron endpoints: Vercel Cron and GitHub Actions send "Authorization: Bearer <CRON_SECRET>". */
export function verifyCron(req: Request) {
  if (!env.cronSecret) return false;
  return safeEqual(req.headers.get("authorization") ?? "", `Bearer ${env.cronSecret}`);
}
