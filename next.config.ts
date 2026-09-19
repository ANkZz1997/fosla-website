import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  // The poster fonts are read from disk at runtime; make sure Vercel ships them with every route that renders a poster.
  outputFileTracingIncludes: {
    "/api/**/*": ["./src/assets/fonts/**"],
  },
};

export default config;
