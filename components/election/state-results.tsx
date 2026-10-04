"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { useApi } from "./use-api";
import { Skeleton, Empty, DataError } from "./results";
import {
  states,
  offices,
  leadingCandidate,
  type Office,
} from "@/lib/election/constants";
import { percent, number } from "@/lib/utils/format";
import type { ResultsEnvelope } from "@/lib/tse/types";
export function StateResultCards({
  office,
  round,
  limit,
  interval = 30000,
}: {
  office: Office;
  round: number;
  limit?: number;
  interval?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(
      (e) => {
        if (e.some((x) => x.isIntersecting)) {
          setVisible(true);
          o.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  const api = useApi<ResultsEnvelope[]>(
    visible ? `/api/results/states/${office}?turno=${round}` : null,
    interval,
  );
  return (
    <div ref={ref}>
      {api.error && <DataError onRetry={api.refresh} />}
      <div className="state-cards">
        {(limit ? states.slice(0, limit) : states).map((s, i) => {
          const r = api.data?.[i]?.data;
          const path =
            office === "governor"
              ? "governador"
              : office === "senate"
                ? "senado"
                : office === "federal-deputy"
                  ? "deputado-federal"
                  : office === "state-deputy"
                    ? s.uf === "df"
                      ? "deputado-distrital"
                      : "deputado-estadual"
                    : "";
          return (
            <Link
              className="state-card panel"
              key={s.uf}
              href={`/estado/${s.uf}${path ? `/${path}` : ""}?turno=${round}`}
            >
              <div className="state-card-top">
                <span className="uf-badge">{s.uf.toUpperCase()}</span>
                <strong>{s.name}</strong>
                <ArrowUpRight size={14} />
              </div>
              <div className="state-card-progress">
                <span>Apuração</span>
                <b>{percent(r?.processedPercentage)}</b>
              </div>
              <div className="tiny-progress">
                <span style={{ width: `${r?.processedPercentage ?? 0}%` }} />
              </div>
              {api.loading && !r ? (
                <Skeleton />
              ) : r ? (
                r.candidates.slice(0, 2).map((c) => (
                  <div className="state-candidate" key={c.id}>
                    <span>
                      {c.ballotName}
                      <small>{c.party}</small>
                    </span>
                    <b>{percent(c.percentage)}</b>
                  </div>
                ))
              ) : (
                <p className="state-pending">
                  {api.data?.[i]?.message ?? "Dados ainda não divulgados"}
                </p>
              )}
              <span className="state-card-bottom">
                Abrir resultado completo <ArrowUpRight size={12} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
export function StateTable({
  results,
  round,
  candidateId,
}: {
  results?: ResultsEnvelope[];
  round: number;
  candidateId?: string;
}) {
  const [q, setQ] = useState(""),
    [sort, setSort] = useState("state"),
    [region, setRegion] = useState("");
  const rows = states
    .map((s, i) => {
      const r = results?.[i]?.data;
      const c = candidateId
        ? r?.candidates.find((c) => c.officialId === candidateId)
        : leadingCandidate(r);
      return { ...s, result: r, candidate: c };
    })
    .filter(
      (s) =>
        s.name.toLocaleLowerCase().includes(q.toLocaleLowerCase()) &&
        (!region || s.region === region),
    )
    .sort((a, b) =>
      sort === "progress"
        ? (b.result?.processedPercentage ?? -1) -
          (a.result?.processedPercentage ?? -1)
        : sort === "votes"
          ? (b.candidate?.votes ?? -1) - (a.candidate?.votes ?? -1)
          : a.name.localeCompare(b.name),
    );
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>{candidateId ? "Votação por estado" : "Presidente por estado"}</h2>
        <span className="eyebrow">27 UNIDADES FEDERATIVAS</span>
      </div>
      <div className="filters">
        <label className="input-search">
          <Search size={15} />
          <input
            placeholder="Buscar estado"
            aria-label="Buscar estado"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <select
          value={region}
          aria-label="Filtrar região"
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="">Todas as regiões</option>
          {["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          value={sort}
          aria-label="Ordenar estados"
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="state">Estado A–Z</option>
          <option value="progress">Apuração</option>
          <option value="votes">Votos</option>
        </select>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Estado</th>
              <th>{candidateId ? "Candidato" : "Mais votos válidos"}</th>
              <th>Partido</th>
              <th className="numeric">Votos</th>
              <th className="numeric">% TSE</th>
              <th className="numeric">Apuração</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.uf}>
                <td>
                  <Link href={`/estado/${s.uf}?turno=${round}`}>
                    <span className="table-uf">{s.uf.toUpperCase()}</span>
                    {s.name}
                  </Link>
                </td>
                <td>{s.candidate?.ballotName ?? "Ainda não disponível"}</td>
                <td>{s.candidate?.party ?? "—"}</td>
                <td className="numeric mono">{number(s.candidate?.votes)}</td>
                <td className="numeric mono">
                  {percent(s.candidate?.percentage)}
                </td>
                <td className="numeric mono">
                  {percent(s.result?.processedPercentage)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <Empty message="Nenhum estado corresponde aos filtros." />
      )}
    </section>
  );
}
