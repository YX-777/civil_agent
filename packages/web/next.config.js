/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // 生产环境 standalone 输出
  transpilePackages: ["@civil-agent/core", "@civil-agent/agent-langgraph", "@civil-agent/scheduler"],
  webpack: (config, { isServer }) => {
    // 排除 chromadb 和 undici
    // undici 6.x 在源码里用了 webpack 不支持的私有字段语法（#target），必须当外部模块加载
    config.externals = config.externals || [];
    config.externals.push(({ request }, callback) => {
      if (request && (request.includes('chromadb') || request.includes('chroma'))) {
        return callback(null, 'commonjs ' + request);
      }
      if (request === 'undici' || (request && request.startsWith('undici/'))) {
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
