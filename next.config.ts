import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // @sparticuz/chromium is already in Next's auto-external list, but on
  // Next 16 + Turbopack + pnpm + Vercel the hashed external alias doesn't
  // resolve and the bin/ directory doesn't make it into the lambda — this
  // surfaces at runtime as "input directory .../chromium/bin does not
  // exist". Force-copy the bin directory into the route's trace so
  // executablePath() finds it (documented workaround; see
  // github.com/Sparticuz/chromium#bundler-configuration).
  outputFileTracingIncludes: {
    '/api/scrape': ['./node_modules/@sparticuz/chromium/bin/'],
  },
};

export default nextConfig;
