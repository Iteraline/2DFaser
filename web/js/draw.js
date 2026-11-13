// Dibujo en canvas: cuaderno de cuadros, muros a lápiz con temblor, trazo rojo, goma, lápiz, iconos y paso de página.
import { cx, cy, nb, pk, open, DX, DY } from './maze.js';
import { pencilXY, radius, blotXY } from './game.js';
import { PORTAL_COLORS } from './data.js';

const PAPER = '#fbf8ef', GRID = '#d3deea', MARGIN = '#e9a3a3', WALL = '#3b3a37', INK = '#d23a33', INK_OLD = 'rgba(210,58,51,0.35)';
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------- Iconos (también se usan en el marcador HTML) ----------
export function icon(c, type, x, y, s, extra = {}) {
  c.save(); c.translate(x, y); c.scale(s / 24, s / 24); c.lineJoin = 'round'; c.lineCap = 'round';
  const stroke = (w = 1.8, col = '#2b2a27') => { c.lineWidth = w; c.strokeStyle = col; c.stroke(); };
  if (type === 'star') {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 4.6 : 10, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r + 1); }
    c.closePath(); c.fillStyle = extra.empty ? 'rgba(0,0,0,0)' : '#f5b400'; c.fill(); stroke(1.6, extra.empty ? '#8a8578' : '#7a5a00');
  } else if (type === 'heart') {
    c.beginPath(); c.moveTo(0, 9); c.bezierCurveTo(-12, 1, -9, -10, 0, -4); c.bezierCurveTo(9, -10, 12, 1, 0, 9);
    c.fillStyle = extra.empty ? 'rgba(0,0,0,0)' : '#e23b4a'; c.fill(); stroke(1.6, extra.empty ? '#8a8578' : '#8f1d28');
  } else if (type === 'key') {
    c.beginPath(); c.arc(-5, 0, 5, 0, 7); c.fillStyle = '#f2b72f'; c.fill(); stroke(1.6, '#7a5a00');
    c.beginPath(); c.arc(-5, 0, 1.8, 0, 7); c.fillStyle = PAPER; c.fill();
    c.beginPath(); c.moveTo(0, 0); c.lineTo(10, 0); c.moveTo(7, 0); c.lineTo(7, 4); c.moveTo(10, 0); c.lineTo(10, 3.5); stroke(2.6, '#7a5a00');
  } else if (type === 'lock') {
    c.beginPath(); c.arc(0, -3, 4.5, Math.PI, 0); stroke(2.4, '#555');
    c.beginPath(); c.roundRect(-7, -3, 14, 11, 2.5); c.fillStyle = '#f2b72f'; c.fill(); stroke(1.6, '#7a5a00');
    c.beginPath(); c.arc(0, 2, 1.6, 0, 7); c.fillStyle = '#7a5a00'; c.fill();
  } else if (type === 'pick') {
    c.beginPath(); c.moveTo(-6, 9); c.lineTo(5, -4); stroke(3, '#8a5a2b');
    c.beginPath(); c.moveTo(-9, -6); c.quadraticCurveTo(2, -12, 10, 3); stroke(3.2, '#6b7280');
  } else if (type === 'torch') {
    c.beginPath(); c.moveTo(0, 10); c.lineTo(0, -1); stroke(3.2, '#8a5a2b');
    c.beginPath(); c.moveTo(0, -11); c.quadraticCurveTo(7, -4, 3, 0); c.quadraticCurveTo(0, 2, -3, 0); c.quadraticCurveTo(-7, -4, 0, -11);
    c.fillStyle = '#f97316'; c.fill(); c.beginPath(); c.moveTo(0, -6); c.quadraticCurveTo(3, -2, 0, -0.5); c.quadraticCurveTo(-3, -2, 0, -6); c.fillStyle = '#fde047'; c.fill();
  } else if (type === 'eye') {
    c.beginPath(); c.moveTo(-11, 0); c.quadraticCurveTo(0, -10, 11, 0); c.quadraticCurveTo(0, 10, -11, 0); c.fillStyle = '#fff'; c.fill(); stroke(1.6);
    c.beginPath(); c.arc(0, 0, 4, 0, 7); c.fillStyle = '#2f6fe0'; c.fill(); c.beginPath(); c.arc(0, 0, 1.6, 0, 7); c.fillStyle = '#111'; c.fill();
  } else if (type === 'sharpen') {
    c.beginPath(); c.roundRect(-8, -6, 16, 12, 2); c.fillStyle = '#4a7bd0'; c.fill(); stroke(1.6, '#1f3f7a');
    c.beginPath(); c.arc(-1, 0, 3.4, 0, 7); c.fillStyle = '#1f3f7a'; c.fill();
    c.beginPath(); c.moveTo(4, -6); c.lineTo(8, -10); stroke(1.6, '#9aa4b2');
  } else if (type === 'lead') { // lápiz pequeño para la barra de mina
    c.rotate(-Math.PI / 4); drawPencilBody(c, 20);
  } else if (type === 'portal') {
    const col = PORTAL_COLORS[extra.color || 0], k = extra.color || 0;
    c.beginPath();
    if (k === 1) { c.moveTo(0, -9); c.lineTo(9, 7); c.lineTo(-9, 7); c.closePath(); }
    else if (k === 2) c.rect(-8, -8, 16, 16);
    else c.arc(0, 0, 9, 0, 7);
    c.fillStyle = col; c.fill(); stroke(1.6, '#1d1d1d');
    c.beginPath(); c.arc(0, k === 1 ? 2 : 0, 3.2, 0, 7); c.fillStyle = PAPER; c.fill();
  }
  c.restore();
}

