// Reglas del combate. Puro (sin DOM): el estado es un objeto JSON serializable, así se guarda,
// se clona para la simulación y se prueba en Node. Cada cambio deja eventos en s.ev para animarlos.
//
// Turno del héroe: un movimiento y una acción, en cualquier orden (los dos opcionales).
// Turno enemigo: 1) atacan todos los que tienen al héroe en su zona (la zona roja que se ve);
//                2) los demás se mueven hacia una casilla desde la que puedan atacar.
// Acabar el turno fuera del rojo = no recibir daño. Sin azar en el combate.
import { ENEMY } from './data.js';
import { rng } from './rng.js';

export const N = 8;
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ALL8 = [...DIRS, ...DIAG];
export const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
export const key = (x, y) => y * N + x;
const xy = (kk) => [kk % N, (kk / N) | 0];
const tile = (s, x, y) => s.tiles[key(x, y)];
const floor = (s, x, y) => inb(x, y) && tile(s, x, y) === 'floor';

export const enemyAt = (s, x, y) => s.enemies.find((e) => e.x === x && e.y === y) || null;
const heroAt = (s, x, y) => s.hero.x === x && s.hero.y === y;
const occupied = (s, x, y) => heroAt(s, x, y) || !!enemyAt(s, x, y);
export const trapAt = (s, x, y) => s.traps.includes(key(x, y));
const alive = (s, e) => s.enemies.includes(e);
const ev = (s, e) => s.ev.push(e);

// ---------- Zonas de ataque ----------
// Casillas que el enemigo golpeará en su turno si el héroe está en ellas (desde px,py).
// El héroe es "transparente" para las líneas: está en una sola casilla, así que la zona no depende de dónde se pare.
export function zoneOf(s, e, px = e.x, py = e.y) {
  const d = ENEMY[e.type], out = new Set();
  if (d.zone === 'melee' || d.zone === 'sweep') {
    for (const [dx, dy] of d.zone === 'sweep' ? ALL8 : DIRS) {
      const x = px + dx, y = py + dy;
      if (inb(x, y) && tile(s, x, y) !== 'rock') out.add(key(x, y));
    }
    return out;
  }
  for (const [dx, dy] of d.zone === 'diag' ? DIAG : DIRS) {
    for (let i = 1; i <= d.range; i++) {
      const x = px + dx * i, y = py + dy * i;
      if (!inb(x, y) || tile(s, x, y) === 'rock') break;
      const o = enemyAt(s, x, y);
      if (o && o !== e && d.zone !== 'breath') break; // arqueros y cultistas no atraviesan aliados; el fuego sí
      out.add(key(x, y));
    }
  }
  return out;
}

// Todas las casillas peligrosas para el próximo turno enemigo (los aturdidos no atacan).
export function danger(s) {
  const out = new Set();
  for (const e of s.enemies) if (!e.stun) for (const kk of zoneOf(s, e)) out.add(kk);
  return out;
}

// ---------- Caminos ----------
function bfs(sx, sy, max, ok) {
  const dist = new Map([[key(sx, sy), 0]]), par = new Map(), q = [[sx, sy]];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i], d = dist.get(key(x, y));
    if (d >= max) continue;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, nk = key(nx, ny);
      if (!inb(nx, ny) || dist.has(nk) || !ok(nx, ny)) continue;
      dist.set(nk, d + 1); par.set(nk, key(x, y)); q.push([nx, ny]);
    }
  }
  return { dist, par };
}
function pathTo(par, from, to) {
  const p = [];
  for (let c = to; c !== from; c = par.get(c)) p.push(c);
  p.push(from);
  return p.reverse().map(xy);
}

// Casillas a las que puede ir el héroe (no pisa sus propias trampas).
export function heroReach(s) {
  const h = s.hero;
  if (s.phase !== 'player' || h.moved) return new Map();
  const { dist } = bfs(h.x, h.y, h.moveRange, (x, y) => floor(s, x, y) && !occupied(s, x, y) && !trapAt(s, x, y));
  dist.delete(key(h.x, h.y));
  return dist;
}

