"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  ChevronRight,
  Globe2,
  ShieldCheck,
  Landmark,
  Users,
  MapPin,
  Info,
  Search,
  RefreshCw,
  Download,
} from "lucide-react";
import { useApi } from "./use-api";
import About from "./about";
import {
  ElectionProgress,
  CandidateList,
  CandidateTable,
  ElectionStats,
  LastUpdated,
  ResultsStatus,
  Empty,
  Skeleton,
  DataError,
  Proportional,
  CandidateAvatar,
} from "./results";
import { StateResultCards, StateTable } from "./state-results";
import {
  states,
  offices,
  stateName,
  electedStatus,
  leadingCandidate,
  type Office,
} from "@/lib/election/constants";
import { number, percent } from "@/lib/utils/format";
import type {
  ResultsEnvelope,
  CandidateResult,
  Municipality,
} from "@/lib/tse/types";
const BrazilMap = dynamic(() => import("@/components/maps/brazil-map"), {
  loading: () => (
    <div className="panel map-panel">
      <Skeleton />
    </div>
  ),
});
const VoteBreakdown = dynamic(
  () => import("@/components/charts/vote-breakdown"),
  { loading: () => <Skeleton /> },
);
export type View =
  | "home"
  | "president"
  | "states"
  | "office"
  | "state"
  | "municipalities"
  | "municipality"
  | "parties"
  | "party"
  | "candidate"
  | "about";
