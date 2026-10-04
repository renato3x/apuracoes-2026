import { Suspense } from "react";
import Link from "next/link";
import About from "@/components/election/about";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Portal, { type PortalProps } from "@/components/election/portal";
import { settings } from "@/lib/tse/endpoints";
import { getResult, getMunicipalities } from "@/lib/tse/client";
import { offices, stateName } from "@/lib/election/constants";
import { resolvePath } from "@/lib/election/routing";
export const revalidate = 0;
type Props = {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<{ turno?: string }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path = [] } = await params;
  const parsed = resolvePath(path);
  const title = !path.length
    ? "Eleições 2026 — Apuração do Brasil"
    : parsed?.uf
      ? `Apuração ${stateName(parsed.uf)} 2026 — ${parsed.office ? offices[parsed.office].label : "Presidente, Governador, Senado e Deputados"}`
      : parsed?.office
        ? `Apuração ${offices[parsed.office].label} 2026`
        : ({
            presidente: "Apuração Presidente 2026 — Resultados",
            estados: "Apuração por Estado 2026",
            partidos: "Partidos — Resultados 2026",
            "sobre-os-dados": "Sobre os dados e metodologia",
          }[path[0]] ?? "Resultados eleitorais 2026");
  return {
    title,
    alternates: { canonical: `/${path.join("/")}` },
    openGraph: { title },
    robots:
      settings().mode === "simulation"
        ? { index: false, follow: true }
        : undefined,
  };
}
export default async function Page({ params, searchParams }: Props) {
  const [{ path = [] }, { turno }] = await Promise.all([params, searchParams]);
  const route = resolvePath(path);
  if (!route) notFound();
  const s = settings(),
    round: 1 | 2 = turno === "2" ? 2 : 1;
  const p = {
    ...route,
    round,
    interval: s.interval,
    simulation: s.mode === "simulation",
  } as PortalProps;
  if (p.view === "about")
    return (
      <>
        <div className="breadcrumb">
          <Link href="/">Brasil</Link>
          <span> / Sobre os dados</span>
        </div>
        {p.simulation && (
          <div className="demo-notice">
            <strong>DADOS DE DEMONSTRAÇÃO</strong>
            <span>Simulado público do TSE.</span>
          </div>
        )}
        <div className="page-heading">
          <div>
            <span className="eyebrow">APURAÇÃO 2026 / TRANSPARÊNCIA</span>
            <h1>Sobre os dados</h1>
            <p>A fonte, a metodologia e os cuidados por trás de cada número.</p>
          </div>
        </div>
        <About interval={s.interval} simulation={p.simulation} />
      </>
    );
  if (p.view === "municipality") {
    try {
      const m = (await getMunicipalities(round)).find(
        (m) => m.uf === p.uf && (m.slug === p.id || m.code === p.id),
      );
      if (m) {
        p.municipalityCode = m.code;
        p.municipalityName = m.name;
      } else notFound();
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_HTTP_ERROR")) throw e;
      return (
        <Portal
          {...p}
          municipalityName="Município — configuração indisponível"
          initial={{
            data: null,
            mode: s.mode,
            checkedAt: new Date().toISOString(),
            refreshInterval: s.interval,
            status: "error",
            message:
              "Não foi possível consultar a configuração oficial de municípios neste momento.",
            history: [],
          }}
        />
      );
    }
  }
  return (
    <Suspense
      fallback={
        <div
          className="page-skeleton"
          role="status"
          aria-label="Carregando resultados"
        />
      }
    >
      <ResultPage p={p} pageKey={`${path.join("/")}:${round}`} />
    </Suspense>
  );
}
async function ResultPage({ p, pageKey }: { p: PortalProps; pageKey: string }) {
  if (["home", "president", "state", "municipality"].includes(p.view))
    p.initial = await getResult(
      p.office ?? "president",
      p.uf ?? "br",
      p.round,
      p.municipalityCode,
    );
  return <Portal key={pageKey} {...p} />;
}
