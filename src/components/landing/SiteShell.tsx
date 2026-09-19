import "@/app/landing.css";
import { body, deva, display } from "./fonts";

/** Fonts, theme scope and the no-JavaScript fallback shared by every public page. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`lp ${display.variable} ${body.variable} ${deva.variable}`}>
      <noscript><style>{".lp-rv,.lp-steps li{opacity:1!important;transform:none!important}"}</style></noscript>
      {children}
    </div>
  );
}
