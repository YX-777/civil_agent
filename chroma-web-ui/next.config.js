/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/chroma/:path*',
        destination: 'http://localhost:8000/api/v2/:path*',
      },
    ]
  },
}

module.exports = nextConfig