/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLint belum dikonfigurasi. Pemeriksaan format dan tipe dijalankan terpisah
    // melalui npm run check sebelum deployment.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript sudah diperiksa melalui npm run check di GitHub Actions.
    // Build VPS melewati pemeriksaan ulang; build lokal juga perlu npm run check.
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
      },
    ],
  },
};

export default nextConfig;
