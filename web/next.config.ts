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
    devIndicators: false,
    transpilePackages: ["@dynamic-labs/ethereum", "@dynamic-labs/sdk-react-core", "@dynamic-labs/wagmi-connector"],
    typescript: {
        ignoreBuildErrors: true,
    }
};

export default nextConfig;
