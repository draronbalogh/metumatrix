import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // a lebegő Next.js fejlesztői "N" gomb kikapcsolva (2026-07-23): dev módban fut az
  // éles használat is, és a gomb mobilon RÁÚSZOTT a Posta gombjaira (nem lehetett kattintani)
  devIndicators: false
};

export default nextConfig;
