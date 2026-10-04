import { readFile, writeFile } from "node:fs/promises";
import { geoMercator, geoPath } from "d3-geo";
const data = JSON.parse(await readFile("scripts/brazil.geojson", "utf8"));
const codes = {
  11: "ro",
  12: "ac",
  13: "am",
  14: "rr",
  15: "pa",
  16: "ap",
  17: "to",
  21: "ma",
  22: "pi",
  23: "ce",
  24: "rn",
  25: "pb",
  26: "pe",
  27: "al",
  28: "se",
  29: "ba",
  31: "mg",
  32: "es",
  33: "rj",
  35: "sp",
  41: "pr",
  42: "sc",
  43: "rs",
  50: "ms",
  51: "mt",
  52: "go",
  53: "df",
};
// A API IBGE usa anéis GeoJSON RFC7946; d3 espera o sentido oposto para polígonos < hemisfério.
for (const f of data.features) {
  const polygons =
    f.geometry.type === "Polygon"
      ? [f.geometry.coordinates]
      : f.geometry.coordinates;
  for (const polygon of polygons) for (const ring of polygon) ring.reverse();
}
const proj = geoMercator().fitExtent(
  [
    [18, 18],
    [542, 530],
  ],
  data,
);
const path = geoPath(proj);
const shapes = data.features.map((f) => ({
  uf: codes[f.properties.codarea],
  d: path(f),
  center: path.centroid(f),
}));
if (shapes.length !== 27 || shapes.some((s) => !s.uf))
  throw new Error("Esperadas 27 UFs");
await writeFile("components/maps/shapes.json", JSON.stringify(shapes));
