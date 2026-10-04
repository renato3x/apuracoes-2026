import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Apuração 2026 — Resultados eleitorais com dados do TSE";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 90,
        background: "#101414",
        color: "#f0f4f2",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 25, color: "#73c9b2", letterSpacing: 5 }}>
        ELEIÇÕES GERAIS · BRASIL
      </div>
      <div style={{ fontSize: 95, fontWeight: 700, marginTop: 35 }}>
        APURAÇÃO 2026
      </div>
      <div style={{ fontSize: 30, color: "#9ba9a3", marginTop: 30 }}>
        Cada voto. Cada estado. Dados do TSE.
      </div>
      <div
        style={{
          width: "100%",
          height: 4,
          background: "#73c9b2",
          marginTop: 65,
        }}
      />
    </div>,
    size,
  );
}
