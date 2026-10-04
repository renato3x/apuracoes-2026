"use client";
import dynamic from "next/dynamic";
import { ArrowUpRight, Equal, Clock3 } from "lucide-react";
import {
  getLeaderAdvantage,
  buildAdvantageHistory,
} from "@/lib/election/advantage";
import { number, percent } from "@/lib/utils/format";
import type { ResultsEnvelope } from "@/lib/tse/types";
const AdvantageHistory = dynamic(
  () => import("@/components/charts/advantage-history"),
);

export function LeaderAdvantage({ envelope }: { envelope?: ResultsEnvelope }) {
  const result = envelope?.data;
  const comparison = getLeaderAdvantage(result);
  if (!comparison || !result) return null;
  const hasComparison =
    comparison.state === "lead" || comparison.state === "tie";
  const history = hasComparison
    ? buildAdvantageHistory(comparison, envelope?.history ?? [])
    : null;
  return (
    <section
      className={`leader-advantage ${hasComparison ? "" : "advantage-pending"}`}
      aria-label={
        comparison.kind === "cut"
          ? "Diferença no corte de votação do Senado"
          : "Diferença de votos entre as primeiras posições"
      }
    >
      <div className="advantage-summary" aria-live="polite" aria-atomic="true">
        <div className="advantage-heading">
          <span className="eyebrow">
            {comparison.kind === "cut"
              ? "CORTE ATUAL POR VOTAÇÃO"
              : "VANTAGEM DO 1º COLOCADO"}
          </span>
          <span className="badge neutral">
            {result.state === "partial"
              ? "RESULTADO PARCIAL"
              : result.state === "final"
                ? "TOTALIZAÇÃO CONCLUÍDA"
                : "AGUARDANDO APURAÇÃO"}
          </span>
        </div>
        {hasComparison ? (
          <>
            <p className="advantage-candidates">
              {comparison.state === "tie" ? (
                <b>{comparison.upper.map((c) => c.ballotName).join(" / ")}</b>
              ) : comparison.kind === "cut" ? (
                <>
                  {comparison.upperPosition}ª posição:{" "}
                  <b>{comparison.upper.map((c) => c.ballotName).join(" / ")}</b>
                  <span> · </span>
                  {comparison.lowerPosition}ª posição:{" "}
                  <b>{comparison.lower.map((c) => c.ballotName).join(" / ")}</b>
                </>
              ) : (
                <>
                  <b>{comparison.upper.map((c) => c.ballotName).join(" / ")}</b>
                  <span> sobre </span>
                  <b>{comparison.lower.map((c) => c.ballotName).join(" / ")}</b>
                </>
              )}
            </p>
            {comparison.state === "tie" ? (
              <p className="advantage-tie">
                <Equal size={19} aria-hidden="true" />
                Empate em número de votos
                {comparison.kind === "cut" ? " no corte" : ""}
              </p>
            ) : (
              <div className="advantage-values">
                <strong>
                  <ArrowUpRight size={22} aria-hidden="true" />+
                  {number(comparison.votesDifference)}
                  <span> votos</span>
                </strong>
                <span className="advantage-points">
                  {comparison.percentagePoints === null
                    ? "Pontos percentuais indisponíveis"
                    : `${comparison.percentagePoints >= 0 ? "+" : ""}${comparison.percentagePoints.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p.p.`}
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="advantage-message">
            <Clock3 size={15} aria-hidden="true" />
            {"message" in comparison ? comparison.message : null}
          </p>
        )}
        <div className="advantage-context">
          <span>
            {result.processedPercentage === null
              ? "Percentual de totalização indisponível"
              : `${percent(result.processedPercentage)} das seções totalizadas`}
          </span>
          {comparison.kind === "cut" && (
            <>
              <span>{number(result.seats)} vagas informadas pelo TSE</span>
              {hasComparison && (
                <span>
                  Corte entre a {comparison.upperPosition}ª e a{" "}
                  {comparison.lowerPosition}ª posições
                </span>
              )}
            </>
          )}
          {envelope?.status === "stale" && (
            <span>Dados desatualizados · última consulta válida</span>
          )}
        </div>
        <p className="advantage-note">
          {comparison.kind === "cut"
            ? "Posições numéricas de votos válidos. O corte não atribui vagas nem garante eleição."
            : "Diferença calculada com votos classificados como válidos pelo TSE. Não representa previsão de resultado."}
        </p>
      </div>
      {history && <AdvantageHistory history={history} />}
    </section>
  );
}
