/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false; // pdfjs optional dependency
    return config;
  },
};
export default nextConfig;
