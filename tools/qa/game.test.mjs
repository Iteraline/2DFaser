// Pruebas de las reglas y del generador (Node). Uso: node tools/qa/game.test.mjs
import { makePage, solve, pathCost, cell, nb, open, pk } from '../../web/js/maze.js';
import { newGame, update, input, tryDir } from '../../web/js/game.js';
import { newPilot, pilot } from '../../web/js/pilot.js';
import { PAGES } from '../../web/js/data.js';

let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FALLO:', msg); } else console.log('ok  ', msg); };
const run = (g, secs, each) => { for (let i = 0; i < secs * 60 && g.phase === 'play'; i++) { if (each) each(); update(g, 1 / 60); } };

// Página de prueba hecha a mano: pasillo en L de 4x3.
//  E . . .
//  # # # .
//  # # # X →
function corridor(over = {}) {
  const W = 4, H = 3, p = { n: 0, seed: 1, W, H, walls: new Array(W * H).fill(15), items: new Array(W * H).fill(null), oneway: {}, lock: null, portals: [], blots: [], entry: 0, exit: 11, cost: 0, lead: 50, sharpen: 10 };
  const link = (a, d) => { p.walls[a] &= ~(1 << d); p.walls[nb(p, a, d)] &= ~(1 << ((d + 2) % 4)); };
  link(0, 1); link(1, 1); link(2, 1); link(3, 2); link(7, 2);
  p.walls[0] &= ~8; p.walls[11] &= ~2;
  Object.assign(p, over);
  p.solution = solve(p);
  return p;
}

// Movimiento básico, mina y salida
{
  const p = corridor(), g = newGame(p, 3);
  input(g, 1); run(g, 0.9);
  ok(g.cur === 3 && g.to < 0, 'se para contra la pared');
  input(g, 2); run(g, 2);
  ok(g.phase === 'exit', 'gira y sale');
  ok(g.lead === 50 - 5, 'gasta 1 de mina por casilla nueva (5)');
}
// Repasar cuesta doble y no se puede cruzar el trazo
{
  const p = corridor(), g = newGame(p, 3);
  input(g, 1); run(g, 0.9);
  input(g, 3); run(g, 0.25);
  ok(g.cur === 2 && g.repasos === 1 && g.lead === 50 - 3 - 2, 'volver atrás = repasar, 2 de mina');
}
// Crear un bucle para probar que no se cruza el trazo: cuadrado 2x2
{
  const W = 2, H = 2, p = { n: 0, W, H, walls: [15, 15, 15, 15], items: [null, null, null, null], oneway: {}, lock: null, portals: [], blots: [], entry: 0, exit: 1, lead: 30, sharpen: 5 };
  const link = (a, d) => { p.walls[a] &= ~(1 << d); p.walls[nb(p, a, d)] &= ~(1 << ((d + 2) % 4)); };
  link(0, 1); link(0, 2); link(2, 1); link(1, 2);
  p.solution = [0, 1];
  const g = newGame(p, 3);
  input(g, 2); run(g, 0.3); input(g, 1); run(g, 0.3); input(g, 0); run(g, 0.3);
  ok(g.cur === 1, 'da la vuelta al cuadrado');
  const r = tryDir(g, 3);
  ok(!r.ok && r.why === 'trazo', 'no puede cruzar su propio trazo');
}
// Flechas
{
  const p = corridor(); p.oneway[pk(p, 1, 1)] = 3; p.solution = null;
  const g = newGame(p, 3);
  input(g, 1); run(g, 2);
  ok(g.cur === 1, 'una flecha en contra corta el paso');
}
// Candado y llave
{
  const p = corridor({ lock: null }); p.lock = pk(p, 3, 2);
  const g = newGame(p, 3);
  input(g, 1); run(g, 0.9); input(g, 2); run(g, 1);
  ok(g.cur === 3 && g.phase === 'play', 'sin llave el candado no se abre');
  const p2 = corridor(); p2.lock = pk(p2, 3, 2); p2.items[1] = 'key';
  const g2 = newGame(p2, 3);
  input(g2, 1); run(g2, 0.9); input(g2, 2); run(g2, 2);
  ok(g2.phase === 'exit' && g2.keys === 0, 'con la llave se abre');
}
// Pico
{
  const W = 2, H = 1, p = { n: 0, W, H, walls: [15 & ~8, 15 & ~2], items: ['pick', null], oneway: {}, lock: null, portals: [], blots: [], entry: 0, exit: 1, lead: 30, sharpen: 5, solution: [0, 1] };
  const g = newGame(p, 3);
  g.items[0] = null; g.picks = 1;
  input(g, 1); run(g, 2);
  ok(g.phase === 'exit' && g.picks === 0, 'el pico atraviesa un muro deslizando contra él');
}
// Goma: si te quedas quieto te alcanza
{
  const p = makePage(1, 123), g = newGame(p, 3);
  const st = newPilot();
  run(g, 1, () => pilot(g, st)); // arranca
  run(g, 30);                  // y se queda quieto en algún momento
  ok(g.phase === 'dead' && (g.reason === 'goma' || g.reason === 'encerrado'), 'la goma alcanza al lápiz parado');
}
// Mina: sin mina, vida perdida
{
  const p = corridor({ lead: 3 }), g = newGame(p, 3);
  input(g, 1); run(g, 0.9); input(g, 2); run(g, 2);
  ok(g.phase === 'dead' && g.reason === 'mina', 'sin mina pierdes una vida');
}
// Portal
{
  const p = corridor(); p.walls = p.walls.slice();
  // portal entre 2 (arriba) y 11 (salida): entrar en 2 te lleva a 11
  p.portals = [{ a: 2, b: 11, color: 0 }];
  const g = newGame(p, 3);
  input(g, 1); run(g, 0.45);
  ok(g.cur === 11, 'el portal te lleva a su pareja');
}

// Generador: 10 páginas × 150 semillas, todas resolubles y el piloto las termina.
for (let n = 0; n < PAGES.length; n++) {
  let solvable = 0, done = 0, deaths = {}, lead = [];
  for (let s = 1; s <= 150; s++) {
    const p = makePage(n, s * 2654435761 >>> 0, s % PAGES[n].H);
    if (solve(p)) solvable++;
    const g = newGame(p, 3), st = newPilot();
    run(g, 120, () => pilot(g, st));
    if (g.phase === 'exit') { done++; lead.push(g.lead / g.leadMax); } else deaths[g.reason] = (deaths[g.reason] || 0) + 1;
  }
  ok(solvable === 150, `página ${n + 1}: 150/150 con solución`);
  ok(done >= 147, `página ${n + 1}: el piloto termina ${done}/150 ${Object.keys(deaths).length ? JSON.stringify(deaths) : ''}`);
}

console.log(fails ? `\n${fails} fallos` : '\nTodo bien');
process.exitCode = fails ? 1 : 0;
