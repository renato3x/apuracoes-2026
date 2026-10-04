import { NextRequest, NextResponse } from "next/server";
import { isOffice, states } from "@/lib/election/constants";
import { getResult, getStateResults } from "@/lib/tse/client";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const turn = req.nextUrl.searchParams.get("turno") ?? "1";
  if (!["1", "2"].includes(turn))
    return NextResponse.json({ error: "Turno inválido" }, { status: 400 });
  const round = Number(turn) as 1 | 2;
  const headers = {
    "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
  };
  if (path[0] === "states" && isOffice(path[1]) && path.length === 2)
    return NextResponse.json(await getStateResults(path[1], round), {
      headers,
    });
  let [office, uf = "br", code] = path;
  if (office === "municipality") {
    if (path.length !== 3)
      return NextResponse.json(
        { error: "Esta consulta exige UF e código municipal" },
        { status: 400 },
      );
    [uf, code] = path.slice(1);
    office = "president";
  }
  if (
    !isOffice(office) ||
    path.length > 3 ||
    !["br", ...states.map((s) => s.uf)].includes(uf.toLowerCase()) ||
    (code && !/^\d{5}$/.test(code))
  )
    return NextResponse.json({ error: "Consulta inválida" }, { status: 400 });
  uf = uf.toLowerCase();
  if (uf === "br" && office !== "president")
    return NextResponse.json(
      { error: "Este cargo exige uma UF" },
      { status: 400 },
    );
  if (
    (office === "district-deputy" && uf !== "df") ||
    (office === "state-deputy" && uf === "df") ||
    (code && uf === "br")
  )
    return NextResponse.json(
      { error: "Cargo ou recorte incompatível com a UF" },
      { status: 400 },
    );
  return NextResponse.json(
    await getResult(office, uf.toLowerCase(), round, code),
    { headers },
  );
}
