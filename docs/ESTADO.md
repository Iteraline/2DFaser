# Estado: A Lápiz (piloto)

## Hecho
- Cuaderno de Matemáticas: 10 páginas generadas con semilla y validadas por un resolutor. Cada partida es distinta.
- Reglas:
  - trazo permanente (no se cruza)
  - repasar gasta el doble de mina
  - mina limitada, con sacapuntas para recargar
  - visión limitada, con niebla y lo ya visto en tenue
  - la goma sigue tu recorrido exacto, más lenta que tú: solo te alcanza si te paras o dudas, y lo que borra queda emborronado
  - media vuelta inmediata a mitad de casilla
  - tocar para parar
- Símbolos:
  - ➜ flechas de sentido único
  - portales de colores (●▲■)
  - ★ estrellas
  - sacapuntas
  - antorcha
  - ojo (señala la salida)
  - ♥ corazón
  - llave y candado
  - pico (atraviesa un muro deslizando contra él estando parado)
  - borrones de tinta que patrullan
- Pasar la hoja: la fila del agujero de salida es la fila de entrada de la página siguiente.
- 3 vidas. Puntuación por estrellas, mina sobrante, tiempo y trazo limpio. Lápiz de oro, plata o bronce por página. Récord local.
- Portada con demostración automática. PWA. Vibración en móvil.

## Dificultad medida (explorador sin mapa, 100 páginas por nivel)
| Pág | Supera | Tiempo medio |
|---|---|---|
| 1 | 93 % | 6,7 s |
| 2 | 90 % | 9,1 s |
| 3 | 74 % | 9,8 s |
| 4 | 75 % | 8,6 s |
| 5 | 74 % | 12,6 s |
| 6 (llave) | 42 % | 17,1 s |
| 7 | 56 % | 13,2 s |
| 8 | 47 % | 14,6 s |
| 9 | 41 % | 16,2 s |
| 10 | 37 % | 12,6 s |

Las muertes por tinta y por quedar encerrado pesan mucho en el bot. Hay que validar con partidas reales.

## Pendiente (siguientes iteraciones)
- Sonido (rasgueo del lápiz, paso de hoja).
- Clip (punto de control), regla, goma como objeto, mancha de café y pliegues.
- Editor de laberintos y compartir con un enlace («¿Te atreves?»).
- Reto diario y clasificación.
- Otros cuadernos: Lengua (rayas), Dibujo (sin cuadrícula), Música (pentagrama).
