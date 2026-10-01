# RD-3 · Antes y después de aplicar el dictamen de las encrucijadas

**1 oct 2026 · rama `claude/rd3-encrucijadas` · v5.46.** Vera (dueña del diseño)
decidió aplicar el dictamen de `docs/medidas/rd0-encrucijadas-2026-09-30.md`
(rama `claude/ritmo-rd0`): **retirar** del sorteo `plague_blame` y las cinco que
duplican mecanismos posteriores, y **reescribir** las ocho cuyo coste anunciado,
efecto ejecutado y lo que se ve no coincidían. Esto es la medida de qué cambió.

## 0. Resultado en ocho líneas

1. **El catálogo vivo pasa de 21 a 15 plantillas** y las retiradas de 3 a 9. Las
   seis nuevas retiradas siguen cargando, enseñándose y contestándose desde un
   guardado (`templateOf`), y sus semillas se disparan con efecto y crónica.
2. **Preguntas por partida: 46,8 → 36,0** (10 semillas × 60 años, `run` con la
   política prudente). Cae un cuarto porque salen seis plantillas (55 de las 468
   eran suyas) y `smith_feud`/`forest_cut` dejan de salir cuatro veces cada una.
3. **`smith_feud` y `forest_cut` ya no son «exactamente 4 por semilla»:** 4–4 →
   2–3 y 4–4 → 1–3.
4. **`hungry_spring` llega al caserío:** primera pregunta de mediana el año 19,2 →
   **1,2** (14 h a ×1), porque ya no pide `reeve` ni `midwife`.
5. **`first_stone` llega con la piedra:** año 41,0 → **8,0** (90 h), con la iglesia
   en pie y el cerco sin cerrar en cada una de las partidas en que sale (la jornada
   lo exige en 12 × 100).
6. **`winter_grain_debt` ya no cae sobre un caserío:** de 14 personas y año 1,9 a
   60 y año 20,9, con los carros proporcionales al granero.
7. **Diversidad en las diez primeras: sin cambio** (9,9 → 9,8 distintas; 7,0 → 7,3
   bloques) y **el asalto pesa más, 31 % → 36 %**: al quitar seis plantillas, las
   que quedan pesan más. El peso de `after_the_raid` no es la palanca (probado).
8. **`quiet_years` sigue sin salir** (0 en 10 × 60): el canario sigue vivo.

## 1. Método

- **Motor:** `foundGame(seed)` + `run(state, 1, 'prudent', CATALOG)` tick a tick,
  **nunca un bucle de `tick`** (nadie contesta y la primera pendiente se queda
  para siempre: la trampa de `CLAUDE.md`). Se registra cuándo se *plantea* cada
  ID (`report.posed`) y la gente viva en ese tick.
- **Muestra:** semillas 5, 7, 11, 13, 23, 25, 31, 37, 41, 60 × 60 años, las
  mismas de RD-0 §3. «Antes» se midió en esta rama **antes de tocar nada** y
  **reproduce RD-0 al número** (468 preguntas, 147 de asalto, 31 %): el catálogo de
  `claude/retiradas-pendientes` + `main` es el mismo que RD-0 midió.
- **Política:** `prudent` elige la opción más barata y no es un jugador: las
  cifras de «qué se elige» son suyas. Cuando una opción desaparece por un
  `requires` (sin anillo, sin sitio), la política elige otra y las cuentas de
  elecciones se mueven aunque nadie haya cambiado de gusto.
- **Tiempo:** una semana = un tick = 14 min a ×1 (§12.1); «h» son horas de reloj a ×1.
  Las medianas son la superior cuando hay dos (por eso «antes» dice a19,2 donde
  RD-0 dice a18,2 para `hungry_spring`: mismo dato, otra mediana).
- Los scripts de la medida (`rd3.ts`, `probe.ts`, `elig.ts`) están en el
  scratchpad de la sesión y no se añaden a `tools/` (el catálogo de
  `tools/README.md` exige una fila por herramienta); la tabla oficial de
  elegibilidad es `npm run eligibility`.

## 2. Por plantilla: antes → después

Cada celda: preguntas por semilla · semillas con ≥ 1 · mediana de la primera vez
que se planteó (año · horas a ×1) · personas vivas en esa primera vez · rango de
veces por semilla.

