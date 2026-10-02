# Rutas: que una obra no tire todas las rutas — medida del 2 oct 2026 (v5.71)

**En una línea:** simular una semana cuesta un **44 % menos** bajo vitest
(6,81 → 3,80 ms en cinco semillas a 40 años) y la partida sale **idéntica byte
a byte**: crónica, gente, edificios, `map.traffic`, sendas y el estado entero,
en las semillas 7, 23, 41, 11 y 99. El parche del diagnóstico
(`docs/medidas/ci-lentitud-2026-10-02.md` §6.1) daba −31 % y cambiaba el
tráfico en dos semillas de tres; éste va más lejos y no cambia nada.

## 1 · Lo que se hizo

Tres cosas, en `src/engine/world/paths.ts` y `astar.ts`:

1. **Una obra ya no sube `GROUND`** (el escalón de `6fa7fda1`). Sube su propia
   versión, `BLOCKS`, y cada ruta guardada decide si le afecta.
2. **Una ruta guardada sigue valiendo si A\* daría la misma**, y se sabe sin
   lanzarlo (`stillCheapest`). Hacen falta tres cosas a la vez:
   - lo que cuesta andarla no ha cambiado (ninguna celda suya bajo una casa,
     vuelta a bosque o con otra senda);
   - sus extremos salen de las mismas parcelas;
   - **ninguna celda abaratada desde que se calculó** —árbol talado, senda
     mejorada— **cae en la zona que su búsqueda miró**. A\* devuelve ahora el
     rectángulo de lo que expandió y sus vecinas (`lastSearchBounds`): una
     celda de fuera no influyó en nada, así que la misma búsqueda daría la
     misma ruta. Y por si acaso, la cota de siempre: si ni a `MIN_STEP` por
     paso una ruta por esa celda llega a costar lo que la guardada, tampoco.
   
   Una celda que antes no se pisaba y ahora sí (una casa derribada) recalcula
   siempre: puede unir lo que estaba separado o abrir una fachada nueva.
   Las sendas mejoradas (`upgradePaths`) pasan por la misma puerta: antes
   también tiraban todas las rutas.
3. **A\* sin *getters* en el bucle.** Bajo vitest cada `TERRAIN_CODE.x` y
   `PATHING.x` es un *getter* del módulo, y `stepCost` los leía ocho veces por
   vecino; `neighbours4` reservaba un array por celda expandida. Ahora una
   tabla de 256 costes por terreno, hecha una vez con el propio `stepCost`, y
   los cuatro vecinos en línea, en el mismo orden. Mismo resultado, la mitad
   de tiempo de A\*.

Y una de regalo: **el camino del valle** (`wearValleyRoad`) lanzaba un A\* por
boca de punta a punta del mapa **cada semana**. Ahora se guarda por sendas,
bosque y plaza, que es todo lo que lo mueve.

## 2 · Por qué no el parche del diagnóstico tal cual

El parche guardaba una ruta si ninguna celda suya había quedado debajo de una
casa. Le faltaba lo que el recálculo total hacía de paso: **aprovechar lo que
se había abaratado desde la última vez**. Una tala de hace tres semanas no
recalcula nada (§7.6, `invalidateForest`), pero en cuanto se abría una obra
todas las rutas se volvían a buscar y la encontraban. Sin eso, la ruta vieja
seguía siendo una ruta, pero no la más corta, y el desgaste caía en otras
celdas: `map.traffic` distinto en las semillas 7 y 23.

La prueba `lo que se ahorra no cambia la partida` lo caza: con el control de
celdas abaratadas desactivado, falla en la semilla 7, semana 100.

## 3 · Las medidas

**Bajo vitest**, que es lo que corre la CI. `foundGame(seed)`, 40 años con
`run(…, 'prudent')`, un hilo, `main` `5726bb3` contra la rama:

| Semilla | `main` ms/semana | v5.71 ms/semana | Vivos al final |
|---|---|---|---|
| 7 | 4,65 | 2,96 | 82 · 82 |
| 23 | 12,06 | 5,98 | 47 · 47 |
| 41 | 5,88 | 3,69 | 67 · 67 |
| 11 | 2,80 | 1,94 | 70 · 70 |
| 99 | 8,65 | 4,44 | 79 · 79 |
| **total** | **6,81** | **3,80 (−44 %)** | |

Bajo `tsx` (`tools/reports/tick-bench.ts`, que es donde se compara la
identidad) la bajada es menor, 4,80 → 4,07 ms en las mismas cinco, porque tsx
no pone *getters* en los módulos y la mitad del ahorro de A\* es eso.

**Identidad a 40 años**, resumen SHA-1 de cada parte del estado:

| Semilla | Crónica | Gente | Edificios | `map.traffic` | Sendas | Estado entero |
|---|---|---|---|---|---|---|
| 7 | igual | igual | igual | igual | igual | igual |
| 23 | igual | igual | igual | igual | igual | igual |
| 41 | igual | igual | igual | igual | igual | igual |
| 11 | igual | igual | igual | igual | igual | igual |
| 99 | igual | igual | igual | igual | igual | igual |

**Búsquedas A\* de rutas de trabajo**, 15 años en 7, 23 y 41: el diagnóstico
contaba 9,5 por semana; quedan **2,5 a 4,5**. De las que quedan, unas tres de
cada cuatro son por una celda abaratada dentro de la zona de búsqueda —casi
siempre una senda que se asienta donde la gente ya anda, que es justo el
mecanismo de §7.6— y las demás, pares nuevos o rutas que una senda o una casa
encareció.

**Perfil bajo vitest** (`--cpu-prof`, semillas 7, 23 y 41, 25 años): en `main`
A\* (`route`) es el 50 % del perfil, 15,6 s de 30,9, y el camino del valle otro
6,7 %; con v5.71, el 28 % de 17,0 s: **4,7 s, un tercio**, y el camino del
valle desaparece del perfil. Lo siguiente que pesa es `advanceWorks` →
`placeBuilding` (16 %) y el resto de `routesFor` (`destinations`,
`walkingGround`, `banksOf`).

## 4 · Lo que queda

- **La población.** Con 240 vivos hay más rutas distintas y no hay caché que
  lo evite. El siguiente paso, si hace falta, es un A\* que reutilice el árbol
  de búsqueda desde cada casa (una búsqueda por origen, no por pareja): eso es
  un brief, no un parche.
- `banksOf` se rehace con cada versión del suelo aunque las orillas sólo
  dependen del agua, que no cambia. No se tocó: las pruebas escriben agua en el
  mapa en caliente y una caché por partida las dejaría con orillas viejas.
- `walkingMap` rehace el mapa entero (8 064 celdas) con cada tala.

## 5 · Cómo se reproduce

```bash
npx tsx tools/reports/tick-bench.ts --seeds 7,23,41,11,99 --years 40
# y la misma línea en una copia del commit de antes (instrucciones en la
# cabecera del fichero). Los resúmenes tienen que coincidir.
npx vitest run tests/fast/route-invalidation.test.ts
```
