import {
  states,
  offices,
  slugify,
  type Office,
} from "@/lib/election/constants";
import { cached, throttle, mapLimited, redis } from "./cache";
import {
  settings,
  discoverElection,
  directory,
  resultFilename,
} from "./endpoints";
import { configSchema, municipalitySchema } from "./schemas";
import { parseResult } from "./parser";
import { snapshots } from "./snapshots";
import type { ResultsEnvelope, Municipality } from "./types";
class NotPublished extends Error {}
const negative = new Map<string, number>();
async function getJson(url: string, ttl: number) {
  if (
    (negative.get(url) ?? 0) > Date.now() ||
    (redis && (await redis.exists(`unpublished:${url}`)))
  )
    throw new NotPublished("Dados ainda não divulgados pelo TSE.");
  await throttle();
  const r = await fetch(url, {
    next: { revalidate: ttl },
    signal: AbortSignal.timeout(12000),
    headers: { Accept: "application/json" },
  });
  if (r.status === 404) {
    negative.set(url, Date.now() + 120000);
    if (negative.size > 400) negative.delete(negative.keys().next().value!);
    if (redis) await redis.set(`unpublished:${url}`, true, { ex: 120 });
    throw new NotPublished("Dados ainda não divulgados pelo TSE.");
  }
  if (!r.ok) throw new Error(`TSE HTTP ${r.status}`);
  return r.json() as Promise<unknown>;
}
export async function getConfig() {
  const s = settings();
  return cached(`config:${s.mode}`, 300, async () => {
    const x = configSchema.parse(
      await getJson(`${s.base}/${s.environment}/comum/config/ele-c.json`, 300),
    );
    if (x.f !== (s.mode === "production" ? "o" : "s"))
      throw new Error("Fase da configuração incompatível");
    return x;
  });
}
export async function getMunicipalities(
  round: 1 | 2 = 1,
): Promise<Municipality[]> {
  const s = settings();
  return cached(`municipalities:${s.mode}:${round}`, 3600, async () => {
    const config = await getConfig();
    const e = discoverElection(config, "president", round);
    if (!e) return [];
    const x = municipalitySchema.parse(
      await getJson(
        `${directory(config, "cm", e, "br")}/mun-e${e.id.padStart(6, "0")}-cm.json`,
        3600,
      ),
    );
    if (x.f !== config.f) throw new Error("Fase incompatível");
    return x.abr
      .filter((a) => states.some((s) => s.uf === a.cd))
      .flatMap((a) =>
        a.mu.map((m) => ({
          uf: a.cd,
          code: m.cd.padStart(5, "0"),
          ibgeCode: m.cdi || null,
          name: m.nm,
          slug: slugify(m.nm),
          capital: m.c === "s",
        })),
      );
  });
}
const lastGood = new Map<string, ResultsEnvelope>();
export async function getResult(
  office: Office,
  territory = "br",
  round: 1 | 2 = 1,
  municipality?: string,
): Promise<ResultsEnvelope> {
  const s = settings();
  const key = `results:${s.mode}:${office}:${territory}:${round}:${municipality ?? ""}`;
  const empty: ResultsEnvelope = {
    data: null,
    checkedAt: new Date().toISOString(),
    refreshInterval: s.interval,
    mode: s.mode,
    status: "unavailable",
    message: "Dados ainda não divulgados pelo TSE.",
    history: [],
  };
  try {
    const value = await cached(key, Math.ceil(s.interval / 1000), async () => {
      try {
        const config = await getConfig();
        const e = discoverElection(config, office, round, territory);
        if (!e)
          return {
            ...empty,
            message:
              "Este cargo ou turno ainda não está disponível para este território.",
          };
        if (municipality) {
          const municipios = await getMunicipalities(round);
          if (
            !municipios.some(
              (m) => m.uf === territory && m.code === municipality,
            )
          )
            return {
              ...empty,
              message: "Município não encontrado na configuração oficial.",
            };
        }
        const url = `${directory(config, "u", e, territory)}/${resultFilename(office, e.id, territory, municipality)}`;
        const raw = await cached(
          `file:${url}`,
          Math.ceil(s.interval / 1000),
          () => getJson(url, Math.ceil(s.interval / 1000)),
        );
        const data = parseResult(raw, {
          office,
          territory,
          round,
          municipality,
          mode: s.mode,
          election: e.id,
          sourceUrl: url,
          photoDirectory: directory(
            config,
            "ft",
            e,
            office === "president" ? "br" : territory,
          ),
        });
        let history: ResultsEnvelope["history"] = [];
        try {
          history = await snapshots(data);
        } catch {
          /* snapshots nunca derrubam resultados */
        }
        const value: ResultsEnvelope = {
          ...empty,
          data,
          status: "ok",
          message: null,
          history,
        };
        lastGood.set(key, value);
        if (lastGood.size > 400) lastGood.delete(lastGood.keys().next().value!);
        return value;
      } catch (error) {
        if (error instanceof NotPublished) return { ...empty };
        throw error;
      }
    });
    if (Date.now() - Date.parse(value.checkedAt) > s.interval * 2 && value.data)
      return {
        ...value,
        status: "stale",
        message:
          "Atualização em andamento. Exibindo o último resultado válido.",
      };
    return value;
  } catch {
    const old =
      lastGood.get(key) ??
      (redis
        ? await redis.get<ResultsEnvelope>(`${key}:stale`).catch(() => null)
        : null);
    return {
      ...(old ?? empty),
      checkedAt: new Date().toISOString(),
      status: old ? "stale" : "error",
      message: "Não foi possível atualizar os dados oficiais neste momento.",
    };
  }
}
export async function getStateResults(office: Office, round: 1 | 2) {
  return mapLimited(states, (s) =>
    getResult(
      office === "state-deputy" && s.uf === "df" ? "district-deputy" : office,
      s.uf,
      round,
    ),
  );
}
export async function getCatalog(round: 1 | 2 = 1) {
  const s = settings();
  return cached(
    `catalog:${s.mode}:${round}`,
    Math.max(60, Math.ceil(s.interval / 1000)),
    async () => {
      const jobs = (Object.keys(offices) as Office[])
        .filter((o) => o !== "district-deputy")
        .flatMap((o) =>
          o === "president"
            ? [{ office: o, uf: "br" }]
            : states.map((s) => ({
                office:
                  o === "state-deputy" && s.uf === "df"
                    ? ("district-deputy" as Office)
                    : o,
                uf: s.uf,
              })),
        );
      const results = await mapLimited(jobs, (x) =>
        getResult(x.office, x.uf, round),
      );
      return {
        results,
        candidates: results.flatMap((r) => r.data?.candidates ?? []),
        checkedAt: new Date().toISOString(),
        mode: s.mode,
      };
    },
  );
}
