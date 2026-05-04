/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // undici 는 server-side require() 로만 쓰이므로 webpack 번들 제외
  // (v5 도 일부 syntax 가 next-swc-loader 와 호환 안 될 수 있어 안전하게 external)
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push({ undici: 'commonjs undici' })
      }
    }
    return config
  },
};

module.exports = nextConfig;
// undici externalize for proxy-fetch require()
