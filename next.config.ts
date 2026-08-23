import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/class-councils/*/classes/*/pdf": ["./public/logo_escola.png"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fpvrznirpicnslngickf.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
