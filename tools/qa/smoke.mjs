// Prueba de humo en Chromium: juega con la interfaz real (toques en el tablero y botones) usando el bot
// para decidir. Recorre: historia → prólogo → mapa → combates/eventos → refugio → compra → nueva expedición.
// Uso: node tools/qa/smoke.mjs [carpeta de capturas]   (arranca su propio servidor)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { bestTurn } from './bot.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] || '/tmp';
const PORT = 8123;
const srv = spawn(process.execPath, [new URL('./devserver.mjs', import.meta.url).pathname, String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));

let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FALLO:', msg); } else console.log('ok  ', msg); };
const b = await chromium.launch();

for (const [name, vp, opts] of [['iphone', { width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ['ipad', { width: 1180, height: 820 }, {}]]) {
  const ctx = await b.newContext({ viewport: vp, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = (n) => page.screenshot({ path: `${out}/${name}-${n}.png` });
  const visible = (sel) => page.locator(sel).isVisible();
  const idle = () => page.waitForFunction(() => !window.__game.busy, null, { timeout: 20000 });
  const tap = async (x, y) => {
    const p = await page.evaluate(([x, y]) => { const r = document.getElementById('board').getBoundingClientRect(), [cx, cy] = window.__game.board.center(x, y); return [r.left + cx, r.top + cy]; }, [x, y]);
    if (opts.hasTouch) await page.touchscreen.tap(p[0], p[1]); else await page.mouse.click(p[0], p[1]);
    await page.waitForTimeout(30); await idle();
  };
  async function playTurn() {
    const s = JSON.parse(await page.evaluate(() => JSON.stringify(window.__game.S.run?.combat || null)));
    if (!s || s.phase !== 'player') { await page.waitForTimeout(150); return; }
    const t = bestTurn(s), N = 8;
    const mv = async () => { if (t.p != null) await tap(t.p % N, (t.p / N) | 0); };
    const act = async () => { if (t.o[0] !== 'none') { await page.click(`[data-k="${t.o[0]}"]`); await tap(t.o[1], t.o[2]); } };
    if (t.first === 'move') { await mv(); await act(); } else { await act(); await mv(); }
    await idle();
    const ph = await page.evaluate(() => window.__game.S.run?.combat?.phase);
    if (ph === 'player' && await page.locator('#endTurn').isEnabled() && await visible('#fight')) { await page.click('#endTurn'); await idle(); }
  }

  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('#modal:not([hidden])');
  await shot('01-historia');
  ok((await page.textContent('#mdTitle')) === '2DFaser', `${name}: abre con la historia`);
  await page.click('#mdChoices button');
  await page.waitForSelector('#fight:not([hidden])');
  await page.waitForTimeout(300);
  await shot('02-prologo');
  ok((await page.textContent('#hint')).includes('azul'), `${name}: pista del tutorial`);
  ok(await page.evaluate(() => window.__game.S.run.combat.enemies.length === 2), `${name}: prólogo con 2 bandidos`);

  let steps = 0, fights = 0, sawMap = false, sawHome = false, shots = new Set();
  while (steps++ < 400) {
    if (await visible('#modal')) {
      const t = await page.textContent('#mdTitle');
      if (!shots.has('modal-' + t) && shots.size < 12) { shots.add('modal-' + t); await shot('m-' + shots.size); }
      await page.locator('#mdChoices button:not([disabled])').first().click();
      await page.waitForTimeout(80);
      continue;
    }
    if (await visible('#fight')) {
      const id = await page.evaluate(() => (window.__game.S.run?.node || '') + ':' + (window.__game.S.run?.visited.length || 0));
      if (!shots.has('fight' + id)) { shots.add('fight' + id); fights++; if (fights <= 3) await shot(`03-combate-${fights}`); }
      await playTurn();
      continue;
    }
    if (await visible('#map')) {
      if (!sawMap) { sawMap = true; await shot('04-mapa'); }
      await page.locator('.node.avail').first().click();
      await page.waitForTimeout(80);
      continue;
    }
    if (await visible('#home')) { sawHome = true; break; }
  }
  ok(sawMap, `${name}: llega al mapa`);
  ok(fights >= 2, `${name}: juega ${fights} combates con la interfaz`);
  ok(sawHome, `${name}: la expedición termina y vuelve al refugio`);
  await shot('05-refugio');
  const gold = await page.evaluate(() => window.__game.S.gold);
  ok(gold > 0, `${name}: trae oro al refugio (${gold})`);
  const buyable = page.locator('.buy:not([disabled])').first();
  if (await buyable.count()) { await buyable.click(); ok(await page.evaluate(() => Object.keys(window.__game.S.build).length > 0), `${name}: compra un edificio`); }
  await page.reload();
  await page.waitForSelector('#home:not([hidden])');
  ok(await page.evaluate(() => window.__game.S.stats.runs >= 1), `${name}: el guardado sobrevive a recargar`);
  await page.click('#go');
  await page.waitForSelector('#map:not([hidden])');
  ok(true, `${name}: nueva expedición`);
  ok(errors.length === 0, `${name}: sin errores de JavaScript ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await b.close(); srv.kill();
console.log(fails ? `\n${fails} fallos` : '\nTodo bien');
process.exitCode = fails ? 1 : 0;
