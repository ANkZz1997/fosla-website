import type { Metadata } from "next";
import { Fab, FinalCta, Footer, Portals, Services, Checklist, Visit } from "@/components/landing/Places";
import { Anatomy, Feed, Stats, Steps, Ticker } from "@/components/landing/Sections";
import { ADDRESS, PHONE, SERVICES, chatLink } from "@/components/landing/data";
import { body, deva, display } from "@/components/landing/fonts";
import { Hero, type HeroPost } from "@/components/landing/Hero";
import { Nav, type Links } from "@/components/landing/Nav";
import { isAdmin } from "@/lib/auth";
import { env } from "@/lib/config";
import { getLandingData } from "@/lib/landing-data";
import { SOURCES } from "@/lib/sources";
import "./landing.css";

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
  const [{ jobs, postedCount }, admin] = await Promise.all([getLandingData(), isAdmin()]);
  const links: Links = {
    // Until a channel link is configured, "join" opens a chat asking to be added, so the button never dead-ends.
    join: env.channelUrl || chatLink("Hi FOSLA Cyber Cafe, please add me to your jobs WhatsApp channel."),
    instagram: env.instagramUrl,
  };
  const post: HeroPost = jobs[0]
    ? { img: `/api/poster/${jobs[0].id}`, title: jobs[0].title, sample: false }
    : { img: "/api/poster/sample", title: "Sample FOSLA job post", sample: true };

  return (
    <div className={`lp ${display.variable} ${body.variable} ${deva.variable}`}>
      <noscript><style>{".lp-rv,.lp-steps li{opacity:1!important;transform:none!important}"}</style></noscript>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav links={links} admin={admin} />
      <main>
        <Hero links={links} post={post} />
        <Ticker />
        <Stats postedCount={postedCount} sources={SOURCES.length} services={SERVICES.length} />
        <Anatomy />
        <Feed jobs={jobs} links={links} />
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
    </div>
  );
}
