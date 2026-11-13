// Piloto automático: sigue la solución de la página. Lo usan la pantalla de título (modo demostración) y las pruebas.
import { queue as input, blotXY } from './game.js';
import { dirTo, cx, cy } from './maze.js';

export const newPilot = () => ({ i: 0, wait: 0 });

export function pilot(g, st) {
  if (g.phase !== 'play') return;
  const p = g.p, sol = p.solution, base = g.to >= 0 ? g.to : g.cur;
  let i = sol.indexOf(base, st.i);
  if (i < 0) i = sol.indexOf(base);
  if (i < 0) { // fuera de la solución (por ejemplo, tras mover a mano): volver por el propio trazo
    const stack = g.to >= 0 && !g.back ? [...g.stack, g.to] : g.stack;
    const prev = stack[stack.length - 2];
    if (prev !== undefined) input(g, dirTo(p, base, prev));
    return;
  }
  st.i = i;
  const next = sol[i + 1];
  if (next === undefined) { input(g, 1); return; } // en la casilla de salida: hacia el agujero
  // Esperar si un borrón de tinta ronda la siguiente casilla.
  const nx = cx(p, next), ny = cy(p, next);
  const risky = g.blots.some((b) => { const [bx, by] = blotXY(g, b); return Math.abs(bx - nx) + Math.abs(by - ny) < 1.8; });
  if (risky) { if (g.to >= 0 || g.dir >= 0) input(g, -2); return; }
  input(g, dirTo(p, base, next));
}