function drawPencilBody(c, L) { // apunta hacia +x, centrado en la punta = (L/2, 0)
  const w = L * 0.26;
  c.beginPath(); c.moveTo(-L / 2, -w / 2); c.lineTo(L * 0.2, -w / 2); c.lineTo(L / 2, 0); c.lineTo(L * 0.2, w / 2); c.lineTo(-L / 2, w / 2); c.closePath();
  c.fillStyle = '#f5c518'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#6b4f00'; c.stroke();
  c.beginPath(); c.moveTo(L * 0.2, -w / 2); c.lineTo(L / 2, 0); c.lineTo(L * 0.2, w / 2); c.closePath(); c.fillStyle = '#ecc89a'; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(L * 0.38, -w * 0.2); c.lineTo(L / 2, 0); c.lineTo(L * 0.38, w * 0.2); c.closePath(); c.fillStyle = '#2b2a27'; c.fill();
  c.fillStyle = '#c9c3b6'; c.fillRect(-L / 2, -w / 2, L * 0.1, w);
}

// ---------- Escena ----------
export class View {
  constructor(canvas) {
    this.cv = canvas; this.c = canvas.getContext('2d');
    this.cam = { x: 0, y: 0 }; this.fx = []; this.shake = 0; this.flip = null; this.cs = 40;
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.resize();
  }
  resize() {
    const r = this.cv.parentElement.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width; this.h = r.height; this.dpr = dpr;
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    this.cs = Math.max(30, Math.min(64, Math.min(r.width / 9, r.height / 11)));
  }
  reset(g) { const [x, y] = pencilXY(g); this.cam = { x: x + 0.5, y: y + 0.5 }; this.fx = []; }
  float(x, y, kind, text) { this.fx.push({ x, y, kind, text, t0: performance.now(), ms: 900 }); }

  // Instantánea de la página actual para el paso de hoja.
  snapshot() { const o = document.createElement('canvas'); o.width = this.cv.width; o.height = this.cv.height; o.getContext('2d').drawImage(this.cv, 0, 0); return o; }
  startFlip(snap) { this.flip = { img: snap, t0: performance.now(), ms: 650 }; }

