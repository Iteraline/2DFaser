// Flujo de la partida: título (con demostración automática) → páginas 1-10 → fin. Bucle en tiempo real.
import { makePage } from './maze.js?v=3';
import { newGame, update, input, pageScore, medal } from './game.js?v=3';
import { View, icon } from './draw.js?v=3';
import { newPilot, pilot } from './pilot.js?v=3';
import { PAGES, LIVES, ITEM } from './data.js?v=3';
import { newSeed } from './rng.js?v=3';
import { cy } from './maze.js?v=3';
import * as store from './store.js?v=3';

const $ = (id) => document.getElementById(id);
const view = new View($('cv'));
let rec = store.load();
let mode = 'title', g = null, run = null, demo = null, paused = false, deadT = 0, pageDone = false;

// ---------- Marcador ----------
function miniIcon(type, size = 22, extra) {
  const cv = document.createElement('canvas'), dpr = 2;
  cv.width = cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px';
  const c = cv.getContext('2d'); c.scale(dpr, dpr); icon(c, type, size / 2, size / 2, size * 0.92, extra);
  return cv;
}
(() => { const c = $('leadIcon').getContext('2d'); icon(c, 'lead', 22, 22, 40); })();
let hudKey = '';
function hud() {
  const key = [g.lives, g.stars, run.n, g.keys, g.picks, Math.ceil(g.torch)].join();
  if (key !== hudKey) {
    hudKey = key;
    const L = $('hLives'); L.innerHTML = '';
    for (let i = 0; i < Math.max(LIVES, g.lives); i++) L.appendChild(miniIcon('heart', 20, { empty: i >= g.lives }));
    const S = $('hStars'); S.innerHTML = '';
    for (let i = 0; i < 3; i++) S.appendChild(miniIcon('star', 20, { empty: i >= g.stars }));
    $('hPage').textContent = run.n + 1;
    const inv = $('hInv'); inv.innerHTML = '';
    const chip = (t, n) => { const s = document.createElement('span'); s.className = 'chip'; s.appendChild(miniIcon(t, 20)); if (n != null) { const b = document.createElement('b'); b.textContent = n; s.appendChild(b); } inv.appendChild(s); };
    if (g.keys) chip('key', g.keys > 1 ? g.keys : null);
    if (g.picks) chip('pick', g.picks > 1 ? g.picks : null);
    if (g.torch > 0) chip('torch', Math.ceil(g.torch) + 's');
  }
  $('hScore').textContent = run.score;
  const f = g.lead / g.leadMax;
  $('hLead').style.width = (100 * f).toFixed(1) + '%';
  $('hLead').className = f < 0.2 ? 'low' : f < 0.4 ? 'mid' : '';
}

let toastTimer = 0;
function toast(text, ms = 2600) {
  const t = $('toast'); t.textContent = text; t.hidden = false; t.classList.remove('out');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('out'), ms);
}

function modal({ kicker = '', title, body = '', choices }) {
  return new Promise((res) => {
    $('mdKicker').textContent = kicker; $('mdTitle').textContent = title; $('mdBody').innerHTML = body;
    const box = $('mdChoices'); box.innerHTML = '';
    choices.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = i === 0 ? 'main big' : 'big'; b.textContent = c; b.onclick = () => { $('modal').hidden = true; res(i); }; box.appendChild(b); });
    $('modal').hidden = false;
    setTimeout(() => box.querySelector('button')?.focus(), 30);
  });
}

// ---------- Partida ----------
function startRun() {
  run = { seed: newSeed(), n: 0, lives: LIVES, score: 0, starsTotal: 0, medals: [], entryRow: null };
  rec.plays++; store.save(rec);
  mode = 'play'; $('title').hidden = true; $('hud').hidden = false;
  loadPage(true);
}
function loadPage(fresh) {
  const page = makePage(run.n, (run.seed + run.n * 1000003) >>> 0, run.entryRow);
  g = newGame(page, run.lives);
  view.reset(g); hudKey = ''; deadT = 0; pageDone = false;
  if (window.__auto) window.__auto = newPilot();
  if (fresh) toast(PAGES[run.n].intro, 3200);
}

function handleEvents() {
  for (const e of g.ev.splice(0)) {
    if (e.t === 'item') {
      const p = g.p, x = e.at % p.W, y = (e.at / p.W) | 0;
      view.float(x, y, e.it);
      if (e.it !== 'star') toast(ITEM[e.it], 1600);
      buzz(10);
    } else if (e.t === 'eraser') { toast('¡La goma!', 1400); buzz([20, 40, 20]); }
    else if (e.t === 'pick') buzz(30);
    else if (e.t === 'unlock') toast('Candado abierto', 1200);
    else if (e.t === 'portal') buzz(15);
    else if (e.t === 'die') { view.shake = 0.45; buzz([60, 40, 60]); toast({ goma: '¡Te ha alcanzado la goma!', mina: 'Te has quedado sin mina', tinta: '¡Borrón de tinta!', encerrado: 'Te has encerrado en tu propio trazo' }[e.reason] || 'Vida perdida', 2200); }
    else if (e.t === 'exit') { buzz(20); }
  }
}
const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* nada */ } };

