import type { NextConfig } from "next";

// Two build targets share this config:
//  - default: `output: "standalone"` for the Docker / LAN self-host bundle.
//  - Pages:   set BUILD_TARGET=pages for a static export (`out/`) deployed to
//             GitHub Pages under a project sub-path. basePath + the asset()
//             helper in lib/data.ts are both driven by NEXT_PUBLIC_BASE_PATH so
//             plain <img> src paths resolve under the sub-path.
const isPages = process.env.BUILD_TARGET === "pages";

const nextConfig: NextConfig = isPages
  ? {
      output: "export",
      basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
      // Static export has no image optimization server; app uses plain <img>,
      // but keep this explicit so a future next/image doesn't break the build.
      images: { unoptimized: true },
    }
  : {
      // Emit a self-contained server bundle for Docker / LAN self-hosting.
      output: "standalone",
    };

export default nextConfig;
