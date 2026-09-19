# IA-0 · Auditoría y contratos, y la estabilización que hizo falta primero

**16 sep 2026.** Primera fase del brief `docs/life-ai-implementation-prompt.md`,
hecha por la sesión de Opus 5 que coordina el rework. Rama
`rework/parada-a-media`, sobre `d2b85b7` (`main`) y sobre los dos commits que
le siguen: `43e29a3` (la parada a media de la ronda anterior) y `f05dabe` (la
documentación de rediseño del dueño del diseño).

Esta fase no toca la IA. Lo que hace es lo que IA-0 pide —comprobar el estado
real de `docs/historico/rework.md` §3.5 y quién es dueño de qué— y lo que la puerta de
toda fase exige y no se cumplía: **que la suite rápida pase**.

---

## 1. El estado real de §3.5, comprobado contra el código

| Punto | Estado | Evidencia |
|---|---|---|
| **1 · el círculo colisiona, no el punto** | **hecho** | `integrate()` en `life/body.ts` comprueba el borde de delante en el eje que se mueve; `clearBetween()` en `life/navigate.ts` acepta un radio y `pathTo` le pasa `ROUTE_CLEARANCE = 0.4` (el cuerpo más ancho del valle, la vaca). Medido en §3.6 de `docs/historico/rework.md`: círculo dentro de un muro, del 1,31 % al 0,10 % de los cuerpo-segundos |
| **2 · un ancla que no se alcanza se cambia** | **pendiente** | `SELF_OFFER` (`life/beasts.ts`) sigue teniendo un solo sitio y un solo asiento por animal, y `noSeats` se le pasa vacío a `decide()` en `stepBeasts`, así que todos los animales de un ancla comparten asiento. `anchorOf()` sigue cayendo en la puerta cuando el empujón de 1,4 celdas da en celda cerrada |
| **3 · la cara sólo sigue al cuerpo cuando el cuerpo anda** | **hecho** | `Dweller.faceAnchor` nuevo; `turnTo` sólo con `speed > TURN_MIN_SPEED * pace` (0,25) y `gap(faceAnchor, body) > TURN_MIN_PROGRESS` (0,3 celdas); al llegar (`doing.there`) se frena de verdad. Se conserva el caso de la pelota, en el que dos se miran parados. Medido: giros de más de π/2 con velocidad casi nula, del 4,75 % al 0,34 % |
| **4 · que nadie se quede parado con un impulso al máximo** | **pendiente** | Medido y sin mover: 0,20 % → 0,19 %. `decide()` sigue devolviendo `who.doing` cuando ninguna de las `TRY = 4` mejores tiene ruta, así que una intención inalcanzable se conserva hasta `GIVE_UP`. No hay oferta de reserva local |
| **5 · la malla y el radio se corresponden** | **pendiente** | Trabajo de `render3d/`, no de `life/`. Sin tocar |
| **6 · `WALLED` completo** | **hecho, y era un no-hallazgo** | La lista ya estaba completa: de los trece tipos de edificio, sólo `field`, `well` y `grave_yard` quedan fuera, y §7.2 los llama «suelo, no interior». Lo que se añadió es la prueba que lo dice (`tests/fast/life-terrain.test.ts`), para que el próximo tipo no se cuele sin decisión |

**Herramienta de medida:** `tools/reports/life-report.ts`
(`npx tsx tools/reports/life-report.ts 3 7 11 23 41 97 --days 4`), sobre personas **y**
animales, 92 160 cuerpo-segundos por columna. Cuenta centro en muro, círculo en
muro, giros de más de π/2 con velocidad casi nula, y parados con un impulso
≥ 0,9. Es la que hay que volver a pasar en cada fase.

**Lo que queda del 0,10 % de círculo en muro** son cuerpos que **nacen** dentro
de uno y tardan unos pasos en salir (el ancla de un animal, el punto de
reunión dentro de un edificio). `integrate()` deja salir a quien está dentro a
propósito —si comprobara los dos bordes, el de atrás tocaría el muro que se
está dejando y lo frenaría en seco— y arreglarlo de raíz es el punto 2: el
ancla se busca en celda libre al crear, no se corrige al andar.

---

## 2. Mapa de propietarios y dependencias

| Módulo | Quién manda | De qué depende | Quién no puede tocarlo |
|---|---|---|---|
| `src/engine/` | El motor: población, recursos, muertes, sucesos (`world/fate.ts`), opiniones | De nada de abajo | `life/`, `derive/`, `ui/` |
| `src/derive/` | Lo que el estado dice antes de pintarlo: `gatherings.ts`, `marks.ts`, `weather.ts`, `encounters.ts` | Del motor, sólo lectura | `render3d/`, `ui/` |
| `src/render3d/life/` | Dónde está cada cuerpo ahora, a `LIFE_STEP` fijo | Lee el estado congelado de la jornada y `seedOfDay`; **nunca escribe en `GameState`** | El motor |
| `src/render3d/`, `src/ui/` | La tinta y las pantallas | De todo lo anterior | — |

