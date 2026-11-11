// Pruebas de las reglas (Node, sin navegador). Uso: node tools/qa/engine.test.mjs
import { newCombat, doMove, doAction, endTurn, danger, heroReach, actions, zoneOf, key, TUTORIAL, N } from '../../web/js/engine.js';
import { newSave, newRun, genMap, nextNodes, encounter, finishRun, buy, applyEvent, ROWS } from '../../web/js/run.js';
import { heroStats, ENEMY, QUESTS } from '../../web/js/data.js';

let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FALLO:', msg); } else console.log('ok  ', msg); };
const H = (over = {}) => ({ ...heroStats({}), hp: 5, arrows: 3, traps: 0, ...over });
const L = (rocks, pits, hero, enemies) => newCombat({ hero: H(), layout: { rocks, pits, hero, enemies } });

// Zonas
{
  const s = L([[3, 1]], [], [0, 7], [['arquero', 3, 4], ['bandido', 3, 6]]);
  const z = zoneOf(s, s.enemies[0]);
  ok(z.has(key(3, 3)) && z.has(key(3, 2)) && !z.has(key(3, 1)), 'arquero: la roca corta la línea');
  ok(z.has(key(3, 5)) && !z.has(key(3, 6)), 'arquero: no dispara a través de un aliado');
  ok(z.has(key(0, 4)) && z.has(key(7, 4)), 'arquero: alcance 5 en horizontal');
  const d = L([], [], [0, 7], [['dragon', 3, 3], ['bandido', 3, 5]]);
  ok(zoneOf(d, d.enemies[0]).has(key(3, 6)), 'dragón: el aliento atraviesa aliados');
}

// Sin daño fuera del rojo; daño dentro.
{
  const s = L([], [], [0, 7], [['bandido', 4, 4]]);
  ok(!danger(s).has(key(0, 7)), 'héroe empieza fuera del rojo');
  endTurn(s);
  ok(s.hero.hp === 5, 'fuera del rojo no recibe daño');
  const e = s.enemies[0];
  ok(Math.abs(e.x - 4) + Math.abs(e.y - 4) === 2, 'bandido se mueve 2 casillas');
  const t = L([], [], [3, 4], [['bandido', 4, 4]]);
  endTurn(t);
  ok(t.hero.hp === 4, 'en el rojo: 1 de daño');
}

// Armadura absorbe primero.
{
  const s = newCombat({ hero: H({ armorMax: 2 }), layout: { hero: [3, 4], enemies: [['bruto', 4, 4]] } });
  endTurn(s);
  ok(s.hero.armor === 0 && s.hero.hp === 5, 'armadura 2 absorbe golpe de 2');
}

// Espada, arco y victoria.
{
  const s = L([], [], [3, 5], [['bandido', 3, 4], ['lobo', 3, 0]]);
  ok(doAction(s, 'sword', 3, 4) && !s.enemies.find((e) => e.type === 'bandido'), 'espada mata bandido (2)');
  ok(!doAction(s, 'bow', 3, 0), 'una sola acción por turno');
  endTurn(s);
  const s2 = L([], [], [3, 7], [['lobo', 3, 2]]);
  ok(doAction(s2, 'bow', 3, 2) && s2.phase === 'won' && s2.hero.arrows === 2, 'arco mata lobo y gana');
}

// Lanza: empujar a la sima, contra roca, contra aliado; pesado no se mueve.
{
  const s = newCombat({ hero: H({ spear: true }), layout: { pits: [[3, 2]], hero: [3, 4], enemies: [['bandido', 3, 3]] } });
  doAction(s, 'spear', 3, 3);
  ok(s.phase === 'won', 'lanza empuja a la sima');
  const r = newCombat({ hero: H({ spear: true }), layout: { rocks: [[3, 2]], hero: [3, 4], enemies: [['bandido', 3, 3]] } });
  doAction(r, 'spear', 3, 3);
  ok(r.phase === 'won', 'lanza contra roca: 1 + 1');
  const a = newCombat({ hero: H({ spear: true }), layout: { hero: [3, 4], enemies: [['bandido', 3, 3], ['lobo', 3, 2]] } });
  doAction(a, 'spear', 3, 3);
  ok(a.enemies.length === 0, 'lanza contra aliado: daño a los dos');
  const b = newCombat({ hero: H({ spear: true }), layout: { pits: [[3, 2]], hero: [3, 4], enemies: [['bruto', 3, 3]] } });
  doAction(b, 'spear', 3, 3);
  ok(b.enemies[0].x === 3 && b.enemies[0].y === 3 && b.enemies[0].hp === 3, 'bruto (pesado) no se empuja');
}

// Trampas: el enemigo la pisa, recibe 2 y pierde el turno.
{
  const s = newCombat({ hero: H({ traps: 1 }), layout: { rocks: [[2, 3], [4, 3]], hero: [3, 5], enemies: [['bandido', 3, 2]] } });
  ok(doAction(s, 'trap', 3, 4), 'coloca trampa');
  ok(!heroReach(s).has(key(3, 4)), 'el héroe no pisa su trampa');
  endTurn(s);
  const e = s.enemies[0];
  ok(!e || (e.stun === 1 && e.hp === 0) || s.phase === 'won', 'bandido cae en la trampa (2 de daño)');
}
{
  const s = newCombat({ hero: H({ traps: 1 }), layout: { hero: [3, 6], enemies: [['bruto', 3, 3]] } });
  doAction(s, 'trap', 3, 5);
  doMove(s, 1, 6);
  endTurn(s); endTurn(s);
  const e = s.enemies[0];
  ok(e && e.hp <= 2 || !e, 'bruto pisa trampa en su camino');
}

