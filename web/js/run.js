// Expedición y refugio (puro, sin DOM): mapa de nodos, encuentros, eventos, oro y edificios.
import { ENEMY, QUESTS, BUILD, EVENTS, heroStats } from './data.js';
import { rng } from './rng.js';

export const ROWS = 6; // filas de nodos antes del jefe

export function newSave() {
  return { v: 1, gold: 0, build: {}, quest: 0, tutorial: false, run: null, stats: { runs: 0, deaths: 0, kills: 0, bosses: 0, best: 0 } };
}

// ---------- Mapa ----------
// rows[r] = [{ id, type, links:[ids fila r+1] }]; la última fila es el jefe.
export function genMap(seed) {
  const r = rng(seed ^ 0x5eed);
  const rows = [];
  for (let i = 0; i < ROWS; i++) {
    const w = i === 0 ? 2 : r.int(2, 3), row = [];
    for (let j = 0; j < w; j++) {
      let type;
      if (i === 0) type = 'combate';
      else if (i === ROWS - 1) type = 'hoguera';
      else type = r.pick(i <= 1 ? ['combate', 'combate', 'botin', 'evento'] : ['combate', 'combate', 'elite', 'botin', 'evento', 'hoguera']);
      row.push({ id: `${i}-${j}`, type, links: [] });
    }
    // Al menos un combate en cada fila intermedia para que haya oro y peligro.
    if (i > 0 && i < ROWS - 1 && !row.some((n) => n.type === 'combate' || n.type === 'elite')) row[r.int(0, row.length - 1)].type = 'combate';
    rows.push(row);
  }
  rows.push([{ id: `${ROWS}-0`, type: 'jefe', links: [] }]);
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i], b = rows[i + 1];
    a.forEach((n, j) => {
      const c = (j + 0.5) / a.length * b.length - 0.5; // posición proporcional en la fila siguiente
      const lo = Math.max(0, Math.floor(c)), hi = Math.min(b.length - 1, Math.ceil(c));
      for (let t = lo; t <= hi; t++) if (!n.links.includes(b[t].id)) n.links.push(b[t].id);
      if (b.length > a.length && r.next() < 0.4) { const extra = b[Math.min(b.length - 1, hi + 1)]; if (!n.links.includes(extra.id)) n.links.push(extra.id); }
    });
    b.forEach((m) => { if (!a.some((n) => n.links.includes(m.id))) { const n = a[Math.min(a.length - 1, Math.round(b.indexOf(m) / b.length * a.length))]; n.links.push(m.id); } });
  }
  return rows;
}
export const nodeById = (map, id) => map.flat().find((n) => n.id === id);
export const rowOf = (id) => +id.split('-')[0];

// Nodos a los que se puede ir ahora.
export function nextNodes(run) {
  if (!run.at) return run.map[0].map((n) => n.id);
  return nodeById(run.map, run.at).links.slice();
}

// ---------- Expedición ----------
export function newRun(save, seed) {
  const st = heroStats(save.build), q = QUESTS[Math.min(save.quest, QUESTS.length - 1)];
  return {
    seed, quest: q.id, map: genMap(seed), at: null, visited: [], gold: 0, kills: 0,
    hero: { ...st, hp: st.maxHp, arrows: st.arrowsMax, traps: st.trapsMax },
    combat: null, event: null, node: null, log: []
  };
}

// Enemigos de un nodo de combate: crece con la fila; élite = +2 y oro doble.
export function encounter(run, nodeId, seed) {
  const q = QUESTS.find((x) => x.id === run.quest), node = nodeById(run.map, nodeId), row = rowOf(nodeId);
  const r = rng(seed);
  if (node.type === 'jefe') return [q.boss, ...q.escort];
  const n = q.base + Math.floor(row / 2) + (node.type === 'elite' ? 2 : 0);
  const pool = q.pool.slice(0, Math.min(q.pool.length, 2 + Math.floor(row / 2)));
  const out = [];
  for (let i = 0; i < n; i++) out.push(r.pick(pool));
  // No más de 1 bruto por encuentro normal.
  let brutes = 0;
  return out.map((t) => (t === 'bruto' && ++brutes > 1 ? pool.find((p) => p !== 'bruto') || 'bandido' : t));
}

export const combatGold = (node, s) => s.gold + (node.type === 'elite' ? 12 : node.type === 'combate' ? 6 : 0);

// Aplicar efectos de un evento. Devuelve el texto del resultado.
export function applyEvent(run, ev, choice, roll = Math.random()) {
  const c = EVENTS.find((e) => e.id === ev).choices[choice], f = c.eff, h = run.hero;
  if (c.need && c.need.gold > run.gold) return null;
  let res = c.res;
  if (f.gamble) { if (roll < 0.5) { run.gold += 30; res = 'Dentro hay 30 monedas.'; } else { h.hp = Math.max(1, h.hp - 2); res = '¡Una aguja envenenada! −2 ♥'; } }
  if (f.bet) { if (roll < 0.5) { run.gold += f.bet; res = `¡Ganas! +${f.bet} oro.`; } else { run.gold -= f.bet; res = `Pierdes ${f.bet} de oro.`; } }
  if (f.gold) run.gold += f.gold;
  if (f.hp) h.hp = Math.max(1, h.hp + f.hp);
  if (f.heal) h.hp = Math.min(h.maxHp, h.hp + f.heal);
  if (f.arrows) h.arrows += f.arrows;
  if (f.traps) h.traps += f.traps;
  if (f.maxHpRun) { h.maxHp = Math.max(1, h.maxHp + f.maxHpRun); h.hp = Math.min(h.hp, h.maxHp); }
  if (f.armorRun) h.armorMax += f.armorRun;
  return res;
}

// Fin de expedición: 'boss' (gesta cumplida), 'retreat' (todo el oro) o 'death' (la mitad).
export function finishRun(save, how) {
  const run = save.run, q = QUESTS.find((x) => x.id === run.quest);
  let gold = run.gold;
  if (how === 'death') gold = Math.floor(run.gold / 2);
  if (how === 'boss') gold += q.reward;
  save.gold += gold;
  save.stats.runs++; save.stats.kills += run.kills;
  if (how === 'death') save.stats.deaths++;
  if (how === 'boss') { save.stats.bosses++; save.quest = Math.min(save.quest + 1, QUESTS.length); }
  save.stats.best = Math.max(save.stats.best, run.visited.length);
  save.run = null;
  return { gold, quest: q, how, nodes: run.visited.length, kills: run.kills };
}

// ---------- Refugio ----------
export function buildCost(save, id) {
  const lv = save.build[id] || 0, c = BUILD[id].costs;
  return lv < c.length ? c[lv] : null;
}
export function buy(save, id) {
  const cost = buildCost(save, id);
  if (cost == null || save.gold < cost) return false;
  save.gold -= cost; save.build[id] = (save.build[id] || 0) + 1;
  return true;
}
export const enemyName = (t) => ENEMY[t].name;
