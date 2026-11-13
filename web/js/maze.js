// Generador de páginas (laberinto + símbolos) y resolutor. Puro y con semilla: misma semilla → misma página.
// Celda c = y*W + x. Muros por celda en bits: N=1, E=2, S=4, O=8 (bit puesto = hay muro).
import { rng } from './rng.js?v=3';
import { PAGES } from './data.js?v=3';

export const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
export const opp = (d) => (d + 2) % 4;
export const cx = (p, c) => c % p.W, cy = (p, c) => (c / p.W) | 0;
export const cell = (p, x, y) => y * p.W + x;
export function nb(p, c, d) {
  const x = cx(p, c) + DX[d], y = cy(p, c) + DY[d];
  return x >= 0 && y >= 0 && x < p.W && y < p.H ? cell(p, x, y) : -1;
}
// Clave de un paso entre dos celdas (la misma en los dos sentidos).
export const pk = (p, c, d) => (d === 1 || d === 2 ? c * 4 + d : nb(p, c, d) * 4 + opp(d));
export const open = (p, c, d) => !(p.walls[c] & (1 << d));

// ¿Se puede pasar de c en dirección d? (muros, flechas, candado). No mira el trazo: eso es del juego.
export function passable(p, c, d, hasKey = true) {
  const n = nb(p, c, d);
  if (n < 0 || !open(p, c, d)) return false;
  const k = pk(p, c, d);
  if (p.oneway[k] !== undefined && p.oneway[k] !== d) return false;
  if (p.lock === k && !hasKey) return false;
  return true;
}
export const portalOf = (p, c) => {
  for (const q of p.portals) { if (q.a === c) return q.b; if (q.b === c) return q.a; }
  return -1;
};

// Resolutor: BFS sobre (celda, tiene llave). Devuelve la lista de celdas del camino más corto o null.
export function solve(p, { portals = false, from = p.entry, ignoreLock = false } = {}) {
  const keyCell = ignoreLock ? from : p.items.findIndex((it) => it && it === 'key');
  const N = p.W * p.H, seen = new Int32Array(N * 2).fill(-1), q = [];
  const start = from * 2 + (keyCell === from ? 1 : 0);
  seen[start] = start; q.push(start);
  for (let i = 0; i < q.length; i++) {
    const s = q[i], c = s >> 1, k = s & 1;
    if (c === p.exit) {
      const path = [];
      for (let t = s; ; t = seen[t]) { path.push(t >> 1); if (t === start) break; }
      return path.reverse();
    }
    const next = [];
    for (let d = 0; d < 4; d++) if (passable(p, c, d, !!k)) next.push(nb(p, c, d));
    if (portals) { const o = portalOf(p, c); if (o >= 0) next.push(o); }
    for (const n of next) {
      const ns = n * 2 + (k || n === keyCell ? 1 : 0);
      if (seen[ns] === -1) { seen[ns] = s; q.push(ns); }
    }
  }
  return null;
}

// Coste en mina de recorrer un camino con las reglas del juego (nueva casilla 1, repasar 2).
export function pathCost(path) {
  const stack = [path[0]], ink = new Set([path[0]]);
  let cost = 0;
  for (const c of path.slice(1)) {
    if (stack.length > 1 && stack[stack.length - 2] === c) { stack.pop(); cost += 2; }
    else { cost += ink.has(c) ? 2 : 1; stack.push(c); }
    ink.add(c);
  }
  return cost;
}

function bfsDist(p, from, ok = () => true) {
  const d = new Int32Array(p.W * p.H).fill(-1), q = [from];
  d[from] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    for (let k = 0; k < 4; k++) if (open(p, c, k)) { const n = nb(p, c, k); if (n >= 0 && d[n] < 0 && ok(n)) { d[n] = d[c] + 1; q.push(n); } }
  }
  return d;
}
const degree = (p, c) => [0, 1, 2, 3].filter((d) => open(p, c, d) && nb(p, c, d) >= 0).length;

