/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

// Site now ships under a custom domain (gkdud1210.mycafe24.com) served from
// the root, so no basePath/assetPrefix is needed like the old
// gkdud1210.github.io/womenshealth_care/ path required.
const nextConfig = {
  ...(isProd && { output: 'export' }),
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: '',
  },
}

module.exports = nextConfig
