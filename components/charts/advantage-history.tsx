"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { AdvantageHistory } from "@/lib/election/advantage";
import { number, time } from "@/lib/utils/format";
export default function AdvantageHistoryChart({
  history,
}: {
  history: AdvantageHistory;
}) {
  const a = history.reference.ballotName,
    b = history.opponent.ballotName;
  return (
    <div className="advantage-history">
      <h3>Evolução da diferença</h3>
      <p>
        Comparação fixa: {a} − {b}. Acima de zero: {a} à frente. Abaixo de zero:{" "}
        {b} à frente.
      </p>
      <div
        role="img"
        aria-label={`Histórico da diferença de votos entre ${a} e ${b}`}
      >
        <ResponsiveContainer width="100%" height={150}>
          <LineChart
            data={history.points}
            margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
          >
            <CartesianGrid stroke="#ffffff08" vertical={false} />
            <XAxis
              dataKey="time"
              tickFormatter={time}
              tick={{ fill: "#aab4b1", fontSize: 9 }}
              minTickGap={24}
            />
            <YAxis
              domain={[
                (min: number) => Math.min(0, min),
                (max: number) => Math.max(0, max),
              ]}
              tickFormatter={number}
              tick={{ fill: "#aab4b1", fontSize: 9 }}
              width={72}
            />
            <Tooltip
              labelFormatter={(v) => time(String(v))}
              formatter={(v) => `${number(Number(v))} votos`}
              contentStyle={{
                background: "#191f20",
                border: "1px solid #303a37",
                color: "#eee",
              }}
            />
            <ReferenceLine y={0} stroke="#99afa4" strokeDasharray="3 3" />
            <Line
              type="linear"
              dataKey="difference"
              name="Diferença"
              stroke="#73c9b2"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="advantage-history-text">
        <summary>Dados do histórico em tabela</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Horário TSE</th>
                <th>
                  Diferença de votos ({a} − {b})
                </th>
              </tr>
            </thead>
            <tbody>
              {history.points.map((p) => (
                <tr key={p.time}>
                  <td>{time(p.time)}</td>
                  <td>{number(p.difference)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p>
        A evolução representa os resultados parciais divulgados pelo TSE em cada
        horário. Exibe apenas snapshots armazenados; períodos sem dados não são
        preenchidos.
      </p>
    </div>
  );
}
