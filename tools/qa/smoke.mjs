// Prueba de humo en Chromium (iPhone e iPad): portada con demostración, deslizar con el dedo,
// y una partida completa de 10 páginas con el piloto automático (acelerado). Capturas en la carpeta indicada.
// Uso: node tools/qa/smoke.mjs [carpeta]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] || '/tmp', PORT = 8124;
const srv = spawn(process.execPath, [new URL('./devserver.mjs', import.meta.url).pathname, String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FALLO:', m); } else console.log('ok  ', m); };
const b = await chromium.launch();
for (const [name, vp, o] of [['iphone', { width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ['ipad', { width: 1180, height: 820 }, {}]]) {
  const ctx = await b.newContext({ viewport: vp, ...o }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = (n) => page.screenshot({ path: `${out}/${name}-${n}.png` });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForTimeout(1500);
  await shot('01-portada');
  ok(await page.isVisible('#play'), `${name}: portada con botón Jugar`);
  await page.click('#play');
  await page.waitForTimeout(600);
  await shot('02-pagina1');
  ok(await page.evaluate(() => window.__game.mode === 'play' && window.__game.run.n === 0), `${name}: empieza la página 1`);
  // Deslizar a mano: el lápiz debe moverse
  const box = await page.locator('#stage').boundingBox();
  const before = await page.evaluate(() => window.__game.g.hist.length);
  const sx = box.x + box.width / 2, sy = box.y + box.height / 2;
  const sol = await page.evaluate(() => { const g = window.__game.g, p = g.p; const a = p.solution[0], b2 = p.solution[1]; return b2 - a === 1 ? 1 : b2 - a === -1 ? 3 : b2 > a ? 2 : 0; });
  const v = [[0, -60], [60, 0], [0, 60], [-60, 0]][sol];
  await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move(sx + v[0] / 2, sy + v[1] / 2); await page.mouse.move(sx + v[0], sy + v[1]); await page.mouse.up();
  await page.waitForTimeout(700);
  ok(await page.evaluate((n) => window.__game.g.hist.length > n, before), `${name}: deslizar mueve el lápiz`);
  await shot('03-trazo');
  // Partida completa con piloto automático acelerado
  await page.evaluate(() => { window.__auto = window.__game.newPilot(); window.__speed = 4; });
  const pagesShot = new Set();
  for (let i = 0; i < 400; i++) {
    await page.waitForTimeout(250);
    const st = await page.evaluate(() => ({ mode: window.__game.mode, n: window.__game.run?.n, modal: !document.getElementById('modal').hidden }));
    if ([3, 5, 8, 9].includes(st.n) && !pagesShot.has(st.n)) { pagesShot.add(st.n); await page.evaluate(() => { window.__speed = 0; }); await page.waitForTimeout(700); await shot(`04-pagina${st.n + 1}`); await page.evaluate(() => { window.__speed = 4; }); }
    if (st.modal) break;
  }
  await shot('05-final');
  const res = await page.evaluate(() => ({ title: document.getElementById('mdTitle').textContent, kicker: document.getElementById('mdKicker').textContent, n: window.__game.run.n, score: window.__game.run.score }));
  ok(res.kicker.length > 0, `${name}: termina la partida (${res.kicker} · página ${res.n + 1} · ${res.title})`);
  ok(res.n >= 7, `${name}: el piloto llega al menos a la página 8`);
  ok(errors.length === 0, `${name}: sin errores de JavaScript ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await b.close(); srv.kill();
console.log(fails ? `\n${fails} fallos` : '\nTodo bien');
process.exitCode = fails ? 1 : 0;
