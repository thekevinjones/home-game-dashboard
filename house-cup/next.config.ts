import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for Docker / LAN self-hosting.
  output: "standalone",
};

export default nextConfig;