| ID | antes | después |
|---|---|---|
| `winter_grain_debt` | 1,0 · 10/10 · a1,9 (21 h) · 14 pers. · 1–1 | 1,0 · 10/10 · a20,9 (234 h) · 60 pers. · 1–1 |
| `tithe_demand` | 2,0 · 10/10 · a6,7 (75 h) · 57 pers. · 2–2 | **retirada** |
| `hungry_spring` | 2,4 · 10/10 · a19,2 (215 h) · 63 pers. · 1–4 | 3,3 · 10/10 · a1,2 (14 h) · 61 pers. · 2–4 |
| `granary_theft` | 2,9 · 10/10 · a12,8 (144 h) · 56 pers. · 2–3 | 3,0 · 10/10 · a8,8 (99 h) · 54 pers. · 3–3 |
| `plague_pit` | 1,0 · 8/10 · a38,0 (426 h) · 54 pers. · 1–2 | 0,9 · 7/10 · a38,0 (426 h) · 44 pers. · 1–2 |
| `plague_blame` | 0,1 · 1/10 · a55,0 (616 h) · 39 pers. · 1–1 | **retirada** |
| `smith_feud` | 4,0 · 10/10 · a4,0 (44 h) · 54 pers. · 4–4 | 2,7 · 10/10 · a6,5 (73 h) · 49 pers. · 2–3 |
| `feud_inherited` | 2,0 · 10/10 · a25,0 (280 h) · 57 pers. · 2–2 | 2,0 · 10/10 · a25,0 (280 h) · 66 pers. · 2–2 |
| `chapel_or_granary` | 1,0 · 10/10 · a6,4 (71 h) · 37 pers. · 1–1 | **retirada** |
| `relic_pedlar` | 0,5 · 5/10 · a5,3 (59 h) · 25 pers. · 1–1 | **retirada** |
| `forest_cut` | 4,0 · 10/10 · a4,7 (53 h) · 49 pers. · 4–4 | 1,7 · 10/10 · a8,5 (96 h) · 43 pers. · 1–3 |
| `wolf_winter` | 0,3 · 3/10 · a2,9 (33 h) · 19 pers. · 1–1 | **retirada** |
| `strangers_at_the_ford` | 2,7 · 10/10 · a6,0 (67 h) · 42 pers. · 2–3 | 2,4 · 10/10 · a7,1 (79 h) · 37 pers. · 1–3 |
| `bandits` | 1,6 · 10/10 · a24,7 (277 h) · 53 pers. · 1–2 | **retirada** |
| `breaking_ground` (sin tocar) | 0,8 · 8/10 · a1,0 (11 h) · 6 pers. · 1–1 | 0,9 · 9/10 · a1,0 (11 h) · 6 pers. · 1–1 |
| `one_at_the_ford` (sin tocar) | 1,0 · 10/10 · a0,3 (4 h) · 6 pers. · 1–1 | 1,1 · 10/10 · a0,3 (4 h) · 6 pers. · 1–2 |
| `raiders_coming` | 7,9 · 10/10 · a9,0 (101 h) · 53 pers. · 4–10 | 6,9 · 10/10 · a11,0 (123 h) · 51 pers. · 3–11 |
| `after_the_raid` | 6,8 · 10/10 · a9,4 (105 h) · 55 pers. · 3–10 | 6,0 · 10/10 · a11,4 (127 h) · 53 pers. · 3–10 |
| `succession` | 3,8 · 10/10 · a20,7 (232 h) · 48 pers. · 2–6 | 3,1 · 10/10 · a25,6 (287 h) · 58 pers. · 2–5 |
| `first_stone` | 1,0 · 10/10 · a41,0 (460 h) · 59 pers. · 1–1 | 1,0 · 10/10 · a8,0 (90 h) · 30 pers. · 1–1 |
| `quiet_years` | 0 | 0 |
| **total** | **468 (46,8 por semilla)** | **360 (36,0 por semilla)** |

Las filas que no se tocaron se mueven por la trayectoria (la misma semilla
diverge desde el primer tick en cuanto cambia una tirada del flujo `cast`).

## 3. Diversidad y peso del asalto

| | antes | después |
|---|---|---|
| distintas en las 10 primeras, por semilla | 10,10,10,10,9,10,10,10,10,10 (media 9,9) | 10,10,9,10,10,10,10,10,9,10 (media 9,8) |
| bloques distintos en las 10 primeras (media) | 7,0 | 7,3 |
| `raiders_coming` + `after_the_raid` | 147 de 468 (**31 %**) | 129 de 360 (**36 %**) |
| de asalto en las 10 primeras, por semilla | 2,2,2,2,2,0,0,2,2,0 (media 1,4) | 1,2,3,2,2,2,1,2,1,2 (media 1,8) |

