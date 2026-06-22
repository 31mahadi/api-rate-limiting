import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compile the workspace types package directly (no prebuilt dist needed).
  transpilePackages: ['@repo/shared'],
  // Self-contained server bundle for a small Docker image.
  output: 'standalone',
  // Trace files from the monorepo root so standalone includes workspace deps.
  outputFileTracingRoot: path.join(dirname, '../../'),
  reactStrictMode: true,
};

export default nextConfig;
