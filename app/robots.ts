import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export const dynamic = "force-static"; // required for output: "export"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}