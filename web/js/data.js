// «A Lápiz»: configuración de las páginas del cuaderno y de los símbolos. Sin lógica.

// Velocidad del lápiz en casillas por segundo.
export const SPEED = 5;

// Cuaderno de Matemáticas: 10 páginas. Cada una introduce algo nuevo.
// eraser: goma (null = no aparece) · radius: visión en casillas · loops: % de muros quitados (más caminos)
// arrows: [en el camino, trampa] · portals: parejas · blots: borrones de tinta · lead: mina = casillas de la página × lead (o el doble del camino óptimo si es más)
export const PAGES = [
  { lead: 1.6, W: 7, H: 9, loops: 0.04, eraser: null, radius: 4.5, intro: 'Desliza para mover el lápiz. Busca el agujero del borde derecho.' },
  { lead: 1.4, W: 8, H: 10, loops: 0.05, eraser: { delay: 7, speed: 2.6 }, radius: 3.6, sharpen: 1, intro: '¡Cuidado! La goma borra tu trazo y te persigue.' },
  { lead: 1.5, W: 9, H: 11, loops: 0.05, eraser: { delay: 6, speed: 2.8 }, radius: 3.4, sharpen: 1, arrows: [3, 2], intro: 'Las flechas solo dejan pasar en un sentido.' },
  { lead: 1.4, W: 9, H: 12, loops: 0.06, eraser: { delay: 6, speed: 2.9 }, radius: 3.2, sharpen: 1, arrows: [2, 2], portals: 1, heart: true, intro: 'Los portales del mismo color están conectados.' },
  { lead: 1.4, W: 10, H: 13, loops: 0.06, eraser: { delay: 6, speed: 3.0 }, radius: 2.8, sharpen: 1, arrows: [2, 2], portals: 1, torch: true, eye: true, intro: 'Está más oscuro. La antorcha alumbra y el ojo te señala la salida.' },
  { lead: 1.6, W: 10, H: 13, loops: 0.05, eraser: { delay: 6, speed: 3.0 }, radius: 3.0, sharpen: 1, arrows: [2, 2], key: true, eye: true, intro: 'Un candado cierra el paso. Busca la llave.' },
  { lead: 1.3, W: 11, H: 14, loops: 0.07, eraser: { delay: 6, speed: 3.1 }, radius: 3.0, sharpen: 1, arrows: [2, 2], blots: 1, torch: true, intro: 'Los borrones de tinta patrullan. No los toques.' },
  { lead: 1.3, W: 11, H: 14, loops: 0.05, eraser: { delay: 5, speed: 3.2 }, radius: 3.0, sharpen: 1, arrows: [2, 2], pick: true, blots: 1, heart: true, intro: 'Con el pico atraviesas un muro: desliza contra él.' },
  { lead: 1.4, W: 12, H: 15, loops: 0.06, eraser: { delay: 5, speed: 3.3 }, radius: 2.8, sharpen: 2, arrows: [3, 2], portals: 1, key: true, pick: true, blots: 1, torch: true, eye: true, intro: 'Todo junto.' },
  { lead: 1.3, W: 12, H: 16, loops: 0.06, eraser: { delay: 4, speed: 3.5 }, radius: 2.6, sharpen: 2, arrows: [3, 2], portals: 2, key: true, pick: true, blots: 2, torch: true, eye: true, intro: 'Última página. La goma va más rápida.' }
];

export const ITEM = {
  star: 'Estrella',
  sharpen: 'Sacapuntas: recarga la mina',
  torch: 'Antorcha: más visión durante 10 s',
  eye: 'Ojo: señala la salida 3 s',
  heart: 'Corazón: una vida más',
  key: 'Llave: abre el candado',
  pick: 'Pico: atraviesa un muro'
};
export const PORTAL_COLORS = ['#2f6fe0', '#e0862f', '#2fa86f'];
export const LIVES = 3;
export const TORCH_TIME = 10, EYE_TIME = 3, TORCH_RADIUS = 6;
