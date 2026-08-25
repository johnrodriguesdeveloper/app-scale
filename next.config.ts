import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "liivdavkqtateyczqqbq.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default withSerwist(nextConfig);
