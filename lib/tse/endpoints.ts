import { offices, type Office } from "@/lib/election/constants";
import type { TseConfig } from "./schemas";
import type { Mode } from "./types";
export function settings() {
  const mode = process.env.TSE_DATA_MODE ?? "simulation";
  if (mode !== "production" && mode !== "simulation")
    throw new Error("TSE_DATA_MODE deve ser simulation ou production");
  const interval = Number(process.env.RESULTS_REFRESH_INTERVAL ?? 30000);
  if (!Number.isFinite(interval) || interval < 10000)
    throw new Error("RESULTS_REFRESH_INTERVAL deve ser pelo menos 10000 ms");
  return {
    mode: mode as Mode,
    interval,
    base:
      mode === "production"
        ? "https://resultados.tse.jus.br"
        : "https://resultados-sim.tse.jus.br/simulado",
    environment: mode === "production" ? "oficial" : "simulado2026",
  };
}
export function discoverElection(
  config: TseConfig,
  office: Office,
  round: 1 | 2,
  uf = "br",
) {
  const code = offices[office].code;
  const generalPleitos = config.pl.filter(
    (p) =>
      p.c === "ele2026" &&
      p.e.some((e) =>
        e.abr.some((a) => a.cd === "br" && a.cp.some((c) => c.cd === "1")),
      ),
  );
  for (const pleito of generalPleitos)
    for (const e of pleito.e) {
      if (
        Number(e.t) !== round ||
        !e.abr.some(
          (a) =>
            (a.cd === "br" || a.cd === uf) && a.cp.some((c) => c.cd === code),
        )
      )
        continue;
      return { id: e.cd, cycle: pleito.c, pleito: pleito.cd };
    }
  // 2º turno só para os cargos majoritários elegíveis; id vem de cdt2 do EA11.
  if (round === 2 && (office === "president" || office === "governor"))
    for (const p of generalPleitos)
      for (const e of p.e)
        if (
          e.t === "1" &&
          e.cdt2 &&
          e.abr.some(
            (a) =>
              (a.cd === "br" || a.cd === uf) && a.cp.some((c) => c.cd === code),
          )
        )
          return { id: e.cdt2, cycle: p.c, pleito: p.cd };
  return null;
}
export function directory(
  config: TseConfig,
  tp: string,
  e: { id: string; cycle: string; pleito: string },
  uf: string,
) {
  const s = settings();
  const template = config.arq.find((a) => a.tp === tp)?.dir;
  if (!template) throw new Error("Diretório não informado pelo TSE");
  const replacements: Record<string, string> = {
    base: s.base,
    ambiente: s.environment,
    ciclo: e.cycle,
    cd_eleicao: e.id,
    cd_pleito: e.pleito,
    uf,
  };
  const url = template.replace(
    /<([^>]+)>/g,
    (_, key) => replacements[key] ?? "INVALID",
  );
  if (url.includes("INVALID") || !url.startsWith(`${s.base}/${s.environment}/`))
    throw new Error("Diretório TSE incompatível");
  return url;
}
export function resultFilename(
  office: Office,
  election: string,
  uf: string,
  municipality?: string,
) {
  if (
    !/^[a-z]{2}$/.test(uf) ||
    !/^\d+$/.test(election) ||
    (municipality && !/^\d{5}$/.test(municipality))
  )
    throw new Error("Parâmetros inválidos");
  return `${uf}${municipality ?? ""}-c${offices[office].code.padStart(4, "0")}-e${election.padStart(6, "0")}-u.json`;
}
