import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const isDocker = process.env.DOCKER_BUILD === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@repo/shared'],
  reactStrictMode: true,
  // standalone server + monorepo file tracing are only needed for the Docker image
  ...(isDocker
    ? {
        output: 'standalone',
        experimental: { outputFileTracingRoot: path.join(dirname, '../../') },
      }
    : {}),
};

export default nextConfig;
