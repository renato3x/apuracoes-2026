import { describe, it, expect, afterEach } from "vitest";
import president from "./fixtures/president-simulation.json";
import deputy from "./fixtures/deputy-simulation.json";
import config from "./fixtures/config-production.json";
import { parseResult, numeric } from "@/lib/tse/parser";
import { configSchema, resultSchema } from "@/lib/tse/schemas";
import {
  discoverElection,
  resultFilename,
  settings,
} from "@/lib/tse/endpoints";
import { resolvePath } from "@/lib/election/routing";
import { electedStatus } from "@/lib/election/constants";
const context = {
  office: "president" as const,
  territory: "br",
  round: 1 as const,
  mode: "simulation" as const,
  election: "21270",
  sourceUrl:
    "https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/br/br-c0001-e021270-u.json",
};
const copy = () => structuredClone(president);
describe("EA20 — fixture pública do simulado 2026 do TSE", () => {
  it("normaliza sem alterar os números oficiais", () => {
    const x = parseResult(president, context);
    expect(x.totalSections).toBe(528951);
    expect(x.electorate).toBe(163079139);
    expect(x.candidates).toHaveLength(13);
    expect(x.candidates[0].votes).toBe(10503573);
    expect(x.candidates[0].percentage).toBe(8.712251427);
    expect(x.validVotes).toBe(100982116);
    expect(x.nullVotes).toBe(9040537);
    expect(x.subJudiceVotes).toBe(10503573);
  });
  it("preserva segundo turno, sem confundir e=s com eleição", () => {
    const x = parseResult(president, context);
    expect(x.candidates[0].status).toBe("2º turno");
    expect(electedStatus(x.candidates[0].status)).toBe(false);
  });
  it("preserva votos anulados e sub judice", () => {
    const x = parseResult(president, context);
    expect(x.candidates.some((c) => c.voteDestination === "Anulado")).toBe(
      true,
    );
    expect(
      x.candidates.some((c) => c.voteDestination === "Anulado sub judice"),
    ).toBe(true);
  });
  it("não declara eleito pela liderança", () => {
    const f = copy();
    delete (f.carg[0].agr[4].par[0].cand[0] as { st?: string }).st;
    const x = parseResult(f, context);
    expect(x.candidates[0].status).toBeNull();
  });
  it("conclusão depende de and=f, não de 100%", () => {
    const f = copy();
    f.and = "p";
    expect(parseResult(f, context).state).toBe("partial");
    f.and = "f";
    expect(parseResult(f, context).state).toBe("final");
  });
  it("campos ausentes não viram zeros", () => {
    const f = copy() as Record<string, unknown>;
    delete f.s;
    delete f.e;
    delete f.v;
    const x = parseResult(f, context);
    expect(x.processedSections).toBeNull();
    expect(x.turnout).toBeNull();
    expect(x.validVotes).toBeNull();
  });
  it("rejeita simulado em produção", () =>
    expect(() =>
      parseResult(president, { ...context, mode: "production" }),
    ).toThrow("Fase"));
  it("rejeita turno incorreto", () =>
    expect(() => parseResult(president, { ...context, round: 2 })).toThrow(
      "turno",
    ));
  it("rejeita eleição incorreta", () =>
    expect(() =>
      parseResult(president, { ...context, election: "6257" }),
    ).toThrow("Eleição"));
  it("rejeita UF incompatível", () =>
    expect(() =>
      parseResult(president, { ...context, territory: "ce" }),
    ).toThrow("Abrangência"));
  it("rejeita cargo incompatível", () =>
    expect(() =>
      parseResult(president, { ...context, office: "governor" }),
    ).toThrow("Cargo"));
  it("rejeita estrutura inesperada", () =>
    expect(resultSchema.safeParse({ cand: [], ele: "21270" }).success).toBe(
      false,
    ));
  it("rejeita números malformados", () => {
    const f = copy();
    f.carg[0].agr[0].par[0].cand[0].vap = "1.000";
    expect(() => parseResult(f, context)).toThrow();
  });
  it("rejeita percentuais fora da faixa", () => {
    const f = copy();
    f.s.pstn = "101";
    expect(() => parseResult(f, context)).toThrow("Percentual");
  });
  it("gera timestamps com fuso Brasília", () => {
    const x = parseResult(president, context);
    expect(x.updatedAt).toBe("2026-09-29T19:28:52.000Z");
  });
  it("aceita os estados jurídicos informados sem interpretá-los", () => {
    for (const st of [
      "Indeferido",
      "Renúncia",
      "Falecimento",
      "Substituído",
      "Eleito matematicamente",
      "Eleito por QP",
      "Eleito por média",
      "Sub judice",
    ]) {
      const f = copy();
      f.carg[0].agr[0].par[0].cand[0].st = st;
      expect(
        parseResult(f, context).candidates.find(
          (c) => c.officialId === "41592502",
        )?.status,
      ).toBe(st);
    }
  });
});
describe("Resultado proporcional oficial de simulação — AC", () => {
  it("normaliza legenda, QE, agrupamentos e vagas sem calcular eleitos", () => {
    const x = parseResult(deputy, {
      ...context,
      office: "federal-deputy",
      territory: "ac",
      election: "21272",
    });
    expect(x.listVotes).toBe(78804);
    expect(x.nominalVotes).toBe(454774);
    expect(x.electoralQuotient).toBe(Number(deputy.carg[0].qe));
    expect(x.allocations[0].seats).toBe(1);
    expect(x.allocations[0].parties[0].listVotes).toBe(3069);
    expect(x.candidates.some((c) => c.status === "Eleito por média")).toBe(
      true,
    );
    expect(x.candidates.some((c) => c.status === "Suplente")).toBe(true);
  });
});
describe("EA11 — descoberta e isolamento", () => {
  it("descobre ids de 2026, excluindo suplementares e 2024", () => {
    const x = configSchema.parse(config);
    expect(discoverElection(x, "president", 1)?.id).toBe("6257");
    expect(discoverElection(x, "governor", 1)?.id).toBe("6259");
    expect(discoverElection(x, "president", 2)?.id).toBe("6258");
    expect(discoverElection(x, "senate", 2)).toBeNull();
  });
  it("formata códigos como documentado", () =>
    expect(resultFilename("senate", "21272", "ac", "01120")).toBe(
      "ac01120-c0005-e021272-u.json",
    ));
  it("rejeita caminhos inválidos", () =>
    expect(() => resultFilename("president", "6257", "../")).toThrow());
});
describe("Valores e rotas", () => {
  it("decodifica siglas de partido publicadas com espaços", () => {
    expect(resolvePath(["partido", "P%209962"])).toEqual({
      view: "party",
      id: "P 9962",
    });
    expect(resolvePath(["partido", "P 9962"])?.id).toBe("P 9962");
    expect(resolvePath(["partido", "%ZZ"])).toBeNull();
  });
  it("não converte vazio em zero", () => {
    expect(numeric("")).toBeNull();
    expect(numeric(undefined)).toBeNull();
    expect(numeric("0")).toBe(0);
    expect(numeric("51,24")).toBe(51.24);
    expect(() => numeric("NaN")).toThrow();
  });
  it("não aceita UF inexistente", () =>
    expect(resolvePath(["estado", "xx"])).toBeNull());
  it("respeita cargo distrital", () => {
    expect(resolvePath(["estado", "df", "deputado-distrital"])?.office).toBe(
      "district-deputy",
    );
    expect(resolvePath(["estado", "ce", "deputado-distrital"])).toBeNull();
    expect(resolvePath(["estado", "df", "deputado-estadual"])).toBeNull();
  });
  it("não aceita cargo de senador em rota de governador", () =>
    expect(resolvePath(["estado", "ce", "invalido"])).toBeNull());
});
import senate from "./fixtures/senate-simulation.json";
import municipality from "./fixtures/municipality-simulation.json";
import governor from "./fixtures/governor-substitution-simulation.json";
import { leadingCandidate } from "@/lib/election/constants";
describe("Senado, municípios e substituições — fixtures públicas", () => {
  it("usa duas vagas do cargo, sem eleger pela ordem", () => {
    const x = parseResult(senate, {
      ...context,
      office: "senate",
      territory: "ac",
      election: "21272",
    });
    expect(x.seats).toBe(2);
    expect(x.candidates.filter((c) => electedStatus(c.status))).toHaveLength(2);
  });
  it("valida código municipal e preserva o recorte", () => {
    const x = parseResult(municipality, {
      ...context,
      office: "senate",
      territory: "ac",
      municipality: "01120",
      election: "21272",
    });
    expect(x.municipality).toBe("01120");
    expect(x.territory).toBe("ac");
    expect(() =>
      parseResult(municipality, {
        ...context,
        office: "senate",
        territory: "ac",
        municipality: "01121",
        election: "21272",
      }),
    ).toThrow("Abrangência");
  });
  it("preserva nomes das candidaturas substituídas", () => {
    const x = parseResult(governor, {
      ...context,
      office: "governor",
      territory: "ma",
      election: "21272",
    });
    expect(
      x.candidates.find((c) => c.officialId === "41653167")
        ?.replacedCandidates[0].ballotName,
    ).toBe("CANDIDATO 9931");
  });
  it("não apresenta liderança de anulados nem de empates", () => {
    const x = parseResult(president, context);
    expect(leadingCandidate(x)?.officialId).toBe("41592500");
    for (const c of x.candidates) c.votes = 0;
    expect(leadingCandidate(x)).toBeNull();
    for (const c of x.candidates) c.votes = 100;
    expect(leadingCandidate(x)).toBeNull();
  });
});
describe("Identidade canônica presidencial", () => {
  it("link da candidatura estadual resolve ao perfil nacional", () => {
    const f = copy();
    f.cdabr = "ce";
    f.tpabr = "uf";
    const x = parseResult(f, { ...context, territory: "ce" });
    expect(x.candidates[0].id).toBe("21270-president-br-41592406");
    expect(x.candidates[0].territory).toBe("ce");
  });
});
import productionPresident from "./fixtures/president-production.json";
describe("Arquivo oficial de produção 2026", () => {
  it("aceita fase oficial com totalização não iniciada e horários ausentes", () => {
    const x = parseResult(productionPresident, {
      ...context,
      election: "6257",
      mode: "production",
    });
    expect(x.state).toBe("awaiting");
    expect(x.processedSections).toBe(0);
    expect(x.totalSections).toBe(499248);
    expect(x.updatedAt).toBeNull();
    expect(x.generatedAt).toBe("2026-10-03T17:47:37.000Z");
    expect(leadingCandidate(x)).toBeNull();
    expect(x.candidates.length).toBeGreaterThan(0);
  });
  it("rejeita dados oficiais no ambiente de simulado", () =>
    expect(() =>
      parseResult(productionPresident, { ...context, election: "6257" }),
    ).toThrow("Fase"));
});
import municipalitiesFixture from "./fixtures/municipalities-simulation.json";
import { municipalitySchema } from "@/lib/tse/schemas";
describe("EA12 — configuração completa de municípios", () => {
  it("aceita localidades do exterior com código IBGE vazio sem quebrar os municípios brasileiros", () => {
    const x = municipalitySchema.parse(municipalitiesFixture);
    expect(x.abr.find((a) => a.cd === "zz")?.mu.some((m) => m.cdi === "")).toBe(
      true,
    );
    const ce = x.abr.find((a) => a.cd === "ce");
    expect(ce?.mu.find((m) => m.nm === "FORTALEZA")?.cd).toBe("13897");
    expect(ce?.mu.every((m) => /^\d{5}$/.test(m.cd))).toBe(true);
  });
});
