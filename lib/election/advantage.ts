import type {
  CandidateResult,
  ElectionResult,
  Snapshot,
} from "@/lib/tse/types";

export interface AdvantageComparison {
  state: "lead" | "tie";
  kind: "leader" | "cut";
  upper: CandidateResult[];
  lower: CandidateResult[];
  pair: [CandidateResult, CandidateResult];
  upperPosition: number;
  lowerPosition: number;
  votesDifference: number;
  percentagePoints: number | null;
}
export type Advantage =
  | AdvantageComparison
  | {
      state: "awaiting" | "unavailable";
      kind: "leader" | "cut";
      message: string;
    };

const validCount = (n: number | null | undefined): n is number =>
  n != null && Number.isSafeInteger(n) && n >= 0;

/** Numeric comparison only: never determines election or applies tie-break rules. */
export function getLeaderAdvantage(
  result: ElectionResult | null | undefined,
): Advantage | null {
  if (!result || !["president", "governor", "senate"].includes(result.office))
    return null;
  const kind = result.office === "senate" ? "cut" : "leader";
  if (result.state === "awaiting")
    return {
      state: "awaiting",
      kind,
      message: "Aguardando apuração para comparar a votação.",
    };
  const unavailable = (message: string): Advantage => ({
    state: "unavailable",
    kind,
    message,
  });
  // Unknown destinations/counts cannot be silently discarded to establish a leader.
  if (
    result.candidates.some(
      (c) => !c.voteDestination && (c.votes === null || c.votes !== 0),
    )
  )
    return unavailable(
      "Classificação dos votos ainda incompleta para comparar candidaturas.",
    );
  const valid = result.candidates.filter((c) => c.voteDestination === "Válido");
  if (valid.some((c) => !validCount(c.votes)))
    return unavailable("Votação ainda incompleta para calcular a diferença.");
  const ranked = [...valid].sort(
    (a, b) => b.votes! - a.votes! || a.id.localeCompare(b.id),
  );
  let upperIndex = 0;
  if (kind === "cut") {
    if (!validCount(result.seats) || result.seats < 1)
      return unavailable("Número de vagas ainda não informado pelo TSE.");
    upperIndex = result.seats - 1;
  }
  if (ranked.length <= upperIndex + 1)
    return unavailable(
      "Candidaturas com votos válidos insuficientes para esta comparação.",
    );
  if (ranked[0].votes === 0)
    return unavailable("Ainda não há votos válidos para comparar.");
  const first = ranked[upperIndex],
    second = ranked[upperIndex + 1];
  const upper = ranked.filter((c) => c.votes === first.votes);
  const lower = ranked.filter((c) => c.votes === second.votes);
  const votesDifference = first.votes! - second.votes!;
  const percentages = [...upper, ...lower];
  const consistentPercentages =
    percentages.every(
      (c) => c.percentage !== null && Number.isFinite(c.percentage),
    ) &&
    upper.every((c) => c.percentage === first.percentage) &&
    lower.every((c) => c.percentage === second.percentage);
  return {
    state: votesDifference === 0 ? "tie" : "lead",
    kind,
    upper,
    lower,
    pair: [first, second],
    upperPosition: upperIndex + 1,
    lowerPosition: upperIndex + 2,
    votesDifference,
    percentagePoints: consistentPercentages
      ? first.percentage! - second.percentage!
      : null,
  };
}

export interface AdvantageHistory {
  reference: CandidateResult;
  opponent: CandidateResult;
  points: { time: string; difference: number | null }[];
}
/** Keep the pair's orientation stable so a change of leader crosses zero. */
export function buildAdvantageHistory(
  comparison: Advantage,
  history: Snapshot[],
): AdvantageHistory | null {
  if (
    comparison.kind !== "leader" ||
    (comparison.state !== "lead" && comparison.state !== "tie")
  )
    return null;
  const c = comparison;
  if (
    (c.state === "lead" && (c.upper.length !== 1 || c.lower.length !== 1)) ||
    (c.state === "tie" && c.upper.length !== 2)
  )
    return null;
  const [reference, opponent] = [...c.pair].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const byTime = new Map<string, { time: string; difference: number | null }>();
  for (const snapshot of history) {
    if (!Number.isFinite(Date.parse(snapshot.time))) continue;
    const a = snapshot.candidates.find((c) => c.id === reference.id)?.votes;
    const b = snapshot.candidates.find((c) => c.id === opponent.id)?.votes;
    byTime.set(snapshot.time, {
      time: snapshot.time,
      difference: validCount(a) && validCount(b) ? a - b : null,
    });
  }
  const points = [...byTime.values()].sort(
    (a, b) => Date.parse(a.time) - Date.parse(b.time),
  );
  if (points.filter((p) => p.difference !== null).length < 2) return null;
  return { reference, opponent, points };
}
