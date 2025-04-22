/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['skls3.cloud.skalena.com.br'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'skls3.cloud.skalena.com.br',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'canvas'],
  },
}

module.exports = nextConfig 