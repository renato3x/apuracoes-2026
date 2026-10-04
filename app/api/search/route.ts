import { NextRequest, NextResponse } from "next/server";
import { states, slugify, offices } from "@/lib/election/constants";
import { getCatalog, getMunicipalities } from "@/lib/tse/client";
export async function GET(req: NextRequest) {
  const q = slugify((req.nextUrl.searchParams.get("q") ?? "").slice(0, 100));
  const round = req.nextUrl.searchParams.get("turno") === "2" ? 2 : 1;
  if (q.length < 2) return NextResponse.json({ items: [] });
  const [catalog, municipalities] = await Promise.allSettled([
    getCatalog(round),
    getMunicipalities(round),
  ]);
  const items = [
    ...states
      .filter((s) => slugify(`${s.name} ${s.uf}`).includes(q))
      .map((s) => ({
        name: s.name,
        description: "Estado",
        group: "Estados",
        href: `/estado/${s.uf}?turno=${round}`,
      })),
    ...(catalog.status === "fulfilled"
      ? catalog.value.candidates
          .filter((c) =>
            slugify(`${c.name} ${c.ballotName} ${c.number}`).includes(q),
          )
          .slice(0, 30)
          .map((c) => ({
            name: c.ballotName,
            description: `${offices[c.office].label} · ${c.party}`,
            group: "Candidatos",
            href: `/candidato/${c.id}?turno=${round}`,
          }))
      : []),
    ...(municipalities.status === "fulfilled"
      ? municipalities.value
          .filter((m) => slugify(m.name).includes(q))
          .slice(0, 30)
          .map((m) => ({
            name: m.name,
            description: `Município · ${m.uf.toUpperCase()}`,
            group: "Municípios",
            href: `/estado/${m.uf}/municipio/${m.slug}?turno=${round}`,
          }))
      : []),
  ];
  return NextResponse.json(
    {
      items,
      partial:
        catalog.status === "rejected" || municipalities.status === "rejected",
    },
    { headers: { "Cache-Control": "public, s-maxage=30" } },
  );
}
