import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LeaderAdvantage } from "@/components/election/leader-advantage";
import {
  getLeaderAdvantage,
  buildAdvantageHistory,
  type AdvantageComparison,
} from "@/lib/election/advantage";
import { parseResult } from "@/lib/tse/parser";
import type {
  CandidateResult,
  ElectionResult,
  ResultsEnvelope,
  Snapshot,
} from "@/lib/tse/types";
import president from "./fixtures/president-simulation.json";
import senate from "./fixtures/senate-simulation.json";

const context = {
  office: "president" as const,
  territory: "br",
  round: 1 as const,
  mode: "simulation" as const,
  election: "21270",
  sourceUrl:
    "https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/br/br-c0001-e021270-u.json",
};
const original = () => parseResult(president, context);
const candidate = (
  id: string,
  votes: number | null,
  percentage: number | null = 50,
): CandidateResult => ({
  ...original().candidates[0],
  id,
  officialId: id,
  ballotName: `Candidato ${id.toUpperCase()}`,
  votes,
  percentage,
  voteDestination: "Válido",
  status: null,
});
const result = (
  candidates: CandidateResult[],
  extra: Partial<ElectionResult> = {},
): ElectionResult => ({
  ...original(),
  candidates,
  state: "partial",
  processedPercentage: 74.21,
  ...extra,
});
const comparison = (r: ElectionResult): AdvantageComparison => {
  const value = getLeaderAdvantage(r);
  expect(value && (value.state === "lead" || value.state === "tie")).toBe(true);
  return value as AdvantageComparison;
};
const html = (r: ElectionResult, status: ResultsEnvelope["status"] = "ok") =>
  renderToStaticMarkup(
    createElement(LeaderAdvantage, {
      envelope: {
        data: r,
        checkedAt: "2026-10-04T21:00:00-03:00",
        refreshInterval: 30000,
        mode: r.mode,
        status,
        history: [],
        message: null,
      },
    }),
  );
const snapshot = (
  time: string,
  a: number | null,
  b: number | null,
): Snapshot => ({
  time,
  processedPercentage: 50,
  candidates: [
    { id: "a", name: "Candidato A", votes: a, percentage: null },
    { id: "b", name: "Candidato B", votes: b, percentage: null },
  ],
});

