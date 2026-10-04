import Link from "next/link";
import { ArrowUpRight, ChartNoAxesColumnIncreasing } from "lucide-react";
export default function Footer() {
  return (
    <footer className="footer wrap">
      <div>
        <Link href="/" className="brand">
          <ChartNoAxesColumnIncreasing size={20} /> APURAÇÃO{" "}
          <span className="brand-year">2026</span>
        </Link>
        <p>Dados oficiais fornecidos pelo Tribunal Superior Eleitoral (TSE).</p>
        <small>
          Este site não possui vínculo institucional com o Tribunal Superior
          Eleitoral.
        </small>
        <p className="footer-credit">
          Desenvolvido por{" "}
          <a
            href="https://github.com/renato3x"
            target="_blank"
            rel="noopener noreferrer"
          >
            renato3x <ArrowUpRight size={12} aria-hidden="true" />
          </a>
        </p>
      </div>
      <div className="footer-links">
        <Link href="/sobre-os-dados">Sobre os dados</Link>
        <Link href="/sobre-os-dados#metodologia">Metodologia</Link>
        <a
          href="https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados"
          target="_blank"
          rel="noreferrer"
        >
          Fonte dos dados <ArrowUpRight size={13} />
        </a>
      </div>
    </footer>
  );
}
