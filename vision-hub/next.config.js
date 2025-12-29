/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/tableros',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rbtczzjlvnymylkvcwdv.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}
module.exports = nextConfig
