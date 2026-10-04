import type { Office } from "@/lib/election/constants";
export type Mode = "simulation" | "production";
export interface CandidateResult {
  id: string;
  officialId: string;
  number: string;
  name: string;
  ballotName: string;
  party: string;
  federation: string | null;
  coalition: string | null;
  photo: string | null;
  votes: number | null;
  percentage: number | null;
  status: string | null;
  voteDestination: string | null;
  replacedCandidates: { name: string; ballotName: string; party: string }[];
  office: Office;
  territory: string;
}
export interface PartyAllocation {
  name: string;
  type: string;
  seats: number | null;
  parties: {
    party: string;
    nominalVotes: number | null;
    listVotes: number | null;
  }[];
}
export interface ElectionResult {
  election: string;
  round: 1 | 2;
  office: Office;
  territory: string;
  municipality: string | null;
  mode: Mode;
  sourceUrl: string;
  generation: string;
  updatedAt: string | null;
  generatedAt: string | null;
  processedSections: number | null;
  totalSections: number | null;
  unprocessedSections: number | null;
  processedPercentage: number | null;
  electorate: number | null;
  turnout: number | null;
  turnoutPercentage: number | null;
  abstentions: number | null;
  abstentionPercentage: number | null;
  validVotes: number | null;
  blankVotes: number | null;
  nullVotes: number | null;
  annulledVotes: number | null;
  subJudiceVotes: number | null;
  nominalVotes: number | null;
  listVotes: number | null;
  seats: number | null;
  electoralQuotient: number | null;
  allocations: PartyAllocation[];
  candidates: CandidateResult[];
  state: "partial" | "final" | "awaiting";
}
export interface ResultsEnvelope {
  data: ElectionResult | null;
  checkedAt: string;
  refreshInterval: number;
  mode: Mode;
  status: "ok" | "unavailable" | "error" | "stale";
  message: string | null;
  history: Snapshot[];
}
export interface Snapshot {
  time: string;
  processedPercentage: number | null;
  candidates: {
    id: string;
    name: string;
    percentage: number | null;
    votes: number | null;
  }[];
}
export interface Municipality {
  uf: string;
  code: string;
  ibgeCode: string | null;
  name: string;
  slug: string;
  capital: boolean;
}
