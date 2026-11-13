// Genera los iconos de la app (lápiz sobre hoja de cuadros). Uso: node tools/qa/icons.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const svg = (s, pad) => {
  const m = pad ? s * 0.16 : s * 0.06, g = (s - 2 * m) / 8;
  let grid = '';
  for (let i = 0; i <= 8; i++) grid += `<line x1="${m + i * g}" y1="${m}" x2="${m + i * g}" y2="${s - m}"/><line x1="${m}" y1="${m + i * g}" x2="${s - m}" y2="${m + i * g}"/>`;
  const L = s * (pad ? 0.5 : 0.62), w = L * 0.2, cx = s / 2, cy = s / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><rect width="${s}" height="${s}" fill="#2456a6"/>
<rect x="${m}" y="${m}" width="${s - 2 * m}" height="${s - 2 * m}" rx="${s * 0.03}" fill="#fbf8ef"/>
<g stroke="#d3deea" stroke-width="${Math.max(1, s / 200)}">${grid}</g>
<path d="M${m + g} ${m + 2 * g} H${m + 5 * g} V${m + 5 * g} H${m + 3 * g}" fill="none" stroke="#d23a33" stroke-width="${s * 0.035}" stroke-linecap="round" stroke-linejoin="round"/>
<g transform="translate(${cx + s * 0.06} ${cy + s * 0.04}) rotate(-45)">
<path d="M${-L / 2} ${-w / 2} H${L * 0.2} L${L / 2} 0 L${L * 0.2} ${w / 2} H${-L / 2} Z" fill="#f5c518" stroke="#6b4f00" stroke-width="${s * 0.012}"/>
<path d="M${L * 0.2} ${-w / 2} L${L / 2} 0 L${L * 0.2} ${w / 2} Z" fill="#ecc89a" stroke="#6b4f00" stroke-width="${s * 0.012}"/>
<path d="M${L * 0.38} ${-w * 0.2} L${L / 2} 0 L${L * 0.38} ${w * 0.2} Z" fill="#2b2a27"/>
<rect x="${-L / 2}" y="${-w / 2}" width="${L * 0.12}" height="${w}" fill="#f4a6b8"/></g></svg>`;
};
const b = await chromium.launch();
for (const [name, s, pad] of [['icon-192', 192], ['icon-512', 512], ['icon-maskable-512', 512, true], ['apple-touch-icon', 180]]) {
  const p = await b.newPage({ viewport: { width: s, height: s } });
  await p.setContent(`<html><body style="margin:0">${svg(s, pad)}</body></html>`); await p.screenshot({ path: `web/icons/${name}.png` }); await p.close();
}
await b.close();
console.log('iconos generados');
