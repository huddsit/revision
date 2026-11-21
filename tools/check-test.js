// Validates a test file against its diagrams.
// Run: node tools/check-test.js docs/tests/<id>.json
const fs = require("fs"), path = require("path");
const file = process.argv[2];
const t = JSON.parse(fs.readFileSync(file, "utf8"));
const dir = path.join(path.dirname(file), "..", "diagrams");
const svg = n => { const p = path.join(dir, n + ".svg"); return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null; };
let bad = 0; const err = (...m) => { console.log(...m); bad++; };
const ids = new Set();
for (const q of t.questions) {
  if (ids.has(q.id)) err("duplicate id", q.id); ids.add(q.id);
  if (!t.topics[q.t]) err("unknown topic", q.id, q.t);
  if (new Set(q.a).size !== q.a.length) err("duplicate answer", q.id);
  if (q.tf && !(q.a.includes("True") && q.a.includes("False"))) err("bad true/false", q.id);
  if (!q.tf && q.a.length < 2) err("too few answers", q.id);
  if (q.img && !svg(q.img)) err("missing diagram", q.id, q.img);
  if (q.mark && !(svg(q.img) || "").includes(`data-part="${q.mark}"`)) err("missing anchor", q.id, q.mark);
}
let auto = 0;
for (const [img, d] of Object.entries(t.diagrams || {})) {
  const s = svg(img); if (!s) { err("missing diagram", img); continue; }
  if (!t.topics[d.t]) err("unknown topic", img, d.t);
  for (const p in d.parts) if (!s.includes(`data-part="${p}"`)) err("missing anchor", img, p);
  auto += Object.keys(d.parts).length * (d.modes || ["name", "find"]).length;
}
for (const g of t.galleries || []) {
  if (!t.topics[g.t]) err("unknown topic", g.q, g.t);
  for (const i in g.items) { if (!svg(i)) err("missing diagram", i); auto++; }
}
console.log(`${bad} problems · ${t.questions.length} written questions · ${auto} generated from diagrams`);
process.exit(bad ? 1 : 0);