// ---------- Página ----------
export function makePage(n, seed, entryRow = null) {
  const cfg = PAGES[n];
  for (let attempt = 0; attempt < 60; attempt++) {
    const p = tryPage(n, cfg, (seed + attempt * 7919) >>> 0, entryRow);
    if (p) return p;
  }
  throw new Error('No se pudo generar la página ' + (n + 1));
}

function tryPage(n, cfg, seed, entryRow) {
  const r = rng(seed), W = cfg.W, H = cfg.H;
  const p = { n, seed, W, H, walls: new Array(W * H).fill(15), items: new Array(W * H).fill(null), oneway: {}, lock: null,
    portals: [], blots: [], entry: 0, exit: 0, cost: 0, lead: 0, sharpen: 0 };
  const ey = entryRow == null ? r.int(1, H - 2) : Math.min(H - 1, Math.max(0, entryRow));
  p.entry = cell(p, 0, ey);
  // Laberinto perfecto (backtracker recursivo), con preferencia por seguir recto para pasillos largos.
  const vis = new Uint8Array(W * H), st = [p.entry];
  vis[p.entry] = 1;
  let lastDir = 1;
  while (st.length) {
    const c = st[st.length - 1];
    const opts = [0, 1, 2, 3].filter((d) => { const m = nb(p, c, d); return m >= 0 && !vis[m]; });
    if (!opts.length) { st.pop(); continue; }
    const d = opts.includes(lastDir) && r.next() < 0.45 ? lastDir : r.pick(opts);
    const m = nb(p, c, d);
    p.walls[c] &= ~(1 << d); p.walls[m] &= ~(1 << opp(d));
    vis[m] = 1; st.push(m); lastDir = d;
  }
  // Algunos bucles: más de un camino.
  const loops = Math.round(W * H * cfg.loops);
  for (let i = 0, tries = 0; i < loops && tries < 500; tries++) {
    const c = r.int(0, W * H - 1), d = r.pick([1, 2]), m = nb(p, c, d);
    if (m < 0 || open(p, c, d)) continue;
    p.walls[c] &= ~(1 << d); p.walls[m] &= ~(1 << opp(d)); i++;
  }
  // Salida en el borde derecho, lo más lejos posible de la entrada (por camino).
  const dist = bfsDist(p, p.entry);
  const rightCol = [...Array(H).keys()].map((y) => cell(p, W - 1, y)).sort((a, b) => dist[b] - dist[a]);
  p.exit = rightCol[r.int(0, Math.min(2, rightCol.length - 1))];
  p.walls[p.entry] &= ~8; p.walls[p.exit] &= ~2; // agujeros en los bordes

  let path = solve(p);
  if (!path) return null;
  const onPath = new Set(path);
  const free = (c) => c !== p.entry && c !== p.exit && !p.items[c] && portalOf(p, c) < 0;
  const distPath = bfsDist2(p, path);
  // Callejones sin salida fuera del camino, ordenados por lo lejos que quedan del camino.
  const deadEnds = () => [...Array(W * H).keys()].filter((c) => !onPath.has(c) && degree(p, c) === 1 && free(c)).sort((a, b) => distPath[b] - distPath[a] || a - b);

  // Llave y candado (el candado en un paso del camino que sea imprescindible).
  const reserved = new Set();
  if (cfg.key) {
    const half = path.slice(Math.floor(path.length * 0.45), path.length - 2);
    let placed = false;
    for (const c of r.shuffle(half)) {
      const i = path.indexOf(c), d = dirTo(p, c, path[i + 1]), k = pk(p, c, d);
      p.lock = k;
      const reach = bfsDistLock(p);
      if (reach[p.exit] >= 0) { p.lock = null; continue; } // no es imprescindible
      // Llave a 2-5 casillas del camino: obliga a desviarse sin que la goma lo haga imposible.
      const cands = deadEnds().filter((x) => reach[x] >= 0 && distPath[x] >= 2 && distPath[x] <= 5).sort((a, b) => distPath[a] - distPath[b]);
      if (!cands.length) { p.lock = null; continue; }
      const kc = cands[r.int(0, Math.min(1, cands.length - 1))];
      p.items[kc] = 'key';
      for (const b of branchOf(p, kc, onPath)) reserved.add(b);
      placed = true; break;
    }
    if (!placed) return null;
    path = solve(p);
    if (!path) return null;
  }
  // Portales: uno cerca de la entrada y otro cerca de la salida, en callejones.
  const dEntry = bfsDist(p, p.entry), dExit = bfsDist(p, p.exit);
  for (let i = 0; i < (cfg.portals || 0); i++) {
    const de = deadEnds().filter((c) => !reserved.has(c));
    const a = de.slice().sort((x, y) => dEntry[x] - dEntry[y])[i];
    const b = de.filter((c) => c !== a).sort((x, y) => dExit[x] - dExit[y])[i];
    if (a === undefined || b === undefined || a === b) return null;
    p.portals.push({ a, b, color: i });
    reserved.add(a); reserved.add(b);
  }
  // Flechas: en el camino (a favor) y trampas fuera del camino (sentido al azar).
  const [aOn, aOff] = cfg.arrows || [0, 0];
  const pathSet = new Set(path);
  const steps = path.slice(1, -1).map((c, i) => [c, path[i + 2]]).filter(([a, b]) => cy(p, a) === cy(p, b) || cx(p, a) === cx(p, b));
  for (const [a, b] of r.shuffle(steps).slice(0, aOn)) {
    const d = dirTo(p, a, b); if (d < 0) continue;
    const k = pk(p, a, d); if (k === p.lock) continue;
    p.oneway[k] = d;
  }
  let off = 0;
  for (const c of r.shuffle([...Array(W * H).keys()])) {
    if (off >= aOff) break;
    if (pathSet.has(c) || reserved.has(c)) continue;
    const ds = [0, 1, 2, 3].filter((d) => open(p, c, d) && nb(p, c, d) >= 0 && !pathSet.has(nb(p, c, d)) && !reserved.has(nb(p, c, d)));
    if (!ds.length) continue;
    const d = r.pick(ds), k = pk(p, c, d);
    if (p.oneway[k] !== undefined) continue;
    p.oneway[k] = d; off++;
  }
  path = solve(p);
  if (!path) return null;
  // Estrellas: 3 en los callejones más escondidos.
  const ends = deadEnds().filter((c) => !reserved.has(c));
  const far = ends.filter((c) => distPath[c] >= 2);
  const starCells = (far.length >= 3 ? far : ends).slice(0, 6);
  const stars = r.shuffle(starCells).slice(0, 3);
  if (stars.length < 3) {
    for (const c of r.shuffle([...Array(W * H).keys()])) { if (stars.length >= 3) break; if (!pathSet.has(c) && free(c) && !reserved.has(c) && !stars.includes(c)) stars.push(c); }
  }
  for (const c of stars) p.items[c] = 'star';
  // Resto de objetos: cerca del camino (a 1-3 casillas), repartidos.
  const near = r.shuffle([...Array(W * H).keys()].filter((c) => free(c) && !reserved.has(c) && distPath[c] >= 1 && distPath[c] <= 3));
  const put = (t) => { const c = near.find((x) => free(x)); if (c !== undefined) p.items[c] = t; };
  for (let i = 0; i < (cfg.sharpen || 0); i++) put('sharpen');
  for (const t of ['torch', 'eye', 'heart', 'pick']) if (cfg[t]) put(t);
  // Borrones de tinta: patrullan tramos rectos de 3+ casillas, lejos de la entrada.
  for (const seg of r.shuffle(straightSegments(p))) {
    if (p.blots.length >= (cfg.blots || 0)) break;
    if (seg.some((c) => dEntry[c] < 4 || c === p.exit || reserved.has(c) || p.blots.some((b) => b.cells.includes(c)))) continue;
    if (seg.filter((c) => pathSet.has(c)).length > 1) continue; // nunca a lo largo del camino: solo lo cruza (hay que esperar el momento)
    p.blots.push({ cells: seg });
  }
  if (p.blots.length < (cfg.blots || 0)) return null;
  // Mina: proporcional al tamaño de la página (hay que poder explorar a ciegas), nunca menos del doble del camino óptimo.
  path = buildSolution(p);
  if (!path) return null;
  p.cost = pathCost(path);
  p.lead = Math.max(Math.ceil(W * H * (cfg.lead || 1)), p.cost * 2);
  p.sharpen = Math.ceil(p.cost * 0.5);
  p.solution = path;
  return p;
}

