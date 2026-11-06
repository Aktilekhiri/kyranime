/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Постеры сжимаются в браузере до ~0.5 МБ, но оставляем запас
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
