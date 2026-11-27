import type { NextConfig } from "next";

// Security headers sent with every page and API response.
const securityHeaders = [
  // Don't let other websites show our pages inside a frame (stops "clickjacking").
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Browsers must not guess file types (stops some script-injection tricks).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // When following a link to another site, send only our domain, never the full page address.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Only our own pages may use the microphone; camera and location are never needed.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=()" },
  // Always use HTTPS once the site has been visited over HTTPS.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Don't advertise which framework the server runs.
  poweredByHeader: false,
  // Put page details (like each parent's app manifest) in <head> for every browser, instead of
  // streaming them into <body> later: Chrome can only install the app if the manifest is in <head>.
  htmlLimitedBots: /.*/,
  // Old demo links from the first version keep working.
  async redirects() {
    return [
      { source: "/ammi", destination: "/talk/demo-ammi", permanent: false },
      { source: "/talk/ammi", destination: "/talk/demo-ammi", permanent: false },
      { source: "/talk/abbu", destination: "/talk/demo-abbu", permanent: false },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
