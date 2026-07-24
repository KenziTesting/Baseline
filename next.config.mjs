/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Baseline is offline-first / mobile-first. PWA service worker is added in Phase 8.
  typedRoutes: true,
};

export default nextConfig;
