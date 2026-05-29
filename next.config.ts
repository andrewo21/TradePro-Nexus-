import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow SVG files to be served via next/image
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
