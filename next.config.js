/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'
const basePath = isProd ? '/womenshealth_care' : ''

const nextConfig = {
  ...(isProd && { output: 'export' }),
  basePath,
  assetPrefix: isProd ? '/womenshealth_care/' : '',
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
}

module.exports = nextConfig
