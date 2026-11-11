# 2DFaser: diseño del juego

Estrategia por turnos con **un solo héroe**. Ciclo: **explorar → luchar → volver al refugio → mejorar → explorar más lejos**. Gestas: romper la maldición, recuperar el tesoro, rescatar a la princesa y matar al dragón.

## 1. Referencias y qué tomamos de cada una

| Juego | Dato verificado | Qué copiamos | Qué evitamos |
|---|---|---|---|
| **Hoplite** (2013, móvil) | Metacritic 88. Sin cifras de descargas públicas | Un héroe en una cuadrícula pequeña. Se ve qué casillas ataca cada enemigo, así que **no hay azar al recibir daño**. El empujón y la carga como armas | Mapas sin variedad, poca meta-progresión |
| **Into the Breach** (Subset, 2018) | No hay ventas oficiales verificadas. Lección de diseño publicada: «sacrificar ideas chulas por claridad, siempre» | Los enemigos **avisan** de su ataque. Empujar enemigos a simas y contra otros enemigos | Escuadrón de 3 (aquí, 1 héroe) |
| **Loop Hero** (2021) | 500.000 copias en una semana y más de 1 M en Steam (dic-2021) | Expedición → recursos → **campamento que se construye** y desbloquea mejoras | Que el combate sea automático |
| **Darkest Dungeon** (2016) | 6 M de copias del juego base (dic-2022) | Aldea entre expediciones. Retirarse a tiempo con el botín | Gestión de varios personajes |
| **Slay the Spire 2** (acceso anticipado, mar-2026) | Más de 3 M en la primera semana (oficial). 5,3 M en marzo (estimación) | **Mapa de nodos con caminos que eliges**: combate, élite, botín, evento, hoguera, jefe. Intención del enemigo visible | Cartas |
| **Heroes of Might & Magic: Olden Era** (abr-2026) | Más de 1 M en Steam (28-may-2026) | Un héroe que recorre un mapa, objetivos de gesta y un jefe final | Ejércitos y ciudades |
| **Vampire Survivors** | 27 M de jugadores (abr-2026) | Jugar en 5 segundos, sin menús, y recibir poder rápido | Acción en tiempo real |

**Conclusión:** las cuatro decisiones que más pesan son estas:

1. Información perfecta del peligro (Hoplite, Into the Breach): la derrota es culpa tuya y por eso enganchas.
2. Mapa con elección de camino (Slay the Spire): cada expedición es distinta.
3. Refugio que crece (Loop Hero, Darkest Dungeon): incluso perder sirve para algo.
4. Cero fricción al empezar (Vampire Survivors).

## 2. Minuto 1

- Abres la app y sale **una frase**: «El dragón Ígnar ha raptado a la princesa y una maldición cubre Valdeluz. Coge tu espada.» Un toque y ya estás en el tablero.
- El primer combate es contra 2 bandidos. Tres pistas contextuales, nunca en pantalla aparte:
  1. azul = puedes ir;
  2. rojo = te golpearán si acabas ahí;
  3. ataca con la espada o el arco.
- Se gana en unos 60 s, cae oro y aparece el **mapa con el dragón en el horizonte**.
- En menos de 5 minutos llegas al primer jefe o mueres. En los dos casos vuelves al refugio con oro y **compras la primera mejora**: trampas, lanza o armadura. Es el gancho de progresión.

## 3. Combate

- Cuadrícula de 8×8 con suelo, rocas (bloquean) y simas (si empujas a alguien dentro, muere; a los jefes y a los pesados no).
- **Turno del héroe**: un movimiento (3 casillas en ortogonal, 4 a caballo) y una acción, en cualquier orden. Las dos son opcionales.
- **Acciones**:

