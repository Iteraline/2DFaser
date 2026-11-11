// Genera los iconos de la app (escudo azul con espada sobre fondo carbón). Uso: node tools/qa/icons.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const svg = (s, pad) => { const k = pad ? 0.62 : 0.8, r = s * 0.36 * k; return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><defs><radialGradient id="g" cx="50%" cy="40%"><stop offset="0" stop-color="#2a2d3a"/><stop offset="1" stop-color="#14161d"/></radialGradient></defs>
<rect width="${s}" height="${s}" fill="url(#g)"/><circle cx="${s / 2}" cy="${s / 2}" r="${r * 1.17}" fill="#f5b400"/><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="#2563eb"/>
<g stroke="#fff" stroke-linecap="round" stroke-width="${r * 0.16}"><line x1="${s / 2}" y1="${s / 2 - r * 0.6}" x2="${s / 2}" y2="${s / 2 + r * 0.45}"/><line x1="${s / 2 - r * 0.32}" y1="${s / 2 + r * 0.12}" x2="${s / 2 + r * 0.32}" y2="${s / 2 + r * 0.12}"/></g></svg>`; };
const b = await chromium.launch();
for (const [name, s, pad] of [['icon-192', 192], ['icon-512', 512], ['icon-maskable-512', 512, true], ['apple-touch-icon', 180]]) {
  const p = await b.newPage({ viewport: { width: s, height: s } });
  await p.setContent(`<html><body style="margin:0">${svg(s, pad)}</body></html>`); await p.screenshot({ path: `web/icons/${name}.png` }); await p.close();
}
await b.close();
console.log('iconos generados');