**Lectura honesta:** el catálogo vivo no es más variado en las diez primeras
preguntas —ya lo era: diez distintas en casi toda semilla—, y el asalto pesa
**más**, no menos: lo que RD-3 quita (seis plantillas, un cuarto de las
preguntas) y lo que frena (`smith_feud`, `forest_cut`) lo ocupa el único
generador que no depende de la edad del valle, el clan vecino. Se probó bajar el
peso de `after_the_raid` de 14 a 8 y **las trayectorias salieron idénticas byte a
byte** en 10 semillas: no es la palanca. Lo que decide su frecuencia es que
`just_sacked` dura un año y que sale tras ~84 % de los saqueos. Si Vera quiere el
asalto por debajo del 31 %, la vía es su reposo (3 años) o exigir algo del parte
de la batalla, que el DSL de §8.2 no sabe preguntar.

## 4. Primera elegibilidad (sondeo con `eligible()` antes de cada tick)

Las mismas cuatro semillas que RD-0 §3 (7, 11, 23, 31), 60 años, `eligible()`
antes de cada tick (el sondeo **consume el flujo `cast`**, así que sus
trayectorias no son las de las tablas de arriba; por eso se miden aparte).
«Condiciones» es la primera vez que `requires` se cumple; «elegible», la
primera que además pasa año mínimo, reposo, tope y reparto (no cuenta el hueco
de 16 ticks entre preguntas). Mediana de las semillas en que ocurre; «antes» es
la tabla de RD-0 §3 (el catálogo era el mismo).

| ID | antes · elegible (tick · año) | después · condiciones | después · elegible (tick · año · h a ×1) | ticks elegibles por semilla (después) |
|---|---|---|---|---|
| `winter_grain_debt` | t402 · a8,4 | t714 · a14,9 | t714 · a14,9 · 167 h | 6 |
| `hungry_spring` | t1040 · a21,7 | t11 · a0,2 | t11 · a0,2 · 3 h | 7 |
| `granary_theft` | t737,5 · a15,4 | t472 · a9,8 | t472 · a9,8 · 110 h | 3 |
| `plague_pit` | t1128 · a23,5 | t1824 · a38,0 | t1824 · a38,0 · 426 h | 2 |
| `smith_feud` | t174 · a3,6 | t293 · a6,1 | t293 · a6,1 · 68 h | **20** (antes 16) |
| `feud_inherited` | t1200 · a25,0 | t1200 · a25,0 | t1200 · a25,0 · 280 h | 2 (antes 6) |
| `forest_cut` | t194,5 · a4,1 | t289 · a6,0 | t289 · a6,0 · 67 h | **22** (antes 34) |
| `strangers_at_the_ford` | t192 · a4,0 | t288 · a6,0 | t288 · a6,0 · 67 h | 11 |
| `breaking_ground` (sin tocar) | t0 | t0 | t0 | 16 |
| `one_at_the_ford` (sin tocar) | t12 | t12 | t12 · 3 h | 4 |
| `raiders_coming` | t480 · a10,0 | t528 · a11,0 | t528 · a11,0 · 123 h | 58 (antes 64) |
| `after_the_raid` | t488 · a10,2 | t536 · a11,2 | t536 · a11,2 · 125 h | 59 (antes 63) |
| `succession` | t392,5 · a8,2 | t1201 · a25,0 | t1201 · a25,0 · 280 h | 12 (antes 18) |
| `first_stone` | **t1968 · a41,0** | t289 · a6,0 | **t289 · a6,0 · 67 h** | 11 (antes 5) |
| `quiet_years` | no compite | — | nunca elegible (reserva) | 0 |

Lo que dice: **`hungry_spring` es elegible desde el tick 11** (antes, desde el
1040: no había `reeve` ni `midwife` hasta entonces); **`first_stone` desde el
289** (año 6, con la iglesia en pie; antes, 1968); y **`smith_feud` y
`forest_cut` siguen elegibles muchos ticks** (20 y 22 por semilla), pero ya no
cierta casi siempre —89,8 % y 91,8 % de los ticks con condiciones en RD-0— sino
condicionadas a un valle de mal humor y a un campo por levantar, así que el
reposo deja de ser lo único que las frena (el porcentaje de ticks con
condiciones ciertas, que RD-0 midió en 89,8 % y 91,8 %, se remide en §4b con la
tabla oficial). `succession` (la muerte del jefe) y
`plague_pit` (el brote) se mueven con la trayectoria: no se tocaron.

