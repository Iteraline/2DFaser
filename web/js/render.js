// Dibujo del tablero en canvas y animación de los eventos del motor. Formas planas y limpias (fase 1).
import { N, key, danger, zoneOf, trapAt } from './engine.js';
import { ENEMY } from './data.js';

const C = {
  floorA: '#ece6d6', floorB: '#e3dcc9', grid: 'rgba(60,50,30,0.10)',
  rock: '#7a7f8c', rockTop: '#9aa0ad', pit: '#121620',
  danger: 'rgba(230,57,70,0.30)', dangerEdge: 'rgba(200,30,45,0.55)',
  reach: 'rgba(52,120,246,0.30)', reachDot: '#2f6fe0',
  target: '#f5b400', zoneSel: 'rgba(124,58,237,0.38)',
  hero: '#2563eb', heroRing: '#f5b400',
  enemy: '#c0392b', boss: '#5b21b6', ink: '#ffffff', hpOn: '#e63946', hpOff: 'rgba(0,0,0,0.25)',
  trap: '#d97706', arrow: '#3b2f1e', fire: '#f97316', curse: '#8b5cf6', armor: '#64748b'
};
const ENEMY_COLOR = { lobo: '#8d6e63', bandido: '#c0392b', arquero: '#2e7d32', bruto: '#6d4c41', cultista: '#7b1fa2' };
const ease = (t) => 1 - (1 - t) * (1 - t);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class Board {
  constructor(canvas) {
    this.cv = canvas; this.cx = canvas.getContext('2d');
    this.s = null; this.spr = new Map(); this.fx = []; this.ui = { reach: null, targets: null, sel: null, showDanger: true };
    this.size = 0; this.cell = 0; this.ox = 0; this.oy = 0; this.speed = 1;
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    const loop = () => { this.draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  resize() {
    const r = this.cv.parentElement.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    this.dpr = dpr; this.size = Math.min(r.width, r.height); this.cell = this.size / N;
    this.ox = (r.width - this.size) / 2; this.oy = r.height > r.width ? 0 : (r.height - this.size) / 2;
  }
  load(s) {
    this.s = s; this.spr.clear(); this.fx = [];
    this.spr.set('hero', { x: s.hero.x, y: s.hero.y, a: 1, flash: 0, dx: 0, dy: 0, sc: 1 });
    for (const e of s.enemies) this.spr.set(e.id, { x: e.x, y: e.y, a: 1, flash: 0, dx: 0, dy: 0, sc: 1, type: e.type });
  }
  sync() { // tras animar: posiciones lógicas
    const s = this.s, ids = new Set(['hero', ...s.enemies.map((e) => e.id)]);
    for (const id of [...this.spr.keys()]) if (!ids.has(id)) this.spr.delete(id);
    const h = this.spr.get('hero'); Object.assign(h, { x: s.hero.x, y: s.hero.y, a: 1, sc: 1, dx: 0, dy: 0 });
    for (const e of s.enemies) { const sp = this.spr.get(e.id) || { flash: 0, type: e.type }; Object.assign(sp, { x: e.x, y: e.y, a: 1, sc: 1, dx: 0, dy: 0 }); this.spr.set(e.id, sp); }
  }
  tileAt(px, py) {
    const x = Math.floor((px - this.ox) / this.cell), y = Math.floor((py - this.oy) / this.cell);
    return x >= 0 && y >= 0 && x < N && y < N ? [x, y] : null;
  }
  center(x, y) { return [this.ox + (x + 0.5) * this.cell, this.oy + (y + 0.5) * this.cell]; }

  tween(ms, fn) {
    ms = ms / this.speed;
    return new Promise((res) => { const t0 = performance.now(); const step = () => { const t = Math.min(1, (performance.now() - t0) / ms); fn(t); if (t < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
  }
  float(x, y, text, color) { this.fx.push({ kind: 'text', x, y, text, color, t0: performance.now(), ms: 900 }); }

  // Reproduce los eventos del motor en orden.
  async play(events) {
    for (const e of events) {
      const sp = e.id ? this.spr.get(e.id) : null;
      if (e.t === 'move' && sp) {
        const per = (e.id === 'hero' ? 70 : 90) * (e.fast ? 0.6 : 1);
        for (let i = 1; i < e.path.length; i++) {
          const [ax, ay] = e.path[i - 1], [bx, by] = e.path[i];
          await this.tween(per, (t) => { sp.x = ax + (bx - ax) * ease(t); sp.y = ay + (by - ay) * ease(t); });
        }
      } else if (e.t === 'push' && sp) {
        const ax = sp.x, ay = sp.y;
        await this.tween(130, (t) => { sp.x = ax + (e.to[0] - ax) * ease(t); sp.y = ay + (e.to[1] - ay) * ease(t); });
      } else if (e.t === 'strike' && sp) {
        const dx = Math.sign(e.to[0] - sp.x) * 0.3, dy = Math.sign(e.to[1] - sp.y) * 0.3;
        await this.tween(140, (t) => { const k = Math.sin(t * Math.PI); sp.dx = dx * k; sp.dy = dy * k; });
      } else if (e.t === 'shot') {
        const from = e.from, to = e.to, color = e.kind === 'fire' ? C.fire : e.kind === 'curse' ? C.curse : C.arrow;
        if (e.kind === 'fire') this.fx.push({ kind: 'cross', x: from[0], y: from[1], color, t0: performance.now(), ms: 420 / this.speed, range: ENEMY.dragon.range });
        else this.fx.push({ kind: 'line', from, to, color, t0: performance.now(), ms: 260 / this.speed, w: e.kind === 'curse' ? 5 : 3 });
        await wait(200 / this.speed);
      } else if (e.t === 'hit') {
        const sp2 = this.spr.get(e.id);
        if (sp2) {
          sp2.flash = 1;
          if (e.dmg > 0) this.float(sp2.x, sp2.y, '−' + e.dmg, e.id === 'hero' ? C.hpOn : '#111');
          if (e.armor) this.float(sp2.x + 0.25, sp2.y - 0.25, '⛨−' + e.armor, C.armor);
          await this.tween(180, (t) => { sp2.flash = 1 - t; });
        }
      } else if (e.t === 'bump' && sp) {
        await this.tween(140, (t) => { const k = Math.sin(t * Math.PI * 3) * 0.08; sp.dx = e.dir[0] * k; sp.dy = e.dir[1] * k; });
      } else if (e.t === 'fall' && sp) {
        await this.tween(220, (t) => { sp.sc = 1 - t * 0.8; sp.a = 1 - t; });
      } else if (e.t === 'die' && sp) {
        await this.tween(220, (t) => { sp.a = Math.min(sp.a, 1 - t); sp.sc = Math.min(sp.sc, 1 - t * 0.3); });
        this.spr.delete(e.id);
      } else if (e.t === 'trap') {
        this.fx.push({ kind: 'burst', x: e.at[0], y: e.at[1], color: C.trap, t0: performance.now(), ms: 380 });
        await wait(150 / this.speed);
      } else if (e.t === 'trapset') {
        this.fx.push({ kind: 'burst', x: e.at[0], y: e.at[1], color: C.trap, t0: performance.now(), ms: 300 });
      } else if (e.t === 'stunned' && sp) {
        this.float(sp.x, sp.y, 'zZ', '#555');
      } else if (e.t === 'spawn') {
        const ns = { x: e.at[0], y: e.at[1], a: 0, flash: 0, dx: 0, dy: 0, sc: 1.4, type: e.type };
        this.spr.set(e.id, ns);
        await this.tween(260, (t) => { ns.a = t; ns.sc = 1.4 - 0.4 * t; });
      } else if (e.t === 'warn') {
        this.fx.push({ kind: 'burst', x: e.at[0], y: e.at[1], color: '#e63946', t0: performance.now(), ms: 500 });
      } else if (e.t === 'enemyturn') {
        await wait(160 / this.speed);
      }
    }
    this.sync();
  }

  draw() {
    const cx = this.cx, s = this.s;
    cx.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
    cx.clearRect(0, 0, this.cv.width, this.cv.height);
    if (!s || !this.cell) return;
    const c = this.cell, X = (x) => this.ox + x * c, Y = (y) => this.oy + y * c;
    // Suelo, rocas, simas
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const t = s.tiles[key(x, y)];
      cx.fillStyle = (x + y) % 2 ? C.floorB : C.floorA;
      cx.fillRect(X(x), Y(y), c + 0.5, c + 0.5);
      if (t === 'rock') {
        rr(cx, X(x) + c * 0.08, Y(y) + c * 0.12, c * 0.84, c * 0.8, c * 0.16); cx.fillStyle = C.rock; cx.fill();
        rr(cx, X(x) + c * 0.08, Y(y) + c * 0.08, c * 0.84, c * 0.62, c * 0.16); cx.fillStyle = C.rockTop; cx.fill();
      } else if (t === 'pit') {
        rr(cx, X(x) + c * 0.06, Y(y) + c * 0.06, c * 0.88, c * 0.88, c * 0.3); cx.fillStyle = C.pit; cx.fill();
        rr(cx, X(x) + c * 0.18, Y(y) + c * 0.18, c * 0.64, c * 0.64, c * 0.24); cx.fillStyle = '#000'; cx.fill();
      }
    }
    cx.strokeStyle = C.grid; cx.lineWidth = 1;
    for (let i = 0; i <= N; i++) { cx.beginPath(); cx.moveTo(X(i), Y(0)); cx.lineTo(X(i), Y(N)); cx.moveTo(X(0), Y(i)); cx.lineTo(X(N), Y(i)); cx.stroke(); }
    // Peligro
    if (this.ui.showDanger && s.phase === 'player') {
      for (const kk of danger(s)) {
        const x = kk % N, y = (kk / N) | 0;
        if (s.tiles[kk] === 'pit') continue;
        cx.fillStyle = C.danger; cx.fillRect(X(x), Y(y), c, c);
        cx.strokeStyle = C.dangerEdge; cx.lineWidth = 2; cx.strokeRect(X(x) + 2, Y(y) + 2, c - 4, c - 4);
      }
    }
    // Zona del enemigo seleccionado
    if (this.ui.sel) {
      const e = s.enemies.find((q) => q.id === this.ui.sel);
      if (e) for (const kk of zoneOf(s, e)) { cx.fillStyle = C.zoneSel; cx.fillRect(X(kk % N), Y((kk / N) | 0), c, c); }
    }
    // Alcance del héroe
    if (this.ui.reach) {
      const dz = this.ui.showDanger ? danger(s) : new Set();
      for (const kk of this.ui.reach.keys()) {
        const x = kk % N, y = (kk / N) | 0;
        if (!dz.has(kk)) { cx.fillStyle = C.reach; cx.fillRect(X(x) + 1, Y(y) + 1, c - 2, c - 2); }
        cx.beginPath(); cx.arc(X(x) + c / 2, Y(y) + c / 2, c * 0.09, 0, 7); cx.fillStyle = C.reachDot; cx.fill();
        cx.lineWidth = 2; cx.strokeStyle = '#fff'; cx.stroke();
      }
    }
    // Trampas
    for (const kk of s.traps) spikes(cx, X(kk % N) + c / 2, Y((kk / N) | 0) + c / 2, c * 0.28, C.trap);
    // Aviso de refuerzos
    if (s.spawn != null) {
      const x = s.spawn % N, y = (s.spawn / N) | 0, px = X(x) + c / 2, py = Y(y) + c / 2;
      cx.setLineDash([c * 0.08, c * 0.06]); cx.strokeStyle = '#c1121f'; cx.lineWidth = 3;
      cx.beginPath(); cx.arc(px, py, c * 0.32, 0, 7); cx.stroke(); cx.setLineDash([]);
      cx.fillStyle = '#c1121f'; cx.font = `800 ${Math.round(c * 0.4)}px Bricolage, sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText('!', px, py + 1);
    }
    // Objetivos de la acción elegida
    if (this.ui.targets) for (const t of this.ui.targets) {
      cx.strokeStyle = C.target; cx.lineWidth = Math.max(3, c * 0.07);
      rr(cx, X(t.x) + c * 0.06, Y(t.y) + c * 0.06, c * 0.88, c * 0.88, c * 0.18); cx.stroke();
    }
    // Unidades
    const order = [...this.spr.entries()].sort((a, b) => a[1].y - b[1].y);
    for (const [id, sp] of order) {
      const px = X(sp.x + sp.dx) + c / 2, py = Y(sp.y + sp.dy) + c / 2;
      cx.globalAlpha = sp.a;
      if (id === 'hero') drawHero(cx, px, py, c * 0.36 * sp.sc, s.hero, sp.flash);
      else {
        const e = s.enemies.find((q) => q.id === id), type = sp.type, d = ENEMY[type];
        drawEnemy(cx, px, py, c * (d.boss ? 0.44 : 0.34) * sp.sc, type, d, e, sp.flash, this.ui.sel === id);
      }
      cx.globalAlpha = 1;
    }
    // Efectos
    const now = performance.now();
    this.fx = this.fx.filter((f) => now - f.t0 < f.ms);
    for (const f of this.fx) {
      const t = (now - f.t0) / f.ms;
      if (f.kind === 'text') {
        cx.globalAlpha = 1 - t; cx.fillStyle = f.color; cx.font = `800 ${Math.round(c * 0.36)}px Bricolage, sans-serif`; cx.textAlign = 'center';
        cx.strokeStyle = 'rgba(255,255,255,0.85)'; cx.lineWidth = 4;
        const [px, py] = [X(f.x) + c / 2, Y(f.y) + c * 0.2 - t * c * 0.5];
        cx.strokeText(f.text, px, py); cx.fillText(f.text, px, py); cx.globalAlpha = 1;
      } else if (f.kind === 'line') {
        const [ax, ay] = [X(f.from[0]) + c / 2, Y(f.from[1]) + c / 2], [bx, by] = [X(f.to[0]) + c / 2, Y(f.to[1]) + c / 2];
        const p = Math.min(1, t * 1.6);
        cx.strokeStyle = f.color; cx.lineWidth = f.w; cx.lineCap = 'round'; cx.globalAlpha = 1 - Math.max(0, t - 0.6) / 0.4;
        cx.beginPath(); cx.moveTo(ax + (bx - ax) * Math.max(0, p - 0.35), ay + (by - ay) * Math.max(0, p - 0.35)); cx.lineTo(ax + (bx - ax) * p, ay + (by - ay) * p); cx.stroke(); cx.globalAlpha = 1;
      } else if (f.kind === 'cross') {
        cx.fillStyle = f.color; cx.globalAlpha = 0.55 * (1 - t);
        const r = f.range;
        cx.fillRect(X(f.x - r), Y(f.y) + c * 0.2, c * (2 * r + 1), c * 0.6);
        cx.fillRect(X(f.x) + c * 0.2, Y(f.y - r), c * 0.6, c * (2 * r + 1)); cx.globalAlpha = 1;
      } else if (f.kind === 'burst') {
        cx.strokeStyle = f.color; cx.lineWidth = 3; cx.globalAlpha = 1 - t;
        cx.beginPath(); cx.arc(X(f.x) + c / 2, Y(f.y) + c / 2, c * (0.2 + t * 0.4), 0, 7); cx.stroke(); cx.globalAlpha = 1;
      }
    }
  }
}

function rr(cx, x, y, w, h, r) { cx.beginPath(); cx.roundRect ? cx.roundRect(x, y, w, h, r) : cx.rect(x, y, w, h); }
function spikes(cx, x, y, r, color) {
  cx.strokeStyle = color; cx.lineWidth = Math.max(2, r * 0.22); cx.lineCap = 'round';
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; cx.beginPath(); cx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); cx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); cx.stroke(); }
}
function shadow(cx, x, y, r) { cx.beginPath(); cx.ellipse(x, y + r * 0.95, r * 0.9, r * 0.28, 0, 0, 7); cx.fillStyle = 'rgba(0,0,0,0.18)'; cx.fill(); }
function drawHero(cx, x, y, r, h, flash) {
  shadow(cx, x, y, r);
  if (h.horse) { cx.beginPath(); cx.arc(x, y, r * 1.18, 0, 7); cx.fillStyle = C.heroRing; cx.fill(); }
  cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.fillStyle = flash > 0 ? mix(C.hero, '#ffffff', flash) : C.hero; cx.fill();
  if (h.armor > 0) { cx.lineWidth = r * 0.16; cx.strokeStyle = '#cbd5e1'; cx.beginPath(); cx.arc(x, y, r * 0.92, 0, 7); cx.stroke(); }
  // Espada: hoja con punta, guarda, empuñadura y pomo
  cx.fillStyle = '#fff';
  cx.beginPath(); cx.moveTo(x, y - r * 0.72); cx.lineTo(x + r * 0.11, y - r * 0.56); cx.lineTo(x + r * 0.11, y + r * 0.2); cx.lineTo(x - r * 0.11, y + r * 0.2); cx.lineTo(x - r * 0.11, y - r * 0.56); cx.closePath(); cx.fill();
  cx.fillRect(x - r * 0.4, y + r * 0.2, r * 0.8, r * 0.13);
  cx.fillRect(x - r * 0.07, y + r * 0.33, r * 0.14, r * 0.28);
  cx.beginPath(); cx.arc(x, y + r * 0.66, r * 0.1, 0, 7); cx.fill();
}
function drawEnemy(cx, x, y, r, type, d, e, flash, selected) {
  shadow(cx, x, y, r);
  const base = d.boss ? C.boss : ENEMY_COLOR[type] || C.enemy;
  if (d.boss) { cx.beginPath(); cx.arc(x, y, r * 1.12, 0, 7); cx.fillStyle = '#f5b400'; cx.fill(); }
  cx.beginPath();
  if (d.heavy && !d.boss) { rr(cx, x - r, y - r, 2 * r, 2 * r, r * 0.35); } else cx.arc(x, y, r, 0, 7);
  cx.fillStyle = flash > 0 ? mix(base, '#ffffff', flash) : base; cx.fill();
  if (selected) { cx.lineWidth = 3; cx.strokeStyle = '#7c3aed'; cx.stroke(); }
  cx.fillStyle = C.ink; cx.font = `800 ${Math.round(r * 1.05)}px Bricolage, sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText(d.glyph, x, y + r * 0.05);
  if (e) { // vida
    const n = e.maxHp, w = Math.min(r * 2.2, n * r * 0.36), pw = w / n;
    for (let i = 0; i < n; i++) { cx.fillStyle = i < e.hp ? C.hpOn : C.hpOff; cx.fillRect(x - w / 2 + i * pw + 1, y + r * 1.12, pw - 2, Math.max(3, r * 0.18)); }
    if (e.stun) { cx.fillStyle = '#334155'; cx.font = `700 ${Math.round(r * 0.6)}px Figtree, sans-serif`; cx.fillText('zZ', x + r * 0.9, y - r * 0.9); }
  }
}
function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
export { trapAt };
