// Datos del juego: enemigos, gestas, edificios del refugio, eventos. Sin lógica.

// zone: melee (4 adyacentes) · sweep (8 alrededor) · line (4 rectas, range) · diag (4 diagonales, range) · breath (cruz que atraviesa unidades)
export const ENEMY = {
  lobo:     { name: 'Lobo', hp: 1, dmg: 1, move: 3, zone: 'melee', glyph: 'L', gold: 2, tip: 'Rápido (3 casillas). Muerde al lado.' },
  bandido:  { name: 'Bandido', hp: 2, dmg: 1, move: 2, zone: 'melee', glyph: 'B', gold: 3, tip: 'Golpea al lado.' },
  arquero:  { name: 'Arquero', hp: 1, dmg: 1, move: 2, zone: 'line', range: 5, glyph: 'A', gold: 3, tip: 'Dispara en línea recta (5). No a través de aliados ni rocas.' },
  bruto:    { name: 'Bruto', hp: 4, dmg: 2, move: 1, zone: 'melee', glyph: 'O', gold: 5, heavy: true, tip: 'Lento y duro. No se le puede empujar.' },
  cultista: { name: 'Cultista', hp: 2, dmg: 1, move: 2, zone: 'diag', range: 4, glyph: 'C', gold: 4, tip: 'Maldice en diagonal (4).' },
  alfa:     { name: 'Lobo Alfa', hp: 6, dmg: 2, move: 3, zone: 'melee', glyph: 'α', gold: 0, heavy: true, boss: true, tip: 'Jefe. Rápido y fuerte.' },
  rey:      { name: 'Rey Bandido', hp: 7, dmg: 2, move: 2, zone: 'sweep', glyph: 'R', gold: 0, heavy: true, boss: true, tip: 'Jefe. Mandoble: golpea las 8 casillas de alrededor.' },
  bruja:    { name: 'Bruja', hp: 6, dmg: 2, move: 2, zone: 'diag', range: 5, glyph: 'Ψ', gold: 0, heavy: true, boss: true, tip: 'Jefe. Maldición en diagonal (5).' },
  dragon:   { name: 'Ígnar', hp: 12, dmg: 2, move: 1, zone: 'breath', range: 3, glyph: 'Δ', gold: 0, heavy: true, boss: true, tip: 'Dragón. Aliento en cruz (3) que quema también a los suyos.' }
};

export const QUESTS = [
  { id: 'bosque', name: 'El Bosque de los Lobos', goal: 'Rompe la maldición del bosque', pool: ['lobo', 'bandido'], boss: 'alfa', escort: ['lobo', 'lobo'], base: 2, reward: 40,
    intro: 'Una maldición pudre el bosque. El Lobo Alfa la guarda.', done: 'La maldición del bosque se rompe. Los caminos al este se abren.' },
  { id: 'ruinas', name: 'Las Ruinas', goal: 'Recupera el tesoro del reino', pool: ['bandido', 'arquero', 'lobo', 'bruto'], boss: 'rey', escort: ['arquero', 'bandido'], base: 3, reward: 60,
    intro: 'El Rey Bandido esconde el tesoro de Valdeluz entre las ruinas.', done: 'Recuperas el tesoro. Con él podrás pagar la subida a la torre.' },
  { id: 'torre', name: 'La Torre', goal: 'Rescata a la princesa', pool: ['cultista', 'arquero', 'bruto', 'bandido'], boss: 'bruja', escort: ['cultista', 'bruto'], base: 3, reward: 80,
    intro: 'La bruja de Ígnar tiene a la princesa encerrada en lo alto de la torre.', done: 'La princesa es libre. Te señala la montaña: «Ígnar duerme allí».' },
  { id: 'montana', name: 'La Montaña', goal: 'Mata al dragón Ígnar', pool: ['bruto', 'arquero', 'cultista', 'lobo', 'bandido'], boss: 'dragon', escort: ['bruto', 'arquero'], base: 4, reward: 150,
    intro: 'Ígnar te espera en la cumbre. Su aliento quema todo lo que toca, incluso a los suyos.', done: 'Ígnar cae. Valdeluz es libre. ¡Eres una leyenda!' }
];

