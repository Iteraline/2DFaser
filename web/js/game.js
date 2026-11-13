// Simulación en tiempo real de una página. Pura (sin DOM): update(g, dt) avanza el mundo.
// Reglas: el trazo es permanente (no se cruza; volver atrás = repasar, gasta doble), la mina se gasta,
// la goma avanza por tu trazo borrándolo y, si te alcanza, pierdes una vida.
import { DX, DY, nb, pk, passable, portalOf, open, cx, cy } from './maze.js?v=3';
import { SPEED, PAGES, TORCH_TIME, EYE_TIME, TORCH_RADIUS } from './data.js?v=3';

export function newGame(page, lives) {
  const cfg = PAGES[page.n];
  return {
    p: page, cfg, lives, t: 0, started: false, phase: 'play', reason: null,
    stack: [page.entry], jumps: [], hist: [page.entry], ink: new Uint8Array(page.W * page.H), seen: new Uint8Array(page.W * page.H),
    cur: page.entry, to: -1, dir: -1, prog: 0, back: false, queue: -1,
    lead: page.lead, leadMax: page.lead, keys: 0, picks: 0, stars: 0, repasos: 0,
    torch: 0, eye: 0, stuck: 0,
    eraser: cfg.eraser ? { on: false, wait: cfg.eraser.delay, idx: 0, speed: cfg.eraser.speed } : null,
    blots: page.blots.map((b, i) => ({ cells: b.cells, pos: 0, dir: 1, speed: 0.9 + (i % 2) * 0.3 })),
    items: page.items.slice(), lock: page.lock, walls: page.walls.slice(), ev: []
  };
}

const ev = (g, e) => g.ev.push(e);
export const radius = (g) => (g.torch > 0 ? TORCH_RADIUS : g.cfg.radius);
// Posición continua del lápiz (en casillas, centro de celda = x+0.5).
export function pencilXY(g) {
  const p = g.p, a = [cx(p, g.cur), cy(p, g.cur)];
  if (g.to < 0) return a;
  const b = [cx(p, g.to), cy(p, g.to)];
  return [a[0] + (b[0] - a[0]) * g.prog, a[1] + (b[1] - a[1]) * g.prog];
}

// Qué pasa si el lápiz intenta salir de la celda actual en dirección d.
// Devuelve { ok, kind: 'move'|'back'|'exit'|'pick'|'unlock', to } o { ok:false, why }.
export function tryDir(g, d) {
  const p = g.p, c = g.cur;
  if (c === p.exit && d === 1) return { ok: true, kind: 'exit' };
  const n = nb(p, c, d);
  if (n < 0) return { ok: false, why: 'borde' };
  const pp = { ...p, walls: g.walls, lock: g.lock };
  if (!open(pp, c, d)) return g.picks > 0 ? { ok: true, kind: 'pick', to: n } : { ok: false, why: 'muro' };
  const k = pk(p, c, d);
  if (p.oneway[k] !== undefined && p.oneway[k] !== d) return { ok: false, why: 'flecha' };
  if (g.lock === k) return g.keys > 0 ? { ok: true, kind: 'unlock', to: n } : { ok: false, why: 'candado' };
  const prev = g.stack.length > 1 ? g.stack[g.stack.length - 2] : -1;
  if (n === prev && !isJump(g, g.stack.length - 1)) return { ok: true, kind: 'back', to: n };
  if (g.stack.includes(n)) return { ok: false, why: 'trazo' };
  if (g.eraser && erasedCell(g, n)) return { ok: false, why: 'trazo' };
  return { ok: true, kind: 'move', to: n };
}
const isJump = (g, i) => g.jumps.includes(i); // stack[i] se alcanzó por portal
// Celdas por las que ya pasó la goma: quedan emborronadas y no se pueden pisar.
function erasedCell(g, c) { return (g.smudge || (g.smudge = new Set())).has(c); }