describe("Diferença de votos — resultados oficiais e casos de apuração", () => {
  it("deriva a diferença da fixture oficial e ignora anulados/sub judice", () => {
    const r = original(),
      x = comparison(r);
    const ranked = r.candidates
      .filter((c) => c.voteDestination === "Válido")
      .sort((a, b) => b.votes! - a.votes!);
    expect(x.pair.map((c) => c.id)).toEqual(
      ranked.slice(0, 2).map((c) => c.id),
    );
    expect(x.votesDifference).toBe(ranked[0].votes! - ranked[1].votes!);
    expect(x.percentagePoints).toBeCloseTo(
      ranked[0].percentage! - ranked[1].percentage!,
      9,
    );
    expect(x.pair[0].id).not.toBe(r.candidates[0].id);
  });
  it("calcula votos e pontos percentuais conforme o exemplo solicitado", () => {
    const x = comparison(
      result([
        candidate("b", 52172982, 48.76),
        candidate("a", 54829312, 51.24),
      ]),
    );
    expect(x.upper[0].id).toBe("a");
    expect(x.votesDifference).toBe(2656330);
    expect(x.percentagePoints).toBeCloseTo(2.48);
  });
  it("recalcula o líder sem alterar o resultado ou a situação oficial", () => {
    const r = result([candidate("a", 10500000), candidate("b", 10490000)]);
    const before = structuredClone(r);
    expect(comparison(r).upper[0].id).toBe("a");
    expect(r).toEqual(before);
    const after = result([candidate("a", 10520000), candidate("b", 10530000)]);
    expect(comparison(after).upper[0].id).toBe("b");
    expect(comparison(after).votesDifference).toBe(10000);
    expect(after.candidates.every((c) => c.status === null)).toBe(true);
  });
  it("recorte estadual e municipal usam somente os votos daquele resultado", () => {
    const a = candidate("a", 2341829, 54.82),
      b = candidate("b", 1734291, 40.6);
    const ce = result([a, b], { territory: "ce" }),
      sp = result([candidate("a", 100), candidate("b", 500)], {
        territory: "sp",
      });
    expect(comparison(ce).votesDifference).toBe(607538);
    expect(comparison(ce).percentagePoints).toBeCloseTo(14.22);
    expect(comparison(sp).upper[0].id).toBe("b");
    expect(
      comparison(
        result([candidate("a", 100), candidate("b", 70)], {
          territory: "ce",
          municipality: "13897",
        }),
      ).votesDifference,
    ).toBe(30);
  });
  it("aplica a mesma comparação a governador e mantém turnos isolados", () => {
    expect(
      comparison(
        result(
          [candidate("a", 1923381, 51.12), candidate("b", 1684889, 44.78)],
          { office: "governor" },
        ),
      ).votesDifference,
    ).toBe(238492);
    expect(
      comparison(result([candidate("a", 60), candidate("b", 90)], { round: 2 }))
        .upper[0].id,
    ).toBe("b");
  });
  it("não resolve empates de duas ou mais candidaturas", () => {
    const x = comparison(
      result([candidate("a", 100), candidate("b", 100), candidate("c", 100)]),
    );
    expect(x.state).toBe("tie");
    expect(x.upper.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(x.votesDifference).toBe(0);
  });
  it("expõe todos os empatados em segundo lugar", () => {
    expect(
      comparison(
        result([candidate("a", 200), candidate("b", 100), candidate("c", 100)]),
      ).lower.map((c) => c.id),
    ).toEqual(["b", "c"]);
  });
  it("não atribui liderança ou empate antes da apuração nem quando todos têm zero votos", () => {
    expect(
      getLeaderAdvantage(
        result([candidate("a", 0), candidate("b", 0)], { state: "awaiting" }),
      )?.state,
    ).toBe("awaiting");
    expect(
      getLeaderAdvantage(result([candidate("a", 0), candidate("b", 0)]))?.state,
    ).toBe("unavailable");
  });
  it("votos ausentes ou classificação incompleta impedem comparar; percentual ausente não vira zero", () => {
    expect(
      getLeaderAdvantage(
        result([
          candidate("a", 200),
          candidate("b", null),
          candidate("c", 100),
        ]),
      )?.state,
    ).toBe("unavailable");
    expect(
      getLeaderAdvantage(
        result([
          candidate("a", 200),
          { ...candidate("b", 300), voteDestination: null },
          candidate("c", 100),
        ]),
      )?.state,
    ).toBe("unavailable");
    expect(
      comparison(result([candidate("a", 200, null), candidate("b", 100, 10)]))
        .percentagePoints,
    ).toBeNull();
    expect(getLeaderAdvantage(result([candidate("a", 200)]))?.state).toBe(
      "unavailable",
    );
  });
  it("números inválidos não produzem uma diferença", () => {
    for (const n of [-1, NaN, Infinity, 1.5])
      expect(
        getLeaderAdvantage(result([candidate("a", 200), candidate("b", n)]))
          ?.state,
      ).toBe("unavailable");
  });
  it("Senado usa a quantidade de vagas da fixture pública do TSE", () => {
    const r = parseResult(senate, {
      ...context,
      office: "senate",
      territory: "ac",
      election: "21272",
    });
    expect(r.seats).toBe(2);
    const x = comparison(r);
    expect(x.kind).toBe("cut");
    expect([x.upperPosition, x.lowerPosition]).toEqual([2, 3]);
    const ranked = r.candidates
      .filter((c) => c.voteDestination === "Válido")
      .sort((a, b) => b.votes! - a.votes!);
    expect(x.votesDifference).toBe(ranked[1].votes! - ranked[2].votes!);
  });
  it("corte do Senado pode usar outro número de vagas, sem declarar eleitos", () => {
    const r = result(
      [
        candidate("a", 400),
        candidate("b", 300),
        candidate("c", 200),
        candidate("d", 100),
      ],
      { office: "senate", seats: 3 },
    );
    expect(comparison(r).pair.map((c) => c.id)).toEqual(["c", "d"]);
    expect(r.candidates.every((c) => c.status === null)).toBe(true);
    expect(getLeaderAdvantage({ ...r, seats: null })?.state).toBe(
      "unavailable",
    );
    expect(getLeaderAdvantage({ ...r, seats: 0 })?.state).toBe("unavailable");
    expect(getLeaderAdvantage({ ...r, seats: 4 })?.state).toBe("unavailable");
  });
  it("identifica empate no corte sem atribuir vagas", () => {
    const x = comparison(
      result([candidate("a", 300), candidate("b", 200), candidate("c", 200)], {
        office: "senate",
        seats: 2,
      }),
    );
    expect(x.state).toBe("tie");
    expect(x.upper.map((c) => c.id)).toEqual(["b", "c"]);
  });
  it("não aplica indicador aos três cargos proporcionais", () => {
    for (const office of [
      "federal-deputy",
      "state-deputy",
      "district-deputy",
    ] as const)
      expect(
        getLeaderAdvantage(
          result([candidate("a", 300), candidate("b", 100)], { office }),
        ),
      ).toBeNull();
    expect(getLeaderAdvantage(null)).toBeNull();
  });
});

describe("Histórico legítimo da diferença", () => {
  const r = () => result([candidate("a", 300), candidate("b", 250)]);
  const points = () => [
    snapshot("2026-10-04T21:00:00-03:00", 100, 200),
    snapshot("2026-10-04T21:15:00-03:00", 220, 220),
    snapshot("2026-10-04T21:30:00-03:00", 300, 250),
  ];
  it("atravessa o zero e mantém referência fixa após mudança de liderança", () => {
    const c = comparison(r()),
      h = buildAdvantageHistory(c, points())!;
    expect(h.points.map((p) => p.difference)).toEqual([-100, 0, 50]);
    const after = comparison(
      result([candidate("b", 400), candidate("a", 350)]),
    );
    const next = buildAdvantageHistory(after, points())!;
    expect(next.reference.id).toBe(h.reference.id);
    expect(next.points).toEqual(h.points);
  });
  it("não inventa histórico ou pontos faltantes", () => {
    const c = comparison(r());
    expect(buildAdvantageHistory(c, [])).toBeNull();
    expect(buildAdvantageHistory(c, [points()[0]])).toBeNull();
    const p = points();
    p[1].candidates[1].votes = null;
    expect(
      buildAdvantageHistory(c, p)!.points.map((p) => p.difference),
    ).toEqual([-100, null, 50]);
  });
  it("ordena horários, deduplica e ignora horários inválidos", () => {
    const p = points();
    expect(
      buildAdvantageHistory(comparison(r()), [
        p[2],
        p[0],
        p[2],
        { ...p[1], time: "invalid" },
      ])!.points.map((p) => p.difference),
    ).toEqual([-100, 50]);
    expect(buildAdvantageHistory(comparison(r()), [p[0], p[0]])).toBeNull();
  });
  it("não monta série arbitrária para empate múltiplo ou corte do Senado", () => {
    expect(
      buildAdvantageHistory(
        comparison(
          result([
            candidate("a", 100),
            candidate("b", 100),
            candidate("c", 100),
          ]),
        ),
        points(),
      ),
    ).toBeNull();
    expect(
      buildAdvantageHistory(
        comparison(
          result([candidate("a", 200), candidate("b", 100)], {
            office: "senate",
            seats: 1,
          }),
        ),
        points(),
      ),
    ).toBeNull();
  });
});

describe("Apresentação neutra e acessível", () => {
  it("empate no corte mostra as candidaturas uma única vez", () => {
    const markup = html(
      result([candidate("a", 300), candidate("b", 200), candidate("c", 200)], {
        office: "senate",
        seats: 2,
      }),
    );
    expect(markup).toContain("Empate em número de votos no corte");
    expect(markup.match(/Candidato B/g)).toHaveLength(1);
    expect(markup.match(/Candidato C/g)).toHaveLength(1);
    expect(markup).toContain("Corte entre a 2ª e a 3ª posições");
  });
  it("aguardando apuração e percentuais ausentes não mostram diferenças inventadas", () => {
    const pending = html(
      result([candidate("a", 0), candidate("b", 0)], { state: "awaiting" }),
    );
    expect(pending).toContain("Aguardando apuração para comparar a votação.");
    expect(pending).not.toContain("+0");
    const incomplete = html(
      result([candidate("a", 200, null), candidate("b", 100, 10)], {
        processedPercentage: null,
      }),
    );
    expect(incomplete).toContain("Pontos percentuais indisponíveis");
    expect(incomplete).toContain("Percentual de totalização indisponível");
  });
  it("exibe votos, p.p., nomes, totalização e resultado parcial", () => {
    const markup = html(
      result([
        candidate("a", 54829312, 51.24),
        candidate("b", 52172982, 48.76),
      ]),
    );
    for (const text of [
      "2.656.330",
      "+2,48 p.p.",
      "Candidato A",
      "Candidato B",
      "74,21% das seções totalizadas",
      "RESULTADO PARCIAL",
      'aria-live="polite"',
    ])
      expect(markup).toContain(text);
    expect(markup).not.toContain("Eleito");
  });
  it("empate tem texto próprio e não exibe zero votos à frente", () => {
    const markup = html(result([candidate("a", 100), candidate("b", 100)]));
    expect(markup).toContain("Empate em número de votos");
    expect(markup).not.toContain("+0");
  });
  it("identifica resultado final e cache desatualizado", () => {
    const markup = html(
      result([candidate("a", 200), candidate("b", 100)], { state: "final" }),
      "stale",
    );
    expect(markup).toContain("TOTALIZAÇÃO CONCLUÍDA");
    expect(markup).toContain("Dados desatualizados");
    expect(markup).not.toContain("RESULTADO PARCIAL");
  });
  it("corte informa vagas e não promete eleição", () => {
    const markup = html(
      result([candidate("a", 300), candidate("b", 200), candidate("c", 150)], {
        office: "senate",
        seats: 2,
      }),
    );
    expect(markup).toContain("CORTE ATUAL POR VOTAÇÃO");
    expect(markup).toContain("2 vagas informadas pelo TSE");
    expect(markup).toContain("não atribui vagas nem garante eleição");
    expect(markup).toContain("2ª posição");
    expect(markup).toContain("3ª posição");
  });
});
