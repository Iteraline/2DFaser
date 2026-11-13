// Pone la versión (?v=…) en todas las importaciones, en index.html y en el service worker,
// para que ningún navegador mezcle archivos de una versión anterior. Uso: node tools/stamp.mjs [versión]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const v = process.argv[2] || new Date().toISOString().slice(0, 16).replace(/\D/g, '');
const root = new URL('../web/', import.meta.url).pathname;
const tag = (s) => s.replace(/(\.(?:js|css))(\?v=\w+)?(['"])/g, `$1?v=${v}$3`);
for (const f of readdirSync(root + 'js')) {
  const p = root + 'js/' + f;
  writeFileSync(p, readFileSync(p, 'utf8').replace(/(from\s+'\.\/[\w-]+\.js)(\?v=\w+)?'/g, `$1?v=${v}'`));
}
const html = root + 'index.html';
writeFileSync(html, readFileSync(html, 'utf8').replace(/(href="\/css\/app\.css|src="\/js\/app\.js)(\?v=\w+)?"/g, `$1?v=${v}"`).replace(/const V = '\w*'/, `const V = '${v}'`));
const sw = root + 'sw.js';
writeFileSync(sw, readFileSync(sw, 'utf8').replace(/const VERSION = '\w*'/, `const VERSION = '${v}'`));
console.log('versión', v);
