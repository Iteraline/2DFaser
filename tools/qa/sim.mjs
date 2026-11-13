// Dificultad medida con un "explorador": no conoce el laberinto, solo ve su radio de visión.
// Explora en profundidad prefiriendo ir hacia la derecha (sabe que la salida está en el borde derecho),
// prepara los giros por adelantado como haría una persona con práctica y tarda 0,35 s en reaccionar en cada callejón.
// Uso: node tools/qa/sim.mjs [semillas por página=100]
import { makePage, nb, cx, cy, open, pk as pkOf } from '../../web/js/maze.js';
import { newGame, update, input, queue, tryDir, blotXY } from '../../web/js/game.js';
import { PAGES } from '../../web/js/data.js';

const SEEDS = +(process.argv[2] || 100), REACT = 0.35;

function choose(g, at) {
  // Opciones desde la celda "at" suponiendo que el lápiz ya está ahí.
  // Si se mira por adelantado (el lápiz aún va hacia "at"), se simula la pila tal como quedará al llegar.
  const p = g.p, save = { cur: g.cur, to: g.to, stack: g.stack };
  if (g.to === at) g.stack = g.back ? g.stack.slice(0, -1) : [...g.stack, at];
  g.cur = at; g.to = -1;
  const opts = [];
  for (let d = 0; d < 4; d++) {
    const r = tryDir(g, d);
    if (!r.ok || r.kind === 'pick') continue;
    const n = r.to ?? -1;
    const fresh = n >= 0 && !g.ink[n];
    const item = n >= 0 && g.items[n] && g.seen[n];
    const oneway = n >= 0 && p.oneway[pkOf(p, at, d)] !== undefined; // una flecha puede ser una trampa: mejor evitarla si hay otra opción
    opts.push({ d, kind: r.kind, fresh, score: (r.kind === 'exit' ? 1000 : 0) + (fresh ? 100 : 0) + (item ? 30 : 0) - (oneway ? 150 : 0) + (n >= 0 ? (cx(p, n) - cx(p, at)) * 10 : 0) });
  }
  g.cur = save.cur; g.to = save.to; g.stack = save.stack;
  const fwd = opts.filter((o) => o.kind !== 'back' && (o.fresh || o.kind === 'exit' || o.kind === 'unlock'));
  if (fwd.length) return fwd.sort((a, b) => b.score - a.score)[0].d;
  // Sin nada nuevo delante: con llave, ir al candado conocido; si no, volver atrás; si no, buscar el borde sin explorar más cercano.
  if (g.keys > 0 && g.lock != null) { const d = route(g, at, (c) => lockSide(g, c)); if (d >= 0) return d; }
  const back = opts.find((o) => o.kind === 'back');
  if (back) return back.d;
  const d = route(g, at, (c) => [0, 1, 2, 3].some((k) => { const n = nb(p, c, k); return n >= 0 && !g.ink[n] && open(p, c, k) && !g.walls[c] === false; }));
  if (d >= 0) return d;
  const any = opts.sort((a, b) => b.score - a.score)[0];
  return any ? any.d : -1;
}
const lockSide = (g, c) => [0, 1, 2, 3].some((k) => nb(g.p, c, k) >= 0 && pkOf(g.p, c, k) === g.lock);
// Primer paso del camino más corto (por casillas ya vistas y sin cruzar el trazo activo) hasta una casilla que cumpla "goal".
function route(g, at, goal) {
  const p = g.p, prev = new Map([[at, -1]]), q = [at], stack = new Set(g.stack);
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    if (c !== at && goal(c)) { let x = c; while (prev.get(x) !== at) x = prev.get(x); return [0, 1, 2, 3].find((k) => nb(p, at, k) === x); }
    for (let k = 0; k < 4; k++) {
      const n = nb(p, c, k);
      if (n < 0 || prev.has(n) || !g.seen[n] || (g.walls[c] & (1 << k))) continue;
      const kk = pkOf(p, c, k);
      if ((p.oneway[kk] !== undefined && p.oneway[kk] !== k) || kk === g.lock) continue;
      if (stack.has(n) && !(c === at && n === g.stack[g.stack.length - 2])) continue;
      if (g.smudge && g.smudge.has(n)) continue;
      prev.set(n, c); q.push(n);
    }
  }
  return -1;
}

function play(n, seed) {
  const p = makePage(n, seed, seed % PAGES[n].H), g = newGame(p, 3);
  let react = 0, lastCur = -1, decidedFor = -1;
  for (let i = 0; i < 60 * 240 && g.phase === 'play'; i++) {
    const dt = 1 / 60;
    if (g.to < 0 && g.dir < 0) { // parado: reacciona y decide
      react += dt;
      if (react >= REACT || !g.started) { const d = choose(g, g.cur); if (d >= 0) queue(g, d); react = 0; }
    } else if (g.to >= 0 && decidedFor !== g.to) { // en marcha: prepara el giro de la próxima casilla
      decidedFor = g.to;
      const d = choose(g, g.to);
      if (d >= 0) queue(g, d);
    }
    // Borrones: si uno ronda la casilla a la que vas, media vuelta; si estás parado, esperar.
    const nx = g.to >= 0 ? g.to : g.cur;
    const near = g.blots.some((b) => { const [bx, by] = blotXY(g, b); return Math.abs(bx - cx(p, nx)) + Math.abs(by - cy(p, nx)) < 1.6; });
    if (near && g.to >= 0 && !g.undo) input(g, (g.dir + 2) % 4);
    update(g, dt);
    if (g.cur !== lastCur) { lastCur = g.cur; }
  }
  return g;
}

console.log(`Explorador sin mapa · ${SEEDS} páginas por nivel · reacción ${REACT}s en cada callejón\n`);
console.log('pág', 'tamaño'.padEnd(7), 'supera'.padStart(7), 'tiempo'.padStart(7), 'mina usada'.padStart(11), 'estrellas'.padStart(10), '  muertes');
for (let n = 0; n < PAGES.length; n++) {
  let win = 0, t = 0, used = 0, stars = 0; const deaths = {};
  for (let s = 1; s <= SEEDS; s++) {
    const g = play(n, (s * 2654435761 + n) >>> 0);
    if (g.phase === 'exit') { win++; t += g.t; used += 1 - g.lead / g.leadMax; stars += g.stars; }
    else deaths[g.reason || 'tiempo'] = (deaths[g.reason || 'tiempo'] || 0) + 1;
  }
  const c = PAGES[n];
  console.log(String(n + 1).padStart(3), `${c.W}x${c.H}`.padEnd(7), (Math.round(100 * win / SEEDS) + ' %').padStart(7), (win ? (t / win).toFixed(1) + 's' : '-').padStart(7),
    (win ? Math.round(100 * used / win) + ' %' : '-').padStart(11), (win ? (stars / win).toFixed(1) : '-').padStart(10), '  ' + Object.entries(deaths).map(([k, v]) => `${k} ${v}`).join(', '));
}