// ---------- Acciones del héroe ----------
// Devuelve { sword:[{x,y}], spear, bow, trap, charge:[{x,y,land:[x,y],dir}] } con los objetivos válidos.
export function actions(s) {
  const h = s.hero, A = {};
  if (s.phase !== 'player' || h.acted) return A;
  const adj = DIRS.map(([dx, dy]) => enemyAt(s, h.x + dx, h.y + dy)).filter(Boolean).map((e) => ({ x: e.x, y: e.y }));
  A.sword = adj;
  if (h.spear) A.spear = adj;
  if (h.arrows > 0) {
    A.bow = [];
    for (const [dx, dy] of DIRS) for (let i = 1; i <= 5; i++) {
      const x = h.x + dx * i, y = h.y + dy * i;
      if (!inb(x, y) || tile(s, x, y) === 'rock') break;
      if (enemyAt(s, x, y)) { A.bow.push({ x, y }); break; }
    }
  }
  if (h.traps > 0) A.trap = DIRS.map(([dx, dy]) => ({ x: h.x + dx, y: h.y + dy })).filter((p) => floor(s, p.x, p.y) && !occupied(s, p.x, p.y) && !trapAt(s, p.x, p.y));
  if (h.horse && !h.moved) { // la carga gasta el movimiento y la acción; galope mínimo de 2 casillas
    A.charge = [];
    for (const [dx, dy] of DIRS) {
      let i = 1;
      while (floor(s, h.x + dx * i, h.y + dy * i) && !occupied(s, h.x + dx * i, h.y + dy * i) && !trapAt(s, h.x + dx * i, h.y + dy * i)) i++;
      const x = h.x + dx * i, y = h.y + dy * i;
      if (i >= 3 && inb(x, y) && enemyAt(s, x, y)) A.charge.push({ x, y, land: [h.x + dx * (i - 1), h.y + dy * (i - 1)], dir: [dx, dy] });
    }
  }
  return A;
}

export function doMove(s, x, y) {
  const h = s.hero;
  if (!heroReach(s).has(key(x, y))) return false;
  const { par } = bfs(h.x, h.y, h.moveRange, (a, b) => floor(s, a, b) && !occupied(s, a, b) && !trapAt(s, a, b));
  const path = pathTo(par, key(h.x, h.y), key(x, y));
  h.x = x; h.y = y; h.moved = true;
  ev(s, { t: 'move', id: 'hero', path });
  return true;
}

export function doAction(s, kind, x, y) {
  const h = s.hero, list = (actions(s)[kind] || []), t = list.find((p) => p.x === x && p.y === y);
  if (!t) return false;
  h.acted = true;
  const e = enemyAt(s, x, y), dir = [Math.sign(x - h.x), Math.sign(y - h.y)];
  if (kind === 'sword') { ev(s, { t: 'strike', id: 'hero', to: [x, y], kind }); hitEnemy(s, e, h.sword, 'sword'); }
  else if (kind === 'spear') { ev(s, { t: 'strike', id: 'hero', to: [x, y], kind }); hitEnemy(s, e, 1, 'spear'); if (alive(s, e)) push(s, e, dir); }
  else if (kind === 'bow') { h.arrows--; ev(s, { t: 'shot', from: [h.x, h.y], to: [x, y], kind: 'arrow' }); hitEnemy(s, e, 1, 'arrow'); }
  else if (kind === 'trap') { h.traps--; s.traps.push(key(x, y)); ev(s, { t: 'trapset', at: [x, y] }); }
  else if (kind === 'charge') {
    const path = [[h.x, h.y]];
    for (let px = h.x, py = h.y; px !== t.land[0] || py !== t.land[1];) { px += t.dir[0]; py += t.dir[1]; path.push([px, py]); }
    h.x = t.land[0]; h.y = t.land[1]; h.moved = true;
    ev(s, { t: 'move', id: 'hero', path, fast: true });
    ev(s, { t: 'strike', id: 'hero', to: [x, y], kind });
    hitEnemy(s, e, h.charge, 'charge');
    if (alive(s, e)) push(s, e, t.dir);
  }
  return true;
}

