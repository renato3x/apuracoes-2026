"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  ArrowUpRight,
  Menu,
  X,
  ChartNoAxesColumnIncreasing,
  Command,
} from "lucide-react";
import { time } from "@/lib/utils/format";
import { useApi } from "@/components/election/use-api";
import type { ResultsEnvelope } from "@/lib/tse/types";
const links = [
  ["/", "Brasil"],
  ["/estados", "Estados"],
  ["/presidente", "Presidente"],
  ["/governadores", "Governadores"],
  ["/senado", "Senado"],
  ["/camara", "Câmara"],
  ["/assembleias", "Assembleias"],
];
export default function Header({
  simulation,
  interval,
}: {
  simulation: boolean;
  interval: number;
}) {
  const path = usePathname(),
    params = useSearchParams(),
    round = params.get("turno") === "2" ? 2 : 1;
  const [mobile, setMobile] = useState(false),
    [clock, setClock] = useState<string>("—"),
    [q, setQ] = useState(""),
    [items, setItems] = useState<
      { name: string; description: string; group: string; href: string }[]
    >([]),
    [busy, setBusy] = useState(false);
  const latest = useApi<ResultsEnvelope>(
    `/api/results/president?turno=${round}`,
    interval,
  );
  const live = !simulation && latest.data?.data?.state === "partial";
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null);
  const open = () => {
    dialog.current?.showModal();
    input.current?.focus();
  };
  useEffect(() => {
    const update = () => setClock(time(new Date().toISOString()));
    update();
    const t = setInterval(update, 1000);
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        open();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      clearInterval(t);
      document.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    if (q.trim().length < 2) {
      setItems([]);
      return;
    }
    const c = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&turno=${round}`,
          { signal: c.signal },
        );
        if (r.ok) setItems((await r.json()).items);
      } catch {
      } finally {
        setBusy(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [q, round]);
  return (
    <>
      <a className="skip" href="#main">
        Ir para o conteúdo
      </a>
      <header className="header">
        <div className="header-top wrap">
          <Link href="/" className="brand">
            <span className="brand-icon">
              <ChartNoAxesColumnIncreasing size={22} />
            </span>
            APURAÇÃO <span className="brand-year">2026</span>
          </Link>
          <span className={`badge ${simulation ? "demo" : "neutral"}`}>
            {simulation
              ? "SIMULADO TSE"
              : live
                ? "● AO VIVO"
                : "FONTE OFICIAL · TSE"}
          </span>
          <div className="header-right">
            <span className="header-updated">
              Última atualização <b>{time(latest.data?.checkedAt)}</b>
            </span>
            <span className="clock">
              {clock} <span>· Brasília</span>
            </span>
            <button
              className="search-trigger"
              aria-label="Buscar no portal"
              onClick={open}
            >
              <Search size={15} />
              <span>Buscar no portal</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="mobile-menu icon-button"
              aria-label="Abrir menu"
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
          </div>
        </div>
        <div className="mobile-source">
          <span>Fonte: TSE</span>
          <span>
            Última atualização (Brasil): <b>{time(latest.data?.checkedAt)}</b>
          </span>
        </div>
        <div className={`nav-wrap ${mobile ? "expanded" : ""}`}>
          <nav className="wrap nav" aria-label="Navegação principal">
            {links.map(([href, label]) => (
              <Link
                onClick={() => setMobile(false)}
                className={
                  (href === "/" ? path === "/" : path.startsWith(href))
                    ? "active"
                    : ""
                }
                href={`${href}?turno=${round}`}
                key={href}
              >
                {label}
              </Link>
            ))}
            <Link href={`/partidos?turno=${round}`} className="nav-party">
              Partidos <ArrowUpRight size={13} />
            </Link>
          </nav>
        </div>
      </header>
      <dialog ref={dialog} className="search-dialog" aria-label="Busca global">
        <div className="search-input">
          <Search size={20} />
          <input
            ref={input}
            aria-label="Busque candidato, estado ou município"
            placeholder="Busque candidato, estado ou município"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="icon-button"
            aria-label="Fechar busca"
            onClick={() => dialog.current?.close()}
          >
            <X size={19} />
          </button>
        </div>
        <div className="search-results">
          {q.length < 2 ? (
            <p>Digite pelo menos 2 caracteres para pesquisar.</p>
          ) : busy ? (
            <p>Consultando o índice oficial…</p>
          ) : items.length === 0 ? (
            <p>Nenhum resultado disponível.</p>
          ) : (
            ["Estados", "Candidatos", "Municípios"].map((group) => (
              <section key={group}>
                {items.some((x) => x.group === group) && (
                  <h3 className="eyebrow">{group}</h3>
                )}
                {items
                  .filter((x) => x.group === group)
                  .map((x) => (
                    <Link
                      key={x.href}
                      href={x.href}
                      onClick={() => dialog.current?.close()}
                    >
                      <span>
                        {x.name}
                        <small>{x.description}</small>
                      </span>
                      <ArrowUpRight size={16} />
                    </Link>
                  ))}
              </section>
            ))
          )}
        </div>
        <div className="dialog-bottom">
          <Command size={13} /> Pesquisa nos registros oficiais disponíveis{" "}
          <kbd>ESC</kbd>
        </div>
      </dialog>
    </>
  );
}
