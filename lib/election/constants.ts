export const states = [
  ["ac", "Acre", "Norte"],
  ["al", "Alagoas", "Nordeste"],
  ["ap", "Amapá", "Norte"],
  ["am", "Amazonas", "Norte"],
  ["ba", "Bahia", "Nordeste"],
  ["ce", "Ceará", "Nordeste"],
  ["df", "Distrito Federal", "Centro-Oeste"],
  ["es", "Espírito Santo", "Sudeste"],
  ["go", "Goiás", "Centro-Oeste"],
  ["ma", "Maranhão", "Nordeste"],
  ["mt", "Mato Grosso", "Centro-Oeste"],
  ["ms", "Mato Grosso do Sul", "Centro-Oeste"],
  ["mg", "Minas Gerais", "Sudeste"],
  ["pa", "Pará", "Norte"],
  ["pb", "Paraíba", "Nordeste"],
  ["pr", "Paraná", "Sul"],
  ["pe", "Pernambuco", "Nordeste"],
  ["pi", "Piauí", "Nordeste"],
  ["rj", "Rio de Janeiro", "Sudeste"],
  ["rn", "Rio Grande do Norte", "Nordeste"],
  ["rs", "Rio Grande do Sul", "Sul"],
  ["ro", "Rondônia", "Norte"],
  ["rr", "Roraima", "Norte"],
  ["sc", "Santa Catarina", "Sul"],
  ["sp", "São Paulo", "Sudeste"],
  ["se", "Sergipe", "Nordeste"],
  ["to", "Tocantins", "Norte"],
].map(([uf, name, region]) => ({ uf, name, region }));
export const offices = {
  president: {
    code: "1",
    label: "Presidente da República",
    path: "presidente",
  },
  governor: { code: "3", label: "Governador", path: "governadores" },
  senate: { code: "5", label: "Senador", path: "senado" },
  "federal-deputy": { code: "6", label: "Deputado Federal", path: "camara" },
  "state-deputy": {
    code: "7",
    label: "Deputado Estadual",
    path: "assembleias",
  },
  "district-deputy": {
    code: "8",
    label: "Deputado Distrital",
    path: "assembleias",
  },
} as const;
export type Office = keyof typeof offices;
export function isOffice(x: string): x is Office {
  return x in offices;
}
export const stateName = (uf: string) =>
  uf === "br"
    ? "Brasil"
    : (states.find((s) => s.uf === uf)?.name ?? uf.toUpperCase());
export const slugify = (x: string) =>
  x
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const electedStatus = (s: string | null) =>
  !!s && /^eleito(?:$|\s)/i.test(s);

// A liderança visual considera apenas votos válidos e nunca resolve empates.
export function leadingCandidate(
  result: import("@/lib/tse/types").ElectionResult | undefined | null,
) {
  const eligible =
    result?.candidates.filter(
      (c) => c.voteDestination === "Válido" && c.votes !== null && c.votes > 0,
    ) ?? [];
  if (!eligible.length) return null;
  const top = Math.max(...eligible.map((c) => c.votes!));
  const leaders = eligible.filter((c) => c.votes === top);
  return leaders.length === 1 ? leaders[0] : null;
}