// ---------- Daño y empujes ----------
function hitEnemy(s, e, dmg, src) {
  if (!e || !alive(s, e)) return;
  e.hp -= dmg;
  ev(s, { t: 'hit', id: e.id, dmg, src });
  if (e.hp <= 0) kill(s, e, src);
}
function kill(s, e, src) {
  s.enemies.splice(s.enemies.indexOf(e), 1);
  s.kills++; s.gold += ENEMY[e.type].gold;
  ev(s, { t: 'die', id: e.id, src });
  if (!s.enemies.length && s.phase !== 'lost') { s.phase = 'won'; ev(s, { t: 'won' }); }
}
function hurtHero(s, dmg, src) {
  const h = s.hero, a = Math.min(h.armor, dmg);
  h.armor -= a; h.hp -= dmg - a;
  ev(s, { t: 'hit', id: 'hero', dmg: dmg - a, armor: a, src });
  if (h.hp <= 0) { h.hp = 0; s.phase = 'lost'; ev(s, { t: 'lost' }); }
}
function triggerTrap(s, e) {
  s.traps.splice(s.traps.indexOf(key(e.x, e.y)), 1);
  e.stun = 1;
  ev(s, { t: 'trap', id: e.id, at: [e.x, e.y] });
  hitEnemy(s, e, 2, 'trap');
}
// Empujar 1 casilla. Pesados: no se mueven. Contra roca/borde/otro: +1 de daño (al otro también). Sima: cae.
function push(s, e, [dx, dy]) {
  if (ENEMY[e.type].heavy) { ev(s, { t: 'bump', id: e.id, dir: [dx, dy], heavy: true }); return; }
  const nx = e.x + dx, ny = e.y + dy;
  if (!inb(nx, ny) || tile(s, nx, ny) === 'rock') { ev(s, { t: 'bump', id: e.id, dir: [dx, dy] }); hitEnemy(s, e, 1, 'wall'); return; }
  const other = enemyAt(s, nx, ny);
  if (other || heroAt(s, nx, ny)) {
    ev(s, { t: 'bump', id: e.id, dir: [dx, dy] });
    hitEnemy(s, e, 1, 'wall');
    if (other) hitEnemy(s, other, 1, 'wall'); else hurtHero(s, 1, 'wall');
    return;
  }
  e.x = nx; e.y = ny;
  ev(s, { t: 'push', id: e.id, to: [nx, ny] });
  if (tile(s, nx, ny) === 'pit') { ev(s, { t: 'fall', id: e.id }); kill(s, e, 'pit'); return; }
  if (trapAt(s, nx, ny)) triggerTrap(s, e);
}

// ---------- Turno enemigo ----------
export function endTurn(s) {
  if (s.phase !== 'player') return;
  const h = s.hero, hk = key(h.x, h.y);
  s.phase = 'enemy';
  ev(s, { t: 'enemyturn' });
  // 1) Ataques (decididos con el tablero tal como lo ve el jugador).
  const attackers = s.enemies.filter((e) => !e.stun && zoneOf(s, e).has(hk));
  const zones = new Map(attackers.map((e) => [e, zoneOf(s, e)]));
  for (const e of attackers) {
    if (!alive(s, e) || s.phase === 'lost') continue;
    const d = ENEMY[e.type];
    ev(s, { t: d.zone === 'line' || d.zone === 'diag' || d.zone === 'breath' ? 'shot' : 'strike', id: e.id, from: [e.x, e.y], to: [h.x, h.y], kind: d.zone === 'breath' ? 'fire' : d.zone === 'diag' ? 'curse' : d.zone === 'line' ? 'arrow' : 'melee' });
    if (d.zone === 'breath') { // el fuego quema a todo lo que esté en la cruz
      for (const o of s.enemies.slice()) if (o !== e && zones.get(e).has(key(o.x, o.y))) hitEnemy(s, o, d.dmg, 'fire');
    }
    hurtHero(s, d.dmg, e.type);
  }
  // 2) Movimiento de los que no han atacado.
  for (const e of s.enemies.slice()) {
    if (s.phase === 'lost' || s.phase === 'won') break;
    if (!alive(s, e) || attackers.includes(e)) continue;
    if (e.stun) { e.stun = 0; ev(s, { t: 'stunned', id: e.id }); continue; }
    moveEnemy(s, e);
  }
  if (s.phase === 'enemy') reinforce(s);
  if (s.phase === 'enemy') {
    s.turn++; h.moved = false; h.acted = false; s.phase = 'player';
    ev(s, { t: 'playerturn' });
  }
}

