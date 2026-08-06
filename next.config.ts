import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // @sparticuz/chromium ships a bin/ directory (the Chromium binary). Next's
  // server bundler must treat it as external so the binary is NOT relocated/
  // bundled away — otherwise production launches fail with
  // 'input directory .../chromium/bin does not exist'.
  // https://github.com/Sparticuz/chromium#bundler-configuration
  serverExternalPackages: ['@sparticuz/chromium'],
};

export default nextConfig;
