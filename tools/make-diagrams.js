// Draws the quiz diagrams as SVG into docs/diagrams/.
// Run: node tools/make-diagrams.js
// Each labellable part has an invisible anchor:
//   <circle data-part="stage" cx cy r="0" data-lx data-ly/>
// (cx,cy) is the point on the part; (lx,ly) is where the app puts the "?" / letter bubble.
// Keep bubbles at least 16 units inside the viewBox.
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "..", "docs", "diagrams");
fs.mkdirSync(OUT, { recursive: true });

// deterministic random so diagrams don't change between runs
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// r (optional): for small parts, the pointer draws a ring of this radius round the part instead of covering it
const A = (part, cx, cy, lx, ly, r) => `<circle data-part="${part}" cx="${cx}" cy="${cy}" r="0" data-lx="${lx}" data-ly="${ly}"${r ? ` data-r="${r}"` : ""}/>`;
function write(name, w, h, body, anchors = []) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="system-ui, sans-serif">\n${body}\n<g class="anchors">${anchors.join("")}</g>\n</svg>\n`;
  fs.writeFileSync(path.join(OUT, name + ".svg"), svg);
}
const circ = (x, y, r, fill, stroke = "#333", sw = 1.5) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

// ---------- particles ----------
function solidParticles(x0, y0, size, r, fill) {
  let s = ""; const n = Math.floor(size / (2 * r));
  const off = (size - n * 2 * r) / 2;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s += circ(x0 + off + r + 2 * r * i, y0 + off + r + 2 * r * j, r, fill);
  return s;
}
function placeRandom(rand, count, x0, y0, w, h, r, minGap, bias) {
  const pts = []; let tries = 0;
  while (pts.length < count && tries++ < 20000) {
    const u = bias ? Math.pow(rand(), bias) : rand();
    const p = { x: x0 + r + u * (w - 2 * r), y: y0 + r + rand() * (h - 2 * r) };
    if (pts.every(q => Math.hypot(q.x - p.x, q.y - p.y) >= minGap)) pts.push(p);
  }
  return pts;
}
function liquidParticles(rand, x0, y0, size, r, fill) {
  // closely packed but disordered: jittered grid with a few gaps
  let s = ""; const n = Math.floor(size / (2 * r));
  const off = (size - n * 2 * r) / 2; const pts = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (rand() < 0.12) continue;
    const p = { x: x0 + off + r + 2 * r * i + (rand() - 0.5) * r * 0.9, y: y0 + off + r + 2 * r * j + (rand() - 0.5) * r * 0.9 };
    p.x = Math.min(Math.max(p.x, x0 + r + 1), x0 + size - r - 1); p.y = Math.min(Math.max(p.y, y0 + r + 1), y0 + size - r - 1);
    if (pts.every(q => Math.hypot(q.x - p.x, q.y - p.y) >= 1.75 * r)) { pts.push(p); s += circ(p.x, p.y, r, fill); }
  }
  return s;
}
function gasParticles(rand, x0, y0, size, r, fill, count) {
  return placeRandom(rand, count, x0, y0, size, size, r, r * 4).map(p => circ(p.x, p.y, r, fill)).join("");
}
const YEL = "#ffe08a";

{ // states of matter, one per picture
  let r = rng(11);
  write("particles-solid", 200, 200, solidParticles(10, 10, 180, 12.5, YEL));
  write("particles-liquid", 200, 200, liquidParticles(r, 10, 10, 180, 12.5, YEL));
  write("particles-gas", 200, 200, gasParticles(rng(5), 10, 10, 180, 12.5, YEL, 6));
}

{ // changes of state
  const r = rng(3); const S = 100;
  const arrow = (x1, x2, y, col) => {
    const dir = x2 > x1 ? 1 : -1;
    return `<line x1="${x1}" y1="${y}" x2="${x2 - dir * 8}" y2="${y}" stroke="${col}" stroke-width="6"/>` +
      `<path d="M${x2},${y} l${-dir * 14},-9 v18 z" fill="${col}"/>`;
  };
  const label = (x, t) => `<text x="${x}" y="188" text-anchor="middle" font-size="17" font-weight="700" fill="#222">${t}</text>`;
  const body =
    solidParticles(10, 60, S, 8, YEL) +
    liquidParticles(r, 160, 60, S, 8, YEL) +
    gasParticles(rng(9), 310, 60, S, 8, YEL, 5) +
    label(60, "Solid") + label(210, "Liquid") + label(360, "Gas") +
    arrow(116, 154, 88, "#c92a2a") + arrow(266, 304, 88, "#c92a2a") +
    arrow(154, 116, 132, "#1c7ed6") + arrow(304, 266, 132, "#1c7ed6");
  write("changes", 420, 230, body, [
    A("melting", 135, 88, 135, 30), A("boiling", 285, 88, 285, 30),
    A("freezing", 135, 132, 110, 215), A("condensing", 285, 132, 260, 215)]);
}

{ // pure substance (compound) vs mixture
  const r = rng(21);
  const mol = (x, y, a) => { const dx = Math.cos(a) * 8, dy = Math.sin(a) * 8; return circ(x - dx, y - dy, 10, "#1c4fd8", "#0b2a80") + circ(x + dx, y + dy, 10, "#f5b800", "#a07800"); };
  const pts = placeRandom(r, 12, 15, 15, 270, 170, 22, 50);
  write("pure", 300, 200, `<rect x="5" y="5" width="290" height="190" fill="#fff" stroke="#222" stroke-width="2.5"/>` + pts.map(p => mol(p.x, p.y, r() * 6.3)).join(""));
  const r2 = rng(22); const pts2 = placeRandom(r2, 24, 15, 15, 270, 170, 10, 38);
  write("mixture", 300, 200, `<rect x="5" y="5" width="290" height="190" fill="#fff" stroke="#222" stroke-width="2.5"/>` +
    pts2.map((p, i) => i % 2 ? circ(p.x, p.y, 10, "#1c4fd8", "#0b2a80") : circ(p.x, p.y, 10, "#f5b800", "#a07800")).join(""));
}

{ // diffusion
  const frame = `<rect x="5" y="5" width="390" height="190" fill="#e7f5ff" stroke="#74c0fc" stroke-width="2.5"/>`;
  const dense = placeRandom(rng(31), 110, 8, 8, 384, 184, 6, 13.5, 2.6);
  write("diffusion", 400, 200, frame + dense.map(p => circ(p.x, p.y, 6, "#ff6b6b", "#c92a2a", 1)).join(""));
  const even = placeRandom(rng(32), 110, 8, 8, 384, 184, 6, 22);
  write("diffusion-even", 400, 200, frame + even.map(p => circ(p.x, p.y, 6, "#ff6b6b", "#c92a2a", 1)).join(""));
}

{ // dissolving: solute + solvent -> solution
  const beaker = x => `<path d="M${x},80 V230 Q${x},242 ${x + 12},242 H${x + 128} Q${x + 140},242 ${x + 140},230 V80" fill="none" stroke="#74c0fc" stroke-width="4"/>`;
  const water = (x, mixRand) => { let s = ""; for (let j = 0; j < 7; j++) for (let i = 0; i < 10; i++) {
    const cx = x + 13 + i * 13, cy = 232 - j * 13; const red = mixRand && mixRand() < 0.22;
    s += circ(cx, cy, 6, red ? "#e03131" : "#74c0fc", red ? "#a51111" : "#1c7ed6", 1); } return s; };
  let solute = ""; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) solute += circ(90 + i * 13, 22 + j * 13, 6, "#e03131", "#a51111", 1);
  const body = beaker(40) + water(40) + solute + beaker(230) + water(230, rng(41)) +
    `<line x1="190" y1="160" x2="214" y2="160" stroke="#222" stroke-width="3"/><path d="M224,160 l-12,-8 v16 z" fill="#222"/>`;
  write("dissolving", 400, 290, body, [
    A("solute", 96, 41, 30, 30), A("solvent", 85, 190, 110, 272), A("solution", 300, 190, 300, 272)]);
}

// ---------- cells ----------
const mito = (x, y, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})"><ellipse rx="13" ry="7" fill="#f4c27a" stroke="#8a5a12" stroke-width="1.5"/><path d="M-9,0 l3,-4 3,7 3,-7 3,7 3,-4" fill="none" stroke="#8a5a12" stroke-width="1.2"/></g>`;
const dot = (x, y, f = "#333") => `<circle cx="${x}" cy="${y}" r="2.6" fill="${f}"/>`;
const ribo = (x, y) => `<circle cx="${x}" cy="${y}" r="4" fill="#1d3b8f"/>`;   // ribosomes: bigger and darker than other dots