async function onExit() {
  pageDone = true;
  const sc = pageScore(g, g.p.cost / 5), m = medal(g);
  run.score += sc.total; run.starsTotal += g.stars; run.medals.push(m); run.lives = g.lives;
  run.entryRow = cy(g.p, g.p.exit); // el agujero de la salida es la entrada de la siguiente hoja
  const snap = view.snapshot();
  if (run.n === PAGES.length - 1) return finish(true);
  run.n++;
  loadPage(false);
  view.startFlip(snap);
  toast(`Página ${run.n}: +${sc.total}${sc.clean ? ' · trazo limpio' : ''} · ${medalName(m)}`, 1800);
  setTimeout(() => { if (mode === 'play' && g && g.p.n === run.n) toast(PAGES[run.n].intro, 3000); }, 1900);
}
const medalName = (m) => ({ oro: 'lápiz de oro', plata: 'lápiz de plata', bronce: 'lápiz de bronce' }[m]);

async function onDead() {
  run.lives = g.lives;
  if (run.lives <= 0) return finish(false);
  loadPage(false); // la misma hoja otra vez
}

async function finish(won) {
  mode = 'end';
  const newBest = run.score > rec.best;
  rec.best = Math.max(rec.best, run.score); rec.bestPage = Math.max(rec.bestPage, won ? PAGES.length : run.n + 1); store.save(rec);
  const golds = run.medals.filter((m) => m === 'oro').length;
  const i = await modal({
    kicker: won ? '¡Cuaderno completado!' : 'Fin de la partida',
    title: `${run.score} puntos`,
    body: `<p>${won ? 'Has terminado las 10 páginas.' : `Llegaste a la página ${run.n + 1} de 10.`} Estrellas: ${run.starsTotal}/30 · lápices de oro: ${golds}.</p>${newBest ? '<p class="rec">¡Nuevo récord!</p>' : `<p class="muted">Récord: ${rec.best}</p>`}`,
    choices: ['Otra partida', 'Salir']
  });
  if (i === 0) startRun(); else toTitle();
}

function toTitle() {
  mode = 'title'; $('title').hidden = false; $('hud').hidden = true; $('toast').hidden = true;
  $('best').textContent = rec.best ? `Récord: ${rec.best} puntos · página ${rec.bestPage}` : '';
  startDemo();
}
function startDemo() {
  const page = makePage(0, newSeed());
  demo = { g: newGame(page, 3), st: newPilot() };
  view.reset(demo.g);
}

// ---------- Bucle ----------
let last = performance.now();
function frame(now) {
  try { step(now); } catch (e) { showFatal(e); return; }
  requestAnimationFrame(frame);
}
function showFatal(e) {
  const f = document.getElementById('fatal');
  f.hidden = false; f.textContent = 'Error: ' + (e && e.message ? e.message : e) + ' — recarga la página.';
  console.error(e);
}
function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (mode === 'title' && demo) {
    pilot(demo.g, demo.st); update(demo.g, dt);
    if (demo.g.phase !== 'play') { demo.wait = (demo.wait || 0) + dt; if (demo.wait > 1.2) startDemo(); }
    view.draw(demo.g, dt);
  } else if (g) {
    if (mode === 'play' && !paused) {
      for (let i = 0; i < (window.__speed || 1) && g.phase === 'play'; i++) { if (window.__auto) pilot(g, window.__auto); update(g, dt); }
      handleEvents();
      if (g.phase === 'exit' && !pageDone) onExit();
      if (g.phase === 'dead') { deadT += dt; if (deadT > 1.1) onDead(); }
      hud();
    }
    view.draw(g, dt);
  }
}
requestAnimationFrame(frame);

// ---------- Controles ----------
const stage = $('stage');
let touch = null;
stage.addEventListener('pointerdown', (e) => { if (mode !== 'play' || paused) return; touch = { x: e.clientX, y: e.clientY, t: performance.now(), swiped: false }; stage.setPointerCapture(e.pointerId); e.preventDefault(); });
stage.addEventListener('pointermove', (e) => {
  if (!touch || !g) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  if (Math.hypot(dx, dy) < 18) return;
  const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
  input(g, d); touch.x = e.clientX; touch.y = e.clientY; touch.swiped = true;
});
const end = () => { if (touch && !touch.swiped && performance.now() - touch.t < 300 && g) input(g, -2); touch = null; };
stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', () => { touch = null; });
window.addEventListener('keydown', (e) => {
  if (mode !== 'play' || !g || paused) return;
  const d = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3, Space: -2 }[e.code];
  if (d !== undefined) { input(g, d); e.preventDefault(); }
  if (e.code === 'Escape' || e.code === 'KeyP') pause();
});
async function pause() {
  if (mode !== 'play') return;
  paused = true;
  const i = await modal({ kicker: 'Pausa', title: `Página ${run.n + 1}`, body: '<p class="muted">La goma también espera.</p>', choices: ['Seguir', 'Abandonar la partida'] });
  paused = false; last = performance.now();
  if (i === 1) { run.lives = 0; finish(false); }
}
$('pause').onclick = pause;
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play' && !paused) pause(); });
$('play').onclick = startRun;

toTitle();
if ('serviceWorker' in navigator && !/^(localhost|127\.)/.test(location.hostname)) navigator.serviceWorker.register('/sw.js').catch(() => {});
// Si al abrir el juego hay pantallas en reposo del sistema o se gira el móvil, recolocar.
window.addEventListener('orientationchange', () => setTimeout(() => view.resize(), 250));
// Para las pruebas automáticas
window.__game = { get g() { return g; }, get run() { return run; }, get mode() { return mode; }, view, newPilot };
