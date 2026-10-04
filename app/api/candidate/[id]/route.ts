import { NextRequest, NextResponse } from "next/server";
import { getResult } from "@/lib/tse/client";
import { isOffice, states } from "@/lib/election/constants";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const match = id.match(
    /^(\d+)-(president|governor|senate|federal-deputy|state-deputy|district-deputy)-([a-z]{2})-(\d+)$/,
  );
  if (
    !match ||
    !isOffice(match[2]) ||
    ![...states.map((s) => s.uf), "br"].includes(match[3])
  )
    return NextResponse.json(
      { candidate: null, envelope: null },
      { status: 404 },
    );
  const r = await getResult(
    match[2],
    match[3],
    req.nextUrl.searchParams.get("turno") === "2" ? 2 : 1,
  );
  const candidate =
    r.data?.election === match[1]
      ? r.data.candidates.find((c) => c.officialId === match[4])
      : null;
  return NextResponse.json(
    { candidate: candidate ?? null, envelope: r },
    {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    },
  );
}
