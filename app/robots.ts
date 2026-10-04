import type { MetadataRoute } from "next";
import { settings } from "@/lib/tse/endpoints";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: settings().mode === "simulation" ? "/" : "/api/",
    },
    sitemap: `${process.env.SITE_URL ?? "http://localhost:3000"}/sitemap.xml`,
  };
}
