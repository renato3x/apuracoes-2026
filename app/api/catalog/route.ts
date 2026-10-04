import { NextRequest, NextResponse } from "next/server";
import { getCatalog, getMunicipalities } from "@/lib/tse/client";
export async function GET(req: NextRequest) {
  const round = req.nextUrl.searchParams.get("turno") === "2" ? 2 : 1;
  try {
    return NextResponse.json(
      req.nextUrl.searchParams.get("type") === "municipalities"
        ? await getMunicipalities(round)
        : await getCatalog(round),
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível consultar a configuração oficial." },
      { status: 503 },
    );
  }
}
