export const number = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("pt-BR");
export const percent = (n: number | null | undefined) =>
  n == null
    ? "—"
    : `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
export const time = (date: string | null | undefined) =>
  date
    ? new Date(date).toLocaleTimeString("pt-BR", {
        timeZone: "America/Fortaleza",
      })
    : "—";
