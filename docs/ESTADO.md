# Estado del proyecto

## Hecho (fase 1)
- Combate completo:
  - 8×8 con rocas y simas
  - espada, arco, lanza, trampas y carga a caballo
  - armadura
  - empujes (contra la sima, contra rocas y contra otros enemigos)
  - zonas de peligro visibles y turno enemigo determinista
  - refuerzos avisados cada 6 turnos (máximo 3) para que no haya atascos
- 5 enemigos y 4 jefes (Lobo Alfa, Rey Bandido, Bruja y el dragón Ígnar, cuyo aliento quema también a sus aliados).
- Expedición con mapa de nodos: combate, élite, botín, encuentro, hoguera (descansar o retirarse con el oro) y jefe.
- Refugio con 6 edificios y 15 mejoras. Campaña de 4 gestas. Prólogo con tutorial contextual.
- PWA (manifiesto, service worker y funcionamiento sin red) y guardado local.
- Pruebas:
  - `engine.test.mjs`: unas 40 comprobaciones de reglas
  - `smoke.mjs`: juega expediciones reales con la interfaz en iPhone e iPad
  - `sim.mjs`: equilibrio

## Equilibrio (bot de 1 turno, 40 expediciones por caso, camino solo de combates)
| Gesta | Sin mejoras | Refugio medio | Alto | Máximo |
|---|---|---|---|---|
| Bosque (Lobo Alfa) | 90 % | 85 % | 93 % | 98 % |
| Ruinas (Rey Bandido) | 30 % | 40 % | 28 % | 68 % |
| Torre (Bruja) | 8 % | 10 % | 33 % | 60 % |
| Montaña (Ígnar) | 0 % | 0 % | 3 % | 15 % |

Medido antes de añadir los refuerzos. Casi todas las derrotas del bot son atascos y no muertes. Un jugador humano arriesgará más, así que la curva real está por validar jugando.

## Decisiones
- El daño recibido no depende del azar: si acabas el turno fuera del rojo, no recibes daño (Hoplite, Into the Breach).
- La carga a caballo gasta el movimiento y la acción, y hace 2 de daño (3 a nivel 2). Con 3 de daño y sin gastar el movimiento rompía el equilibrio: era la mejora que más subía la tasa de victoria en la simulación.
- Si caes, conservas el 50 % del oro. Retirarte en la hoguera te deja el 100 %, pero pierdes el avance de la gesta.

## Pendiente
- Fase 2: perfiles, nube (Supabase `faser`), salón de la fama y reto diario con semilla.
- Fase 3: arte, animación, sonido, más eventos y enemigos.
- Ajustar el equilibrio con partidas reales: la Montaña probablemente necesite un dragón algo más débil.
