import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/account", "/admin", "/unsubscribe"],
    },
    sitemap: "https://www.tradepronexus.com/sitemap.xml",
  };
}
