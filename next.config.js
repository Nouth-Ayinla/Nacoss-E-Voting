/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Add your storage domain (R2/Supabase) once file upload is wired up,
    // so next/image can optimize ID card + candidate photos.
    remotePatterns: [
      // { protocol: "https", hostname: "your-bucket.r2.dev" },
    ],
  },
};

module.exports = nextConfig;
