import Link from "next/link";
export default function NotFound() {
  return (
    <section className="panel empty">
      <span className="eyebrow">404</span>
      <h1>Página não encontrada</h1>
      <p>Este território, cargo ou endereço não existe no portal.</p>
      <Link href="/">Voltar ao panorama nacional →</Link>
    </section>
  );
}
