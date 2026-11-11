# 2DFaser

Juego de estrategia por turnos con **un solo héroe**. El ciclo es **explorar → luchar → volver al refugio → mejorar → llegar más lejos**. Las cuatro gestas son romper la maldición, recuperar el tesoro, rescatar a la princesa y matar al dragón Ígnar. Sigue el mismo patrón que Chess, Wellness y massage.

- **Web**: `web/` es estático y no necesita compilación (JavaScript de navegador, canvas 2D, sin librerías ni CDN). Es una PWA que funciona sin red una vez instalada.
- **Diseño**: `docs/DISENO.md` recoge las referencias con datos verificados, las reglas, los enemigos, el refugio y las gestas.
- **Guardado**: de momento se guarda en el dispositivo (`localStorage`). En la fase 2 se añadirán perfiles y nube con Supabase (esquema `faser`), como en Chess.

## Estructura

| Ruta | Qué es |
|---|---|
| `web/js/engine.js` | Reglas del combate, puras y deterministas: zonas de peligro, movimiento, acciones, empujes, trampas, IA enemiga y refuerzos |
| `web/js/run.js` | Expedición (mapa de nodos, encuentros, eventos, oro) y refugio (edificios) |
| `web/js/data.js` | Enemigos, gestas, edificios, eventos y estadísticas del héroe |
| `web/js/render.js` | Tablero en canvas y animación de los eventos del motor |
| `web/js/app.js` | Pantallas: refugio, mapa, combate y ventanas |
| `web/js/store.js` | Guardado local |
| `tools/qa/engine.test.mjs` | Pruebas de las reglas (Node) |
| `tools/qa/sim.mjs` + `bot.mjs` | Simulación de equilibrio: un bot que mira 1 turno por delante juega expediciones enteras de cada gesta |
| `tools/qa/smoke.mjs` | Prueba de humo en Chromium (iPhone e iPad) que juega con la interfaz real |

## Probar

```
node tools/qa/engine.test.mjs
node tools/qa/devserver.mjs 8000      # http://localhost:8000
node tools/qa/smoke.mjs /tmp          # requiere Playwright y Chromium
node tools/qa/sim.mjs 40              # equilibrio (≈2 min)
```

Despliegue: ver `docs/despliegue.md`. Estado y pendientes: `docs/ESTADO.md`.