function start(g, d, allowPick = false) {
  const r = tryDir(g, d);
  if (!r.ok || (r.kind === 'pick' && !allowPick)) return false;
  g.started = true;
  if (r.kind === 'exit') { g.phase = 'exit'; ev(g, { t: 'exit' }); return true; }
  if (r.kind === 'pick') {
    g.picks--; const k = pk(g.p, g.cur, d), n = r.to;
    g.walls[g.cur] &= ~(1 << d); g.walls[n] &= ~(1 << ((d + 2) % 4));
    ev(g, { t: 'pick', at: g.cur, d, k });
  }
  if (r.kind === 'unlock') { g.keys--; g.lock = null; ev(g, { t: 'unlock' }); }
  g.dir = d; g.to = r.to; g.prog = 0; g.back = r.kind === 'back'; g.undo = false;
  return true;
}

function arrive(g) {
  const p = g.p, c = g.to;
  g.to = -1; g.prog = 0;
  if (g.undo) { g.undo = false; g.back = false; g.cur = c; return; } // media vuelta: no cuenta como paso
  if (g.back) { g.stack.pop(); g.lead -= 2; g.repasos++; ev(g, { t: 'repaso' }); }
  else { g.lead -= g.ink[c] ? 2 : 1; if (g.ink[c]) g.repasos++; g.stack.push(c); }
  g.ink[c] = Math.min(255, g.ink[c] + 1);
  g.cur = c; g.hist.push(c);
  // Objetos
  const it = g.items[c];
  if (it) {
    g.items[c] = null;
    if (it === 'star') g.stars++;
    else if (it === 'sharpen') g.lead = Math.min(g.leadMax, g.lead + p.sharpen);
    else if (it === 'torch') g.torch = TORCH_TIME;
    else if (it === 'eye') g.eye = EYE_TIME;
    else if (it === 'heart') g.lives++;
    else if (it === 'key') g.keys++;
    else if (it === 'pick') g.picks++;
    ev(g, { t: 'item', it, at: c });
  }
  // Portal (solo al entrar andando hacia delante)
  if (!g.back) {
    const o = portalOf(p, c);
    if (o >= 0 && !g.stack.includes(o)) {
      g.stack.push(o); g.jumps.push(g.stack.length - 1);
      g.ink[o] = Math.min(255, g.ink[o] + 1); g.cur = o; g.hist.push(o);
      ev(g, { t: 'portal', from: c, to: o });
    }
  }
  g.back = false;
  if (g.cur === p.exit) { g.phase = 'exit'; ev(g, { t: 'exit' }); return; } // llegar al agujero = página superada
  if (g.lead <= 0) { g.lead = 0; die(g, 'mina'); }
}

function die(g, reason) {
  if (g.phase !== 'play') return;
  g.lives--; g.phase = 'dead'; g.reason = reason;
  ev(g, { t: 'die', reason });
}

// d: 0-3 dirección; -2 = parar en la siguiente casilla.
// Dar media vuelta a mitad de casilla es inmediato (como en Pac-Man): vuelves a la casilla de la que salías sin gastar mina.
export function input(g, d) {
  if (g.phase === 'play' && g.to >= 0 && d === (g.dir + 2) % 4) {
    [g.cur, g.to] = [g.to, g.cur]; g.prog = 1 - g.prog; g.dir = d; g.undo = !g.undo; g.queue = -1;
    return;
  }
  g.queue = d;
}
// Giro en cola, sin media vuelta inmediata (lo usan el piloto y el explorador).
export function queue(g, d) { g.queue = d; }

