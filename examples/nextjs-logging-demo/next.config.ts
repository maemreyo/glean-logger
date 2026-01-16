/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable logging in development only
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
