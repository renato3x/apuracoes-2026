"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="panel empty">
      <h1>Não foi possível abrir esta página.</h1>
      <p>Tente novamente em alguns instantes.</p>
      <button onClick={reset}>Tentar novamente</button>
    </section>
  );
}
