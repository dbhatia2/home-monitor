import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server blocks cross-origin requests by default. The mobile app
  // reaches this server through a tunnel, so those hostnames must be allowed.
  // Only enable in development mode
  allowedDevOrigins: process.env.NODE_ENV === "development" ? [
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok.io",
    "*.trycloudflare.com",
    "192.168.1.186", // Local network access from phone
  ] : [],
};

export default nextConfig;