// Refuerzos contra el atasco: en los turnos 5, 11 y 17 se marca una casilla arriba (se ve) y al turno siguiente llega un enemigo.
export const REINF_EVERY = 6, REINF_MAX = 3;
function reinforce(s) {
  const h = s.hero, free = (kk) => s.tiles[kk] === 'floor' && !occupied(s, ...xy(kk)) && !s.traps.includes(kk);
  const far = (kk) => Math.abs(xy(kk)[0] - h.x) + Math.abs(xy(kk)[1] - h.y);
  const top = [...Array(2 * N).keys()].filter(free).sort((a, b) => far(b) - far(a) || a - b);
  if (s.spawn != null) {
    const at = free(s.spawn) ? s.spawn : top[0];
    s.spawn = null;
    if (at == null) return;
    const type = s.pool[s.reinf % s.pool.length], [x, y] = xy(at);
    s.reinf++;
    const e = { id: 'e' + (++s.nextId), type, x, y, hp: ENEMY[type].hp, maxHp: ENEMY[type].hp, stun: 0 };
    s.enemies.push(e);
    ev(s, { t: 'spawn', id: e.id, type, at: [x, y] });
  } else if (s.turn % REINF_EVERY === REINF_EVERY - 1 && s.reinf < REINF_MAX && top.length) {
    s.spawn = top[0];
    ev(s, { t: 'warn', at: xy(top[0]) });
  }
}

function moveEnemy(s, e) {
  const d = ENEMY[e.type], h = s.hero, hk = key(h.x, h.y), ek = key(e.x, e.y);
  const passable = (x, y) => floor(s, x, y) && !occupied(s, x, y); // las trampas no las ven
  const goals = new Set();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if ((passable(x, y) || key(x, y) === ek) && zoneOf(s, e, x, y).has(hk)) goals.add(key(x, y));
  }
  if (goals.has(ek)) return; // ya amenaza (no debería pasar: habría atacado)
  const mine = bfs(e.x, e.y, d.move, passable);
  // Distancia de cada casilla a la meta más cercana (BFS desde todas las metas).
  const dg = new Map(), q = [];
  for (const g of goals) { dg.set(g, 0); q.push(g); }
  for (let i = 0; i < q.length; i++) {
    const [x, y] = xy(q[i]), dd = dg.get(q[i]);
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, nk = key(nx, ny);
      if (!inb(nx, ny) || dg.has(nk) || !(passable(nx, ny) || nk === ek)) continue;
      dg.set(nk, dd + 1); q.push(nk);
    }
  }
  let best = ek, bestScore = [dg.has(ek) ? dg.get(ek) : 99, Math.abs(e.x - h.x) + Math.abs(e.y - h.y), 0];
  for (const [kk, steps] of mine.dist) {
    const [x, y] = xy(kk);
    const sc = [dg.has(kk) ? dg.get(kk) : 99, Math.abs(x - h.x) + Math.abs(y - h.y), steps];
    if (sc[0] < bestScore[0] || (sc[0] === bestScore[0] && (sc[1] < bestScore[1] || (sc[1] === bestScore[1] && sc[2] < bestScore[2])))) { best = kk; bestScore = sc; }
  }
  if (best === ek) return;
  const path = pathTo(mine.par, ek, best), walked = [path[0]];
  for (const [x, y] of path.slice(1)) {
    e.x = x; e.y = y; walked.push([x, y]);
    if (trapAt(s, x, y)) break;
  }
  ev(s, { t: 'move', id: e.id, path: walked });
  if (trapAt(s, e.x, e.y)) triggerTrap(s, e);
}