export const BUILD = {
  taller:   { name: 'Taller', icon: '✱', costs: [20, 50, 90], desc: ['Trampas: 2 por expedición', 'Trampas: 3 por expedición', 'Trampas: 4 por expedición'] },
  forja:    { name: 'Forja', icon: '⚒', costs: [30, 80], desc: ['Lanza: daño 1 y empuja', 'Espada: daño 3'] },
  armeria:  { name: 'Armería', icon: '⛨', costs: [40, 90, 150], desc: ['Armadura 2 en cada combate', 'Armadura 3', 'Armadura 4'] },
  huerto:   { name: 'Huerto', icon: '♥', costs: [25, 60, 110], desc: ['+1 corazón', '+1 corazón', '+1 corazón'] },
  arqueria: { name: 'Arquería', icon: '➶', costs: [20, 50], desc: ['5 flechas', '7 flechas'] },
  establo:  { name: 'Establo', icon: '♘', costs: [60, 120], desc: ['Caballo: mueve 4 y carga (2 de daño y empuje)', 'Carga: 3 de daño'] }
};
export const BUILD_ORDER = ['taller', 'forja', 'armeria', 'huerto', 'arqueria', 'establo'];

// Héroe a partir de los edificios del refugio.
export function heroStats(b = {}) {
  const lv = (k) => b[k] || 0;
  return {
    maxHp: 5 + lv('huerto'),
    armorMax: [0, 2, 3, 4][lv('armeria')],
    arrowsMax: [3, 5, 7][lv('arqueria')],
    trapsMax: [0, 2, 3, 4][lv('taller')],
    sword: lv('forja') >= 2 ? 3 : 2,
    spear: lv('forja') >= 1,
    horse: lv('establo') >= 1,
    charge: lv('establo') >= 2 ? 3 : 2,
    moveRange: lv('establo') >= 1 ? 4 : 3
  };
}

export const NODE = {
  combate: { icon: '⚔', name: 'Combate' },
  elite:   { icon: '☠', name: 'Élite' },
  botin:   { icon: '◆', name: 'Botín' },
  evento:  { icon: '?', name: 'Encuentro' },
  hoguera: { icon: '▲', name: 'Hoguera' },
  jefe:    { icon: '♛', name: 'Jefe' }
};

// Eventos: cada opción tiene efecto {gold, hp, heal, arrows, traps, maxHpRun}; need = requisito.
export const EVENTS = [
  { id: 'viajero', title: 'Un viajero herido', text: 'Un mercader herido te pide ayuda junto al camino.', choices: [
    { label: 'Curarle con tus vendas (−1 ♥)', eff: { hp: -1, gold: 20 }, res: 'Agradecido, te da 20 de oro.' },
    { label: 'Seguir tu camino', eff: {}, res: 'Le dejas atrás.' }
  ] },
  { id: 'cofre', title: 'Un cofre con cerradura', text: 'Un cofre viejo entre zarzas. Huele a trampa.', choices: [
    { label: 'Forzarlo (50 %: 30 oro o −2 ♥)', eff: { gamble: true }, res: '' },
    { label: 'Dejarlo', eff: {}, res: 'Mejor no tentar a la suerte.' }
  ] },
  { id: 'herrero', title: 'Un herrero ambulante', text: '«Por 15 monedas te afilo las flechas y te doy más.»', choices: [
    { label: 'Pagar 15 (+3 flechas)', eff: { gold: -15, arrows: 3 }, need: { gold: 15 }, res: 'Carcaj lleno.' },
    { label: 'No, gracias', eff: {}, res: 'Se encoge de hombros.' }
  ] },
  { id: 'fuente', title: 'Una fuente clara', text: 'El agua brilla con una luz extraña.', choices: [
    { label: 'Beber (+2 ♥)', eff: { heal: 2 }, res: 'Te sientes mejor.' },
    { label: 'Llenar trampas de agua bendita (+1 trampa)', eff: { traps: 1 }, res: 'Una trampa más.' }
  ] },
  { id: 'apuesta', title: 'Soldados jugando a los dados', text: '«¿Te atreves? Doble o nada.»', choices: [
    { label: 'Apostar 10 (50 %: +20)', eff: { bet: 10 }, need: { gold: 10 }, res: '' },
    { label: 'Pasar', eff: {}, res: 'Sigues adelante.' }
  ] },
  { id: 'altar', title: 'Un altar antiguo', text: 'Una voz susurra: «Sangre por fuerza».', choices: [
    { label: 'Ofrecer sangre (−1 ♥ máx., +1 armadura en esta expedición)', eff: { maxHpRun: -1, armorRun: 1 }, res: 'La piedra se templa en tu piel.' },
    { label: 'Rezar (+1 ♥)', eff: { heal: 1 }, res: 'Calma.' }
  ] }
];

export const STORY = {
  opening: 'El dragón Ígnar ha raptado a la princesa y una maldición cubre Valdeluz. Coge tu espada.'
};
