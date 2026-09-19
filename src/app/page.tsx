import type { Metadata } from "next";
import { Fab, FinalCta, Footer, Portals, Services, Checklist, Visit } from "@/components/landing/Places";
import { Anatomy, Stats, Steps, Ticker } from "@/components/landing/Sections";
import { JobsPreview } from "@/components/landing/Board";
import { ADDRESS, PHONE, SERVICES, chatLink } from "@/components/landing/data";
import { SiteShell } from "@/components/landing/SiteShell";
import { Hero, type HeroPost } from "@/components/landing/Hero";
import { Nav } from "@/components/landing/Nav";
import { loadSite } from "@/lib/site";
import { SOURCES } from "@/lib/sources";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "FOSLA Cyber Cafe",
    title: "FOSLA Cyber Cafe, Mandi | Govt Job Alerts & Online Form Filling",
    description: "Seat-wise job, result and admit card alerts on WhatsApp. Form filling, print, scan and more in Mandi, HP.",
    images: [{ url: "/api/poster/sample", width: 1080, height: 1350 }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "FOSLA Cyber Cafe",
  description: "Cyber cafe offering online form filling, printing, scanning, xerox, lamination, passport photos and government job alerts.",
  telephone: `+91${PHONE}`,
  address: { "@type": "PostalAddress", streetAddress: "Shop No. 26, Tibetan Market, Near Police Thana Sadar", addressLocality: "Mandi", addressRegion: "Himachal Pradesh", postalCode: "175001", addressCountry: "IN" },
  openingHours: "Mo-Su 09:00-20:00",
};

export default async function Home() {
  const { jobs, links, admin, serverNow } = await loadSite();
  // The phone mock shows a real poster only if it has been posted (posters of drafts stay private).
  const showcase = jobs.find((j) => j.posted);
  const post: HeroPost = showcase
    ? { img: `/api/poster/${showcase.id}`, title: showcase.title, sample: false }
    : { img: "/api/poster/sample", title: "Sample FOSLA job post", sample: true };

  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav links={links} admin={admin} />
      <main>
        <Hero links={links} post={post} />
        <Ticker />
        <Stats openCount={jobs.filter((j) => j.category === "job").length} sources={SOURCES.length} services={SERVICES.length} />
        <JobsPreview jobs={jobs} links={links} serverNow={serverNow} />
        <Anatomy />
        <Services />
        <Portals />
        <Steps />
        <Checklist />
        <Visit />
        <FinalCta links={links} />
      </main>
      <Footer links={links} admin={admin} />
      <Fab />
      <address hidden>{ADDRESS}</address>
    </SiteShell>
  );
}