{ // animal cell
  const body =
    `<path d="M110,150 C100,80 180,50 240,60 C310,70 320,130 305,180 C290,240 220,255 160,240 C120,230 112,190 110,150 Z" fill="#fbc9c9" stroke="#b5474b" stroke-width="3"/>` +
    `<ellipse cx="170" cy="120" rx="36" ry="30" fill="#7a3b3b" stroke="#4d2020" stroke-width="2"/>` +
    mito(250, 110, 20) + mito(235, 205, -15) + mito(150, 205, 30) +
    [[140, 170], [200, 175], [270, 150], [215, 90], [130, 110], [185, 225], [255, 230], [280, 195], [210, 140]].map(([x, y]) => ribo(x, y)).join("");
  write("animal-cell", 400, 300, body, [
    A("nucleus", 170, 120, 40, 60), A("mitochondria", 250, 110, 360, 50), A("cytoplasm", 245, 165, 360, 125),
    A("ribosome", 140, 170, 40, 210, 9), A("membrane", 311, 160, 360, 215)]);
}

{ // plant cell
  const chl = [[125, 130, 90], [125, 170, 90], [125, 210, 90], [160, 238, 0], [210, 238, 0], [255, 238, 0], [280, 200, 90], [280, 150, 90], [280, 100, 90], [230, 66, 0], [185, 66, 0]];
  const body =
    `<rect x="98" y="38" width="204" height="224" rx="12" fill="#d9822b" stroke="#8a4b0f" stroke-width="2.5"/>` +
    `<rect x="111" y="51" width="178" height="198" rx="8" fill="#d3ecb0" stroke="#4d7a1f" stroke-width="2"/>` +
    `<rect x="150" y="92" width="118" height="132" rx="14" fill="#fdf6d8" stroke="#b9a56a" stroke-width="2"/>` +
    chl.map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="12" ry="6.5" transform="rotate(${r} ${x} ${y})" fill="#3f9c35" stroke="#24601d" stroke-width="1.5"/>`).join("") +
    `<ellipse cx="138" cy="80" rx="19" ry="15" fill="#7a3b3b" stroke="#4d2020" stroke-width="2"/>` +
    mito(255, 80, 10) + [[278, 225], [140, 230], [205, 80], [143, 150]].map(([x, y]) => ribo(x, y)).join("");
  write("plant-cell", 400, 300, body, [
    A("cellwall", 104, 240, 40, 262), A("membrane", 111, 112, 40, 120), A("nucleus", 138, 80, 40, 45),
    A("cytoplasm", 140, 190, 40, 190), A("vacuole", 210, 160, 360, 175), A("chloroplast", 280, 150, 360, 125),
    A("mitochondria", 255, 80, 360, 60), A("ribosome", 278, 225, 360, 240, 7)]);
}

{ // bacterium
  const pili = [[160, 110, 155, 92], [200, 110, 200, 90], [240, 110, 246, 92], [170, 200, 165, 218], [220, 200, 224, 218], [260, 198, 268, 214]]
    .map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#6b7a2a" stroke-width="2"/>`).join("");
  const body = pili +
    `<path d="M290,155 C310,135 325,175 345,155 S372,135 388,152" fill="none" stroke="#6b7a2a" stroke-width="3"/>` +
    `<rect x="130" y="110" width="160" height="90" rx="45" fill="#e6ebb5" stroke="#6b7a2a" stroke-width="6"/>` +
    `<rect x="142" y="122" width="136" height="66" rx="33" fill="#f8f1d6" stroke="#b0a050" stroke-width="2"/>` +
    `<path d="M175,150 C185,130 215,135 220,150 C228,170 250,160 245,145 C240,128 205,175 195,168 C185,160 230,140 235,165 C238,178 200,178 190,170" fill="none" stroke="#8e44ad" stroke-width="2.5"/>` +
    `<circle cx="160" cy="140" r="7" fill="none" stroke="#c2255c" stroke-width="2.5"/>` +
    [[165, 175], [258, 135], [262, 172], [210, 181], [230, 130]].map(([x, y]) => ribo(x, y)).join("");
  write("bacterium", 400, 300, body, [
    A("pili", 200, 90, 200, 35), A("cellwall", 131, 155, 40, 155), A("membrane", 250, 122, 310, 40),
    A("cytoplasm", 255, 168, 300, 270), A("dna", 220, 150, 210, 280), A("plasmid", 160, 140, 40, 90),
    A("ribosome", 165, 175, 40, 225, 9), A("flagellum", 345, 155, 365, 240)]);
}

