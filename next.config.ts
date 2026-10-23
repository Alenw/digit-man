import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript:{
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  }
};

export default nextConfig;
