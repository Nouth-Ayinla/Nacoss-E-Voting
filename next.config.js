/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  // Prevents browsers from guessing MIME types (stops MIME-sniffing attacks)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Blocks the page from being loaded in a frame/iframe (prevents clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Stops the browser from sending the full referrer URL to external sites
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restricts browser features (camera, mic, geolocation, etc.)
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()" },
  // Forces HTTPS for 1 year, including subdomains
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Content Security Policy — restricts what scripts/styles/resources can load
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Allow Next.js inline scripts. In development mode, 'unsafe-eval' is required for Fast Refresh/HMR.
      isProd
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Allow inline styles (used by Tailwind) and Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Allow fonts from Google and self
      "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
      // Allow images from self, data URIs, and Cloudflare R2 storage
      "img-src 'self' data: blob: https://*.r2.dev https://*.r2.cloudflarestorage.com",
      // Allow API connections only to self
      "connect-src 'self'",
      // Block all frames
      "frame-ancestors 'none'",
      // Block plugin embeds
      "object-src 'none'",
      // Block base tag hijacking
      "base-uri 'self'",
    ].join("; "),
  },
];

const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      // { protocol: "https", hostname: "your-bucket.r2.dev" },
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
