import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@copilotkit/runtime"],

  // Proxy API calls to Python agent
  async rewrites() {
    return [
      {
        source: "/agent/:path*",
        destination: "http://localhost:8000/:path*",
      },
    ];
  },

  // Configure webpack with unplugin (optional)
  webpack: (config, { isServer }) => {
    // Example: Add custom unplugin here
    // const { myPlugin } = require('./build-utils/unplugin.config');
    // config.plugins.push(myPlugin.webpack());

    return config;
  },
};

export default nextConfig;