Dentro de `life/`, las dependencias que importan para las fases siguientes:

```
body.ts (Body, Terrain, integrate, turnTo)
  ← steering.ts (seek, separate, avoid, resolve, drive)
  ← navigate.ts (pathTo, clearBetween, Router, follow)
      ← decide.ts (worth, decide, satisfy; RETHINK, LOOK, TRY, STICKY)
          ← village.ts (Dweller, createVillage, el bucle de las personas)
          ← beasts.ts (Beast, createBeasts, stepBeasts; RADIUS, PACE, BEAST_RISE)
  offers.ts (OFFERS, doorOf, seatAt) → decide.ts
  needs.ts (los seis impulsos, RISE, TEMPER) → decide.ts, village.ts
  places.ts, props.ts, cast.ts, scenes.ts, staging.ts, grid.ts, clock.ts, terrain.ts
```

**El registro de compromisos que pide IA-2 no existe todavía.** Hoy hay dos
mecanismos parciales y separados: `taken`/`noSeats` (un mapa de asientos
ocupados que `village.ts` calcula por tick y `beasts.ts` pasa **vacío**), y
`Dweller.scene`, un objeto compartido por los dos participantes de una escena a
dos. No hay propuesta, ni reserva atómica de dos actores y dos posiciones, ni
caducidad, ni liberación idempotente. Los contratos `ActorRef`,
`InteractionProposal` e `InteractionLease` del brief **quedan congelados tal
como el brief los escribe** y se implementan en IA-2; no se han añadido al
código todavía para no dejar un tipo sin uso.

---

## 3. El bloqueo que esta fase encontró, y cómo se resolvió

**La puerta de toda fase es `typecheck`, `npm test`, `npm run test:journeys` y
`lint`. La suite rápida tenía 42 pruebas rojas en 19 ficheros**, heredadas de la
ronda anterior: R-1 (los sucesos del valle) y §2.6 (quitar las puertas del rayo,
«que haya caos y que haya partidas que se rompan es la idea del juego»). Ninguna
fase de IA podía cerrarse con esa puerta abierta, así que se cerró primero.

**Una sola causa.** Casi todas esas pruebas construían su aldea con
`foundGame(seed)` —la pareja fundadora— y la jugaban diez, veinte o sesenta
años para después medir un mecanismo: la sal, el rebaño, la merma, el sonido de
la fragua, la pantalla de la gente, el letargo. Desde §2.6 la pareja se rompe a
menudo, así que esas pruebas medían una aldea muerta o de cuatro personas.
`CLAUDE.md` ya tenía escrita la convención desde v3.69: **lo que mide una aldea
hecha se funda con `foundTwenty`**, y estos ficheros nunca se migraron.

Lo hecho, por orden de tamaño:

1. **`foundGame` → `foundTwenty` en las fixtures de mecanismo** de dieciocho
   ficheros. No es bajar un listón: es dejar de medir la fundación cuando lo
   que se quería medir era otra cosa. Las pruebas que **sí** miden la fundación
   —`tests/journeys/founding.test.ts`— siguen con la pareja.
2. **`tests/helpers/founding.ts` gana `villageWhere(years, wants)`**: la primera
   aldea de varias semillas que cumple lo que la prueba necesita, con memoria
   por semilla y año dentro del módulo. Hacía falta porque desde R-1 el valle
   **pierde edificios**: la fragua de la semilla 7 se quema antes de los
   ochenta años, y tres pruebas medían justamente esa fragua. Ahora el valle se
   elige por lo que tiene, no por su número, y si ninguna semilla lo tiene la
   prueba falla diciéndolo. El primer intento de este ayudante jugaba hasta
   ochocientos años de aldea por fichero y **tiró un trabajador de vitest**; de
   ahí la memoria.
3. **`tests/fast/marks.test.ts`** lee del catálogo **qué tipo de edificio apaga
   la opción que usa** y busca un valle que lo tenga en pie, en vez de nombrar
   fragua, capilla o iglesia a mano.
4. **`tests/fast/daylife.test.ts`**: las dos pruebas del herrero buscan un valle
   con fragua entre cinco semillas.
