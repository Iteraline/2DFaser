# A Lápiz

Arcade de laberintos en tiempo real, inspirado en los laberintos que se dibujaban en los recreos en cuadernos de cuadros. Recorres la página a lápiz:

- no puedes cruzar tu propio trazo, y volver atrás gasta el doble de mina;
- solo ves lo que tienes cerca;
- una goma te persigue borrando tu recorrido;
- al llegar al agujero del borde, pasas la hoja.

Repo `Iteraline/2DFaser` (antes se usó para un prototipo de estrategia, archivado en `docs/archivo-heroe-DISENO.md`). Mismo patrón que Chess, Wellness y massage: web estática sin compilación, PWA, Vercel.

- **Diseño**: `docs/PROPUESTA-LABERINTO.md`
- **Estado y números de dificultad**: `docs/ESTADO.md`

## Estructura

| Ruta | Qué es |
|---|---|
| `web/js/maze.js` | Generador de páginas con semilla (laberinto, bucles, salida, símbolos) y resolutor que garantiza que todas tienen solución |
| `web/js/game.js` | Simulación en tiempo real, sin DOM: lápiz, trazo, mina, goma, objetos, portales, candado, pico, borrones y media vuelta |
| `web/js/draw.js` | Canvas: hoja de cuadros, muros con temblor de lápiz, niebla, iconos dibujados y paso de hoja |
| `web/js/pilot.js` | Piloto automático (demostración en la portada y pruebas) |
| `web/js/app.js` | Portada, partida de 10 páginas, marcador, controles (deslizar, tocar para parar, teclado) |
| `web/js/data.js` | Las 10 páginas del cuaderno de Matemáticas y su dificultad |
| `tools/qa/game.test.mjs` | Reglas + 1.500 páginas generadas (todas resolubles; el piloto las termina) |
| `tools/qa/sim.mjs` | Dificultad: un explorador sin mapa juega 100 páginas de cada nivel |
| `tools/qa/smoke.mjs` | Chromium (iPhone e iPad): portada, deslizar y partida completa |
| `tools/qa/responsive.mjs` | Maqueta en 7 tamaños de iPhone/iPad, en vertical y horizontal |
| `tools/stamp.mjs` | Versión en todos los archivos antes de publicar |

## Probar

```
node tools/qa/game.test.mjs
node tools/qa/devserver.mjs 8000      # http://localhost:8000
node tools/qa/smoke.mjs /tmp          # requiere Playwright y Chromium
node tools/qa/sim.mjs 100             # dificultad (≈1 min)
```
