import type { Metadata } from "next";
import Link from "next/link";
import { adminConfigured, isAdmin } from "@/lib/auth";
import { env } from "@/lib/config";
import { aiEnabled } from "@/lib/extract/ai";
import { buildPost } from "@/lib/format/caption";
import { canPublish } from "@/lib/publish";
import { getStore } from "@/lib/store";
import type { RunSummary } from "@/lib/types";
import { JobCard, type CardJob } from "./JobCard";
import { RunButton } from "./RunButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin | FOSLA Jobs Auto-Post", robots: { index: false, follow: false } };

const TABS = ["new", "ready", "posted", "failed", "skipped", "all"] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = { new: "Last 24 hours", ready: "Ready", posted: "Posted", failed: "Failed", skipped: "Skipped", all: "All" };
const DAY = 86_400_000;

function Shell({ children, loggedIn = false }: { children: React.ReactNode; loggedIn?: boolean }) {
  return (
    <>
      <header className="top">
        <div className="wrap">
          <div>
            <div className="brand">FOSLA <span>CYBER CAFE</span></div>
            <small>JOBS AUTO-POST • MANDI, HP</small>
          </div>
          {loggedIn ? (
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/" className="btn ghost">View site ↗</Link>
              <form method="post" action="/api/admin/logout"><button className="btn red" type="submit">Log out</button></form>
            </div>
          ) : null}
        </div>
      </header>
      {children}
    </>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const sp = await searchParams;

  if (!adminConfigured()) {
    return (
      <Shell>
        <div className="wrap login panel">
          <h2>Finish setup</h2>
          <p>Set <code>ADMIN_PASSWORD</code> and <code>SESSION_SECRET</code> in your environment variables, then reload. The dashboard stays locked until then.</p>
        </div>
      </Shell>
    );
  }

  if (!(await isAdmin())) {
    return (
      <Shell>
        <form className="wrap login panel" method="post" action="/api/admin/login">
          <h2>Admin login</h2>
          <input type="password" name="password" placeholder="Password" autoFocus required />
          {sp.error ? <div className="error">Wrong password.</div> : null}
          <button className="btn red" type="submit">Sign in</button>
        </form>
      </Shell>
    );
  }

  const store = getStore();
  const [all, lastRun] = await Promise.all([store.listJobs(150), store.getMeta<RunSummary>("lastRun")]);
  const tab = ((TABS as readonly string[]).includes(sp.status ?? "") ? sp.status! : "new") as (typeof TABS)[number];
  // "Last 24 hours" = everything the nightly (or manual) check found since yesterday, minus what you skipped.
  const isNew = (j: (typeof all)[number]) => Date.now() - Date.parse(j.createdAt) < DAY && j.status !== "skipped";
  const inTab = (t: (typeof TABS)[number], j: (typeof all)[number]) => (t === "all" ? true : t === "new" ? isNew(j) : j.status === t);
  const shown = all.filter((j) => inTab(tab, j));
  const counts = Object.fromEntries(TABS.map((t) => [t, all.filter((j) => inTab(t, j)).length]));
  const canPost = canPublish();

  const cards: CardJob[] = shown.map((j) => ({
    id: j.id, title: j.title, category: j.category, status: j.status, source: j.source, hp: j.hp, createdAt: j.createdAt, url: j.url, error: j.error,
    thin: j.category === "job" && j.details.extractedBy === "listing-only",
    posts: j.details.postWise.length,
    ...buildPost(j),
  }));

  return (
    <Shell loggedIn>
      <main className="wrap">
        <div className="status">
          <div className={`stat ${store.persistent ? "good" : "bad"}`}><b>Memory of posted jobs</b><span>{store.persistent ? "Saved ✓" : "NOT saved (connect Upstash Redis)"}</span></div>
          <div className="stat"><b>Posting mode</b><span>{canPost ? (env.autoPost ? "Bridge · automatic" : "Bridge · one click") : "Manual (copy & paste)"}</span></div>
          <div className={`stat ${aiEnabled() ? "good" : ""}`}><b>AI cleanup of messy pages</b><span>{aiEnabled() ? `On (${env.aiModel})` : "Off"}</span></div>
          <div className="stat"><b>Public job board</b><span>{env.landingJobs === "posted" ? "Posted jobs only" : "All open jobs (Skip hides one)"}</span></div>
          <div className="stat"><b>Automatic check</b><span>Every night at 12:00 AM IST</span></div>
          <div className="stat"><b>Last check</b><span>{lastRun ? new Date(lastRun.finishedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "Never"}{lastRun ? ` · ${lastRun.created} new` : ""}</span></div>
        </div>

        {!store.persistent ? (
          <div className="notice">Without Upstash Redis the app forgets what it already prepared, so the same jobs can appear again on every run. Add the free <b>Upstash Redis</b> integration in your Vercel project (Storage tab) and redeploy.</div>
        ) : null}
        {lastRun?.sources.some((s) => !s.ok) ? (
          <div className="notice">
            Some sites could not be read on the last check:{" "}
            {lastRun.sources.filter((s) => !s.ok).map((s) => `${s.source} (${s.error})`).join("; ")}. The other sites still worked.
          </div>
        ) : null}
        {lastRun?.errors.filter((e) => !e.includes(":") || e.startsWith("AUTO_POST") || e.startsWith("post ")).map((e) => <div key={e} className="notice">{e}</div>)}

        <div className="toolbar">
          <div className="tabs">
            {TABS.map((t) => (
              <Link key={t} href={`/admin?status=${t}`} className={`tab ${t === tab ? "on" : ""}`}>{TAB_LABEL[t]} ({counts[t]})</Link>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <RunButton />
          </div>
        </div>

        {cards.length ? (
          <div className="grid">
            {cards.map((c) => <JobCard key={c.id} job={c} canPost={canPost} channelUrl={env.channelUrl} />)}
          </div>
        ) : (
          <div className="panel empty">Nothing in “{TAB_LABEL[tab]}”. The site is checked automatically every night; you can also press <b>Fetch new jobs now</b>.</div>
        )}
      </main>
    </Shell>
  );
}
