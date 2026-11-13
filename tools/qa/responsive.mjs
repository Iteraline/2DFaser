// Comprueba la maqueta en varios iPhone/iPad, en vertical y horizontal: portada centrada y dentro de pantalla,
// sin desbordar a lo ancho, tablero con tamaño y marcador visible. Capturas en la carpeta indicada.
// Uso: node tools/qa/responsive.mjs [carpeta]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] || '/tmp', PORT = 8125;
const srv = spawn(process.execPath, [new URL('./devserver.mjs', import.meta.url).pathname, String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FALLO:', m); } else console.log('ok  ', m); };
const cases = [
  ['iphone-se', devices['iPhone SE']], ['iphone-15', devices['iPhone 15']], ['iphone-15-pro-max', devices['iPhone 15 Pro Max']],
  ['iphone-15-horizontal', devices['iPhone 15 landscape']], ['ipad-vertical', devices['iPad (gen 7)']], ['ipad-horizontal', devices['iPad (gen 7) landscape']],
  ['ipad-pro-horizontal', devices['iPad Pro 11 landscape']]
];
const b = await chromium.launch();
for (const [name, dev] of cases) {
  const { defaultBrowserType, ...d } = dev;
  const ctx = await b.newContext({ ...d, deviceScaleFactor: 1 }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/`); await page.waitForTimeout(900);
  const vp = page.viewportSize();
  const t = await page.evaluate(() => { const r = document.querySelector('.cover').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, sw: document.documentElement.scrollWidth, cw: innerWidth, ch: innerHeight, canvas: document.getElementById('cv').width }; });
  await page.screenshot({ path: `${out}/${name}-portada.png` });
  ok(t.l >= 0 && t.r <= t.cw + 0.5 && Math.abs(t.l - (t.cw - t.r)) < 2, `${name} ${vp.width}x${vp.height}: portada centrada en horizontal (${Math.round(t.l)} | ${Math.round(t.cw - t.r)})`);
  ok(t.t >= 0 && t.b <= t.ch + 0.5, `${name}: portada entera en vertical (${Math.round(t.t)}–${Math.round(t.b)} de ${t.ch})`);
  ok(t.sw <= t.cw, `${name}: sin desbordar a lo ancho`);
  ok(t.canvas > 0, `${name}: la demostración tiene lienzo`);
  await page.click('#play'); await page.waitForTimeout(900);
  const gm = await page.evaluate(() => { const h = document.getElementById('hud').getBoundingClientRect(), c = document.getElementById('cv').getBoundingClientRect(); return { hud: h.height, cw: c.width, ch: c.height, sw: document.documentElement.scrollWidth, vw: innerWidth, cs: window.__game.view.cs }; });
  await page.screenshot({ path: `${out}/${name}-juego.png` });
  ok(gm.ch > 150 && gm.cw > 150 && gm.sw <= gm.vw, `${name}: tablero ${Math.round(gm.cw)}x${Math.round(gm.ch)}, casilla ${Math.round(gm.cs)}px, marcador ${Math.round(gm.hud)}px`);
  ok(errors.length === 0, `${name}: sin errores ${errors.join(' | ')}`);
  await ctx.close();
}
await b.close(); srv.kill();
console.log(fails ? `\n${fails} fallos` : '\nTodo bien');
process.exitCode = fails ? 1 : 0;
