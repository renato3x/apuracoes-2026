import type { MetadataRoute } from "next";
import { states } from "@/lib/election/constants";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  return [
    "",
    "presidente",
    "governadores",
    "senado",
    "camara",
    "assembleias",
    "estados",
    "partidos",
    "sobre-os-dados",
    ...states.flatMap((s) => [
      `estado/${s.uf}`,
      `estado/${s.uf}/governador`,
      `estado/${s.uf}/senado`,
      `estado/${s.uf}/deputado-federal`,
      `estado/${s.uf}/${s.uf === "df" ? "deputado-distrital" : "deputado-estadual"}`,
      `estado/${s.uf}/municipios`,
    ]),
  ].map((p) => ({
    url: `${base}/${p}`,
    changeFrequency: "hourly",
    priority: p === "" ? 1 : 0.7,
  }));
}
