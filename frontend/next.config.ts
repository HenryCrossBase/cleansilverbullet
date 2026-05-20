import type { NextConfig } from "next";

const apiProxyTarget =
    process.env.NEXT_PUBLIC_API_PROXY_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
    experimental: {
        externalDir: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "flagcdn.com",
            },
        ],
    },
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${apiProxyTarget}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
