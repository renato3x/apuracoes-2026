import { offices, type Office } from "@/lib/election/constants";
import { resultSchema } from "./schemas";
import type { ElectionResult, Mode } from "./types";
export function numeric(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d+(?:[,.]\d+)?$/.test(value))
    throw new Error("Número oficial inválido");
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n)) throw new Error("Número oficial inválido");
  return n;
}
function timestamp(date?: string, hour?: string): string | null {
  if (!date || !hour) return null;
  const m = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m || !/^\d{2}:\d{2}:\d{2}$/.test(hour))
    throw new Error("Data oficial inválida");
  const s = `${m[3]}-${m[2]}-${m[1]}T${hour}-03:00`;
  if (!Number.isFinite(Date.parse(s))) throw new Error("Data oficial inválida");
  return new Date(s).toISOString();
}
export function parseResult(
  raw: unknown,
  context: {
    office: Office;
    territory: string;
    municipality?: string;
    round: 1 | 2;
    mode: Mode;
    election: string;
    sourceUrl: string;
    photoDirectory?: string;
  },
): ElectionResult {
  const x = resultSchema.parse(raw);
  if (x.f !== (context.mode === "production" ? "o" : "s"))
    throw new Error("Fase TSE incompatível com o ambiente");
  if (x.ele !== context.election || Number(x.t) !== context.round)
    throw new Error("Eleição ou turno incompatível");
  const expectedType = context.municipality
    ? "mu"
    : context.territory === "br"
      ? "br"
      : "uf";
  if (x.tpabr !== expectedType)
    throw new Error("Abrangência: tipo incompatível");
  const expected = context.municipality ?? context.territory;
  if (x.cdabr.toLowerCase() !== expected.toLowerCase())
    throw new Error("Abrangência incompatível");
  const c = x.carg.find((c) => c.cd === offices[context.office].code);
  if (!c) throw new Error("Cargo ausente no arquivo");
  const met = (m: Record<string, string> | undefined, k: string) => {
    const n = numeric(m?.[k]);
    if (n !== null) {
      if (k.startsWith("p")) {
        if (n > 100) throw new Error("Percentual oficial inválido");
      } else if (!Number.isSafeInteger(n))
        throw new Error("Contagem oficial inválida");
    }
    return n;
  };
  const p = met(x.s, "pstn") ?? met(x.s, "pst");
  if (p !== null && (p < 0 || p > 100))
    throw new Error("Percentual de seções inválido");
  const candidates = c.agr
    .flatMap((g) =>
      g.par.flatMap((party) =>
        party.cand.map((v) => {
          const pct = numeric(v.pvapn) ?? numeric(v.pvap);
          if (pct !== null && pct > 100)
            throw new Error("Percentual de candidato inválido");
          return {
            id: `${context.election}-${context.office}-${context.office === "president" ? "br" : context.territory}-${v.sqcand}`,
            officialId: v.sqcand,
            number: v.n,
            name: v.nm,
            ballotName: v.nmu,
            party: party.sg,
            federation: c.fed?.find((f) => f.n === party.nfed)?.nm ?? null,
            coalition: g.tp === "c" ? g.nm : null,
            photo: context.photoDirectory
              ? `${context.photoDirectory}/${v.sqcand}.jpeg`
              : null,
            votes: numeric(v.vap),
            percentage: pct,
            status: v.st || null,
            voteDestination: v.dvt || null,
            replacedCandidates: (v.subs ?? []).map((s) => ({
              name: s.nm,
              ballotName: s.nmu,
              party: s.sgp,
            })),
            office: context.office,
            territory: context.territory,
          };
        }),
      ),
    )
    .sort(
      (a, b) =>
        (b.votes ?? -1) - (a.votes ?? -1) || a.number.localeCompare(b.number),
    );
  return {
    election: x.ele,
    round: context.round,
    office: context.office,
    territory: context.territory,
    municipality: context.municipality ?? null,
    mode: context.mode,
    sourceUrl: context.sourceUrl,
    generation: x.idg,
    updatedAt: timestamp(x.dt, x.ht),
    generatedAt: timestamp(x.dg, x.hg),
    processedSections: met(x.s, "st"),
    totalSections: met(x.s, "ts"),
    unprocessedSections: met(x.s, "snt"),
    processedPercentage: p,
    electorate: met(x.e, "te"),
    turnout: met(x.e, "c"),
    turnoutPercentage: met(x.e, "pcn") ?? met(x.e, "pc"),
    abstentions: met(x.e, "a"),
    abstentionPercentage: met(x.e, "pan") ?? met(x.e, "pa"),
    validVotes: met(x.v, "vv"),
    blankVotes: met(x.v, "vb"),
    nullVotes: met(x.v, "tvn"),
    annulledVotes: met(x.v, "van"),
    subJudiceVotes: met(x.v, "vansj"),
    nominalVotes: met(x.v, "vnom"),
    listVotes: met(x.v, "vl"),
    seats: numeric(c.nv),
    electoralQuotient: numeric(c.qe),
    allocations: c.agr.map((g) => ({
      name: g.nm,
      type: g.tp,
      seats: numeric(g.vag),
      parties: g.par.map((p) => ({
        party: p.sg,
        nominalVotes: numeric(p.tvtn),
        listVotes: numeric(p.tvtl),
      })),
    })),
    candidates,
    state:
      x.and === "f"
        ? "final"
        : met(x.s, "st") === 0 || met(x.s, "st") === null
          ? "awaiting"
          : "partial",
  };
}