export function dirTo(p, a, b) {
  for (let d = 0; d < 4; d++) if (nb(p, a, d) === b) return d;
  return -1;
}
function bfsDist2(p, sources) {
  const d = new Int32Array(p.W * p.H).fill(-1), q = [];
  for (const s of sources) { d[s] = 0; q.push(s); }
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    for (let k = 0; k < 4; k++) if (open(p, c, k)) { const n = nb(p, c, k); if (n >= 0 && d[n] < 0) { d[n] = d[c] + 1; q.push(n); } }
  }
  return d;
}
function bfsDistLock(p) {
  const d = new Int32Array(p.W * p.H).fill(-1), q = [p.entry];
  d[p.entry] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    for (let k = 0; k < 4; k++) if (passable(p, c, k, false)) { const n = nb(p, c, k); if (d[n] < 0) { d[n] = d[c] + 1; q.push(n); } }
  }
  return d;
}
// Celdas de la rama (fuera del camino) que lleva a c.
function branchOf(p, c, onPath) {
  const out = [c], seen = new Set([c]);
  for (let i = 0; i < out.length; i++) for (let d = 0; d < 4; d++) {
    if (!open(p, out[i], d)) continue;
    const n = nb(p, out[i], d);
    if (n >= 0 && !seen.has(n) && !onPath.has(n)) { seen.add(n); out.push(n); }
  }
  return out;
}
function straightSegments(p) {
  const segs = [];
  for (const d of [1, 2]) for (let c = 0; c < p.W * p.H; c++) {
    const back = nb(p, c, opp(d));
    if (back >= 0 && open(p, c, opp(d))) continue; // empieza solo al inicio del tramo
    const seg = [c];
    let cur = c;
    while (open(p, cur, d) && nb(p, cur, d) >= 0) { cur = nb(p, cur, d); seg.push(cur); }
    if (seg.length >= 3) segs.push(seg.slice(0, 5));
  }
  return segs;
}

