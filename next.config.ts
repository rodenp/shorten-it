import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' }, // Replace with specific origin in prod
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ];
  },

  experimental: {
    allowedDevOrigins: [
      '9000-firebase-studio-1746992730513.cluster-axf5tvtfjjfekvhwxwkkkzsk2y.cloudworkstations.dev',
    ],
    // Other experimental flags available in Next.js 15 if needed
    // reactCompiler: true,
    // after: true,
  },

  output: 'standalone',
};

export default nextConfig;