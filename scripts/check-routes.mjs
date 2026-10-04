import assert from "node:assert/strict";
const base = process.env.TEST_URL ?? "http://127.0.0.1:3000";
const routes = [
  "/",
  "/presidente",
  "/estados",
  "/governadores",
  "/senado",
  "/camara",
  "/assembleias",
  "/partidos",
  "/sobre-os-dados",
  "/estado/ce",
  "/estado/ce/governador",
  "/estado/ce/senado",
  "/estado/ac/deputado-federal",
  "/estado/ce/deputado-estadual",
  "/estado/df/deputado-distrital",
  "/estado/ce/municipios",
  "/estado/ce/municipio/fortaleza",
  "/presidente?turno=2",
  "/estado/ce/governador?turno=2",
  "/sitemap.xml",
  "/robots.txt",
  "/opengraph-image",
];
let count = 0;
for (const path of routes) {
  const r = await fetch(base + path, { signal: AbortSignal.timeout(45000) });
  assert.equal(r.status, 200, path);
  const body = await r.text();
  assert.ok(
    !body.includes("Application error:") &&
      !body.includes("Internal Server Error"),
    path,
  );
  count++;
}
for (const path of [
  "/estado/xx",
  "/estado/ce/deputado-distrital",
  "/estado/df/deputado-estadual",
  "/nao-existe",
]) {
  const r = await fetch(base + path);
  assert.equal(r.status, 404, path);
  count++;
}
const result = await (
  await fetch(base + "/api/results/president?turno=1")
).json();
assert.ok(["ok", "unavailable", "error", "stale"].includes(result.status));
assert.ok(result.checkedAt);
assert.ok(result.refreshInterval >= 10000);
if (result.data) {
  assert.equal(result.data.round, 1);
  assert.equal(result.data.office, "president");
  assert.equal(result.data.mode, result.mode);
  const c = result.data.candidates[0];
  if (c) {
    const candidate = await fetch(`${base}/candidato/${c.id}?turno=1`);
    assert.equal(candidate.status, 200);
    const payload = await (
      await fetch(`${base}/api/candidate/${c.id}?turno=1`)
    ).json();
    assert.equal(payload.candidate?.id, c.id);
    count += 2;
  }
}
for (const path of [
  "/api/results/president/XX",
  "/api/results/president?turno=3",
  "/api/results/governor",
])
  assert.equal((await fetch(base + path)).status, 400, path);
const second = await (
  await fetch(base + "/api/results/president?turno=2")
).json();
if (second.data) {
  assert.equal(second.data.round, 2);
  if (result.data) assert.notEqual(second.data.election, result.data.election);
}
const municipalities = await (
  await fetch(base + "/api/catalog?type=municipalities")
).json();
assert.ok(Array.isArray(municipalities));
assert.ok(municipalities.every((m) => /^\d{5}$/.test(m.code)));
const search = await (await fetch(base + "/api/search?q=Fortaleza")).json();
assert.ok(Array.isArray(search.items));
assert.ok(
  search.items.some(
    (i) => i.group === "Municípios" && i.name.toLowerCase() === "fortaleza",
  ),
);
const catalog = await (await fetch(base + "/api/catalog")).json();
const party = catalog.candidates?.[0]?.party;
if (party) {
  const page = await fetch(`${base}/partido/${encodeURIComponent(party)}`);
  assert.equal(page.status, 200);
  const escaped = party.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
      })[c],
  );
  assert.ok(
    (await page.text()).includes(`<h1>${escaped}</h1>`),
    "sigla partidária decodificada",
  );
  count++;
}
console.log(
  `${count} páginas verificadas; APIs, municípios, busca, candidaturas e isolamento de turnos passaram.`,
);
