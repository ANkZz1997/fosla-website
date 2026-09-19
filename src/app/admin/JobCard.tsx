"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface CardJob {
  id: string;
  title: string;
  category: string;
  status: "ready" | "posted" | "skipped" | "failed";
  source: string;
  hp: boolean;
  createdAt: string;
  url: string;
  error?: string;
  thin: boolean;
  posts: number;
  short: string;
  full: string;
}

export function JobCard({ job, canPost, channelUrl }: { job: CardJob; canPost: boolean; channelUrl: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function act(action: "post" | "mark-posted" | "skip" | "reset") {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNote(`${label} copied`);
    } catch {
      setNote("Copy blocked by the browser - select the text and copy manually.");
    }
  }

  return (
    <article className="card">
      <a href={`/api/poster/${job.id}?download=1`} title="Download poster">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/poster/${job.id}`} alt={job.title} loading="lazy" />
      </a>
      <div className="body">
        <div className="badges">
          <span className={`badge ${job.status}`}>{job.status}</span>
          {job.hp ? <span className="badge hp">HP</span> : null}
          <span className="badge">{job.category}</span>
          <span className="badge">{job.source}</span>
          {job.posts ? <span className="badge">{job.posts} post types</span> : null}
        </div>
        <h3>{job.title}</h3>
        {job.thin ? <div className="meta">⚠ The job page could not be read, so this post only has headline details. Check it before posting.</div> : null}
        {job.error ? <div className="err">{job.error}</div> : null}
        <details>
          <summary>Poster caption (short)</summary>
          <textarea readOnly value={job.short} />
        </details>
        <details>
          <summary>Full details message</summary>
          <textarea readOnly value={job.full} style={{ minHeight: 220 }} />
        </details>
        <div className="actions">
          <button className="btn" onClick={() => copy(job.short, "Caption")}>Copy caption</button>
          <button className="btn" onClick={() => copy(job.full, "Full details")}>Copy details</button>
          <a className="btn ghost" href={`/api/poster/${job.id}?download=1`}>⬇ Poster</a>
          {channelUrl ? <a className="btn ghost" href={channelUrl} target="_blank" rel="noopener">Open channel ↗</a> : null}
          <a className="btn ghost" href={job.url} target="_blank" rel="noopener">Source ↗</a>
        </div>
        <div className="actions">
          {job.status !== "posted" && canPost ? <button className="btn red" disabled={busy} onClick={() => act("post")}>{busy ? "Posting…" : "Post to channel"}</button> : null}
          {job.status !== "posted" ? <button className="btn ok" disabled={busy} onClick={() => act("mark-posted")}>✓ Mark as posted</button> : null}
          {job.status === "ready" || job.status === "failed" ? <button className="btn ghost" disabled={busy} onClick={() => act("skip")}>Skip</button> : null}
          {job.status === "skipped" || job.status === "posted" ? <button className="btn ghost" disabled={busy} onClick={() => act("reset")}>Move back to queue</button> : null}
        </div>
        {note ? <div className="meta">{note}</div> : null}
      </div>
    </article>
  );
}