// Solución jugable con las reglas del trazo: camino principal y, si hay llave, ida y vuelta por su rama
// (volviendo sobre el propio trazo, sin cruzarlo).
export function buildSolution(p) {
  const main = solve(p, { ignoreLock: true });
  if (!main) return null;
  const kc = p.items.indexOf('key');
  if (kc < 0) return main;
  const onMain = new Set(main), prev = new Map([[kc, -1]]), q = [kc];
  let J = -1;
  for (let i = 0; i < q.length && J < 0; i++) {
    const c = q[i];
    for (let d = 0; d < 4; d++) {
      const n = nb(p, c, d);
      if (n < 0 || !open(p, c, d) || prev.has(n)) continue;
      const k = pk(p, c, d);
      if (p.oneway[k] !== undefined || p.lock === k) continue;
      prev.set(n, c);
      if (onMain.has(n)) { J = n; break; }
      q.push(n);
    }
  }
  if (J < 0) return null;
  const back = [];
  for (let c = J; c !== -1; c = prev.get(c)) back.push(c); // J … llave
  const jIdx = main.indexOf(J);
  const lockIdx = main.findIndex((c, i) => i < main.length - 1 && pk(p, c, dirTo(p, c, main[i + 1])) === p.lock);
  if (lockIdx >= 0 && jIdx > lockIdx) return null;
  const toKey = back; // J → llave
  const home = back.slice().reverse(); // llave → J
  return [...main.slice(0, jIdx), ...toKey, ...home.slice(1), ...main.slice(jIdx + 1)];
}