interface Catalog {
  candidates: CandidateResult[];
  results: ResultsEnvelope[];
  mode: string;
  checkedAt: string;
}
export interface PortalProps {
  view: View;
  round: 1 | 2;
  uf?: string;
  office?: Office;
  id?: string;
  municipalityCode?: string;
  municipalityName?: string;
  interval: number;
  simulation: boolean;
  initial?: ResultsEnvelope;
}
function SectionTitle({
  title,
  sub,
  href,
}: {
  title: string;
  sub?: string;
  href?: string;
}) {
  return (
    <div className="block-heading">
      <div>
        <span className="eyebrow">{sub}</span>
        <h2>{title}</h2>
      </div>
      {href && (
        <Link href={href}>
          Ver todos <ArrowUpRight size={14} />
        </Link>
      )}
    </div>
  );
}
function RoundSelector({ round }: { round: number }) {
  const router = useRouter(),
    path = usePathname();
  return (
    <div className="round-selector" role="group" aria-label="Selecionar turno">
      {[1, 2].map((r) => (
        <button
          key={r}
          className={round === r ? "selected" : ""}
          aria-pressed={round === r}
          onClick={() => router.push(`${path}?turno=${r}`)}
        >
          {r}º turno
        </button>
      ))}
    </div>
  );
}
function MunicipalityBrowser({
  uf,
  round,
  interval,
}: {
  uf: string;
  round: number;
  interval: number;
}) {
  const [q, setQ] = useState(""),
    [page, setPage] = useState(0);
  const api = useApi<Municipality[]>(
    `/api/catalog?type=municipalities&turno=${round}`,
    Math.max(interval, 3600000),
  );
  const municipalities =
    api.data?.filter(
      (m) =>
        m.uf === uf &&
        m.name.toLocaleLowerCase().includes(q.toLocaleLowerCase()),
    ) ?? [];
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Municípios de {stateName(uf)}</h2>
        <span className="badge neutral">
          {municipalities.length} MUNICÍPIOS
        </span>
      </div>
      <div className="filters">
        <label className="input-search">
          <Search size={16} />
          <input
            aria-label="Buscar município"
            placeholder="Buscar município, ex.: Fortaleza"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
        </label>
      </div>
      {api.error ? (
        <DataError onRetry={api.refresh} />
      ) : api.loading ? (
        <Skeleton />
      ) : municipalities.length ? (
        <>
          <div className="municipality-grid">
            {municipalities.slice(page * 60, page * 60 + 60).map((m) => (
              <Link
                key={m.code}
                href={`/estado/${uf}/municipio/${m.slug}?turno=${round}`}
              >
                <MapPin size={15} />
                <span>
                  {m.name}
                  {m.capital && <small>Capital</small>}
                </span>
                <ChevronRight size={15} />
              </Link>
            ))}
          </div>
          <div className="pagination">
            <span>
              {municipalities.length} municípios · Página {page + 1}
            </span>
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>
              Anterior
            </button>
            <button
              disabled={(page + 1) * 60 >= municipalities.length}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </button>
          </div>
        </>
      ) : (
        <Empty message="A configuração oficial não contém municípios para esta consulta." />
      )}
    </section>
  );
}
function Parties({
  catalog,
  round,
  party,
}: {
  catalog?: Catalog;
  round: number;
  party?: string;
}) {
  const [q, setQ] = useState("");
  if (!catalog) return <Skeleton />;
  const names = [...new Set(catalog.candidates.map((c) => c.party))].sort();
  const scope = party
    ? catalog.candidates.filter(
        (c) => c.party.toLowerCase() === party.toLowerCase(),
      )
    : [];
  const successful = catalog.results.filter((r) => r.status === "ok").length;
  const all = catalog.results.length;
  return (
    <>
      <div className="notice">
        <Info size={16} />
        <span>
          Contagens derivadas apenas das situações oficiais “Eleito”. Cobertura:{" "}
          {successful}/{all} recortes disponíveis. Totais incompletos são
          identificados.
        </span>
      </div>
      {party ? (
        <section className="panel">
          <div className="section-heading">
            <h2>Candidatos de {party}</h2>
          </div>
          {scope.length ? (
            <CandidateTable candidates={scope} round={round} />
          ) : (
            <Empty message="Partido sem candidaturas disponíveis no turno selecionado." />
          )}
        </section>
      ) : (
        <section className="panel">
          <div className="section-heading">
            <h2>Representação por partido</h2>
            <span className="eyebrow">ORDEM ALFABÉTICA</span>
          </div>
          <div className="filters">
            <label className="input-search">
              <Search size={15} />
              <input
                placeholder="Buscar partido"
                aria-label="Buscar partido"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Partido</th>
                  <th className="numeric">Dep. federais</th>
                  <th className="numeric">Dep. estaduais / distritais</th>
                  <th className="numeric">Senadores</th>
                  <th className="numeric">Governadores</th>
                </tr>
              </thead>
              <tbody>
                {names
                  .filter((p) => p.toLowerCase().includes(q.toLowerCase()))
                  .map((p) => (
                    <tr key={p}>
                      <td>
                        <Link
                          href={`/partido/${encodeURIComponent(p)}?turno=${round}`}
                        >
                          {p} <ArrowUpRight size={12} />
                        </Link>
                      </td>
                      {[
                        ["federal-deputy"],
                        ["state-deputy", "district-deputy"],
                        ["senate"],
                        ["governor"],
                      ].map((os, i) => {
                        const results = catalog.results.filter(
                          (r) => r.data && os.includes(r.data.office),
                        );
                        const complete =
                          results.length === 27 &&
                          results.every(
                            (r) =>
                              r.status === "ok" && r.data?.state === "final",
                          );
                        const count = catalog.candidates.filter(
                          (c) =>
                            c.party === p &&
                            os.includes(c.office) &&
                            electedStatus(c.status),
                        ).length;
                        return (
                          <td className="numeric mono" key={i}>
                            {results.length
                              ? `${number(count)}${complete ? "" : "*"}`
                              : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!names.length && <Empty />}
          <p className="footnote">
            * Contagem parcial dos recortes disponíveis. Não representa a
            composição final. Ausência de dados é exibida como —.
          </p>
        </section>
      )}
    </>
  );
}
export default function Portal(p: PortalProps) {
  const { view, round, interval, simulation, uf = "br" } = p;
  const [office, setOffice] = useState<Office>(p.office ?? "president");
  const router = useRouter();
  const isResults = ["home", "president", "state", "municipality"].includes(
    view,
  );
  const resultApi = useApi<ResultsEnvelope>(
    isResults && !(view === "municipality" && !p.municipalityCode)
      ? `/api/results/${office}/${uf}${p.municipalityCode ? `/${p.municipalityCode}` : ""}?turno=${round}`
      : null,
    interval,
    office === (p.office ?? "president") ? p.initial : undefined,
  );
  const result = resultApi.data?.data ?? null;
  const needStates = ["home", "president", "states", "candidate"].includes(
    view,
  );
  const stateApi = useApi<ResultsEnvelope[]>(
    needStates ? `/api/results/states/president?turno=${round}` : null,
    interval,
  );
  const catalogApi = useApi<Catalog>(
    ["parties", "party"].includes(view) ? `/api/catalog?turno=${round}` : null,
    Math.max(interval, 60000),
  );
  const candidateApi = useApi<{
    candidate: CandidateResult | null;
    envelope: ResultsEnvelope | null;
  }>(
    view === "candidate" ? `/api/candidate/${p.id}?turno=${round}` : null,
    interval,
  );
  const candidate = candidateApi.data?.candidate;
  const selectedEnvelope = candidateApi.data?.envelope ?? undefined;
  const titles: Record<View, string> = {
    home: "O voto de milhões. Cada resultado, aqui.",
    president: "Presidente da República",
    states: "Resultados por estado",
    office: p.office ? offices[p.office].label : "Resultados",
    state: stateName(uf),
    municipalities: `Municípios de ${stateName(uf)}`,
    municipality: p.municipalityName ?? "Resultado municipal",
    parties: "Partidos políticos",
    party: p.id ?? "Partido",
    candidate: candidate?.ballotName ?? "Resultado do candidato",
    about: "Sobre os dados",
  };
  function selectOffice(o: Office) {
    setOffice(o);
    if (view === "state") {
      const paths: Partial<Record<Office, string>> = {
        governor: "governador",
        senate: "senado",
        "federal-deputy": "deputado-federal",
        "state-deputy": "deputado-estadual",
        "district-deputy": "deputado-distrital",
      };
      router.push(
        `/estado/${uf}${paths[o] ? `/${paths[o]}` : ""}?turno=${round}`,
      );
    }
  }
  return (
    <>
      <div className="breadcrumb">
        <Link href="/">Brasil</Link>
        {view !== "home" && (
          <>
            <ChevronRight size={12} />
            <span>
              {view === "state" || view === "municipality"
                ? stateName(uf)
                : titles[view]}
            </span>
          </>
        )}
        <span className="breadcrumb-edition">ELEIÇÕES GERAIS · 2026</span>
      </div>
      {simulation && (
        <div className="demo-notice">
          <Info size={14} />
          <strong>DADOS DE DEMONSTRAÇÃO</strong>
          <span>Simulado público do TSE. Não são resultados das eleições.</span>
          <Link href="/sobre-os-dados">
            Entenda <ArrowUpRight size={12} />
          </Link>
        </div>
      )}
      <div className={`page-heading ${view === "home" ? "home-heading" : ""}`}>
        <div>
          <div className="eyebrow">
            <span className="small-dot" />{" "}
            {view === "home" ? "ELEIÇÕES 2026" : "APURAÇÃO 2026"}{" "}
            <span className="eyebrow-separator">/</span>{" "}
            {uf === "br" ? "PANORAMA NACIONAL" : stateName(uf).toUpperCase()}
          </div>
          <h1>{titles[view]}</h1>
          <p>
            {view === "home"
              ? "Acompanhe a apuração de todo o Brasil. Dados do Tribunal Superior Eleitoral."
              : view === "about"
                ? "A fonte, a metodologia e os cuidados por trás de cada número."
                : `Resultados ${simulation ? "do simulado" : "oficiais"} · ${round}º turno · Fonte: TSE`}
          </p>
        </div>
        {view !== "about" && <RoundSelector round={round} />}
      </div>
      {view === "about" ? (
        <About interval={interval} simulation={simulation} />
      ) : (
        <>
          {isResults && (
            <>
              {resultApi.error && <DataError onRetry={resultApi.refresh} />}
              <ElectionProgress
                result={result}
                title={
                  uf === "br"
                    ? "Apuração nacional"
                    : `Apuração ${view === "municipality" ? "municipal" : "estadual"}`
                }
              />
              <LastUpdated envelope={resultApi.data} />
            </>
          )}
          {(view === "home" || view === "president") && (
            <>
              <div className="main-grid">
                <section className="president-panel panel">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">RESULTADO NACIONAL</span>
                      <h2>Presidente da República</h2>
                    </div>
                    <span className="badge neutral">{round}º TURNO</span>
                  </div>
                  <CandidateList
                    envelope={resultApi.data}
                    limit={view === "home" ? 5 : undefined}
                    round={round}
                  />
                  <div className="candidate-disclaimer">
                    <ShieldCheck size={13} /> Situação eleitoral informada
                    exclusivamente pelo TSE.
                  </div>
                  {view === "home" && (
                    <Link
                      className="panel-link"
                      href={`/presidente?turno=${round}`}
                    >
                      Ver resultado completo <ArrowUpRight size={15} />
                    </Link>
                  )}
                </section>
                <BrazilMap results={stateApi.data} round={round} />
              </div>
              {view === "president" && (
                <div className="section-spacer">
                  <StateTable results={stateApi.data} round={round} />
                </div>
              )}
            </>
          )}
          {view === "home" && (
            <>
              <SectionTitle
                title="Governos estaduais"
                sub="EXECUTIVO"
                href={`/governadores?turno=${round}`}
              />
              <StateResultCards
                office="governor"
                round={round}
                limit={3}
                interval={interval}
              />
              <SectionTitle
                title="Senado Federal"
                sub="LEGISLATIVO"
                href={`/senado?turno=${round}`}
              />
              <StateResultCards
                office="senate"
                round={round}
                limit={3}
                interval={interval}
              />
              <div className="legislative-grid">
                {[
                  [
                    "/camara",
                    "Câmara dos Deputados",
                    "Deputados federais",
                    "federal-deputy",
                  ],
                  [
                    "/assembleias",
                    "Assembleias Legislativas",
                    "Deputados estaduais e distritais",
                    "state-deputy",
                  ],
                ].map(([href, title, desc]) => (
                  <Link
                    key={href}
                    className="legislative-card panel"
                    href={`${href}?turno=${round}`}
                  >
                    <Landmark size={23} />
                    <div>
                      <span className="eyebrow">ELEIÇÃO PROPORCIONAL</span>
                      <h2>{title}</h2>
                      <p>{desc} · Consulte os resultados por UF</p>
                    </div>
                    <ArrowUpRight size={21} />
                  </Link>
                ))}
              </div>
              <SectionTitle
                title="O retrato da votação"
                sub="ESTATÍSTICAS NACIONAIS"
              />
              <ElectionStats result={result} />
              {result && (
                <VoteBreakdown
                  result={result}
                  history={resultApi.data?.history ?? []}
                />
              )}
            </>
          )}
          {view === "office" && (
            <>
              <div className="notice">
                <Info size={16} />
                <span>
                  {p.office === "senate"
                    ? "As vagas são informadas pelo TSE em cada recorte. Apenas situações oficiais identificam os eleitos."
                    : p.office?.includes("deputy")
                      ? "Nas eleições proporcionais, a votação nominal não define sozinha os eleitos. Consulte a distribuição e as situações oficiais por UF."
                      : "Selecione um estado para acompanhar os candidatos e a situação oficial."}
                </span>
              </div>
              <StateResultCards
                office={p.office ?? "governor"}
                round={round}
                interval={interval}
              />
            </>
          )}
          {view === "states" && (
            <>
              <StateDirectory
                round={round}
                interval={interval}
                presidentResults={stateApi.data}
              />
              <div className="section-spacer">
                <BrazilMap results={stateApi.data} round={round} />
              </div>
            </>
          )}
          {(view === "state" || view === "municipality") && (
            <>
              <div
                className="office-tabs"
                role="group"
                aria-label="Selecionar cargo"
              >
                {(
                  [
                    "president",
                    "governor",
                    "senate",
                    "federal-deputy",
                    uf === "df" ? "district-deputy" : "state-deputy",
                  ] as Office[]
                ).map((o) => (
                  <button
                    key={o}
                    className={office === o ? "selected" : ""}
                    aria-pressed={office === o}
                    onClick={() => selectOffice(o)}
                  >
                    {o === "president" ? "Presidente" : offices[o].label}
                  </button>
                ))}
                {view === "state" && (
                  <Link href={`/estado/${uf}/municipios?turno=${round}`}>
                    Municípios <ArrowUpRight size={13} />
                  </Link>
                )}
              </div>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">
                      {view === "municipality"
                        ? p.municipalityName
                        : stateName(uf)}
                    </span>
                    <h2>{offices[office].label}</h2>
                  </div>
                  <ResultsStatus result={result} />
                </div>
                {office === "senate" && (
                  <div className="notice">
                    Vagas em disputa informadas pelo TSE:{" "}
                    <strong>{number(result?.seats)}</strong>. As posições não
                    atribuem vagas.
                  </div>
                )}
                {office.includes("deputy") ? (
                  result?.candidates.length ? (
                    <CandidateTable
                      candidates={result.candidates}
                      round={round}
                    />
                  ) : resultApi.loading ? (
                    <Skeleton />
                  ) : (
                    <Empty message={resultApi.data?.message ?? undefined} />
                  )
                ) : (
                  <CandidateList envelope={resultApi.data} round={round} />
                )}
              </section>
              {office.includes("deputy") && result && (
                <Proportional result={result} />
              )}
              <SectionTitle
                title="Estatísticas da votação"
                sub="RECORTE SELECIONADO"
              />
              <ElectionStats result={result} />
              {result && (
                <VoteBreakdown
                  result={result}
                  history={resultApi.data?.history ?? []}
                />
              )}
              <div className="data-source">
                {result && (
                  <a href={result.sourceUrl} target="_blank" rel="noreferrer">
                    Consultar arquivo oficial deste resultado{" "}
                    <ArrowUpRight size={14} />
                  </a>
                )}
              </div>
            </>
          )}
          {view === "municipalities" && (
            <MunicipalityBrowser uf={uf} round={round} interval={interval} />
          )}
          {(view === "party" || view === "parties") && (
            <>
              {catalogApi.error && <DataError onRetry={catalogApi.refresh} />}
              <Parties
                catalog={catalogApi.data}
                party={view === "party" ? p.id : undefined}
                round={round}
              />
            </>
          )}
          {view === "candidate" && (
            <>
              {candidateApi.error && (
                <DataError onRetry={candidateApi.refresh} />
              )}{" "}
              {candidateApi.loading && !candidate ? (
                <Skeleton />
              ) : !candidate ? (
                <Empty message="Candidatura não encontrada nos arquivos disponíveis para este turno." />
              ) : (
                <>
                  <section className="candidate-detail panel">
                    <CandidateAvatar candidate={candidate} />
                    <div>
                      <span className="eyebrow">
                        {offices[candidate.office].label} ·{" "}
                        {stateName(candidate.territory)}
                      </span>
                      <h2>{candidate.ballotName}</h2>
                      <p>{candidate.name}</p>
                      <span className="party">{candidate.party}</span>{" "}
                      <span className="mono">{candidate.number}</span>
                      {candidate.federation && <p>{candidate.federation}</p>}
                      {candidate.coalition && <p>{candidate.coalition}</p>}
                      <p>
                        Situação oficial:{" "}
                        <strong>
                          {candidate.status ??
                            "Informação ainda não disponível"}
                        </strong>
                      </p>
                      {candidate.replacedCandidates.length > 0 && (
                        <p>
                          Candidatura substituída:{" "}
                          {candidate.replacedCandidates
                            .map((c) => `${c.ballotName} (${c.party})`)
                            .join(", ")}
                        </p>
                      )}
                      <p>
                        Destinação dos votos:{" "}
                        {candidate.voteDestination ??
                          "Informação ainda não disponível"}
                      </p>
                    </div>
                    <div className="candidate-detail-votes">
                      <strong>{percent(candidate.percentage)}</strong>
                      <span>{number(candidate.votes)} votos</span>
                    </div>
                  </section>
                  <LastUpdated envelope={selectedEnvelope} />
                  {candidate.office === "president" ? (
                    <>
                      <div className="section-spacer">
                        <BrazilMap
                          results={stateApi.data}
                          round={round}
                          candidateId={candidate.officialId}
                        />
                      </div>
                      <StateTable
                        results={stateApi.data}
                        round={round}
                        candidateId={candidate.officialId}
                      />
                    </>
                  ) : (
                    <CandidateMunicipalResults
                      candidate={candidate}
                      round={round}
                      interval={interval}
                    />
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
      <div className="source-strip">
        <ShieldCheck size={16} />
        <span>Dados do TSE. Sem projeções. Sem preferência política.</span>
        <Link href="/sobre-os-dados">
          Conheça a metodologia <ArrowUpRight size={13} />
        </Link>
      </div>
    </>
  );
}
function StateDirectory({
  round,
  interval,
  presidentResults,
}: {
  round: number;
  interval: number;
  presidentResults?: ResultsEnvelope[];
}) {
  const governors = useApi<ResultsEnvelope[]>(
      `/api/results/states/governor?turno=${round}`,
      interval,
    ),
    senate = useApi<ResultsEnvelope[]>(
      `/api/results/states/senate?turno=${round}`,
      interval,
    );
  const [q, setQ] = useState(""),
    [region, setRegion] = useState("");
  return (
    <>
      <div className="filters">
        <label className="input-search">
          <Search size={16} />
          <input
            aria-label="Buscar estado"
            placeholder="Buscar estado ou UF"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <select
          aria-label="Filtrar região"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="">Todas as regiões</option>
          {["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>
      <div className="state-cards">
        {states
          .filter(
            (s) =>
              `${s.name} ${s.uf}`.toLowerCase().includes(q.toLowerCase()) &&
              (!region || s.region === region),
          )
          .map((s) => {
            const i = states.indexOf(s);
            return (
              <Link
                className="state-card panel"
                href={`/estado/${s.uf}?turno=${round}`}
                key={s.uf}
              >
                <div className="state-card-top">
                  <span className="uf-badge">{s.uf.toUpperCase()}</span>
                  <strong>{s.name}</strong>
                  <ArrowUpRight size={15} />
                </div>
                <div className="state-card-progress">
                  <span>Apuração presidencial</span>
                  <b>
                    {percent(presidentResults?.[i]?.data?.processedPercentage)}
                  </b>
                </div>
                {[
                  ["Presidente", presidentResults?.[i]],
                  ["Governador", governors.data?.[i]],
                  ["Senado", senate.data?.[i]],
                ].map(([label, raw]) => {
                  const r = raw as ResultsEnvelope | undefined;
                  return (
                    <div className="state-candidate" key={String(label)}>
                      <span>
                        {String(label)}
                        <small>
                          {leadingCandidate(r?.data)?.ballotName ??
                            "Ainda não disponível"}
                        </small>
                      </span>
                      <b>{percent(leadingCandidate(r?.data)?.percentage)}</b>
                    </div>
                  );
                })}
                <span className="state-card-bottom">
                  Abrir estado <ArrowUpRight size={12} />
                </span>
              </Link>
            );
          })}
      </div>
    </>
  );
}
function CandidateMunicipalResults({
  candidate,
  round,
  interval,
}: {
  candidate: CandidateResult;
  round: number;
  interval: number;
}) {
  const [q, setQ] = useState(""),
    [selected, setSelected] = useState<string>("");
  const municipalities = useApi<Municipality[]>(
    `/api/catalog?type=municipalities&turno=${round}`,
    3600000,
  );
  const results = useApi<ResultsEnvelope>(
    selected
      ? `/api/results/${candidate.office}/${candidate.territory}/${selected}?turno=${round}`
      : null,
    interval,
  );
  const c = results.data?.data?.candidates.find(
    (c) => c.officialId === candidate.officialId,
  );
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Votação por município</h2>
      </div>
      <div className="filters">
        <label className="input-search">
          <Search size={15} />
          <input
            aria-label="Filtrar municípios"
            placeholder="Filtrar municípios"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <select
          aria-label="Selecionar município"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Selecione um município</option>
          {municipalities.data
            ?.filter(
              (m) =>
                m.uf === candidate.territory &&
                m.name.toLowerCase().includes(q.toLowerCase()),
            )
            .map((m) => (
              <option value={m.code} key={m.code}>
                {m.name}
              </option>
            ))}
        </select>
      </div>
      {selected ? (
        results.loading ? (
          <Skeleton />
        ) : c ? (
          <div className="inline-stats">
            <span>
              Votos <strong>{number(c.votes)}</strong>
            </span>
            <span>
              Percentual TSE <strong>{percent(c.percentage)}</strong>
            </span>
            <span>
              Apuração{" "}
              <strong>
                {percent(results.data?.data?.processedPercentage)}
              </strong>
            </span>
          </div>
        ) : (
          <Empty message={results.data?.message ?? undefined} />
        )
      ) : (
        <p className="muted padded">
          Selecione um município para consultar a votação oficial desta
          candidatura.
        </p>
      )}
    </section>
  );
}
