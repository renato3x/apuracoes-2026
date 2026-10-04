import type { PortalProps } from "@/components/election/portal";
import { states, type Office } from "./constants";
export function resolvePath(path: string[]): Partial<PortalProps> | null {
  if (!path.length) return { view: "home" };
  const [first, uf, sub, last] = path;
  const simple: Record<string, PortalProps["view"]> = {
    presidente: "president",
    estados: "states",
    partidos: "parties",
    "sobre-os-dados": "about",
  };
  if (path.length === 1 && simple[first]) return { view: simple[first] };
  const officePaths: Record<string, Office> = {
    governadores: "governor",
    senado: "senate",
    camara: "federal-deputy",
    assembleias: "state-deputy",
  };
  if (path.length === 1 && officePaths[first])
    return { view: "office", office: officePaths[first] };
  if (["partido", "candidato"].includes(first) && path.length === 2) {
    try {
      return {
        view: first === "partido" ? "party" : "candidate",
        id: decodeURIComponent(uf),
      };
    } catch {
      return null;
    }
  }
  if (first !== "estado" || !states.some((s) => s.uf === uf) || path.length > 4)
    return null;
  if (path.length === 2) return { view: "state", uf };
  if (path.length === 3 && sub === "municipios")
    return { view: "municipalities", uf };
  if (path.length === 4 && sub === "municipio")
    return { view: "municipality", uf, id: last };
  const subs: Record<string, Office> = {
    presidente: "president",
    governador: "governor",
    senado: "senate",
    "deputado-federal": "federal-deputy",
    "deputado-estadual": "state-deputy",
    "deputado-distrital": "district-deputy",
  };
  if (
    path.length === 3 &&
    subs[sub] &&
    !(uf === "df" && sub === "deputado-estadual") &&
    !(uf !== "df" && sub === "deputado-distrital")
  )
    return { view: "state", uf, office: subs[sub] };
  return null;
}