// Carga a caballo.
{
  const s = newCombat({ hero: H({ horse: true, charge: 2 }), layout: { hero: [3, 7], enemies: [['bandido', 3, 2], ['lobo', 3, 1]] } });
  const c = actions(s).charge;
  ok(c.length === 1 && c[0].land[1] === 3, 'carga: aterriza junto al enemigo');
  doAction(s, 'charge', 3, 2);
  ok(s.hero.y === 3 && s.enemies.length === 1 && s.enemies[0].type === 'lobo', 'carga: 2 de daño mata al bandido');
}

// Dragón quema a sus aliados.
{
  const s = newCombat({ hero: H({ hp: 9 }), layout: { hero: [3, 6], enemies: [['dragon', 3, 3], ['bandido', 3, 5]] } });
  endTurn(s);
  ok(!s.enemies.find((e) => e.type === 'bandido'), 'aliento del dragón mata al bandido de en medio');
}

// Movimiento: siempre dentro del alcance; mover dos veces no.
{
  const s = newCombat({ seed: 7, hero: H(), roster: ['bandido', 'lobo', 'arquero'] });
  const r = heroReach(s), [kk, d] = [...r][0];
  ok(d <= 3, 'alcance del héroe 3');
  ok(doMove(s, kk % N, (kk / N) | 0) && heroReach(s).size === 0, 'un solo movimiento por turno');
}

// Generación: 300 combates con suelo conectado y enemigos en su sitio.
{
  let good = 0;
  for (let i = 1; i <= 300; i++) {
    const s = newCombat({ seed: i, hero: H(), roster: ['bruto', 'arquero', 'lobo', 'bandido', 'cultista', 'dragon'] });
    good += s.enemies.length === 6 && s.tiles[key(s.hero.x, s.hero.y)] === 'floor' ? 1 : 0;
  }
  ok(good === 300, 'genera 300 combates válidos');
}

// Mapa y expedición.
{
  let okMaps = 0;
  for (let i = 1; i <= 200; i++) {
    const m = genMap(i);
    const reach = m.length === ROWS + 1 && m.every((row, r) => r === m.length - 1 || row.every((n) => n.links.length > 0)) &&
      m.slice(1).every((row, r) => row.every((n) => m[r].some((p) => p.links.includes(n.id))));
    okMaps += reach ? 1 : 0;
  }
  ok(okMaps === 200, 'mapas: todos los nodos con entrada y salida');
  const save = newSave(); save.run = newRun(save, 42);
  ok(nextNodes(save.run).length === 2, 'primera fila: 2 opciones');
  ok(encounter(save.run, `${ROWS}-0`, 1)[0] === 'alfa', 'jefe de la primera gesta: Lobo Alfa');
  save.run.gold = 41;
  const r = finishRun(save, 'death');
  ok(r.gold === 20 && save.gold === 20 && save.run === null, 'muerte: la mitad del oro');
  ok(!buy(save, 'forja') && buy(save, 'taller') && save.build.taller === 1 && save.gold === 0, 'comprar en el refugio');
  ok(heroStats(save.build).trapsMax === 2, 'taller 1 → 2 trampas');
  save.run = newRun(save, 3); save.run.gold = 5;
  ok(applyEvent(save.run, 'herrero', 0) === null, 'evento: no se puede pagar sin oro');
  ok(applyEvent(save.run, 'apuesta', 1) !== null, 'evento: pasar');
  finishRun(save, 'boss');
  ok(save.quest === 1 && save.gold === QUESTS[0].reward + 5, 'jefe: oro + recompensa y siguiente gesta');
}

// Refuerzos: aviso en el turno 5 y llegada en el 6.
{
  const s = newCombat({ hero: H(), layout: { rocks: [[3, 6], [3, 5]], hero: [3, 7], enemies: [['bruto', 0, 0]] } });
  for (let i = 0; i < 4; i++) { endTurn(s); s.ev = []; }
  ok(s.spawn == null && s.turn === 5, 'sin aviso antes del turno 5');
  endTurn(s);
  ok(s.spawn != null && s.turn === 6, 'aviso de refuerzos al acabar el turno 5');
  const at = s.spawn; endTurn(s);
  ok(s.enemies.length === 2 && key(s.enemies[1].x, s.enemies[1].y) === at && s.enemies[1].type === 'bruto', 'llega el refuerzo donde se avisó');
}

// Tutorial válido.
{
  const s = newCombat({ hero: H(), layout: TUTORIAL });
  ok(s.enemies.length === 2 && !danger(s).has(key(3, 7)), 'tutorial: 2 bandidos, empiezas a salvo');
}

for (const t of Object.keys(ENEMY)) ok(ENEMY[t].hp > 0 && ENEMY[t].move > 0, `enemigo ${t} completo`);
console.log(fails ? `\n${fails} fallos` : '\nTodo bien');
process.exitCode = fails ? 1 : 0;
