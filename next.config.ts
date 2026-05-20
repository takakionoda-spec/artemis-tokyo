import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Hosts the cron-publisher may pull cover artwork from.
    // `**.example.com` matches any subdomain; pair with the apex when needed.
    remotePatterns: [
      // --- Unsplash (fallback covers when source has no image) ---
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },

      // --- NASA properties (apex + all subdomains) ---
      { protocol: "https", hostname: "nasa.gov" },
      { protocol: "https", hostname: "**.nasa.gov" },

      // --- Space.com & Future Publishing CDN ---
      // Space.com itself rarely hot-links from its apex; the actual asset
      // host is Future plc's CDN at cdn.mos.cms.futurecdn.net.
      { protocol: "https", hostname: "space.com" },
      { protocol: "https", hostname: "**.space.com" },
      { protocol: "https", hostname: "**.futurecdn.net" },

      // --- arXiv (figures, occasionally referenced from abstracts) ---
      { protocol: "https", hostname: "arxiv.org" },
      { protocol: "https", hostname: "**.arxiv.org" },

      // --- Other space-news adjacent CDNs the crawler may encounter ---
      { protocol: "https", hostname: "**.spaceflightnow.com" },
      { protocol: "https", hostname: "**.scientificamerican.com" },
      { protocol: "https", hostname: "**.wp.com" },             // WordPress.com CDN
      { protocol: "https", hostname: "**.wordpress.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },     // common image CDN
      { protocol: "https", hostname: "**.akamaized.net" },      // common image CDN
      { protocol: "https", hostname: "**.imgix.net" }           // common image CDN
    ]
  }
};

export default nextConfig;