### 4b · La tabla oficial (`npm run eligibility`, 8 semillas × 60 años)

`npm run eligibility`, 8 semillas (7, 11, 23, 31, 37, 41, 13, 25) × 60 años,
23 040 ticks. «Antes» es la tabla de RD-0 §3 (378 encrucijadas, 47,3 por
partida); «después», la de hoy (**283, 35,4 por partida**). Cada celda:
condiciones OK · ofrecida · planteada.

| plantilla | antes | después |
|---|---|---|
| `smith_feud` | **89,83 %** · 0,99 % · 32 | **11,26 %** · 0,49 % · 21 |
| `forest_cut` | **91,81 %** · 0,99 % · 32 | **8,06 %** · 0,72 % · 14 |
| `hungry_spring` | 0,99 % · 0,12 % · 21 | 1,43 % · 0,20 % · 24 |
| `granary_theft` | 4,51 % · 0,10 % · 22 | 4,84 % · 0,10 % · 24 |
| `first_stone` | 5,99 % · 0,15 % · 8 | 9,25 % · 0,33 % · 8 |
| `winter_grain_debt` | 0,03 % · 0,03 % · 8 | 0,22 % · 0,22 % · 8 |
| `feud_inherited` | 56,58 % · 0,26 % · 16 | 52,40 % · 0,07 % · 16 |
| `plague_pit` | 0,46 % · 0,04 % · 8 | 0,44 % · 0,07 % · 7 |
| `strangers_at_the_ford` | 5,10 % · 0,23 % · 22 | 4,64 % · 0,25 % · 17 |
| `succession` | 0,36 % · 0,36 % · 35 | 0,39 % · 0,39 % · 26 |
| `raiders_coming` | 2,26 % · 2,22 % · 63 | 1,91 % · 1,91 % · 55 |
| `after_the_raid` | 13,30 % · 2,33 % · 53 | 11,32 % · 1,98 % · 47 |
| `breaking_ground` / `one_at_the_ford` (sin tocar) | 0,76 / 0,63 % · 0,49 / 0,14 % · 6 / 8 | 0,99 / 0,91 % · 0,50 / 0,14 % · 7 / 9 |
| `quiet_years` | no compite · **0** | 23,19 % · 0,00 % · **0** |
| retiradas (`tithe_demand`, `chapel_or_granary`, `relic_pedlar`, `wolf_winter`, `bandits`, `plague_blame`) | 16 + 8 + 4 + 1 + 14 + 1 = 44 planteadas | — |

**Lo que cambia de verdad:** `smith_feud` y `forest_cut` pasan de «condiciones
ciertas en nueve de cada diez ticks» (el reposo era lo único que las frenaba) a
**8–11 %**: ahora salen cuando el valle está de mal humor o le falta un campo.
Y **el canario está donde estaba**: `quiet_years` no sale nunca (la garantía de
960 ticks sin pregunta no llega a disparar: 35 preguntas por partida).

## 5. Las ocho reescritas y las seis retiradas, una a una

