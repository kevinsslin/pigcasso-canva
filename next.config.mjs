/** @type {import('next').NextConfig} */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.ufs.sh",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.mypinata.cloud",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "canva-clone-ali.vercel.app",
        pathname: "/**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    const kitDistDir = dirname(require.resolve("@solana/kit"));
    const kitEntry = join(kitDistDir, isServer ? "index.node.mjs" : "index.browser.mjs");

    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@solana/kit": kitEntry,
    };
    return config;
  },
};

export default nextConfig;
