/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  output: 'export',
  basePath: isProd ? '/womenshealth_care' : '',
  assetPrefix: isProd ? '/womenshealth_care/' : '',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
