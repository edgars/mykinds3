/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable standalone output mode for Docker
  output: 'standalone',
  
  // Add image domains for external images
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com', 'picsum.photos'],
    // Allow image optimization from external sources
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      }
    ]
  },
  
  // Increase serverless function timeout for image generation
  serverRuntimeConfig: {
    // Will only be available on the server side
    apiTimeout: 60, // seconds
  },
}

module.exports = nextConfig 