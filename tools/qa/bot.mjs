// Bot de 1 turno vista: prueba cada movimiento + acción (en los dos órdenes) y simula el turno enemigo.
import { doMove, doAction, endTurn, danger, heroReach, actions, key, N } from '../../web/js/engine.js';
const clone = (s) => JSON.parse(JSON.stringify(s));
const score = (s) => {
  if (s.phase === 'lost') return -1e6;
  const h = s.hero;
  if (s.phase === 'won') return 1e6 + h.hp * 100 + h.arrows + h.traps * 3;
  const dz = danger(s).has(key(h.x, h.y)) ? 1 : 0;
  const ehp = s.enemies.reduce((a, e) => a + e.hp, 0);
  const near = Math.min(...s.enemies.map((e) => Math.abs(e.x - h.x) + Math.abs(e.y - h.y)));
  return h.hp * 60 + Math.max(0, 3 - h.hp) * 80 + h.armor * 20 - ehp * 30 - s.enemies.length * 70 - dz * 25 - near * 3 + h.arrows * 3 + h.traps * 6;
};
function options(s) {
  const out = [], acts = actions(s), list = [['none']];
  for (const [kind, ts] of Object.entries(acts)) for (const t of ts) list.push([kind, t.x, t.y]);
  return list;
}
export function bestTurn(s) {
  let best = null, bs = -Infinity;
  const tryIt = (st, plan) => { const c = clone(st); endTurn(c); c.ev = []; const v = score(c); if (v > bs) { bs = v; best = plan; } };
  const spots = [null, ...[...heroReach(s).keys()]];
  for (const p of spots) { // mover y luego actuar
    const a = clone(s); if (p != null) doMove(a, p % N, (p / N) | 0);
    for (const o of options(a)) { const b = clone(a); if (o[0] !== 'none') doAction(b, ...o); if (b.phase === 'won') { bs = 1e9; best = { p, o, first: 'move' }; return best; } tryIt(b, { p, o, first: 'move' }); }
  }
  for (const o of options(s)) { // actuar y luego mover
    if (o[0] === 'none') continue;
    const a = clone(s); doAction(a, ...o);
    if (a.phase === 'won') return { p: null, o, first: 'act' };
    for (const p of [...heroReach(a).keys()]) { const b = clone(a); doMove(b, p % N, (p / N) | 0); tryIt(b, { p, o, first: 'act' }); }
  }
  return best;
}
