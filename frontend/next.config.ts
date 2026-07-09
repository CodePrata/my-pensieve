import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/calendar/:path*",
        destination: `${backendUrl}/calendar/:path*`,
      },
      {
        source: "/study/:path*",
        destination: `${backendUrl}/study/:path*`,
      },
      {
        source: "/projects",
        destination: `${backendUrl}/projects`,
      },
      {
        source: "/briefing/:path*",
        destination: `${backendUrl}/briefing/:path*`,
      },
      {
        source: "/knowledge/:path*",
        destination: `${backendUrl}/knowledge/:path*`,
      },
    ];
  },
};

export default nextConfig;