| ID | qué decía el dictamen | qué se hizo | evidencia |
|---|---|---|---|
| `winter_grain_debt` | +900 fijo a un caserío; «si se descubre» era «siempre»; `scar felled_wood` sin tala | `people ≥ 20`; `kneel` ×2,2 del granero, `take_it_at_night` ×1,8, `tithe_due` ×0,8; el precio dice «within nine years»; `visible` → reunión en el vado | primera pregunta de 14 personas y a1,9 → 60 y a20,9 |
| `hungry_spring` | exige `reeve`+`midwife`; cifras fijas; dos `visible` falsos | dos nombrados cualesquiera; `eat_it` ×1,4 y `half_and_half` ×1,2; `visible` → reuniones | primera: a19,2 → a1,2 |
| `granary_theft` | ninguna opción toca el grano | `grain ×0,9` en las tres + 40 de madera el cerrojo; cuerpo dice «a tenth is gone» | las tres opciones tienen un efecto de grano (test) |
| `smith_feud` | saturada por el reposo; A/B arbitrarios; «B withdraws» 6–14 años después | B odia a A a −55 o peor (`grudgeAgainst`+`min`); sólo con `morale < 45`; reposo 20; el precio dice «Four slower years of building, and some years on {B} leaves with two more»; **`side_with_*` ya no apaga la fragua** (`lit smithy off` era para siempre, ver §6) | 4–4 → 2–3 por semilla; la opinión de B sobre A ≤ −55 en cada pregunta (jornada) |
| `feud_inherited` | `{B}` literal; B menor con la herrería | B = `grudgeAgainst` A (`min` 45): nombrado, vivo, adulto; el oficio sólo si hay herrería y **no hay herrero** | B con nombre y ≥ 18 años en cada pregunta (jornada); sin llave `{B}` |
| `forest_cut` | premisa «faltan campos» sin comprobar | `room field` + `grainToHarvest < 1,15`; la semilla `the_wood_holds` pide bosque > 0,20 y no > 0,5 | 4–4 → 1–2; hay sitio para un campo en cada pregunta (jornada) |
| `after_the_raid` | `build_up` no construye; ciega al parte | `build_up` pide dos estacas (sólo con anillo: `room palisade`); `chase` devuelve la mitad del grano saqueado | **ciega al parte: sigue** (el DSL no pregunta por `threat`) |
| `first_stone` | llega al año 41 con la muralla ya en pie | `has church` + `wall_closed` sin poner; se quitan `minYear 41` y `year > 40` | a41,0 → a8,0; iglesia en pie y cerco abierto cada vez que se plantea (jornada) |
| `plague_pit` (T-lista) | `burn_the_houses` quema «las casas de los muertos» | dice «the two oldest roofs»; `visible` → reuniones/ruinas reales | |
| `strangers_at_the_ford` (T-lista) | `turn_them_away` calla los 10 años de `hostile` | el precio los dice | |
| las seis retiradas | duplican mecanismos o son inalcanzables | a `RETIRED_TEMPLATES` | 0 planteadas en 12 × 100 (jornada); pendiente + semillas se leen y contestan (test) |

## 6. Dos cosas que la reescritura necesitó y que no estaban en `catalog/`

Declaradas en el changelog (v5.46) porque salen del carril:

1. **`{ k: 'room', building }`** (`state.ts`, `conditions.ts`, validador de
   `save.ts`): «se puede pedir una obra más de esta familia» (`withinCap`, y
   para la estaca y la muralla, que el anillo esté escrito). **Hallazgo:** sin la
   segunda mitad, `build palisade` se **rechaza en silencio hasta que el pueblo
   tiene once casas** (A2c, `placement.ts:757`): medido en las semillas 7 y 11 a
   los años 0, 5 y 12 (`requestBuild` devuelve `null`), así que las cuatro
   empalizadas de `smith_feud.build_together` —la opción que `prudent` elegía 30
   de 40 veces— y las de las retiradas `bandits`/`wolf_winter` no construían nada
   en media partida y la opción cobraba su coste igual (RD-0 T2 lo midió en los
   campos; en la estaca era peor). `build_together` y `build_up` sólo se ofrecen
   ya con anillo; consecuencia visible en la política: `smith_feud` pasa de
   `build_together` 30 de 40 (RD-0 §3) a 15 de 26, y `side_with_a` de 10 de 40 a 11 de 26.
   **Y el hallazgo de la fragua:** `smith_feud.side_with_*` hacía `lit smithy off`
   y **nada del motor vuelve a encender una fragua apagada** (sólo levantar otra o
   `feud_inherited.give_b_the_smithy`): sin fragua encendida no hay piedra
   (`canQuarry`), ni bono de oficio, ni camino de herrería. Con `build_together`
   oculto, `side_with_*` salía más y los tests de la atalaya y la era (que juegan
   doce años y buscan piedra) dejaron de ver piedra en la semilla 7. Se quita el
   efecto: queda el `works_slowed_85` de cuatro años, que es el precio de verdad.
2. **`min` en `grudgeAgainst`** (`schema.ts`, `cast.ts`): la opinión de B sobre A
   ≤ −min. Sin él «el que más lo odia» puede ser alguien con un −1 y la riña de la
   tarjeta no existe.

## 7. Lo que queda abierto

- **`after_the_raid` sigue ciega al parte** (bajas, botín, portón): el DSL de §8.2
  no sabe preguntar por `state.threat`. Hace falta una condición nueva
  (`threat`/`just_held`) o un efecto que escriba una marca del resultado; es del
  motor del asedio, no del catálogo.
