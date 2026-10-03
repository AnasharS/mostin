import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // prototyp konkursowy - żadna strona ani plik nie trafia do wyszukiwarek
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] }];
  },
};

export default nextConfig;