{ // specialised cells (300 x 180)
  const W = 300, H = 180;
  // egg
  let r = rng(51), yolk = "";
  for (const p of placeRandom(r, 40, 95, 35, 110, 110, 2.5, 9)) if (Math.hypot(p.x - 150, p.y - 90) < 52 && Math.hypot(p.x - 135, p.y - 85) > 18) yolk += dot(p.x.toFixed(1), p.y.toFixed(1), "#d9a520");
  write("cell-egg", W, H, `<circle cx="150" cy="90" r="70" fill="#fdf3cf" stroke="#f0cf5a" stroke-width="12"/>` + yolk +
    `<circle cx="135" cy="85" r="14" fill="#6b3a2a"/>`, [A("coat", 101, 41, 35, 28), A("cytoplasm", 170, 115, 265, 150), A("nucleus", 135, 85, 265, 40)]);
  // sperm
  write("cell-sperm", W, H,
    `<path d="M138,90 C160,70 175,110 195,90 S230,70 250,90 S280,110 292,94" fill="none" stroke="#2b6c99" stroke-width="3"/>` +
    `<rect x="106" y="84" width="34" height="12" rx="6" fill="#7fbfe0" stroke="#2b6c99" stroke-width="2"/>` +
    `<ellipse cx="80" cy="90" rx="30" ry="20" fill="#bfe3f7" stroke="#2b6c99" stroke-width="2"/>` +
    `<ellipse cx="85" cy="90" rx="16" ry="11" fill="#2b6c99" opacity=".6"/>`,
    [A("head", 62, 80, 35, 30), A("midpiece", 123, 90, 123, 155), A("tail", 250, 90, 255, 150)]);
  // red blood cell
  write("cell-rbc", W, H, `<ellipse cx="150" cy="90" rx="95" ry="65" fill="#d8343a" stroke="#9e1b20" stroke-width="3"/><ellipse cx="150" cy="90" rx="55" ry="35" fill="#b5242a" opacity=".85"/>`);
  // nerve cell
  const branches = [[70, 90, 25, 40], [25, 40, 10, 25], [25, 40, 30, 18], [70, 90, 15, 95], [15, 95, 6, 80], [70, 90, 30, 145], [30, 145, 12, 160], [70, 90, 72, 30], [72, 30, 58, 14], [72, 30, 88, 14], [70, 90, 68, 155]]
    .map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#b5651d" stroke-width="3" stroke-linecap="round"/>`).join("");
  const ends = [[285, 55], [292, 90], [285, 125]].map(([x, y]) => `<line x1="250" y1="90" x2="${x}" y2="${y}" stroke="#b5651d" stroke-width="3"/><circle cx="${x}" cy="${y}" r="4.5" fill="#b5651d"/>`).join("");
  let myelin = ""; for (let x = 105; x < 240; x += 30) myelin += `<rect x="${x}" y="82" width="22" height="16" rx="7" fill="#f9e27d" stroke="#c9a92a" stroke-width="1.5"/>`;
  write("cell-nerve", W, H, branches + `<line x1="90" y1="90" x2="250" y2="90" stroke="#b5651d" stroke-width="5"/>` + myelin + ends +
    `<circle cx="70" cy="90" r="22" fill="#f4a259" stroke="#b5651d" stroke-width="2.5"/><circle cx="70" cy="90" r="8" fill="#7d3c98"/>`,
    [A("myelin", 146, 82, 150, 30), A("endings", 285, 55, 230, 25), A("nucleus", 70, 90, 40, 165)]);
  // muscle cell
  write("cell-muscle", W, H, `<path d="M15,90 C80,52 220,52 285,90 C220,128 80,128 15,90 Z" fill="#f0a3a8" stroke="#b04a55" stroke-width="2.5"/>` +
    `<path d="M60,82 H240 M50,98 H250" stroke="#d97a83" stroke-width="1.5" fill="none"/><ellipse cx="150" cy="90" rx="26" ry="7" fill="#8e3b8e"/>`);
  // ciliated epithelial cells
  let cil = ""; for (let x = 48; x <= 252; x += 6) cil += `<path d="M${x},70 q-4,-12 1,-24" fill="none" stroke="#a5604a" stroke-width="1.6"/>`;
  write("cell-ciliated", W, H, [45, 115, 185].map(x => `<rect x="${x}" y="70" width="70" height="100" fill="#fbd3c4" stroke="#b8735c" stroke-width="2"/><ellipse cx="${x + 35}" cy="135" rx="13" ry="10" fill="#c0504d"/>`).join("") + cil,
    [A("cilia", 232, 52, 265, 22)]);
  // root hair cell
  write("cell-roothair", W, H, `<path d="M30,55 H110 Q122,55 122,67 V75 H272 Q290,75 290,90 Q290,105 272,105 H122 V113 Q122,125 110,125 H30 Q18,125 18,113 V67 Q18,55 30,55 Z" fill="#f6e3b0" stroke="#b08a3c" stroke-width="3"/>` +
    `<rect x="62" y="66" width="50" height="48" rx="10" fill="#fdf6df" stroke="#cdb57a" stroke-width="1.5"/><circle cx="40" cy="90" r="10" fill="#6b3a2a"/>`,
    [A("roothair", 220, 105, 220, 155), A("nucleus", 40, 90, 40, 160)]);
  // palisade cell
  let pc = "";
  const cp = (x, y, rot) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="4.5" transform="rotate(${rot} ${x} ${y})" fill="#3c9a3c" stroke="#1f5e1f" stroke-width="1"/>`;
  for (let y = 25; y <= 160; y += 15) pc += cp(115, y, 90) + cp(185, y, 90);
  for (let x = 132; x <= 170; x += 13) pc += cp(x, 22, 0);
  write("cell-palisade", W, H, `<rect x="104" y="8" width="92" height="166" rx="14" fill="#dff0c8" stroke="#4c7a2a" stroke-width="3"/>` +
    `<rect x="126" y="34" width="48" height="112" rx="10" fill="#f7f9e8" stroke="#a8b87a" stroke-width="1.5"/>` + pc + `<circle cx="150" cy="160" r="9" fill="#6b3a2a"/>`,
    [A("chloroplast", 115, 55, 50, 55), A("vacuole", 150, 90, 250, 90)]);
}

// ---------- microscope ----------
write("microscope", 400, 440,
  `<rect x="120" y="398" width="210" height="24" rx="12" fill="#e9ecef" stroke="#555" stroke-width="2"/>` +
  `<path d="M232,398 L272,398 C350,320 345,190 288,118 L262,138 C312,205 306,318 232,372 Z" fill="#dfe3e8" stroke="#555" stroke-width="2"/>` +
  `<line x1="194" y1="352" x2="252" y2="358" stroke="#555" stroke-width="5"/>` +
  `<ellipse cx="170" cy="350" rx="25" ry="9" transform="rotate(-15 170 350)" fill="#c5f6fa" stroke="#343a40" stroke-width="3"/>` +
  `<rect x="200" y="130" width="78" height="34" fill="#dfe3e8" stroke="#555" stroke-width="2"/>` +
  `<rect x="150" y="100" width="54" height="115" rx="4" fill="#f1f3f5" stroke="#555" stroke-width="2"/>` +
  `<rect x="160" y="42" width="34" height="60" rx="4" fill="#343a40"/><rect x="156" y="36" width="42" height="11" rx="3" fill="#212529"/>` +
  `<path d="M146,215 L208,215 L200,232 L154,232 Z" fill="#adb5bd" stroke="#555" stroke-width="2"/>` +
  `<rect x="154" y="232" width="16" height="36" rx="3" fill="#495057"/><rect x="156" y="266" width="12" height="7" fill="#ced4da"/>` +
  `<rect x="184" y="232" width="16" height="28" rx="3" fill="#495057"/><rect x="186" y="258" width="12" height="7" fill="#ced4da"/>` +
  `<rect x="262" y="288" width="30" height="30" fill="#dfe3e8" stroke="#555" stroke-width="2"/>` +
  `<rect x="105" y="292" width="165" height="12" rx="3" fill="#343a40"/>` +
  `<rect x="140" y="286" width="70" height="6" fill="#a5d8ff" stroke="#4dabf7"/>` +
  `<circle cx="262" cy="147" r="20" fill="#212529"/><circle cx="262" cy="147" r="7" fill="#adb5bd"/>` +
  `<circle cx="315" cy="212" r="11" fill="#212529"/><circle cx="315" cy="212" r="4" fill="#adb5bd"/>`,
  [A("eyepiece", 177, 62, 60, 50), A("bodytube", 160, 160, 60, 130), A("objective", 162, 252, 60, 215),
   A("stage", 115, 298, 50, 290), A("mirror", 155, 354, 55, 370), A("rough", 262, 147, 360, 90),
   A("fine", 315, 212, 370, 190), A("handle", 322, 287, 372, 340)]);

// ---------- separation ----------
{ // simple distillation
  const c = 0.9135, s = 0.4067; // 24 degree condenser
  write("distillation", 420, 320,
    `<g transform="rotate(24 230 170)">` +
      `<rect x="140" y="158" width="180" height="24" rx="10" fill="#e7f5ff" stroke="#495057" stroke-width="2"/>` +
      `<line x1="120" y1="170" x2="340" y2="170" stroke="#495057" stroke-width="3"/>` +
      `<rect x="155" y="143" width="10" height="16" fill="#e7f5ff" stroke="#495057" stroke-width="2"/>` +
      `<rect x="295" y="181" width="10" height="16" fill="#e7f5ff" stroke="#495057" stroke-width="2"/>` +
    `</g>` +
    `<line x1="118" y1="125" x2="130" y2="125" stroke="#495057" stroke-width="3"/>` +
    `<path d="M330,214 L336,250" stroke="#495057" stroke-width="3"/>` +
    `<rect x="100" y="108" width="20" height="52" fill="#fff" stroke="#495057" stroke-width="2"/>` +
    `<circle cx="110" cy="200" r="45" fill="#fff" stroke="#495057" stroke-width="2.5"/>` +
    `<path d="M69,215 A45,45 0 0 0 151,215 Z" fill="#a5d8ff"/>` +
    `<rect x="98" y="100" width="24" height="12" rx="2" fill="#495057"/>` +
    `<line x1="110" y1="28" x2="110" y2="132" stroke="#868e96" stroke-width="5" stroke-linecap="round"/><line x1="110" y1="60" x2="110" y2="132" stroke="#e03131" stroke-width="2"/><circle cx="110" cy="134" r="4" fill="#e03131"/>` +
    `<path d="M328,245 L348,245 L348,262 L378,305 L298,305 L328,262 Z" fill="#fff" stroke="#495057" stroke-width="2.5"/>` +
    `<path d="M307,292 L369,292 L378,305 L298,305 Z" fill="#a5d8ff"/>` +
    `<path d="M110,248 C100,262 102,272 104,276 L116,276 C118,272 120,262 110,248 Z" fill="#4dabf7"/>` +
    `<rect x="102" y="276" width="16" height="30" fill="#adb5bd" stroke="#495057"/><rect x="88" y="304" width="44" height="8" fill="#868e96"/>`,
    [A("thermometer", 110, 60, 40, 40), A("flask", 67, 195, 25, 160), A("saltwater", 95, 230, 25, 240), A("heat", 110, 262, 45, 295),
     A("condenser", 230, 170, 270, 110), A("waterin", 283, 223, 250, 290), A("waterout", 177, 117, 190, 40), A("distillate", 338, 298, 400, 265)]);
}

{ // filtration
  let drops = ""; for (const y of [192, 215, 238]) drops += `<ellipse cx="200" cy="${y}" rx="3" ry="4.5" fill="#4dabf7"/>`;
  write("filtration", 400, 310,
    `<path d="M180,185 L220,185 L220,205 L265,290 L135,290 L180,205 Z" fill="#fff" stroke="#495057" stroke-width="2.5"/>` +
    `<path d="M150,262 L250,262 L265,290 L135,290 Z" fill="#a5d8ff"/>` + drops +
    `<path d="M140,60 L260,60 L210,130 L210,178 L190,178 L190,130 Z" fill="#f1f3f5" stroke="#495057" stroke-width="2.5"/>` +
    `<path d="M152,66 L248,66 L203,128 L197,128 Z" fill="#fff" stroke="#adb5bd" stroke-width="2"/>` +
    `<path d="M165,82 L235,82 L216,106 L184,106 Z" fill="#c8a873" opacity=".85"/>` +
    `<ellipse cx="200" cy="116" rx="13" ry="7" fill="#7a5a2a"/>`,
    [A("filterpaper", 157, 72, 55, 40), A("mixture", 190, 92, 55, 95), A("residue", 196, 116, 55, 150),
     A("funnel", 240, 88, 330, 70), A("flask", 238, 240, 330, 200), A("filtrate", 220, 276, 330, 280)]);
}

{ // evaporation
  write("evaporation", 400, 300,
    `<path d="M175,90 c-8,-10 8,-20 0,-30 s8,-20 0,-30 M200,88 c-8,-10 8,-20 0,-30 s8,-20 0,-30 M225,90 c-8,-10 8,-20 0,-30 s8,-20 0,-30" fill="none" stroke="#adb5bd" stroke-width="3"/>` +
    `<line x1="125" y1="152" x2="100" y2="285" stroke="#495057" stroke-width="4"/><line x1="275" y1="152" x2="300" y2="285" stroke="#495057" stroke-width="4"/>` +
    `<rect x="105" y="146" width="190" height="6" fill="#868e96"/>` +
    `<path d="M120,110 Q200,180 280,110 Z" fill="#f8f9fa"/>` +
    `<path d="M140,125 Q200,160 260,125 Z" fill="#74c0fc"/>` +
    `<path d="M120,110 Q200,180 280,110" fill="none" stroke="#495057" stroke-width="3"/><line x1="114" y1="110" x2="286" y2="110" stroke="#495057" stroke-width="3"/>` +
    `<path d="M200,160 C186,185 188,205 192,215 L208,215 C212,205 214,185 200,160 Z" fill="#4dabf7" opacity=".85"/>` +
    `<rect x="190" y="215" width="20" height="55" fill="#adb5bd" stroke="#495057"/><rect x="170" y="270" width="60" height="10" fill="#868e96"/>`,
    [A("basin", 256, 128, 350, 100), A("solution", 200, 135, 55, 115), A("steam", 200, 62, 55, 45), A("heat", 200, 195, 55, 215)]);
}

{ // chromatography
  const spot = (x, y, c) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="6" fill="${c}"/>`;
  const RED = "#e03131", BLUE = "#1c7ed6", YELLOW = "#fab005";
  write("chromatography", 400, 320,
    `<rect x="102" y="252" width="196" height="46" fill="#c5ecfa"/>` +
    `<path d="M100,40 V288 Q100,300 112,300 H288 Q300,300 300,288 V40" fill="none" stroke="#495057" stroke-width="3"/>` +
    `<rect x="140" y="30" width="120" height="250" fill="#f1f3f5" stroke="#868e96" stroke-width="1.5" opacity=".95"/>` +
    `<path d="M140,72 q15,-4 30,0 t30,0 t30,0 t30,0" fill="none" stroke="#495057" stroke-width="1.5"/>` +
    `<line x1="140" y1="228" x2="260" y2="228" stroke="#868e96" stroke-width="2"/>` +
    spot(155, 105, RED) + spot(155, 170, BLUE) + spot(185, 105, RED) + spot(215, 170, BLUE) + spot(245, 200, YELLOW) +
    ["X", "A", "B", "C"].map((t, i) => `<text x="${155 + 30 * i}" y="246" text-anchor="middle" font-size="14" font-weight="700" fill="#222">${t}</text>`).join(""),
    [A("front", 142, 72, 50, 72), A("pencil", 142, 228, 50, 210), A("solvent", 120, 280, 50, 280), A("paper", 255, 140, 350, 140)]);
}

console.log("diagrams written to", OUT);
