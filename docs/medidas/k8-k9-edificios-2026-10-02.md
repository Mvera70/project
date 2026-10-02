# K8+K9 · Cuándo llegan la herrería y la iglesia, y qué aprieta (2 oct 2026)

Medido en `main` (tras v5.54) con `tools/reports/k8-report.ts`: 12 semillas
(3, 10, 17…) × 60 años, `run` y política prudente, horas a ×1 (una semana son
14 min).

## Cuándo llegan

| llega | mediana | reparto | valles | gente entonces |
|---|---:|---|---:|---:|
| capilla (o iglesia) | **33 h** | 20–60 h | 12/12 | 20 |
| cura | **34 h** | 22–78 h | 12/12 | — |
| herrería | **40 h** | 28–86 h | 12/12 | 22 |
| herrero (el oficio) | 11 h | 11–11 h | 12/12 | — |
| iglesia (la capilla en piedra) | **65 h** | 42–93 h | 12/12 | 27 |

**Ninguna llega tarde para que su tablón importe**: las tres llegan antes de la
edad de piedra (60–70 h, el objetivo de Vera) en los doce valles. El oficio
de herrero existe desde la fundación; la herrería, desde las 40 h.

## Qué aprieta en cada tramo

Fracción de semanas; existencias en mediana.

| tramo | semanas | hambre | obra esperando madera | ánimo < 40 | piedra | plata | fe |
|---|---:|---:|---:|---:|---:|---:|---:|
| sin capilla | 1 826 | 5 % | 11 % | **58 %** | 0 | 2 | 41 |
| capilla, sin herrería | 1 541 | 7 % | **38 %** | 25 % | 210 | 6 | 87 |
| herrería, sin cerco | 15 553 | 5 % | 12 % | 10 % | 210 | 6 | 89 |
| villa cerrada | 15 640 | 4 % | 4 % | 10 % | 210 | 9 | 90 |

Definiciones: hambre, menos grano que una semana de comer; obra esperando
madera, hay obra que levantar con madera de sobra y no la hay (`nextProject`).

## Lo que dice para el diseño

- **El ánimo aprieta antes de la capilla** (58 % de las semanas por debajo de
  40) y deja de apretar en cuanto hay capilla: la misa llega cuando el ánimo ya
  se ha recuperado. Si la iglesia ha de servir para el ánimo, tiene que pesar
  en las crisis (un invierno, una peste, una muerte), no en la media.
- **La madera aprieta justo cuando llega la herrería** (38 % entre capilla y
  herrería): una inclinación hacia la madera tendría sitio en la herrería
  (hachas), y K1–K3 la hizo un recurso de verdad.
- **La plata es escasa siempre** (2–9): es la única que viene de fuera. Lo que
  la herrería haga para vender al camino tendría sentido toda la partida.
- **La piedra y la fe sobran** (210 y ~89 en mediana): inclinar hacia piedra
  o hacia fe no tendría hoy ningún efecto que se viera.
- 0 de 12 partidas acabadas en 60 años.

## K9 · ¿alguna inclinación dominada o que mate aldeas?

Con los tablones hechos (v5.60), `tools/reports/tilt-report.ts`: cada opción
pedida **siempre que se pueda**, 8 semillas (3, 10…52) × 40 años, `run` y
política prudente. Es la prueba contra la trampa de v2.0, donde sólo vivía la
postura de fábrica y `timber` a 0,2 mataba 11 aldeas de 16.

| estrategia | actos | acabadas | gente al final | obra esperando madera | hambre | ánimo < 40 | plata media | grano medio | ánimo medio |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| nada | 0 | 0/8 | 64 | 9 % | 4 % | 12 % | 6,8 | 1518 | 59 |
| hachas | 6 | 0/8 | 48 | 8 % | 4 % | 13 % | 2,1 | 1491 | 59 |
| rejas | 5 | 0/8 | 62 | 7 % | 3 % | 10 % | 2,2 | 1558 | 60 |
| herrajes | 35 | **2/8 (asaltadas)** | 49 | 16 % | 5 % | 15 % | **103** | 1331 | 57 |
| misa | 132 | 0/8 | **74** | 8 % | 4 % | **7 %** | 6,3 | 1676 | **80** |
| rogativa | 38 | 0/8 | 72 | 8 % | **3 %** | 13 % | 5,9 | **1815** | 59 |

**Cada una es la mejor en algo, y ninguna en todo:**

- **Rejas:** la que menos deja a la obra esperando madera (7 %): liberan manos
  del campo, que van a talar y a construir.
- **Rogativa:** la de menos hambre (3 %) y más grano guardado (1 815).
- **Herrajes:** la plata (103 de media, frente a 7).
- **Misa:** el ánimo (80) y la gente (74).
- **Hachas:** no ganaban en nada de esta tabla, así que se midió lo que hacen,
  **cerrar la villa antes**, en las mismas 8 semillas emparejadas con «nada»:
  cierran el cerco antes en las 8, y los 8 valles lo cierran, frente a 6 de 8
  sin hachas. Por ejemplo, la semilla 24 lo cierra a las 170 h frente a 291, y
  la 31 lo cierra a las 419 h cuando sin hachas no llegaba. Lo pagan con más
  hambre en algunas semillas (24: 112 muertes de hambre frente a 73): se
  construye en vez de cultivar. Es la meta del juego (§1b) y el informe ya lo
  mide (`villa cerrada`).

**La que mata aldeas: los herrajes, y por su cara mala.** Las dos que acaban
lo hacen **asaltadas** (`stormed`), no de hambre ni de frío. La plata
amontonada atrae al clan vecino: cada moneda pesa como 50 de grano en lo que el
valle vale visto desde la ladera (`THREAT.WORTH_PER_SILVER` 1 frente a
`WORTH_PER_GRAIN` 0,02), y pedir herrajes sin gastar la plata lleva a 97–103
de media. **Vera decidió dejarlo así** (2 oct 2026): es su cara mala, como cada
medio del carro tiene la suya, y sólo cae la aldea que amontona sin hacer nada.

**Lo que sí se arregló:** una semilla pasó 46 semanas con la leñera vacía
pidiendo herrajes. Desde entonces ningún encargo se acepta si deja la leña por
debajo de lo que el invierno pide (`winterReserve`, la regla de K3a para las
obras). Con ella, los herrajes siguen acabando 2 de 8 asaltadas (plata media
97). Es la cara mala, no la leña.

**La misa es fuerte**: pedida cada temporada sube el ánimo medio de 59 a 80 y
la gente de 64 a 74, por un séptimo del trabajo de una semana de cada doce. Es
nivelado, y el nivelado es de Vera (`BOARDS.MASS_MORALE`, `MASS_EVERY`).

Capturas: `docs/medidas/k-img/k8-{herreria,capilla}-{390,750}.png` y
`k8-fachada.png`.