export function update(g, dt) {
  if (g.phase !== 'play') return;
  g.t += g.started ? dt : 0;
  if (g.torch > 0) g.torch = Math.max(0, g.torch - dt);
  if (g.eye > 0) g.eye = Math.max(0, g.eye - dt);
  // Lápiz
  let left = dt * SPEED;
  for (let guard = 0; guard < 4 && left > 0 && g.phase === 'play'; guard++) {
    if (g.to < 0) {
      // En el centro de una celda: giro en cola, si no seguir recto, si no parar.
      // El pico solo se usa si el lápiz está parado y deslizas contra el muro (nunca por un giro en cola).
      const want = g.queue, stopped = g.dir < 0;
      if (want === -2) { g.dir = -1; g.queue = -1; break; } // tocar = parar en la siguiente casilla
      const ahead = g.dir >= 0 ? tryDir(g, g.dir) : null;
      if (want >= 0 && start(g, want, stopped)) { g.queue = -1; }
      else if (ahead && ahead.ok && (ahead.kind === 'move' || ahead.kind === 'exit' || ahead.kind === 'unlock')) start(g, g.dir);
      else { g.dir = -1; g.queue = -1; break; }
      if (g.phase !== 'play') return;
    }
    const need = 1 - g.prog;
    if (left >= need) { left -= need; g.prog = 1; arrive(g); }
    else { g.prog += left; left = 0; }
  }
  // Atrapado: parado sin ninguna salida posible.
  if (g.to < 0 && g.started) {
    const any = [0, 1, 2, 3].some((d) => tryDir(g, d).ok);
    g.stuck = any ? 0 : g.stuck + dt;
    if (g.stuck > 0.8) die(g, 'encerrado');
  }
  // Visión: marcar celdas vistas
  const [px, py] = pencilXY(g), R = radius(g), p = g.p;
  for (let y = Math.max(0, Math.floor(py - R)); y <= Math.min(p.H - 1, Math.ceil(py + R)); y++)
    for (let x = Math.max(0, Math.floor(px - R)); x <= Math.min(p.W - 1, Math.ceil(px + R)); x++)
      if ((x - px) ** 2 + (y - py) ** 2 <= R * R) g.seen[y * p.W + x] = 1;
  // Goma
  const e = g.eraser;
  if (e && g.started && g.phase === 'play') {
    if (!e.on) { e.wait -= dt; if (e.wait <= 0) { e.on = true; ev(g, { t: 'eraser' }); } }
    else {
      // La goma sigue tu recorrido exacto (también los callejones y las vueltas atrás), más despacio que tú:
      // solo te alcanza si te paras o dudas. Lo que borra queda emborronado y no se puede pisar.
      e.idx += e.speed * dt;
      const head = g.hist.length - 1 + (g.to >= 0 ? (g.undo ? 1 - g.prog : g.prog) : 0);
      const sm = g.smudge || (g.smudge = new Set());
      for (let i = e.done || 0; i < Math.min(Math.floor(e.idx), g.hist.length - 1); i++) sm.add(g.hist[i]);
      e.done = Math.max(e.done || 0, Math.min(Math.floor(e.idx), g.hist.length - 1));
      if (e.idx >= head - 0.15) die(g, 'goma');
    }
  }
  // Borrones de tinta
  for (const b of g.blots) {
    b.pos += b.dir * b.speed * dt;
    if (b.pos >= b.cells.length - 1) { b.pos = b.cells.length - 1; b.dir = -1; }
    if (b.pos <= 0) { b.pos = 0; b.dir = 1; }
    const [bx, by] = blotXY(g, b);
    if ((bx - px) ** 2 + (by - py) ** 2 < 0.45 ** 2) die(g, 'tinta');
  }
}
export function blotXY(g, b) {
  const p = g.p, i = Math.min(b.cells.length - 2, Math.floor(b.pos)), f = b.pos - i;
  const a = b.cells[i], c = b.cells[i + 1];
  return [cx(p, a) + (cx(p, c) - cx(p, a)) * f, cy(p, a) + (cy(p, c) - cy(p, a)) * f];
}

// Puntuación de la página.
export function pageScore(g, par) {
  const time = Math.max(0, Math.round((par * 2.2 - g.t) * 10));
  const clean = g.repasos === 0 ? 200 : 0;
  return { stars: g.stars * 100, lead: g.lead * 2, time, clean, total: g.stars * 100 + g.lead * 2 + time + clean };
}
// Medalla: oro = 3 estrellas y trazo limpio; plata = 2+; bronce = terminada.
export const medal = (g) => (g.stars === 3 && g.repasos === 0 ? 'oro' : g.stars >= 2 ? 'plata' : 'bronce');
export { DX, DY };