  draw(g, dt, opts = {}) {
    const c = this.c, cs = this.cs, p = g.p;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = '#1b1d24'; c.fillRect(0, 0, this.w, this.h);
    // Cámara: sigue al lápiz con suavidad; centra la página si cabe entera.
    const [px, py] = pencilXY(g), tx = px + 0.5, ty = py + 0.5;
    const k = 1 - Math.pow(0.0015, dt);
    this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k;
    const viewW = this.w / cs, viewH = this.h / cs, pad = 0.6;
    const camX = p.W + 2 * pad <= viewW ? p.W / 2 : Math.max(viewW / 2 - pad, Math.min(p.W + pad - viewW / 2, this.cam.x));
    const camY = p.H + 2 * pad <= viewH ? p.H / 2 : Math.max(viewH / 2 - pad, Math.min(p.H + pad - viewH / 2, this.cam.y));
    let ox = this.w / 2 - camX * cs, oy = this.h / 2 - camY * cs;
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt); const m = this.shake * 14; ox += (Math.random() - 0.5) * m; oy += (Math.random() - 0.5) * m; }
    this.ox = ox; this.oy = oy;
    const X = (x) => ox + x * cs, Y = (y) => oy + y * cs;
    // Hoja
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
    c.fillStyle = PAPER; c.fillRect(X(-pad), Y(-pad), (p.W + 2 * pad) * cs, (p.H + 2 * pad) * cs);
    c.restore();
    c.strokeStyle = GRID; c.lineWidth = 1;
    c.beginPath();
    for (let x = -0.5; x <= p.W + 0.5; x += 0.5) { c.moveTo(X(x), Y(-pad)); c.lineTo(X(x), Y(p.H + pad)); }
    for (let y = -0.5; y <= p.H + 0.5; y += 0.5) { c.moveTo(X(-pad), Y(y)); c.lineTo(X(p.W + pad), Y(y)); }
    c.globalAlpha = 0.55; c.stroke(); c.globalAlpha = 1;
    c.strokeStyle = MARGIN; c.lineWidth = 1.5; c.beginPath(); c.moveTo(X(-pad + 0.25), Y(-pad)); c.lineTo(X(-pad + 0.25), Y(p.H + pad)); c.stroke();
    const R = radius(g), vis = (x, y) => (x + 0.5 - (px + 0.5)) ** 2 + (y + 0.5 - (py + 0.5)) ** 2 <= (R + 0.6) ** 2;
    const known = (cl) => g.seen[cl] || opts.reveal;
    // Trazo: primero lo repasado/antiguo (claro), luego el trazo activo (fuerte).
    c.lineCap = 'round'; c.lineJoin = 'round';
    const center = (cl) => [X(cx(p, cl) + 0.5), Y(cy(p, cl) + 0.5)];
    const isNb = (a, b) => [0, 1, 2, 3].some((d) => nb(p, a, d) === b);
    c.strokeStyle = INK_OLD; c.lineWidth = cs * 0.11; c.beginPath();
    for (let i = 1; i < g.hist.length; i++) { const a = g.hist[i - 1], b = g.hist[i]; if (!isNb(a, b)) continue; c.moveTo(...center(a)); c.lineTo(...center(b)); }
    c.stroke();
    c.strokeStyle = INK; c.lineWidth = cs * 0.13; c.beginPath();
    for (let i = 0; i < g.stack.length; i++) {
      const [x, y] = center(g.stack[i]);
      if (i === 0 || g.jumps.includes(i)) c.moveTo(x, y); else c.lineTo(x, y);
    }
    if (g.to >= 0 && !g.back && !g.undo) c.lineTo(X(px + 0.5), Y(py + 0.5));
    c.stroke();
    // Borrón de la goma
    if (g.smudge) for (const cl of g.smudge) {
      const x = X(cx(p, cl) + 0.5), y = Y(cy(p, cl) + 0.5);
      c.fillStyle = 'rgba(160,150,140,0.55)'; c.beginPath(); c.ellipse(x, y, cs * 0.42, cs * 0.3, hash(cl, 9) * 3, 0, 7); c.fill();
    }
    // Muros y símbolos (solo lo que has visto)
    c.strokeStyle = WALL; c.lineWidth = Math.max(2, cs * 0.075);
    c.beginPath();
    for (let cl = 0; cl < p.W * p.H; cl++) {
      if (!known(cl)) continue;
      const x = cx(p, cl), y = cy(p, cl);
      for (const d of [0, 1, 2, 3]) {
        if (!(g.walls[cl] & (1 << d))) continue;
        const n = nb(p, cl, d);
        if (n >= 0 && (d === 0 || d === 3) && known(n)) continue; // cada muro una vez
        const ax = x + (d === 1 ? 1 : 0), ay = y + (d === 2 ? 1 : 0), bx = d === 0 || d === 2 ? ax + 1 : ax, by = d === 1 || d === 3 ? ay + 1 : ay;
        const j = (hash(cl * 4 + d, 3) - 0.5) * 0.12, j2 = (hash(cl * 4 + d, 7) - 0.5) * 0.08;
        c.moveTo(X(ax + (d % 2 ? j2 : 0)), Y(ay + (d % 2 ? 0 : j2)));
        c.quadraticCurveTo(X((ax + bx) / 2 + (d % 2 ? j : 0)), Y((ay + by) / 2 + (d % 2 ? 0 : j)), X(bx), Y(by));
      }
    }
    c.stroke();
    // Flechas de sentido único y candado
    for (const [kStr, d] of Object.entries(p.oneway)) {
      const k = +kStr, a = (k / 4) | 0, ad = k % 4; // paso desde a hacia ad
      const b = nb(p, a, ad);
      if (!known(a) && !known(b)) continue;
      const mx = cx(p, a) + 0.5 + DX[ad] * 0.5, my = cy(p, a) + 0.5 + DY[ad] * 0.5;
      c.save(); c.translate(X(mx), Y(my)); c.rotate(Math.atan2(DY[d], DX[d]));
      c.beginPath(); c.moveTo(-cs * 0.16, -cs * 0.2); c.lineTo(cs * 0.12, 0); c.lineTo(-cs * 0.16, cs * 0.2);
      c.strokeStyle = '#2b4c8c'; c.lineWidth = cs * 0.09; c.stroke(); c.restore();
    }
    if (g.lock != null) {
      const a = (g.lock / 4) | 0, ad = g.lock % 4;
      if (known(a) || known(nb(p, a, ad))) icon(c, 'lock', X(cx(p, a) + 0.5 + DX[ad] * 0.5), Y(cy(p, a) + 0.5 + DY[ad] * 0.5), cs * 0.62);
    }
    // Agujeros de entrada y salida
    const hole = (cl, side) => { const x = side < 0 ? X(-0.12) : X(p.W + 0.12), y = Y(cy(p, cl) + 0.5); c.fillStyle = '#2a2722'; c.beginPath(); c.ellipse(x, y, cs * 0.14, cs * 0.3, 0, 0, 7); c.fill(); };
    hole(p.entry, -1);
    if (known(p.exit)) { hole(p.exit, 1); const y = Y(cy(p, p.exit) + 0.5), t = performance.now() / 300; c.fillStyle = '#2f6fe0'; c.beginPath(); const x0 = X(p.W + 0.35) + Math.sin(t) * 3; c.moveTo(x0, y - cs * 0.16); c.lineTo(x0 + cs * 0.2, y); c.lineTo(x0, y + cs * 0.16); c.fill(); }
    // Objetos y portales
    for (let cl = 0; cl < p.W * p.H; cl++) {
      if (!known(cl)) continue;
      const it = g.items[cl];
      const x = X(cx(p, cl) + 0.5), y = Y(cy(p, cl) + 0.5 + Math.sin(performance.now() / 400 + cl) * 0.04);
      if (it) icon(c, it, x, y, cs * 0.62);
    }
    for (const q of p.portals) for (const cl of [q.a, q.b]) if (known(cl)) icon(c, 'portal', X(cx(p, cl) + 0.5), Y(cy(p, cl) + 0.5), cs * 0.6, { color: q.color });
    // Borrones de tinta
    for (const b of g.blots) {
      const [bx, by] = blotXY(g, b);
      if (!vis(Math.round(bx), Math.round(by)) && !opts.reveal) continue;
      const x = X(bx + 0.5), y = Y(by + 0.5), t = performance.now() / 250;
      c.fillStyle = '#121212'; c.beginPath(); c.arc(x, y, cs * 0.28, 0, 7); c.fill();
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + Math.sin(t + i) * 0.2, r = cs * (0.26 + 0.06 * Math.sin(t * 1.3 + i * 2)); c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, cs * 0.09, 0, 7); c.fill(); }
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x - cs * 0.08, y - cs * 0.04, cs * 0.05, 0, 7); c.arc(x + cs * 0.08, y - cs * 0.04, cs * 0.05, 0, 7); c.fill();
    }
    // Niebla: lo no visto, oscuro; lo visto pero lejos, velado; lo cercano, claro.
    for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) {
      const cl = y * p.W + x;
      if (opts.reveal) continue;
      if (!g.seen[cl]) { c.fillStyle = 'rgba(52,47,40,0.88)'; c.fillRect(X(x) - 0.5, Y(y) - 0.5, cs + 1, cs + 1); }
      else if (!vis(x, y)) { c.fillStyle = 'rgba(52,47,40,0.28)'; c.fillRect(X(x) - 0.5, Y(y) - 0.5, cs + 1, cs + 1); }
    }
    // Goma
    if (g.eraser && g.eraser.on) {
      const e = g.eraser, i = Math.min(Math.floor(e.idx), g.hist.length - 1), f = e.idx - i;
      const a = g.hist[i], b = g.hist[Math.min(i + 1, g.hist.length - 1)];
      const jump = !isNb(a, b);
      const ex = cx(p, a) + (jump ? 0 : (cx(p, b) - cx(p, a)) * f), ey = cy(p, a) + (jump ? 0 : (cy(p, b) - cy(p, a)) * f);
      const ang = jump ? 0 : Math.atan2(cy(p, b) - cy(p, a), cx(p, b) - cx(p, a));
      c.save(); c.translate(X(ex + 0.5), Y(ey + 0.5)); c.rotate(ang);
      c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 6; c.shadowOffsetY = 3;
      c.beginPath(); c.roundRect(-cs * 0.38, -cs * 0.26, cs * 0.76, cs * 0.52, cs * 0.12); c.fillStyle = '#f4a6b8'; c.fill();
      c.shadowColor = 'transparent';
      c.beginPath(); c.roundRect(-cs * 0.38, -cs * 0.26, cs * 0.28, cs * 0.52, cs * 0.12); c.fillStyle = '#4a6fd1'; c.fill();
      c.fillStyle = '#2b1b1f'; c.beginPath(); c.arc(cs * 0.12, -cs * 0.08, cs * 0.05, 0, 7); c.arc(cs * 0.12, cs * 0.08, cs * 0.05, 0, 7); c.fill();
      c.restore();
    }
    // Lápiz
    const dir = g.dir >= 0 ? g.dir : (this.lastDir ?? 1); this.lastDir = dir;
    c.save(); c.translate(X(px + 0.5), Y(py + 0.5)); c.rotate(Math.atan2(DY[dir], DX[dir]));
    c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 6; c.shadowOffsetY = 4;
    c.translate(-cs * 0.32, 0); drawPencilBody(c, cs * 0.9);
    c.restore();
    // Ojo: flecha hacia la salida
    if (g.eye > 0) {
      const ex = p.W + 0.5, ey = cy(p, p.exit) + 0.5, ang = Math.atan2(ey - (py + 0.5), ex - (px + 0.5));
      c.save(); c.translate(X(px + 0.5), Y(py + 0.5)); c.rotate(ang); c.globalAlpha = Math.min(1, g.eye);
      c.strokeStyle = '#2f6fe0'; c.lineWidth = cs * 0.1; c.setLineDash([cs * 0.2, cs * 0.14]);
      c.beginPath(); c.moveTo(cs * 0.7, 0); c.lineTo(cs * 2.2, 0); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.moveTo(cs * 2.5, 0); c.lineTo(cs * 2.1, -cs * 0.25); c.lineTo(cs * 2.1, cs * 0.25); c.fillStyle = '#2f6fe0'; c.fill();
      c.restore();
    }
    // Viñeta suave alrededor de la visión
    if (!opts.reveal) {
      const gx = X(px + 0.5), gy = Y(py + 0.5), rad = (R + 0.4) * cs;
      const grd = c.createRadialGradient(gx, gy, rad * 0.75, gx, gy, rad * 1.25);
      grd.addColorStop(0, 'rgba(27,29,36,0)'); grd.addColorStop(1, 'rgba(27,29,36,0.18)');
      c.fillStyle = grd; c.fillRect(0, 0, this.w, this.h);
    }
    // Efectos flotantes
    const now = performance.now();
    this.fx = this.fx.filter((f) => now - f.t0 < f.ms);
    for (const f of this.fx) {
      const t = (now - f.t0) / f.ms, x = X(f.x + 0.5), y = Y(f.y + 0.5) - t * cs * 0.9;
      c.globalAlpha = 1 - t;
      if (f.kind === 'text') { c.font = `800 ${Math.round(cs * 0.42)}px Bricolage, sans-serif`; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = PAPER; c.strokeText(f.text, x, y); c.fillStyle = '#2b2a27'; c.fillText(f.text, x, y); }
      else icon(c, f.kind, x, y, cs * 0.7);
      c.globalAlpha = 1;
    }
    // Paso de hoja: la página anterior gira sobre el borde izquierdo
    if (this.flip) {
      const t = (now - this.flip.t0) / this.flip.ms;
      if (t >= 1) this.flip = null;
      else {
        const s = Math.cos(t * Math.PI / 2), img = this.flip.img;
        c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalAlpha = 1; c.drawImage(img, 0, 0, img.width * s, img.height);
        c.fillStyle = `rgba(0,0,0,${0.35 * t})`; c.fillRect(0, 0, img.width * s, img.height);
        c.restore();
      }
    }
  }
}
