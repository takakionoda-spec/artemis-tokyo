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

      // --- NASA ---
      { protocol: "https", hostname: "nasa.gov" },
      { protocol: "https", hostname: "**.nasa.gov" },

      // --- ESA ---
      { protocol: "https", hostname: "esa.int" },
      { protocol: "https", hostname: "**.esa.int" },

      // --- Space.com & Future plc CDN ---
      { protocol: "https", hostname: "space.com" },
      { protocol: "https", hostname: "**.space.com" },
      { protocol: "https", hostname: "**.futurecdn.net" },

      // --- arXiv (figures occasionally) ---
      { protocol: "https", hostname: "arxiv.org" },
      { protocol: "https", hostname: "**.arxiv.org" },

      // --- TechCrunch ---
      { protocol: "https", hostname: "techcrunch.com" },
      { protocol: "https", hostname: "**.techcrunch.com" },

      // --- Futurism ---
      { protocol: "https", hostname: "futurism.com" },
      { protocol: "https", hostname: "**.futurism.com" },

      // --- Dezeen ---
      { protocol: "https", hostname: "dezeen.com" },
      { protocol: "https", hostname: "**.dezeen.com" },

      // --- Ars Technica ---
      { protocol: "https", hostname: "arstechnica.com" },
      { protocol: "https", hostname: "**.arstechnica.com" },
      { protocol: "https", hostname: "**.arstechnica.net" },
      { protocol: "https", hostname: "cdn.arstechnica.net" },

      // --- The Verge / Vox Media ---
      { protocol: "https", hostname: "theverge.com" },
      { protocol: "https", hostname: "**.theverge.com" },
      { protocol: "https", hostname: "**.vox-cdn.com" },

      // --- SpaceNews ---
      { protocol: "https", hostname: "spacenews.com" },
      { protocol: "https", hostname: "**.spacenews.com" },

      // --- Payload Space ---
      { protocol: "https", hostname: "payloadspace.com" },
      { protocol: "https", hostname: "**.payloadspace.com" },
      { protocol: "https", hostname: "**.substack.com" },
      { protocol: "https", hostname: "**.substackcdn.com" },

      // --- Generic CDNs frequently used by editorial publishers ---
      { protocol: "https", hostname: "**.wp.com" },
      { protocol: "https", hostname: "**.wordpress.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "**.akamaized.net" },
      { protocol: "https", hostname: "**.imgix.net" },
      { protocol: "https", hostname: "**.cdninstagram.com" }
    ]
  }
};

export default nextConfig;
