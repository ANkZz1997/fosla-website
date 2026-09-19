import { chatLink } from "@/components/landing/data";
import type { Links } from "@/components/landing/Nav";
import { isAdmin } from "./auth";
import { env } from "./config";
import { getLandingData } from "./landing-data";

/** Everything the public pages share: job data, contact links and whether an admin is signed in. */
export async function loadSite() {
  const [{ jobs, updatedAt }, admin] = await Promise.all([getLandingData(), isAdmin()]);
  const links: Links = {
    // Until a channel link is configured, "join" opens a chat asking to be added, so the button never dead-ends.
    join: env.channelUrl || chatLink("Hi FOSLA Cyber Cafe, please add me to your jobs WhatsApp channel."),
    instagram: env.instagramUrl,
  };
  const updatedLabel = new Date(updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return { jobs, links, admin, updatedLabel, serverNow: Date.now() };
}
