/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@civil-agent/core", "@civil-agent/agent-langgraph"],
};

module.exports = nextConfig;