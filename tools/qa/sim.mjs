// Simulación de equilibrio: un bot que juega 1 turno vista (prueba cada movimiento + acción y el turno enemigo)
// recorre expediciones enteras de cada gesta con distintos niveles de refugio.
// Uso: node tools/qa/sim.mjs [expediciones por caso=60]
import { newCombat, doMove, doAction, endTurn, N } from '../../web/js/engine.js';
import { bestTurn } from './bot.mjs';
import { newRun, encounter, nodeById, ROWS } from '../../web/js/run.js';
import { heroStats, QUESTS } from '../../web/js/data.js';

function playCombat(hero, roster, seed) {
  const s = newCombat({ seed, hero, roster });
  while (s.phase === 'player' && s.turn < 40) {
    const t = bestTurn(s);
    const mv = () => t.p != null && doMove(s, t.p % N, (t.p / N) | 0), act = () => t.o[0] !== 'none' && doAction(s, ...t.o);
    if (t.first === 'move') { mv(); act(); } else { act(); mv(); }
    if (s.phase === 'player') endTurn(s);
    s.ev = [];
  }
  return s;
}

const RUNS = +(process.argv[2] || 60);
const LEVELS = {
  'sin mejoras': {},
  'refugio medio': { taller: 1, forja: 1, armeria: 1, huerto: 1, arqueria: 1 },
  'refugio alto': { taller: 2, forja: 2, armeria: 2, huerto: 2, arqueria: 1, establo: 1 },
  'refugio máximo': { taller: 3, forja: 2, armeria: 3, huerto: 3, arqueria: 2, establo: 2 }
};
console.log(`Bot de 1 turno vista · ${RUNS} expediciones por caso · camino de solo combates (peor caso) + hoguera antes del jefe\n`);
console.log('gesta'.padEnd(24), 'refugio'.padEnd(16), 'llega jefe', 'gana jefe', 'turnos/comb', 'vida final', 'atascos');
for (const [qi, q] of QUESTS.entries()) {
  for (const [name, build] of Object.entries(LEVELS)) {
    let reach = 0, win = 0, turns = 0, fights = 0, hpEnd = 0, stall = 0;
    for (let r = 1; r <= RUNS; r++) {
      const save = { build, quest: qi }; const run = newRun(save, r * 7919 + qi);
      let alive = true;
      for (let row = 0; row < ROWS && alive; row++) {
        const node = run.map[row].find((n) => n.type === 'combate' || n.type === 'elite') || run.map[row][0];
        if (node.type === 'hoguera') { run.hero.hp = Math.min(run.hero.maxHp, run.hero.hp + 2); continue; }
        if (node.type !== 'combate') continue; // el bot evita élites para medir el camino normal
        const s = playCombat(run.hero, encounter(run, node.id, r * 31 + row), r * 101 + row);
        turns += s.turn; fights++;
        if (s.phase !== 'won') { alive = false; if (s.phase === 'player') stall++; break; }
        Object.assign(run.hero, { hp: s.hero.hp, arrows: s.hero.arrows, traps: s.hero.traps });
      }
      if (!alive) continue;
      reach++;
      const b = playCombat(run.hero, encounter(run, `${ROWS}-0`, r), r * 13);
      turns += b.turn; fights++;
      if (b.phase === 'won') { win++; hpEnd += b.hero.hp; } else if (b.phase === 'player') stall++;
    }
    const pct = (x) => (100 * x / RUNS).toFixed(0).padStart(3) + ' %';
    console.log(q.name.padEnd(24), name.padEnd(16), pct(reach).padStart(10), pct(win).padStart(9), (turns / Math.max(1, fights)).toFixed(1).padStart(11), (win ? (hpEnd / win).toFixed(1) : '-').padStart(10), pct(stall).padStart(8));
  }
}
