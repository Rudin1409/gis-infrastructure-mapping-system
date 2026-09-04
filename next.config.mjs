/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLint is checked in development/CI; skipping during next build speeds up VPS deployment drastically
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript check is already verified in GitHub Actions (npx tsc --noEmit); skipping redundant check speeds up VPS build
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ],
  },
};

export default nextConfig;
