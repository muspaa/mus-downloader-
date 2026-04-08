/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Hanya compile file dalam project, ignore folder sistem
    config.watchOptions = {
      ignored: ['**/node_modules', '**/data/**', '**/storage/**', '/data/**', '/**/data/**']
    };
    return config;
  },
  // Ignore permission errors untuk folder sistem
  serverRuntimeConfig: {
    rootDir: __dirname
  }
}

module.exports = nextConfig