5. **`tests/fast/ui-milestones.test.ts`**: la cota de «entre veinte y sesenta
   hitos en sesenta años» se pide a las partidas que **llegan** a los sesenta
   años; a las que se rompen se les pide lo que sí prometen, historia
   proporcional a lo que vivieron y nunca cero, y las décadas que vivieron en
   vez de seis fijas. Medir el caos contra la cota de una partida completa era
   medirlo como si fuera un fallo.
6. **`src/engine/chronicle/bank.en.ts`**: dos claves nuevas,
   `built.smithy.year` y `built.mill.year`. Con los veinte de §12.2 la aldea
   levanta más de una fragua y más de un molino en el mismo año, y §9.2 exige
   forma anual para toda familia que se repita dentro de un año. No hacían
   falta antes porque la aldea nunca llegaba a dos de ninguna en doce meses.
   **Es la única línea de producción que esta fase cambió.**
7. **`tests/fast/fate.test.ts` → `tests/journeys/fate-chaos.test.ts`**: la
   medida del caos son doce semillas por cuarenta años, o sea minutos, y estaba
   escrita en la suite rápida, que tiene que caber en treinta segundos. En la
   rápida se queda lo barato: que ninguna cifra se salga de su rango.

**Y un error de medida propio, corregido, que estuvo a punto de convertirse en
un informe falso.** Al ver `house: 0` en cinco valles de sesenta años escribí
que el mundo era incoherente —gente sin casas— cuando lo que pasaba es que
contaba sólo las casas de madera. Hay quince o dieciséis, de piedra: la madera
se quema y se reconstruye en piedra. **Y con las puertas del rayo puestas pasa
exactamente lo mismo**, así que el cambio de §2.6 no rompe el mundo: a sesenta
años mueve la población de 69/36/78 a 56/35/74 y los edificios perdidos de
64/85/74 a 77/91/82. Queda escrito porque es justo la trampa que `CLAUDE.md`
avisa: medir media cosa y concluir sobre la entera.

---

## 4. Lo que esta fase deja medido

| Medida | Antes de esta fase | Después |
|---|---|---|
| Suite rápida, pruebas rojas | 42 en 19 ficheros | ver §5 |
| `typecheck` | limpio | limpio |
| `lint` | limpio | limpio |
| Círculo en muro (§3.6) | 1,31 % | 0,10 % |
| Giros sobre sí mismo (§3.6) | 4,75 % | 0,34 % |

---

## 5. Lo que queda abierto, con nombre

1. **Un trabajador de vitest se cae en la suite rápida** («Worker exited
   unexpectedly», tinypool) después de `chronicle.test.ts`, que es de las
   caras. No es memoria del montículo: con `--max-old-space-size=4096` cae
   igual. La suite en paralelo no llega al final, y por eso esta fase no puede
   escribir todavía «69 ficheros verdes». La pasada en serie
   (`--no-file-parallelism`) es la que da lista definitiva y es lo que hay que
   usar hasta que se entienda.
2. **La suite rápida ya no cabe en treinta segundos**, que es lo que `CLAUDE.md`
   promete. Con las aldeas vivas, las pruebas caras del motor son de verdad
   caras: el bosque de un siglo 18,7 s, las riñas de una partida entera 24,7 s,
   la crónica anual 11,7 s. Hay que decidir si esas tres se mudan a las
   jornadas —donde los minutos están permitidos— o si la promesa de treinta
   segundos se reescribe con el número real.
3. **Las nueve jornadas rojas de `docs/historico/rework.md` §2.8** siguen rojas. Casi
   todas son de la capa de vida y sus números van a cambiar con IA-1 a IA-4,
   así que se tocan **después** de esas fases y no antes.
4. **Los puntos 2, 4 y 5 de §3.5**, que son el contenido de IA-1.
5. **Sin capturas.** Esta fase no cambia nada que se vea, así que no hay
   secuencia que enseñar; la primera que toca es la de IA-1.

---

## 6. Qué refutaría lo que esta fase afirma

- Que alguna de las dieciocho fixtures migradas a `foundTwenty` estuviera
  midiendo la fundación y no un mecanismo: entonces la migración le quitó lo
  que probaba. Se revisó una por una y ninguna nombra la pareja ni el
  crecimiento; las que lo hacen están en `tests/journeys/founding.test.ts`.
- Que el trabajador de vitest se cayera por algo que esta fase introdujo y no
  por el peso de las aldeas vivas. La pasada en serie lo dirá: si en serie pasa
  y en paralelo no, es concurrencia y no una prueba concreta.
- Que `villageWhere` esconda un cambio de comportamiento del motor: si mañana
  **ninguna** semilla llega con fragua en pie, las pruebas que la usan fallan
  diciéndolo en vez de pasar en silencio. Eso es lo que la distingue de bajar
  una cota.