- **`hamlet.ts` (no es de este carril):** la semilla `the_cleared_strip` de
  `breaking_ground` levanta un campo con `raise field` sin `room`; con ≤ 10
  personas casi nunca topa, pero la prueba de honestidad del catálogo la salta
  por eso (`tests/fast/catalog.test.ts`).
- **`vassal` ya no tiene lector** fuera de `winter_grain_debt` (el lector era
  `tithe_demand`): `kneel` sigue poniéndolo y la bandera sólo evita una segunda
  visita del señor. El diezmo lo cobra el motor a cualquier valle.
- **La migración anterior a M-0** sigue borrando una pendiente retirada
  (`save.ts`): inalcanzable, no se toca.
- **`winter_grain_debt` llega tarde** (año 20,9 de mediana): `people ≥ 20` y
  `grainToHarvest < 0,9` no coinciden hasta que la aldea crece y se aprieta. Si
  Vera la quiere en la aldea temprana hay que relajar la segunda condición, y eso
  es una decisión de diseño, no un arreglo.

## 7b. Lo que la ronda movió en las pruebas, y quedó sin cerrar

Verificado con la suite rápida entera (dos pasadas) y las jornadas enteras; por
orden del coordinador no se cerró la última ronda. Cada cambio de listón lleva su
causa en el propio fichero de prueba.

- **Cerrado:** `era`, `fire-brigade`, `life-companions`, `marks`, `reactions`
  (la primera piedra llega con la iglesia y la política prudente contesta «las
  casas»: a los 8–20 años no hay casas de madera), `crown` (clamp a
  `OPINION.MIN`), `ui-milestones` (cota 60 → 80: `work_done` 41–42, antes 12–16),
  `daylife`/`scars`/`quarrels` (quien se marcha tiene `leftTick`), `life-places`
  y `life-props` (sus `it.fails` pasan: vuelven a `it`), `life-beasts` (la semilla
  7 se queda sin corral a los 40 años: entra la 1).
- **Rojo, sin remedir (CI):** `archery` (semilla 11 a los 25 años, 96 flechas y 0
  aciertos: hace falta otra semilla con cerco y aciertos, como se hizo con la
  41 → 36), `e3b-corridor` ×4 y `e3b-rampart` ×2 (huellas de villas concretas:
  hay que volver a buscar cada escena en 60 semillas, `docs/historico/rework.md`
  §2.7). En la base (`claude/retiradas-pendientes`) esas ocho pasaban.
- **Cronómetros bajo carga**, rojos también en la base con la máquina saturada:
  `save` (`catchUp` 960 ticks en < 2 s), `life-perf` (µs por cuerpo) y
  `life-decide` (una jornada en < 2,5 s).
- **Dos defectos de otros carriles que el cambio destapó, sin arreglar aquí:**
  `render3d/life/companions.ts:129` busca el hogar del perro sólo en
  `kind === 'house'` (un valle de casas de piedra se queda **sin perro**: pasaba
  en toda partida pasado el año 41, ahora a los ~8), y `derive/marks.ts`
  (`dousedAt` sin `who` apaga «la primera casa de madera»).

## 8. Reproducir

```bash
npm run eligibility                        # tabla oficial, 8 semillas × 60 años
npx tsx <scratchpad>/rd3.ts out.json 5,7,11,13   # preguntas por partida (run + prudent)
node   <scratchpad>/sum.js out.json ...    # las tablas de §2 y §3
npx vitest run tests/fast/catalog.test.ts tests/fast/rd3-catalogue.test.ts tests/fast/retired-pending.test.ts
npx vitest run --config vitest.journeys.config.ts tests/journeys/catalogue-coverage.test.ts
```

## RD-6 · `winter_grain_debt` vuelve al caserío (decisión de Vera, 1 oct 2026)

Al integrar RD-3 con el resto del rework, el hambre a tres años se duplicó
(16 semillas, `prudent`): de 20 muertes en 8 valles (`main`) a 39 en 13 con
RD-3. La causa medida es el límite de veinte personas de `winter_grain_debt`:
el préstamo del señor era, sin que nadie lo supiera, el salvavidas del caserío
en su segundo invierno. Sin ese límite, y con el préstamo proporcional de RD-3,
hay 16 muertes en 8 valles y la población media pasa de 13,9 a 19,3. Vera eligió
devolverlo al caserío. La fila «`winter_grain_debt`, primera vez» de la tabla de
arriba deja de valer: vuelve a llegar en los primeros inviernos.