| Acción | Requisito | Efecto |
|---|---|---|
| Espada | — | 2 de daño a un enemigo adyacente (3 con la forja a nivel 2) |
| Arco | flechas | 1 de daño al primer enemigo en línea recta, hasta 5 casillas. Las rocas lo paran, las simas no |
| Lanza | Forja 1 | 1 de daño y empuja 1 casilla. Contra roca, borde u otro enemigo: +1 de daño (al otro también). A la sima: muerte |
| Trampa | Taller 1 | Se coloca en una casilla adyacente. El enemigo que la pisa recibe 2 de daño y pierde su siguiente turno |
| Carga | Establo 1 | Gasta el movimiento y la acción. Galopa en línea recta hasta el primer enemigo (mínimo 2 casillas): 2 de daño y empuje (3 con el establo a nivel 2) |

- **Armadura**: puntos que absorben daño antes que los corazones. Se recarga en cada combate.
- **Turno enemigo** (determinista): primero atacan todos los que tienen al héroe en su zona roja. Después se mueven los demás hacia una casilla desde la que puedan atacar. **Si acabas el turno fuera del rojo, no recibes daño.** La dificultad está en el espacio, el número de enemigos y los recursos.

| Enemigo | Vida | Daño | Movimiento | Zona |
|---|---|---|---|---|
| Lobo | 1 | 1 | 3 | adyacente |
| Bandido | 2 | 1 | 2 | adyacente |
| Arquero | 1 | 1 | 2 | líneas rectas de 5; no dispara a través de aliados |
| Bruto | 4 | 2 | 1 | adyacente; pesado, no se empuja |
| Cultista | 2 | 1 | 2 | diagonales de 4 |
| Lobo Alfa (jefe 1) | 6 | 2 | 3 | adyacente |
| Rey Bandido (jefe 2) | 7 | 2 | 2 | las 8 casillas de alrededor |
| Bruja (jefe 3) | 6 | 2 | 2 | diagonales de 5 |
| Dragón Ígnar (jefe 4) | 12 | 2 | 1 | aliento en cruz de 3 que quema **también a sus aliados** |

## 4. Expedición (mapa)

- 6 filas de 2 o 3 nodos y el jefe al final. Eliges el camino.
- Tipos de nodo:
  - ⚔ combate
  - ☠ élite (más enemigos y el doble de oro)
  - ◆ botín
  - ? evento con decisión
  - ▲ hoguera: curar 2 o **retirarte con todo el oro**
  - ♛ jefe
- La vida se mantiene entre combates. Las flechas y las trampas se reponen al salir del refugio.
- **Muerte**: vuelves al refugio con el 50 % del oro de la expedición. **Jefe vencido**: todo el oro, la recompensa y la gesta siguiente.

## 5. Refugio (meta-progresión)

| Edificio | Niveles (coste en oro) | Efecto |
|---|---|---|
| Taller | 20 · 50 · 90 | 2/3/4 trampas por expedición |
| Forja | 30 · 80 | Lanza · espada +1 |
| Armería | 40 · 90 · 150 | 2/3/4 de armadura |
| Huerto | 25 · 60 · 110 | +1 corazón máximo por nivel |
| Arquería | 20 · 50 | 5/7 flechas |
| Establo | 60 · 120 | Caballo (movimiento 4 + carga de 2) · carga de 3 |

## 6. Gestas (campaña)

1. **El Bosque de los Lobos**: romper la maldición del bosque (Lobo Alfa)
2. **Las Ruinas**: recuperar el tesoro (Rey Bandido)
3. **La Torre**: rescatar a la princesa (Bruja)
4. **La Montaña**: el dragón Ígnar

Cada gesta añade enemigos nuevos al repertorio.

## 7. Fases

- **Fase 1 (esta)**: juego local completo. 4 gestas, refugio, guardado en el dispositivo, PWA, Vercel y pruebas (motor, simulación de equilibrio y navegador).
- **Fase 2**: perfiles y guardado en la nube como en Chess (contraseña de la web, perfiles con código o Face ID, esquema `faser` en el Supabase personal), salón de la fama y reto diario con la misma semilla para todos.
- **Fase 3**: arte y animación definitivos, sonido y más eventos y enemigos.
