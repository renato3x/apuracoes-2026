"use client";
import { useState } from "react";
import Link from "next/link";
import { MapPin, ArrowUpRight } from "lucide-react";
import shapes from "./shapes.json";
import { states, stateName, leadingCandidate } from "@/lib/election/constants";
import { number, percent } from "@/lib/utils/format";
import type { ResultsEnvelope } from "@/lib/tse/types";
export default function BrazilMap({
  results,
  round,
  candidateId,
}: {
  results?: ResultsEnvelope[];
  round: number;
  candidateId?: string;
}) {
  const [mode, setMode] = useState("result"),
    [hover, setHover] = useState<string | null>(null);
  const selected = results?.find((r) => r.data?.territory === hover)?.data;
  const c = candidateId
    ? selected?.candidates.find((c) => c.officialId === candidateId)
    : leadingCandidate(selected);
  const candidateIds = [
    ...new Set(
      results?.flatMap(
        (r) => r.data?.candidates.map((c) => c.officialId) ?? [],
      ) ?? [],
    ),
  ].sort();
  const colors = [
    "#73c9b2",
    "#8f9ed9",
    "#cfac77",
    "#b18fb8",
    "#789daa",
    "#a3a6ad",
  ];
  function color(uf: string) {
    const r = results?.find((r) => r.data?.territory === uf)?.data;
    if (!r) return "#252c2e";
    if (mode === "result" && !candidateId) {
      const leader = leadingCandidate(r);
      return leader
        ? colors[candidateIds.indexOf(leader.officialId) % colors.length]
        : "#252c2e";
    }
    const value =
      candidateId && mode === "result"
        ? r.candidates.find((c) => c.officialId === candidateId)?.percentage
        : mode === "progress"
          ? r.processedPercentage
          : mode === "turnout"
            ? r.turnoutPercentage
            : r.abstentionPercentage;
    return value != null ? `hsl(164 25% ${18 + value * 0.45}%)` : "#252c2e";
  }
  function textColor(uf: string) {
    const fill = color(uf);
    return fill === "#252c2e" ||
      (fill.startsWith("hsl") &&
        Number(fill.match(/(\d+(?:\.\d+)?)%\)/)?.[1] ?? 0) < 40)
      ? "#c7d7cf"
      : "#102019";
  }
  return (
    <section className="map-panel panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">PANORAMA REGIONAL</span>
          <h2>
            {candidateId
              ? "Distribuição de votos"
              : "O Brasil, estado a estado"}
          </h2>
        </div>
        <MapPin size={18} className="muted" />
      </div>
      <div className="map-tabs" role="group" aria-label="Visualização do mapa">
        {[
          ["result", candidateId ? "Votos" : "Presidente"],
          ["progress", "Apuração"],
          ["turnout", "Comparecimento"],
          ["abstention", "Abstenção"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={mode === key ? "selected" : ""}
            onClick={() => setMode(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="map-stage">
        <svg
          viewBox="0 0 560 548"
          aria-label="Mapa interativo das 27 unidades federativas do Brasil"
        >
          <title>
            Resultados por unidade federativa. Use Tab e Enter para abrir cada
            estado.
          </title>
          {shapes.map((s) => (
            <a
              href={`/estado/${s.uf}?turno=${round}`}
              key={s.uf}
              aria-label={`Abrir resultado de ${stateName(s.uf)}`}
              onMouseEnter={() => setHover(s.uf)}
              onFocus={() => setHover(s.uf)}
              onMouseLeave={() => setHover(null)}
              onBlur={() => setHover(null)}
            >
              <path
                d={s.d ?? ""}
                fill={color(s.uf)}
                stroke="#111718"
                strokeWidth="1.5"
                className={hover === s.uf ? "map-state hovered" : "map-state"}
              />
              {s.uf === "df" ? (
                <>
                  <circle
                    cx={s.center[0]}
                    cy={s.center[1]}
                    r="5"
                    fill={color("df")}
                    stroke="#b8c8c3"
                  />
                  <text
                    style={{ fill: textColor(s.uf) }}
                    x={s.center[0] + 12}
                    y={s.center[1] - 4}
                  >
                    DF
                  </text>
                </>
              ) : (
                <text
                  style={{ fill: textColor(s.uf) }}
                  x={s.center[0]}
                  y={s.center[1] + 3}
                  textAnchor="middle"
                >
                  {s.uf.toUpperCase()}
                </text>
              )}
            </a>
          ))}
        </svg>
        {hover && (
          <div className="map-tooltip" role="status">
            <strong>{stateName(hover)}</strong>
            <span>Apuração {percent(selected?.processedPercentage)}</span>
            <span>{c?.ballotName ?? "Informação ainda não disponível"}</span>
            {c && (
              <span>
                {percent(c.percentage)} · {number(c.votes)} votos
              </span>
            )}
          </div>
        )}
      </div>
      <div className="map-caption">
        <span>
          <span className="legend-dot" />{" "}
          {mode === "result"
            ? candidateId
              ? "Intensidade representa o percentual da candidatura"
              : "Cor identifica a candidatura com mais votos válidos"
            : "Intensidade representa o percentual"}
        </span>
        <span>Sem projeções</span>
      </div>
      <Link className="panel-link" href={`/estados?turno=${round}`}>
        Explorar os 27 estados <ArrowUpRight size={15} />
      </Link>
      <details className="map-alternative">
        <summary>Alternativa textual do mapa</summary>
        {states.map((s) => (
          <Link key={s.uf} href={`/estado/${s.uf}?turno=${round}`}>
            {s.name}:{" "}
            {percent(
              results?.find((r) => r.data?.territory === s.uf)?.data
                ?.processedPercentage,
            )}{" "}
            apurado
          </Link>
        ))}
      </details>
    </section>
  );
}
