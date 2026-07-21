import type { NextConfig } from "next";

/** Prefer IPv4 loopback — Node may resolve `localhost` to ::1 while NestJS listens on 127.0.0.1 only. */
function resolveBackendUrl(): string {
  const raw = process.env.BACKEND_URL ?? "http://127.0.0.1:3000";
  return raw.replace(/^http:\/\/localhost(?=[:/]|$)/i, "http://127.0.0.1");
}

const backendUrl = resolveBackendUrl();

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
