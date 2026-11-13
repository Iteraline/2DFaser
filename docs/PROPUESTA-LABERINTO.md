# «A Lápiz»: propuesta (v0.2)

Cambios respecto a la v0.1: el nombre queda aprobado, la goma se mantiene como presión y la espada pasa a ser un **pico** que atraviesa un muro.

Arcade en tiempo real: recorres a lápiz un laberinto dibujado en un cuaderno de cuadros, sin ver la página entera y sin poder equivocarte gratis. Cuando llegas al borde, das la vuelta a la hoja.

## 1. Núcleo: tres reglas que lo hacen distinto
1. **El trazo es permanente.** La punta del lápiz deja línea y no puede cruzar su propio trazo. Volver por donde has pasado («repasar») está permitido, pero gasta mina doble. Es el «sin equivocarte» del recreo.
2. **La mina se gasta.** Cada casilla dibujada consume mina (barra en pantalla) y el sacapuntas la recarga. Si te quedas sin mina, pierdes una vida. Los errores cuestan recursos, no solo tiempo.
3. **La goma te persigue.** A los pocos segundos entra la goma de borrar y avanza por tu trazo, borrándolo, un poco más despacio que tú. Si te alcanza la punta, pierdes una vida. Dudar se paga.

## 2. Ver solo lo cercano
- La página está en sombra y solo ves un radio de 3 casillas alrededor de la punta.
- Lo ya explorado queda visible en tenue, como tu mapa mental.
- La antorcha amplía la visión a 6 casillas durante 10 s.

## 3. Controles
- Desliza para elegir dirección. El lápiz avanza solo hasta topar con una pared, como en Pac-Man.
- Si deslizas antes de llegar a un cruce, el giro queda en cola y se ejecuta al llegar. Así se juega rápido con el pulgar.
- En ordenador, con las flechas.

## 4. Pasar la página
- Cada página es un nivel y un cuaderno es un mundo de 10 páginas.
- La salida está en el borde. Al llegar, la hoja gira (animación) y sigues por el reverso.
- **Regla de papel real**: un agujero en el borde derecho aparece en el borde izquierdo del reverso, porque la hoja se refleja. Hay que pensarlo.

## 5. Símbolos (sin letras)
| Símbolo | Qué hace |
|---|---|
| ➜ flecha | Sentido único |
| ● ▲ ■ portales de colores | Entras en uno y sales por el otro del mismo color |
| ★ estrella | 3 por página, para puntuar |
| ⌂ sacapuntas | Recarga la mina |
| 🔥 antorcha | Visión ampliada 10 s |
| ♥ corazón | Una vida más |
| 🔑 llave y 🔒 candado | Puertas |
| 👁 pista | Durante 3 s, una flecha señala la salida |
| ⛏ pico | Atraviesas un muro (deslizando contra él estando parado) |
| ▭ goma (objeto) | Una vez por página: cruzas tu trazo |
| 📏 regla | Avance recto al doble de velocidad hasta topar con una pared |
| 📎 clip | Punto de control: si mueres, reapareces aquí |

**Peligros**:
- Borrones de tinta que patrullan pasillos.
- Manchas de café donde vas más lento.
- Pliegues: una zona de la hoja doblada que no se ve hasta entrar.

## 6. Cuadernos (mundos)
1. **Matemáticas**: cuadrícula clásica, para aprender las reglas.
2. **Lengua**: papel de rayas; solo hay líneas horizontales, así que las paredes verticales son pocas y la goma corre más.
3. **Dibujo**: hoja en blanco; los muros los marcan manchas y tachones, y sin cuadrícula orientarse cuesta más.
4. **Música**: pentagrama; las notas son portales.

## 7. Vidas y puntuación
- 3 corazones por cuaderno.
- Puntos por página = tiempo + estrellas + mina sobrante.
- Si no repasas nunca, ganas el bonus **«trazo limpio»**.
- Medallas por página: lápiz de bronce, plata u oro.

## 8. Minuto 1
- Abres la app y ves una hoja de cuaderno con un laberinto que se va dibujando ante ti.
- Un dedo animado indica «desliza» y en 15 segundos terminas la primera página.
- La hoja gira y en la segunda aparece la goma.
- En la tercera ya estás contra el reloj.

## 9. Lo social (más adelante)
- **Editor**: dibujas tu laberinto sobre la cuadrícula, colocas símbolos y envías un enlace: «¿Te atreves?». Es el recreo, en digital.
- **Reto diario**: la misma página para todos, con clasificación.
- **Para el final, por ser difícil**: jugar la foto de un laberinto dibujado en papel de verdad.

## 10. Técnica (lo que se reutiliza)
- Misma arquitectura: web estática en Vercel, PWA, canvas 2D, guardado y pruebas.
- Generador de laberintos con semilla y trazo «a mano» (líneas con ligero temblor, como en la foto).
- Un **resolutor automático** valida que cada página tenga solución y calcula el tiempo objetivo y la mina necesaria. Es la base del equilibrio, igual que el bot de antes.

## 11. Primera versión jugable (alcance)
- Cuaderno de Matemáticas, 10 páginas.
- Páginas 1-5: movimiento, trazo, mina, visión, goma, flechas, portales, estrellas, sacapuntas, antorcha y paso de página.
- Páginas 6-10: añaden llaves, borrones de tinta y pico.
