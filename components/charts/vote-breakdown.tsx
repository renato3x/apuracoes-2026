"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { number, percent, time } from "@/lib/utils/format";
import type { ElectionResult, Snapshot } from "@/lib/tse/types";
export default function VoteBreakdown({
  result,
  history,
}: {
  result: ElectionResult;
  history: Snapshot[];
}) {
  const values = [
    { name: "Válidos", value: result.validVotes, color: "#73c9b2" },
    { name: "Brancos", value: result.blankVotes, color: "#9ca6b7" },
    { name: "Nulos", value: result.nullVotes, color: "#b8a68b" },
  ].filter((x) => x.value !== null);
  return (
    <div className="charts-grid">
      <section className="panel chart-panel">
        <div className="section-heading">
          <h2>Composição dos votos</h2>
          <span className="eyebrow">{result.territory.toUpperCase()}</span>
        </div>
        {values.length ? (
          <>
            <div
              className="chart"
              role="img"
              aria-label={values
                .map((v) => `${v.name}: ${number(v.value)}`)
                .join(", ")}
            >
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={values}
                  layout="vertical"
                  margin={{ left: 0, right: 24 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={65}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#aab4b1", fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(v) => number(Number(v))}
                    contentStyle={{
                      background: "#191f20",
                      border: "1px solid #303a37",
                      color: "#eee",
                    }}
                    cursor={{ fill: "#ffffff05" }}
                  />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={20}>
                    {values.map((v) => (
                      <Cell key={v.name} fill={v.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="inline-stats">
              {values.map((v) => (
                <span key={v.name}>
                  {v.name}
                  <strong>{number(v.value)}</strong>
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="muted">Informação ainda não disponível.</p>
        )}
        <p className="footnote">
          Votos anulados: {number(result.annulledVotes)} · Anulados sub judice:{" "}
          {number(result.subJudiceVotes)}. Categorias preservadas conforme o
          TSE.
        </p>
      </section>
      <section className="panel chart-panel">
        <div className="section-heading">
          <h2>Evolução da totalização</h2>
          <span className="badge neutral">HISTÓRICO</span>
        </div>
        {history.length >= 2 ? (
          <div
            className="chart"
            role="img"
            aria-label="Evolução do percentual de seções totalizadas"
          >
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={history}>
                <CartesianGrid stroke="#ffffff08" />
                <XAxis
                  dataKey="time"
                  tickFormatter={time}
                  tick={{ fill: "#aab4b1", fontSize: 10 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#aab4b1", fontSize: 10 }}
                  width={36}
                />
                <Tooltip
                  labelFormatter={(v) => time(String(v))}
                  formatter={(v) => percent(Number(v))}
                  contentStyle={{
                    background: "#191f20",
                    border: "1px solid #303a37",
                  }}
                />
                <Line
                  dataKey="processedPercentage"
                  name="Seções totalizadas"
                  stroke="#73c9b2"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="history-empty">
            <span>Sem série histórica disponível</span>
            <p>
              O histórico aparece após a coleta de pelo menos dois snapshots
              persistentes.
            </p>
          </div>
        )}
        <p className="footnote">
          A evolução representa os resultados parciais divulgados pelo TSE em
          cada horário.
        </p>
      </section>
    </div>
  );
}
