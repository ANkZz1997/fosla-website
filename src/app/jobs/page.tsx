import type { Metadata } from "next";
import { Board } from "@/components/landing/Board";
import { Fab, FinalCta, Footer } from "@/components/landing/Places";
import { Nav } from "@/components/landing/Nav";
import { SiteShell } from "@/components/landing/SiteShell";
import { loadSite } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Government Job Openings | FOSLA Cyber Cafe, Mandi",
  description: "Every open government job, result and admit card in one place: seats, last dates and an Apply button. Search and filter Himachal Pradesh and all-India openings.",
  alternates: { canonical: "/jobs" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "FOSLA Cyber Cafe",
    title: "Live Government Job Openings | FOSLA Cyber Cafe",
    description: "Seat-wise details, last dates and an Apply button for every open job.",
    images: [{ url: "/api/poster/sample", width: 1080, height: 1350 }],
  },
};

export default async function JobsPage() {
  const { jobs, links, admin, updatedLabel, serverNow } = await loadSite();
  return (
    <SiteShell>
      <Nav links={links} admin={admin} />
      <main>
        <Board jobs={jobs} links={links} serverNow={serverNow} updatedLabel={updatedLabel} />
        <FinalCta links={links} />
      </main>
      <Footer links={links} admin={admin} />
      <Fab />
    </SiteShell>
  );
}