// ---------- Crear un combate ----------
// hero: estadísticas de la expedición (vida actual, flechas, trampas…). roster: tipos de enemigo.
// layout (opcional, tutorial): { rocks:[[x,y]], pits:[[x,y]], hero:[x,y], enemies:[[tipo,x,y]] }
export function newCombat({ seed = 1, hero, roster = [], layout = null }) {
  const r = rng(seed);
  const make = (tiles, hpos, foes) => ({
    turn: 1, phase: 'player', tiles, traps: [], gold: 0, kills: 0, ev: [], spawn: null, reinf: 0, nextId: foes.length,
    pool: [...new Set(foes.map((f) => f[0]).filter((t) => !ENEMY[t].boss))].concat(foes.some((f) => !ENEMY[f[0]].boss) ? [] : ['bandido']),
    hero: { x: hpos[0], y: hpos[1], hp: hero.hp, maxHp: hero.maxHp, armor: hero.armorMax, armorMax: hero.armorMax,
      arrows: hero.arrows, traps: hero.traps, sword: hero.sword, spear: hero.spear, horse: hero.horse, charge: hero.charge,
      moveRange: hero.moveRange, moved: false, acted: false },
    enemies: foes.map(([type, x, y], i) => ({ id: 'e' + (i + 1), type, x, y, hp: ENEMY[type].hp, maxHp: ENEMY[type].hp, stun: 0 }))
  });
  if (layout) {
    const tiles = Array(N * N).fill('floor');
    for (const [x, y] of layout.rocks || []) tiles[key(x, y)] = 'rock';
    for (const [x, y] of layout.pits || []) tiles[key(x, y)] = 'pit';
    return make(tiles, layout.hero, layout.enemies);
  }
  for (let tries = 0; tries < 500; tries++) {
    const tiles = Array(N * N).fill('floor');
    const hpos = [r.int(2, 5), 7];
    const near = (x, y) => Math.abs(x - hpos[0]) + Math.abs(y - hpos[1]) <= 1;
    const cells = r.shuffle([...Array(N * N).keys()]);
    let rocks = r.int(4, 8), pits = r.int(1, 3);
    for (const c of cells) {
      const [x, y] = xy(c);
      if (y === 0 || near(x, y)) continue;
      if (rocks > 0) { tiles[c] = 'rock'; rocks--; } else if (pits > 0 && y < 7) { tiles[c] = 'pit'; pits--; } else break;
    }
    // Todo el suelo conectado con el héroe.
    const { dist } = bfs(hpos[0], hpos[1], 99, (x, y) => floor({ tiles }, x, y));
    if (dist.size !== tiles.filter((t) => t === 'floor').length) continue;
    // Enemigos arriba (filas 0-3), lejos del héroe; jefes en el centro de arriba.
    const free = r.shuffle(cells.filter((c) => { const [x, y] = xy(c); return tiles[c] === 'floor' && y <= 3; }));
    const foes = [], used = new Set();
    const order = roster.slice().sort((a, b) => (ENEMY[b].boss ? 1 : 0) - (ENEMY[a].boss ? 1 : 0));
    for (const type of order) {
      const pick = ENEMY[type].boss
        ? free.find((c) => !used.has(c) && xy(c)[1] <= 1 && xy(c)[0] >= 2 && xy(c)[0] <= 5)
        : free.find((c) => !used.has(c));
      if (pick === undefined) break;
      used.add(pick); foes.push([type, ...xy(pick)]);
    }
    if (foes.length !== roster.length) continue;
    return make(tiles, hpos, foes);
  }
  throw new Error('No se pudo generar el combate');
}

export const TUTORIAL = {
  rocks: [[1, 4], [6, 3], [4, 1]], pits: [[2, 2]],
  hero: [3, 7],
  enemies: [['bandido', 2, 3], ['bandido', 5, 2]]
};
