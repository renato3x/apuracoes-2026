"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Info,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { electedStatus, offices, stateName } from "@/lib/election/constants";
import { LeaderAdvantage } from "./leader-advantage";
import { number, percent, time } from "@/lib/utils/format";
import type {
  CandidateResult,
  ElectionResult,
  ResultsEnvelope,
} from "@/lib/tse/types";
export function Skeleton() {
  return (
    <div className="skeleton" role="status" aria-label="Carregando resultados">
      <div />
      <div />
      <div />
    </div>
  );
}
export function Empty({
  message = "Informação ainda não disponível.",
}: {
  message?: string;
}) {
  return (
    <div className="empty">
      <Clock3 size={24} />
      <strong>
        {message.includes("Não foi possível")
          ? "Atualização indisponível"
          : "Aguardando dados do TSE"}
      </strong>
      <p>{message}</p>
    </div>
  );
}
export function ResultsStatus({ result }: { result: ElectionResult | null }) {
  return (
    <span className={`status ${result?.state === "final" ? "completed" : ""}`}>
      {result?.state === "final" ? (
        <Check size={13} />
      ) : (
        <span className="dot" />
      )}
      {result?.state === "final"
        ? "TOTALIZAÇÃO CONCLUÍDA"
        : result?.state === "partial"
          ? "RESULTADO PARCIAL"
          : "AGUARDANDO APURAÇÃO"}
    </span>
  );
}
export function LastUpdated({ envelope }: { envelope?: ResultsEnvelope }) {
  return (
    <div className="last-updated">
      <span>
        Última atualização: <b>{time(envelope?.checkedAt)}</b>
      </span>
      {envelope?.data?.updatedAt && (
        <span>
          Dados atualizados pelo TSE às <b>{time(envelope.data.updatedAt)}</b> ·{" "}
          {new Date(envelope.data.updatedAt).toLocaleDateString("pt-BR", {
            timeZone: "America/Fortaleza",
          })}
        </span>
      )}
    </div>
  );
}
export function ElectionProgress({
  result,
  title = "Apuração nacional",
}: {
  result: ElectionResult | null;
  title?: string;
}) {
  return (
    <section className="progress-panel panel">
      <div className="progress-title">
        <span className="eyebrow">{title}</span>
        <ResultsStatus result={result} />
      </div>
      <div className="progress-main">
        <strong>
          {percent(result?.processedPercentage).replace("%", "")}
          <span>{result?.processedPercentage != null ? "%" : ""}</span>
        </strong>
        <span>
          das seções
          <br />
          totalizadas
        </span>
        <div className="progress-count">
          <b>{number(result?.processedSections)}</b>
          <span>de {number(result?.totalSections)} seções</span>
        </div>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Seções totalizadas"
        aria-valuenow={result?.processedPercentage ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div style={{ width: `${result?.processedPercentage ?? 0}%` }} />
      </div>
      <div className="progress-bottom">
        <span>Fonte: Tribunal Superior Eleitoral</span>
        <span>
          {result?.unprocessedSections != null
            ? `${number(result.unprocessedSections)} seções pendentes`
            : "Informação ainda não disponível"}
        </span>
      </div>
    </section>
  );
}
export function CandidateAvatar({ candidate }: { candidate: CandidateResult }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="avatar">
      {candidate.photo && !failed ? (
        <Image
          src={candidate.photo}
          width={44}
          height={44}
          alt={`Foto de ${candidate.ballotName}`}
          onError={() => setFailed(true)}
        />
      ) : (
        candidate.ballotName
          .split(" ")
          .slice(0, 2)
          .map((x) => x[0])
          .join("")
      )}
    </span>
  );
}
export function CandidateResultRow({
  candidate,
  index,
  round = 1,
}: {
  candidate: CandidateResult;
  index: number;
  round?: number;
}) {
  const colors = ["#73c9b2", "#8f9ed9", "#cfac77", "#a3a6ad"];
  const color = colors[index % colors.length];
  return (
    <div className="candidate-row">
      <span className="position">{String(index + 1).padStart(2, "0")}</span>
      <CandidateAvatar candidate={candidate} />
      <div className="candidate-identity">
        <Link href={`/candidato/${candidate.id}?turno=${round}`}>
          {candidate.ballotName}
        </Link>
        <span>
          <span className="party">{candidate.party}</span>{" "}
          <span className="candidate-number">{candidate.number}</span>
          {candidate.status && (
            <span
              className={`official-status ${electedStatus(candidate.status) ? "elected" : ""}`}
            >
              {candidate.status}
            </span>
          )}
        </span>
        <div className="vote-bar">
          <span
            style={{
              width: `${candidate.percentage ?? 0}%`,
              background: color,
            }}
          />
        </div>
        {candidate.replacedCandidates.length > 0 && (
          <small className="vote-destination">
            Substitui{" "}
            {candidate.replacedCandidates.map((c) => c.ballotName).join(", ")}
          </small>
        )}
        {candidate.voteDestination &&
          candidate.voteDestination !== "Válido" && (
            <small className="vote-destination">
              {candidate.voteDestination}
            </small>
          )}
      </div>
      <div className="candidate-votes">
        <strong>{percent(candidate.percentage)}</strong>
        <span>{number(candidate.votes)} votos</span>
      </div>
    </div>
  );
}
export function CandidateList({
  envelope,
  limit,
  round = 1,
}: {
  envelope?: ResultsEnvelope;
  limit?: number;
  round?: number;
}) {
  if (!envelope) return <Skeleton />;
  if (!envelope.data) return <Empty message={envelope.message ?? undefined} />;
  if (!envelope.data.candidates.length) return <Empty />;
  return (
    <>
      <LeaderAdvantage envelope={envelope} />
      <div className="candidate-column-label">
        <span>CANDIDATO / PARTIDO</span>
        <span>VOTOS / PERCENTUAL TSE</span>
      </div>
      {envelope.data.candidates.slice(0, limit).map((c, i) => (
        <CandidateResultRow key={c.id} candidate={c} index={i} round={round} />
      ))}
      {envelope.status === "stale" && (
        <p className="notice">
          {envelope.message} Exibindo o último resultado válido.
        </p>
      )}
    </>
  );
}
export function ElectionStats({ result }: { result: ElectionResult | null }) {
  return (
    <div className="stats-grid">
      {[
        ["Eleitorado", result?.electorate, "Eleitores aptos"],
        ["Comparecimento", result?.turnout, percent(result?.turnoutPercentage)],
        [
          "Abstenções",
          result?.abstentions,
          percent(result?.abstentionPercentage),
        ],
        ["Votos válidos", result?.validVotes, "Conforme classificação do TSE"],
        ["Votos em branco", result?.blankVotes, "Votação do cargo selecionado"],
        [
          "Votos nulos",
          result?.nullVotes,
          "Inclui nulos técnicos quando informados",
        ],
      ].map(([label, value, detail]) => (
        <div className="stat panel" key={String(label)}>
          <span>{label}</span>
          <strong>{number(value as number | null)}</strong>
          <small>{detail}</small>
        </div>
      ))}
    </div>
  );
}
export function DataError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="notice error" role="alert">
      <Info size={16} />
      <span>Não foi possível atualizar os dados oficiais neste momento.</span>
      <button onClick={onRetry}>
        <RefreshCw size={13} /> Tentar novamente
      </button>
    </div>
  );
}
export function CandidateTable({
  candidates,
  round,
}: {
  candidates: CandidateResult[];
  round: number;
}) {
  const [q, setQ] = useState(""),
    [party, setParty] = useState(""),
    [fed, setFed] = useState(""),
    [elected, setElected] = useState(false),
    [page, setPage] = useState(0),
    [sort, setSort] = useState("votes");
  const filtered = candidates
    .filter(
      (c) =>
        `${c.ballotName} ${c.name} ${c.number}`
          .toLocaleLowerCase()
          .includes(q.toLocaleLowerCase()) &&
        (!party || c.party === party) &&
        (!fed || c.federation === fed) &&
        (!elected || electedStatus(c.status)),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.ballotName.localeCompare(b.ballotName)
        : (b.votes ?? -1) - (a.votes ?? -1),
    );
  const showOffice = new Set(candidates.map((c) => c.office)).size > 1;
  const pages = Math.max(1, Math.ceil(filtered.length / 20)),
    current = Math.min(page, pages - 1);
  return (
    <>
      <div className="filters">
        <label className="input-search">
          <Search size={16} />
          <input
            aria-label="Buscar candidato"
            placeholder="Buscar candidato ou número"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <select
          aria-label="Filtrar partido"
          value={party}
          onChange={(e) => {
            setParty(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Todos os partidos</option>
          {[...new Set(candidates.map((c) => c.party))].sort().map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar federação"
          value={fed}
          onChange={(e) => {
            setFed(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Todas as federações</option>
          {[
            ...new Set(
              candidates.flatMap((c) => (c.federation ? [c.federation] : [])),
            ),
          ]
            .sort()
            .map((f) => (
              <option key={f}>{f}</option>
            ))}
        </select>
        <select
          aria-label="Ordenar candidatos"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="votes">Mais votos</option>
          <option value="name">Nome</option>
        </select>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={elected}
            onChange={(e) => {
              setElected(e.target.checked);
              setPage(0);
            }}
          />{" "}
          Eleitos oficiais
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Candidato</th>
              <th>Número</th>
              {showOffice && (
                <>
                  <th>Cargo</th>
                  <th>UF</th>
                </>
              )}
              <th>Partido / federação</th>
              <th className="numeric">Votos nominais</th>
              <th className="numeric">% TSE</th>
              <th>Situação oficial</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(current * 20, current * 20 + 20).map((c) => (
              <tr key={c.id}>
                <td className="muted">
                  {candidates.findIndex((x) => x.id === c.id) + 1}
                </td>
                <td>
                  <Link
                    className="table-candidate"
                    href={`/candidato/${c.id}?turno=${round}`}
                  >
                    <CandidateAvatar candidate={c} />
                    {c.ballotName}
                  </Link>
                </td>
                <td className="mono">{c.number}</td>
                {showOffice && (
                  <>
                    <td>{offices[c.office].label}</td>
                    <td>{stateName(c.territory)}</td>
                  </>
                )}
                <td>
                  {c.party}
                  <small>{c.federation}</small>
                </td>
                <td className="numeric mono">{number(c.votes)}</td>
                <td className="numeric mono">{percent(c.percentage)}</td>
                <td>
                  <span
                    className={`official-status ${electedStatus(c.status) ? "elected" : ""}`}
                  >
                    {c.status ?? "Não disponível"}
                  </span>
                  {c.voteDestination !== "Válido" && (
                    <small>{c.voteDestination}</small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <Empty message="Nenhum candidato corresponde aos filtros." />
      )}
      <div className="pagination">
        <span>
          {number(filtered.length)} candidatos · Página {current + 1} de {pages}
        </span>
        <button
          disabled={current === 0}
          aria-label="Página anterior"
          onClick={() => setPage(current - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          disabled={current >= pages - 1}
          aria-label="Próxima página"
          onClick={() => setPage(current + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </>
  );
}
export function Proportional({ result }: { result: ElectionResult }) {
  return (
    <section className="panel proportional">
      <div className="section-heading">
        <h2>Distribuição proporcional</h2>
        <span className="badge neutral">DADOS DO TSE</span>
      </div>
      <p className="muted">
        A votação nominal não determina, isoladamente, a eleição. As situações
        abaixo são as publicadas pelo TSE. Vagas de agrupamentos podem variar
        nas parciais.
      </p>
      <div className="inline-stats">
        <span>
          Quociente eleitoral{" "}
          <strong>{number(result.electoralQuotient)}</strong>
        </span>
        <span>
          Votos nominais <strong>{number(result.nominalVotes)}</strong>
        </span>
        <span>
          Votos de legenda <strong>{number(result.listVotes)}</strong>
        </span>
        <span>
          Vagas do cargo <strong>{number(result.seats)}</strong>
        </span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Partido / federação</th>
              <th className="numeric">Votos nominais</th>
              <th className="numeric">Votos de legenda</th>
              <th className="numeric">Vagas informadas</th>
            </tr>
          </thead>
          <tbody>
            {result.allocations.map((a, i) => (
              <tr key={i}>
                <td>
                  {a.name}
                  <small>{a.parties.map((p) => p.party).join(" / ")}</small>
                </td>
                <td className="numeric">
                  {a.parties.every((p) => p.nominalVotes !== null)
                    ? number(a.parties.reduce((n, p) => n + p.nominalVotes!, 0))
                    : "—"}
                </td>
                <td className="numeric">
                  {a.parties.every((p) => p.listVotes !== null)
                    ? number(a.parties.reduce((n, p) => n + p.listVotes!, 0))
                    : "—"}
                </td>
                <td className="numeric">{number(a.seats)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        Quociente partidário: informação ainda não disponível no modelo
        consultado. Eleitos por média são identificados exclusivamente pela
        situação oficial do candidato.
      </p>
    </section>
  );
}
