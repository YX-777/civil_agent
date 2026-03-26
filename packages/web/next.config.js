/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@civil-agent/core", "@civil-agent/agent-langgraph", "@civil-agent/scheduler"],
  webpack: (config, { isServer }) => {
    // 排除chromadb相关的包
    config.externals = config.externals || [];
    config.externals.push(({ request }, callback) => {
      if (request && (request.includes('chromadb') || request.includes('chroma'))) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    });

    // 添加别名来排除chromadb
    config.resolve.alias = {
      ...config.resolve.alias,
      'chromadb': false,
      'chromadb-default-embed': false,
    };

    return config;
  },
};

module.exports = nextConfig;
