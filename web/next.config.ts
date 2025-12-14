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
            {
                protocol: "https",
                hostname: process.env.NEXT_PUBLIC_PINATA_GATEWAY!.replace(/^https?:\/\//, ""),
            }
        ],
    },
    devIndicators: false,
    transpilePackages: ["@dynamic-labs/ethereum", "@dynamic-labs/sdk-react-core", "@dynamic-labs/wagmi-connector"],
    typescript: {
        ignoreBuildErrors: true,
    }
};

export default nextConfig;
