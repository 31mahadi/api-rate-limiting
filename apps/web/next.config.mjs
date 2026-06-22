/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compile the workspace types package directly (no prebuilt dist needed).
  transpilePackages: ['@repo/shared'],
  // Self-contained server bundle for a small Docker image.
  output: 'standalone',
  reactStrictMode: true,
};

export default nextConfig;
