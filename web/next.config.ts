import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactCompiler: true,
    experimental: {
        useCache: true,
    },
    images: {
        qualities: [100, 80],
        remotePatterns: [
            {
                protocol: "https",
                hostname: "gateway.pinata.cloud",
            },
        ],
    },
    devIndicators: false
};

export default nextConfig;
