# RD-0 · Auditoría de las 21 encrucijadas activas

**30 sep 2026 · rama `claude/ritmo-rd0` · motor en `main` c0bd680 (tras la
PR #17) · medida, sin cambios de código.** Es la mitad «catálogo» de RD-0
(`plan-ritmo-descanso-y-progresion-2026-09-29.md` §4 y brief RD-0). No toca
`balance.ts`, el motor ni el contenido: sólo lee, mide y dictamina. La mitad
«apertura visible en móvil» (cronología de lo visto y tocado, ×1/×16/×64, sol,
sonido) es de otra medición y aquí sólo se cita donde el catálogo la condiciona.

## 0. Resultado en diez líneas

1. **El inventario del plan es correcto:** 21 plantillas activas (los 21 IDs del
   §4, uno por fila) y 3 retiradas de comercio (`cattle_drover`, `salt_carrier`,
   `grain_factor`). La clasificación del plan difiere del código en dos filas:
   `first_stone` es categoría `succession` y `quiet_years` es `stranger`.
2. **Dictámenes:** **7 conservar** (`plague_pit`, `strangers_at_the_ford`, `breaking_ground`, `one_at_the_ford`, `raiders_coming`, `succession`, `quiet_years`), **8 reescribir** (`winter_grain_debt`, `hungry_spring`, `granary_theft`, `smith_feud`, `feud_inherited`, `forest_cut`, `after_the_raid`, `first_stone`), **5 sustituir** (`tithe_demand`, `chapel_or_granary`, `relic_pedlar`, `wolf_winter`, `bandits`), **1 retirar** (`plague_blame`).
3. **Siete de las veintiuna no sostienen su propia premisa frente al mundo de
   hoy**, por un motivo que ninguna prueba vigila: `chapel_or_granary` se plantea
   con una iglesia ya en pie; `first_stone` se plantea con la muralla de piedra y
   los bastiones ya construidos; `relic_pedlar` desaparece cuando la capilla se
   mejora; `wolf_winter` y `plague_blame` son casi inalcanzables; `tithe_demand`
   duplica el diezmo automático del motor; `bandits` duplica al clan vecino.
4. **El principio «toda opción cambia algo en pantalla» se cumple en forma y no
   en fondo:** el test sólo cuenta `visible.length ≥ 1`
   (`tests/fast/catalog.test.ts:128-134`). De las 59 opciones, **7 declaran un
   efecto visible que no ocurre** (`raise`/`scar` sin la obra, la tala o la
   muerte que lo sostenga), **2 más** dependen de una marca `grave_row` que el
   render no dibuja, y **4** apagan una fragua, un molino o una capilla sin
   relación con lo decidido (§7, T3).
5. **Las promesas de coste fallan sobre todo por omisión:** ningún texto miente
   por completo, pero `take_it_at_night` dice «si» donde el motor dice «siempre»,
   `bandits.pay_them` dice «cada primavera» y dispara en otoño, `bandits.fight_them`
   no dice que muere el 10 %, y `granary_theft` no toca el granero.
6. **Dos defectos de escala:** los efectos son cifras absolutas (+900, +300,
   −450…) pensadas para 40–80 personas, y las dos preguntas de caserío hablan de
   «los dos» y de «una tercera boca» con 4–8 personas ya presentes.
7. **Repetición:** `raiders_coming` + `after_the_raid` son 31 % (147 de 468) de las
   preguntas; `smith_feud` y `forest_cut` salen **exactamente 4 veces por partida
   en cada semilla** (el reposo manda, no la condición).
8. **La primera pregunta de las 10 fundaciones medidas es `one_at_the_ford`, en el tick
   15** (3,5 h a ×1; 13 min 8 s a ×16; 3 min 17 s a ×64). La segunda, en primavera,
   es `breaking_ground` (t48–96). Las dos son candidatas reales a «primera
   elección de fundación» (§8a), con cuerpo y texto corregidos.
9. **Guardados:** un guardado de esquema 12 con una pendiente retirada **carga**
   (el validador acepta `RETIRED_TEMPLATES`) pero **no se ve ni se puede
   resolver** (la UI y `tick` usan sólo `CATALOG`): bloquea todas las preguntas
   futuras. Hoy es inalcanzable desde el juego (la migración 6→7 la borra y nada
   las plantea), pero es una trampa para RD-3 si retira más plantillas.
10. **Ninguna de las 21 es una señal del mapa ni una escena:** todas son una
    tarjeta modal a pantalla completa que espera sin caducar.

## 1. Método y límites

- **Motor:** `run(state, 1, 'prudent', CATALOG)` (nunca un bucle de `tick`), tick
  a tick, desde `foundGame(seed)`, 60 años, sin actos del jugador (`actsFor`
  vacío: no se da nada, no hay caza ni tablón). Se registra cuándo se *plantea*
  cada ID (`state.crossroad.posedTick`) y el estado de la aldea en ese tick
  (personas, grano, edificios en pie, topes, bandera, roles). Script:
  `rd0.ts` en el scratchpad de la sesión (no se añade a `tools/`; ver §9).
- **Muestra:** 10 semillas `pure` 5, 7, 11, 13, 23, 25, 31, 37, 41, 60 + 4 semillas con sondeo de
  elegibilidad (`eligible()` antes de cada tick, igual que
  `tools/reports/eligibility-report.ts`) + `npm run eligibility` (8 semillas ×
  60 años: 7, 11, 23, 31, 37, 41, 13, 25). El sondeo **perturba el flujo `cast`**
  (cada `fillCast` consume azar, `cast.ts:165`), así que sus trayectorias no son
  las de `pure`; por eso se miden por separado y no se mezclan.
- **Escalera de ritmo:** `npx tsx tools/reports/pace-report.ts --seeds 24 --years 20` repetido en esta sesión: primera decisión 3,5 h, edad de piedra (1.ª obra) 54 h (a4,8), primer asalto 103 h, muralla de piedra y villa cerrada ~199–200 h (7/24 valles en 20 años). Sirve para situar cada ID en su etapa.
- **Tiempo:** una semana = un tick = 14 min a ×1 (§12.1); «h» son horas de reloj
  a ×1; a ×16 multiplicar por 1/16 y a ×64 por 1/64.
- **La política `prudent` no es un jugador.** Escoge la opción de menor coste
  visible y por eso elige siempre `feed_him_and_send_him_on`, `eat_it`, `wait`,
  `the_houses`…; las cifras de «qué opción se elige» son de la política y no
  dicen qué prefiere una persona. Nadie contesta al primer minuto de una
  partida humana; la política contesta al tick siguiente.
- **Lo que no se mide aquí:** visibilidad en móvil, sol/reloj/audio, tablón y
  caza (RD-0, otra mitad); el efecto físico del asedio (los partes de batalla
  entran por `PlayerAct` y no se simulan en `run`).
- **Lectura del código:** cada coste anunciado se contrastó con
  `src/engine/crossroads/resolve.ts` (efectos), `seeds.ts` (consecuencias),
  `sim.ts:1475-1515` (`build`/`destroy`/`fell`), `world/works.ts`, `world/buildings.ts`
  (topes) y el banco de textos `chronicle/bank.en.ts:1425-1680`.

## 2. Inventario verificado contra el código

`src/engine/crossroads/catalog/index.ts` ensambla `CATALOG` con 21 entradas y
`RETIRED_TEMPLATES = [...TRADE_TEMPLATES]` con 3 (`tests/fast/catalog.test.ts:29-34`
lo fija). Por categoría del código:

| Categoría (código) | IDs | Bloque del plan |
|---|---|---|
| `lord` | `winter_grain_debt`, `tithe_demand` | Señor |
| `famine` | `hungry_spring`, `granary_theft` | Hambre |
| `plague` | `plague_pit`, `plague_blame` | Peste |
| `feud` | `smith_feud`, `feud_inherited` | Riña |
| `faith` | `chapel_or_granary`, `relic_pedlar` | Fe |
| `forest` | `forest_cut`, `wolf_winter` | Bosque |
| `stranger` | `strangers_at_the_ford`, `bandits`, `quiet_years` | Forasteros (+ la reserva) |
| `hamlet` | `breaking_ground`, `one_at_the_ford` | Caserío |
| `raid` | `raiders_coming`, `after_the_raid` | Asalto |
| `succession` | `succession`, `first_stone` | Sucesión (+ `first_stone` de la Reserva) |

Total 2+2+2+2+2+2+3+2+2+2 = **21**. Retiradas (`trade.ts`): `cattle_drover`,
`salt_carrier`, `grain_factor`; sus títulos y textos siguen en el banco
(`bank.en.ts:1552-1576`).

## 3. Medición

**Muestra `pure`:** semillas 5, 7, 11, 13, 23, 25, 31, 37, 41, 60 (10); política `prudent`; 60 años; sin actos del jugador.

| ID | bloque | semillas con ≥1 | 1.ª planteada, mediana (tick · año · h a ×1) | rango (ticks) | rango (h) | planteadas/semilla (media · mín–máx) | años 0–10 / 10–30 / 30–60 | personas al plantearla (mediana · rango) |
|---|---|---|---|---|---|---|---|---|
| `winter_grain_debt` | lord | 10/10 | t90 · a1.9 (sem. 42) · 21 h | 42–1292 | 9.8 h–301 h | 1.0 · 1–1 | 8 / 2 / 0 | 14 · 7–78 |
| `tithe_demand` | lord | 10/10 | t323 · a6.7 (sem. 35) · 75 h | 323–1331 | 75 h–311 h | 2.0 · 2–2 | 8 / 2 / 10 | 56.5 · 20–78 |
| `hungry_spring` | famine | 10/10 | t874 · a18.2 (sem. 10) · 204 h | 59–2074 | 14 h–484 h | 2.4 · 1–4 | 4 / 7 / 13 | 59.5 · 14–86 |
| `granary_theft` | famine | 10/10 | t592 · a12.3 (sem. 16) · 138 h | 184–1150 | 43 h–268 h | 2.9 · 2–3 | 3 / 11 / 15 | 56 · 24–82 |
| `plague_pit` | plague | 8/10 | t1488 · a31.0 (sem. 0) · 347 h | 384–2448 | 90 h–571 h | 1.0 · 0–2 | 3 / 1 / 6 | 53 · 41–78 |
| `plague_blame` | plague | 1/10 | t2640 · a55.0 (sem. 0) · 616 h | 2640–2640 | 616 h–616 h | 0.1 · 0–1 | 0 / 0 / 1 | 39 · 39–39 |
| `smith_feud` | feud | 10/10 | t182 · a3.8 (sem. 38) · 42 h | 68–374 | 16 h–87 h | 4.0 · 4–4 | 10 / 10 / 20 | 53 · 21–82 |
| `feud_inherited` | feud | 10/10 | t1200 · a25.0 (sem. 0) · 280 h | 1200–1213 | 280 h–283 h | 2.0 · 2–2 | 0 / 10 / 10 | 57 · 32–83 |
| `chapel_or_granary` | faith | 10/10 | t305 · a6.4 (sem. 17) · 71 h | 209–1080 | 49 h–252 h | 1.0 · 1–1 | 8 / 2 / 0 | 37 · 31–42 |
| `relic_pedlar` | faith | 5/10 | t252 · a5.3 (sem. 12) · 59 h | 156–588 | 36 h–137 h | 0.5 · 0–1 | 4 / 1 / 0 | 25 · 24–27 |
| `forest_cut` | forest | 10/10 | t224 · a4.7 (sem. 32) · 52 h | 119–514 | 28 h–120 h | 4.0 · 4–4 | 9 / 11 / 20 | 48.5 · 26–81 |
| `wolf_winter` | forest | 3/10 | t140 · a2.9 (sem. 44) · 33 h | 85–180 | 20 h–42 h | 0.3 · 0–1 | 3 / 0 / 0 | 19 · 19–23 |
| `strangers_at_the_ford` | stranger | 10/10 | t241.5 · a5.0 (sem. 1) · 56 h | 102–480 | 24 h–112 h | 2.7 · 2–3 | 9 / 7 / 11 | 42 · 20–66 |
| `bandits` | stranger | 10/10 | t1186 · a24.7 (sem. 34) · 277 h | 802–2338 | 187 h–546 h | 1.6 · 1–2 | 0 / 9 / 7 | 52.5 · 31–82 |
| `breaking_ground` | hamlet | 8/10 | t48 · a1.0 (sem. 0) · 11 h | 48–96 | 11 h–22 h | 0.8 · 0–1 | 8 / 0 / 0 | 6 · 5–8 |
| `one_at_the_ford` | hamlet | 10/10 | t15 · a0.3 (sem. 15) · 3.5 h | 15–15 | 3.5 h–3.5 h | 1.0 · 1–1 | 10 / 0 / 0 | 6 · 4–8 |
| `raiders_coming` | raid | 10/10 | t408 · a8.5 (sem. 24) · 95 h | 240–624 | 56 h–146 h | 7.9 · 4–10 | 9 / 29 / 41 | 53 · 21–85 |
| `after_the_raid` | raid | 10/10 | t430.5 · a9.0 (sem. 46) · 100 h | 257–641 | 60 h–150 h | 6.8 · 3–10 | 8 / 24 / 36 | 55 · 21–81 |
| `succession` | succession | 10/10 | t894 · a18.6 (sem. 30) · 209 h | 226–1960 | 53 h–457 h | 3.8 · 2–6 | 4 / 10 / 24 | 47.5 · 19–81 |
| `first_stone` | succession | 10/10 | t1969 · a41.0 (sem. 1) · 459 h | 1968–2160 | 459 h–504 h | 1.0 · 1–1 | 0 / 0 / 10 | 57.5 · 45–80 |
| `quiet_years` | stranger | 0/10 | — | — | — | 0.0 · 0–0 | 0 / 0 / 0 | — |

Primeras 10 planteadas por semilla:

| semilla | secuencia (id@año) | distintas | bloques distintos |
|---|---|---|---|
| 5 | one_at_the_ford@0.3 · breaking_ground@1.0 · hungry_spring@1.2 · winter_grain_debt@1.9 · wolf_winter@3.8 · smith_feud@5.9 · tithe_demand@6.7 · raiders_coming@9.0 · after_the_raid@9.4 · strangers_at_the_ford@10.0 | 10/10 | 7 |
| 7 | one_at_the_ford@0.3 · breaking_ground@2.0 · smith_feud@4.0 · forest_cut@5.0 · relic_pedlar@6.3 · strangers_at_the_ford@7.1 · chapel_or_granary@7.5 · plague_pit@8.0 · raiders_coming@9.0 · after_the_raid@9.4 | 10/10 | 7 |
| 11 | one_at_the_ford@0.3 · breaking_ground@1.0 · winter_grain_debt@1.9 · smith_feud@2.6 · strangers_at_the_ford@4.0 · chapel_or_granary@4.4 · forest_cut@4.7 · raiders_coming@6.0 · after_the_raid@6.4 · tithe_demand@6.7 | 10/10 | 7 |
| 13 | one_at_the_ford@0.3 · winter_grain_debt@0.9 · relic_pedlar@4.3 · forest_cut@4.6 · smith_feud@5.0 · strangers_at_the_ford@6.0 · chapel_or_granary@6.4 · tithe_demand@6.7 · raiders_coming@9.0 · after_the_raid@9.4 | 10/10 | 7 |
| 23 | one_at_the_ford@0.3 · breaking_ground@1.0 · smith_feud@3.3 · strangers_at_the_ford@4.0 · forest_cut@4.4 · succession@4.7 · chapel_or_granary@5.1 · raiders_coming@11.0 · after_the_raid@11.4 · succession@13.0 | 9/10 | 7 |
| 25 | one_at_the_ford@0.3 · breaking_ground@1.0 · hungry_spring@1.2 · winter_grain_debt@1.9 · smith_feud@2.2 · relic_pedlar@3.3 · forest_cut@3.6 · strangers_at_the_ford@4.0 · chapel_or_granary@4.4 · tithe_demand@6.7 | 10/10 | 7 |
| 31 | one_at_the_ford@0.3 · winter_grain_debt@0.9 · breaking_ground@1.2 · strangers_at_the_ford@4.1 · smith_feud@4.4 · forest_cut@4.8 · chapel_or_granary@5.4 · tithe_demand@6.7 · plague_pit@9.0 · succession@9.1 | 10/10 | 8 |
| 37 | one_at_the_ford@0.3 · winter_grain_debt@0.9 · smith_feud@1.4 · wolf_winter@1.8 · strangers_at_the_ford@2.1 · forest_cut@2.5 · granary_theft@3.8 · raiders_coming@5.0 · after_the_raid@5.4 · hungry_spring@6.2 | 10/10 | 7 |
| 41 | one_at_the_ford@0.3 · breaking_ground@1.0 · winter_grain_debt@3.9 · tithe_demand@6.7 · strangers_at_the_ford@7.1 · forest_cut@7.4 · smith_feud@7.8 · raiders_coming@8.0 · hungry_spring@8.2 · after_the_raid@8.6 | 10/10 | 7 |
| 60 | one_at_the_ford@0.3 · winter_grain_debt@0.9 · breaking_ground@1.2 · wolf_winter@2.9 · forest_cut@3.3 · smith_feud@3.6 · relic_pedlar@5.3 · strangers_at_the_ford@6.0 · chapel_or_granary@6.4 · tithe_demand@6.7 | 10/10 | 6 |

Total planteadas: 468 (46.8/semilla). Reparto por bloque: raid 147 (31 %), feud 60 (13 %), famine 53 (11 %), succession 48 (10 %), forest 43 (9 %), stranger 43 (9 %), lord 30 (6 %), hamlet 18 (4 %), faith 15 (3 %), plague 11 (2 %).

Raid (raiders_coming + after_the_raid): 147 de 468 (31 %). Las 5 más frecuentes: raiders_coming 79, after_the_raid 68, smith_feud 40, forest_cut 40, succession 38.

Opciones que tomó la política `prudent` (por ID):

- `winter_grain_debt`: kneel 10
- `tithe_demand`: send_him_away 20
- `hungry_spring`: eat_it 20, half_and_half 4
- `granary_theft`: believe_a 20, a_new_latch 9
- `plague_pit`: bless_them 10
- `plague_blame`: silence_a 1
- `smith_feud`: build_together 30, side_with_a 10
- `feud_inherited`: give_b_the_smithy 20
- `chapel_or_granary`: the_chapel 10
- `relic_pedlar`: send_him_on 5
- `forest_cut`: take_the_edge 30, fell_it 10
- `wolf_winter`: build_the_palisade 3
- `strangers_at_the_ford`: take_them_in 20, turn_them_away 7
- `bandits`: wall_the_village_first 16
- `breaking_ground`: let_it_wait 8
- `one_at_the_ford`: feed_him_and_send_him_on 10
- `raiders_coming`: wait 55, brace 23
- `after_the_raid`: build_up 48, bear_it 20
- `succession`: choose_a 29, choose_b 9
- `first_stone`: the_houses 10
- `quiet_years`: —

Elegibilidad (probe con `eligible()` cada tick, semillas 7, 11, 23, 31):

| ID | condiciones OK 1.ª vez (tick) | elegible 1.ª vez (tick · año · h) | elegible, ticks por semilla (media) | planteada 1.ª vez en esas semillas |
|---|---|---|---|---|
| `winter_grain_debt` | med t402 (4/4) | med t402 · a8.4 (sem. 18) · 94 h (4/4; rango t42–1292) | 1 | med t402 |
| `tithe_demand` | med t539 (4/4) | med t539 · a11.2 (sem. 11) · 126 h (4/4; rango t323–1331) | 2 | med t539 |
| `hungry_spring` | med t10 (4/4) | med t1040 · a21.7 (sem. 32) · 243 h (4/4; rango t820–2073) | 4 | med t1040 |
| `granary_theft` | med t737.5 (4/4) | med t737.5 · a15.4 (sem. 17) · 172 h (4/4; rango t381–1150) | 3 | med t737.5 |
| `plague_pit` | med t1104 (4/4) | med t1128 · a23.5 (sem. 24) · 263 h (4/4; rango t384–2064) | 2 | med t1128 |
| `plague_blame` | med t1512 (2/4) | med t1512 · a31.5 (sem. 24) · 353 h (2/4; rango t384–2640) | 3 | med t2640 |
| `smith_feud` | med t174 (4/4) | med t174 · a3.6 (sem. 30) · 41 h (4/4; rango t125–196) | 16 | med t174 |
| `feud_inherited` | med t1200 (4/4) | med t1200 · a25.0 (sem. 0) · 280 h (4/4; rango t1200–1202) | 6 | med t1200 |
| `chapel_or_granary` | med t236.5 (4/4) | med t236.5 · a4.9 (sem. 44) · 55 h (4/4; rango t206–344) | 11 | med t252.5 |
| `relic_pedlar` | med t252 (2/4) | med t252 · a5.3 (sem. 12) · 59 h (2/4; rango t204–300) | 1 | med t300 |
| `forest_cut` | med t194.5 (4/4) | med t194.5 · a4.1 (sem. 2) · 45 h (4/4; rango t193–201) | 34 | med t227.5 |
| `wolf_winter` | — | — | 0 | — |
| `strangers_at_the_ford` | med t192 (4/4) | med t192 · a4.0 (sem. 0) · 45 h (4/4; rango t192–195) | 9 | med t193.5 |
| `bandits` | med t970.5 (4/4) | med t970.5 · a20.2 (sem. 10) · 226 h (4/4; rango t802–2242) | 2 | med t970.5 |
| `breaking_ground` | med t0 (4/4) | med t0 · a0.0 (sem. 0) · 0.0 h (4/4; rango t0–0) | 16 | med t53.5 |
| `one_at_the_ford` | med t12 (4/4) | med t12 · a0.3 (sem. 12) · 2.8 h (4/4; rango t12–12) | 4 | med t15 |
| `raiders_coming` | med t480 (4/4) | med t480 · a10.0 (sem. 0) · 112 h (4/4; rango t288–624) | 64 | med t480 |
| `after_the_raid` | med t488 (4/4) | med t488 · a10.2 (sem. 8) · 114 h (4/4; rango t296–632) | 63 | med t497 |
| `succession` | med t392.5 (4/4) | med t392.5 · a8.2 (sem. 8) · 92 h (4/4; rango t210–1960) | 18 | med t392.5 |
| `first_stone` | med t1968 (4/4) | med t1968 · a41.0 (sem. 0) · 459 h (4/4; rango t1968–1968) | 5 | med t1970.5 |
| `quiet_years` | med t0 (4/4) | — | 0 | — |


**Cómo leer «elegible» frente a «planteada».** `eligible()` aplica condiciones, año mínimo, reposo por plantilla, tope y reparto, pero **no el hueco mínimo entre preguntas** (`MIN_TICKS_BETWEEN = 16`, `select.ts:310`): por eso `breaking_ground` es elegible ya en el tick 0 (primavera del año 0, menos de 10 personas) y no se plantea hasta la primavera siguiente: cuando el hueco de 16 ticks se abre (tick 15) la estación ya es verano y sólo queda `one_at_the_ford`. El mismo mecanismo explica que muchas plantillas se planteen unos ticks después de su primera elegibilidad.

**Tabla oficial** (`npm run eligibility`, esta sesión): 23040 ticks mirados, 378 encrucijadas planteadas. Se cita en cada ficha; la trayectoria de esa herramienta es la del sondeo (consume `cast` al mirar), distinta de la de `pure`.

## 4. Matriz de dictámenes (una fila por ID)

Las columnas completas de cada fila están en §5. «1.ª real» es la mediana de la primera vez que se **plantea** en la muestra `pure` (horas a ×1); «/sem.» es la media de planteamientos por semilla en 60 años.

| ID | bloque | etapa prevista | 1.ª real (mediana, h ×1) | /sem. | dictamen | motivo en una frase |
|---|---|---|---|---:|---|---|
| `winter_grain_debt` | señor | aldea temprana | 21 h (a1,9) | 1,0 | **REESCRIBIR** | el señor sí es meta, pero +900 no escala (1,1–7,6× la despensa temprana), nadie lo ve y «si se descubre» es «siempre» |
| `tithe_demand` | señor | aldea | 75 h (a6,7) | 2,0 | **SUSTITUIR** | duplica el diezmo automático del motor y no hay señor en pantalla |
| `hungry_spring` | hambre | caserío/aldea | 204 h (a18,2) | 2,4 | **REESCRIBIR** | el dilema más auténtico, pero exige `reeve`, usa cifras fijas y dos `visible` no ocurren |
| `granary_theft` | hambre | aldea | 138 h (a12,3) | 2,9 | **REESCRIBIR** | ninguna opción toca el grano ni hay culpable real; `visible` sin respaldo |
| `plague_pit` | peste | aldea/villa | 347 h (a31,0) | 1,0 | **CONSERVAR** | proporcionada y visible; corregir qué casas arden y el saldo de `bless_them` |
| `plague_blame` | peste | villa | 616 h (a55,0) | 0,1 | **RETIRAR** | casi inalcanzable (sacerdote devoto + fe > 55 + brote) y B no es «el que el pueblo señala» |
| `smith_feud` | riña | aldea | 42 h (a3,8) | 4,0 | **REESCRIBIR** | saturada por el reposo (4 por partida), A/B arbitrarios y «B withdraws» llega 6–14 años después |
| `feud_inherited` | riña | villa | 280 h (a25,0) | 2,0 | **REESCRIBIR** | `{B}` literal en la tarjeta y B puede ser un menor con la herrería; no hay riña real |
| `chapel_or_granary` | fe | aldea naciente | 71 h (a6,4) | 1,0 | **SUSTITUIR** | se plantea con iglesia ya en pie (`has chapel` ciego a `church`); las dos obras fallan por tope |
| `relic_pedlar` | fe | aldea | 59 h (a5,3) | 0,5 | **SUSTITUIR** | sólo vive mientras la capilla no se mejora y duplica el medio `relic` y al buhonero físico |
| `forest_cut` | bosque | aldea | 52 h (a4,7) | 4,0 | **REESCRIBIR** | premisa «faltan campos» sin comprobar; con campos en tope la tala no da campo |
| `wolf_winter` | bosque | caserío/aldea | 33 h (a2,9) | 0,3 | **SUSTITUIR** | inalcanzable (`forestLeft > 0.25`); los lobos ya existen como cuerpo en `wolves_at_the_coop` |
| `strangers_at_the_ford` | forasteros | aldea | 56 h (a5,0) | 2,7 | **CONSERVAR** | coste y consecuencia reales; falta la llegada física y avisar del `hostile` de 10 años |
| `bandits` | forasteros | aldea/villa | 277 h (a24,7) | 1,6 | **SUSTITUIR** | duplica al clan vecino sin su batalla; «cada primavera» dispara en otoño y `fight_them` oculta el 10 % de muertos |
| `breaking_ground` | caserío | caserío | 11 h (a1,0) | 0,8 | **CONSERVAR** | la mejor alineada: coste = efecto, semilla a 1 año exacto, efecto visible real; corregir «the two of them» |
| `one_at_the_ford` | caserío | caserío | 3,5 h (a0,3) | 1,0 | **CONSERVAR** | primera pregunta de las 12 fundaciones; escala correcta; falta cuerpo del forastero y texto conforme a 4–8 personas |
| `raiders_coming` | asalto | asedio | 95 h (a8,5) | 7,9 | **CONSERVAR** | núcleo de la fase 4: aviso → defensa → asalto; efectos leídos por `threat.ts` |
| `after_the_raid` | asalto | asedio | 100 h (a9,0) | 6,8 | **REESCRIBIR** | ciega al parte de batalla y `build_up` no construye |
| `succession` | sucesión | cualquiera | 209 h (a18,6) | 3,8 | **CONSERVAR** | coste = efecto y consecuencia que vuelve; corona y cargo visibles |
| `first_stone` | reserva (cód. succession) | aldea (hoy villa) | 459 h (a41,0) | 1,0 | **REESCRIBIR** | anacrónica: llega con la muralla de piedra y bastiones ya construidos; dilema falso |
| `quiet_years` | reserva (cód. stranger) | cualquiera | — | 0,0 | **CONSERVAR** | canario intencional; no compite en el sorteo |


## 5. Fichas por ID

Cada ficha recorre las columnas de `plan-ritmo…` §4. Convenciones: «t» es el
tick absoluto (una semana de juego; 14 min a ×1), «aN» el año de juego, «h» las
horas de reloj a ×1. `M:` es lo medido con el motor integrado
(`pure_*`), `E:` lo medido con el sondeo de elegibilidad (`probe_*`).
Las rutas `fichero:línea` son del `main` c0bd680.

### 5.1 Señor

#### `winter_grain_debt` · señor · etapa prevista: aldea temprana (la presión exterior antes de la muralla)

- **M:** en 10/10 semillas; 1.ª planteada, mediana t90 (a1,9, semana 42 del año, 21 h; rango t42–1292, 9,8 h–301 h); 1,0 por semilla (mín–máx 1–1; años 0–10/10–30/30–60: 8/2/0); personas al plantearla: mediana 14 (7–78).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t402 (a8,4, semana 18 del año, 94 h; rango t42–1292; 4/4), con las condiciones cumplidas desde t402; 1 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 0,03 % de los ticks, ofrecida 0,03 %, planteada 8 veces.
- **Condiciones:** invierno, semana ≥ 6 de la estación, `grainToHarvest < 0.9`, sin `vassal`, líder vivo (`lord.ts:27-32`). Es **episódica de verdad** (elegible ~0,03 % de los ticks) y, a diferencia de media docena de sus hermanas, no está pegada a su reposo.
- **Situación frente al mundo actual:** el texto pone «riders from Wealdmere … three carts of rye … at the ford». **No hay jinetes, carros ni capitán en el mapa**: `life/visitors.ts` sólo instancia cuerpos para los `HappeningId` (buhonero, forastero, visitas del camino); ni una decisión ni `arrive` tienen cuerpo. Medido: en 8 de 10 semillas llega entre los ticks 42 y 186 (años 0,9–3,9; 7–23 personas y 119–838 de grano en la muestra de referencia; 4 semillas la reciben en el primer invierno posible, t42) y en las demás a los años 14,9 y 27 (62 y 78 personas, 1.281 y 2.571 de grano): **la misma pregunta con despensas de ~120 y de ~2.500**.
- **Coste anunciado vs efecto:**
  - `kneel` «The valley is no longer its own» → grano **+900**, `vassal` permanente, ánimo −12 (`lord.ts:37-47`). En el caserío y la aldea temprana +900 son entre 1,1 y 7,6 veces la despensa medida (119–838). Y «no es suyo» sólo se materializa en `tithe_demand` (que lee `vassal`) y en el banner gris: **el diezmo anual ya lo cobra el motor a cualquier valle de ≥10 personas** (`world/road.ts:140`, `TITHE.MIN_PEOPLE`), vasallo o no.
  - `refuse` «People will die this winter» → grano ×0, cosecha ×0,55 (una), ánimo +10, `proud` 20 años (`lord.ts:61-77`). Cumple: la muerte llega por hambre del invierno, no por un efecto `kill`. En una aldea de 8–11 es una posible extinción.
  - `take_it_at_night` «If it is found out, they come armed» → grano +600, fe −15, recuerdo `stole` en A, **el líder** (`lord.ts:89-99`). La semilla `the_reckoning` (3–9 años: mata al 15 % y destruye 3 empalizadas) **no tiene `condition`** (`lord.ts:100-112`): el «si» del texto es un «siempre».
- **Consecuencia:** inmediata (grano, ánimo, bandera); diferida por semillas `tithe_due` (8–14 a: −450 grano), `wealdmere_remembers` (12–25 a: `threatened` 5 a si sigue `proud`) y `the_reckoning`; **visible:** banner gris permanente (real), reunión en la plaza 3 semanas (real); `scar felled_wood` de `take_it_at_night` **sin efecto `fell`** (sólo enfoca la cámara).
- **Vínculos:** personas: sólo el líder (A). Señales del mapa: ninguna (modal a pantalla completa). Crónica: título y consecuencias citan el año. Meta §1b: `threatened` adelanta la muralla (`works.ts:62-64`) y cuenta como crisis `lord` (×4); no conecta con arma ni con el parte de asalto.
- **DICTAMEN: REESCRIBIR.** La presión exterior «dar para no caer» es la meta del proyecto y llega pronto, pero el número absoluto no escala, el señor no se ve y el «si» de `take_it_at_night` miente.

#### `tithe_demand` · señor · etapa prevista: aldea (≥10 personas) — hoy llega en el primer otoño legal (año 6,7)

- **M:** en 10/10 semillas; 1.ª planteada, mediana t323 (a6,7, semana 35 del año, 75 h; rango t323–1331, 75 h–311 h); 2,0 por semilla (mín–máx 2–2; años 0–10/10–30/30–60: 8/2/10); personas al plantearla: mediana 56.5 (20–78).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t539 (a11,2, semana 11 del año, 126 h; rango t323–1331; 4/4), con las condiciones cumplidas desde t539; 2 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 1,74 % de los ticks, ofrecida 0,07 %, planteada 16 veces.
- **Condiciones:** `vassal` **o** `watched` **o** `silver > 40` (M-1), otoño semana ≥ 11, año > 5, repartos `reeve` + `leader` (`lord.ts:134-146`).
- **Situación:** «The lord has sent a man to count the sheaves». Hay dos cobros del mismo señor: el diezmo **automático** (`collectTithe`, `road.ts:140`: 4 semanas tras la siega, 10 % de la plata o 10 % del grano por encima de un año de comida) y esta pregunta. Con `silver > 40` o `watched` (que ponen los medios `relic` y `arms`, `means.ts:95,121`, la corte, `crown.ts:80`, y el factor, `fate.ts:404`) la pregunta puede salir **sin que el jugador haya conocido al señor**: la frase no tendría antecedente. En la muestra no ocurrió (las 18 preguntas fueron de valles `vassal`, porque la política `prudent` se arrodilla 10 de 10 veces en `winter_grain_debt`; plata máxima en la pregunta: 22), así que este brazo es un riesgo de diseño, no una cifra.
- **Coste vs efecto:** `pay_in_full` «A quarter of the harvest» → grano ×0,75 **del almacén**, no de la cosecha (`lord.ts:151-162`); `pay_short` «They will count again next year» → ×0,88 + `watched` 10 a, y la semilla `double_tithe` cae entre 1 y 3 años después (no «el año que viene») (`lord.ts:163-183`); `send_him_away` «Wealdmere does not forget» → ánimo +12, `threatened` 6 a; la semilla `punitive_raid` (2–5 a) **mata al 12 % y destruye 2 casas** (`lord.ts:184-208`): el coste real está detrás de una frase vaga. `visible: douse smithy` no tiene relación con echar al recaudador y es nulo sin herrería.
- **Calendario, no contenido:** se plantea en el primer otoño legal (t323, año 6,7) en 8 de 10 de las semillas: la condición `year > 5` + otoño + `vassal` decide cuándo, no la historia del valle.
- **Consecuencia:** inmediata en grano/ánimo; diferida por semillas; visible: reunión/banner; el apagón de la fragua es decorativo.
- **Vínculos:** personas: `reeve` + líder (el recaudador «A» es el aldeano que cuenta el grano, no el enviado del señor: A cae en el reparto equivocado). Señales: ninguna. Meta: `threatened` (muralla, `lord` ×4).
- **DICTAMEN: SUSTITUIR** por una visita física del recaudador que *sea* el cobro automático del diezmo (cuerpo en el camino con `visitors.ts`, elección pagar/regatear/echar sobre esa visita). Hoy duplica el cobro y carece de señor en pantalla.

### 5.2 Hambre

#### `hungry_spring` · hambre · etapa prevista: caserío/aldea (primer invierno) — hoy llega de mediana en el año 18

- **M:** en 10/10 semillas; 1.ª planteada, mediana t874 (a18,2, semana 10 del año, 204 h; rango t59–2074, 14 h–484 h); 2,4 por semilla (mín–máx 1–4; años 0–10/10–30/30–60: 4/7/13); personas al plantearla: mediana 59.5 (14–86).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t1040 (a21,7, semana 32 del año, 243 h; rango t820–2073; 4/4), con las condiciones cumplidas desde t10; 4 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 0,99 % de los ticks, ofrecida 0,12 %, planteada 21 veces.
- **Condiciones:** primavera, `grainYears < 0.35`, repartos `reeve` **y** `midwife` (`famine.ts:18-25`). El reparto `reeve` exige un adulto ≥ 22 años **no nombrado** al que el motor haya promovido (`sim.ts:140-163`): los dos fundadores son nombrados y el caserío no suele tenerlo (sí en 2 de 10 semillas, a las 14 personas). Resultado medido: primera pregunta de hambre en la mediana del año 18,2 (rango en la tabla de §3; la más temprana, t59 —año 1,2—, ocurre en 2 semillas en las que ya hay un `reeve` con 14 personas), a pesar de que la crisis `famine` (despensa < semanas hasta la cosecha) es cierta desde el tick 0 en las fundaciones medidas.
- **Situación:** «grain enough to sow the fields, or to eat until midsummer … {A} has counted it, {B} the children». Coherente con el caballo de batalla del juego (subsistencia) pero escrita para 45–80 personas (mediana medida: 59.5).
- **Coste vs efecto:** `sow_it` «A hungry summer» → `forced_hunger` 8 semanas (severidad ≥ 0,5: *sí* es hambre) + ánimo −8, sin ningún refuerzo de cosecha (`famine.ts:30-41`); su `visible: raise field` **no lleva `build`**: no se levanta ningún campo. `eat_it` «A thin harvest» → grano **+300** fijo y cosecha ×0,55 (`famine.ts:42-61`); su `visible: douse mill` es nulo casi siempre (sin molino en pie) y la semilla `lean_autumn` (a 1 año exacto) **no tiene efectos**: es una línea de crónica. `half_and_half` «Both, and neither enough» → +140 grano, cosecha ×0,78, ánimo −4 (cumple). Los números son fijos: +300 son 4 semanas para 71 personas y 75 para 4.
- **Consecuencia:** inmediata y medible (cosecha modificada, hambre); diferida sólo en texto; visible: sólo `half_and_half` (reunión) tiene efecto perceptible.
- **Vínculos:** personas: `reeve` y partera (no tocan ninguna opción); señales: ninguna; crónica ok; meta: nada (el hambre es lo que más cae al «se cae por decisiones» de §1b).
- **DICTAMEN: REESCRIBIR.** Es el dilema más auténtico del catálogo y falta exactamente donde más hambre hay (caserío); escalar por población, repartir en líder/nombrados y dar al `sow_it` un efecto visible real.

#### `granary_theft` · hambre · etapa prevista: aldea

- **M:** en 10/10 semillas; 1.ª planteada, mediana t592 (a12,3, semana 16 del año, 138 h; rango t184–1150, 43 h–268 h); 2,9 por semilla (mín–máx 2–3; años 0–10/10–30/30–60: 3/11/15); personas al plantearla: mediana 56 (24–82).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t737.5 (a15,4, semana 17 del año, 172 h; rango t381–1150; 4/4), con las condiciones cumplidas desde t737.5; 3 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 4,51 % de los ticks, ofrecida 0,10 %, planteada 22 veces.
- **Condiciones:** invierno (≥ sem. 4), (`grainToHarvest < 1.1` **o** plata > 40), granero en pie, `grudge ≥ 40`, reparto A nombrado + B su mayor enemigo (`famine.ts:96-109`). El rencor `deepestDislike` **satura hacia −100** poco después del año 5 (en 367 de 411 (89 %) de las preguntas posteriores al año 5 hay un rencor ≥ 45 en el valle): la condición de rencor es ambiental.
- **Situación:** «Someone has been at the granary in the night. {B} says it was {A}.» **Ninguna opción modifica el grano ni el granero**: ni pérdida, ni recuperación, ni cerradura (`famine.ts:113-183` no contiene un solo `stat grain`, `build` ni `lit`). No hay verdad sobre quién robó: las tres opciones son igual de ciertas.
- **Coste vs efecto:** `believe_b` «{A} is cast out» → cumple (`role null` + `leave`), pero el recuerdo y la opinión de A sobre B casi no pesan porque A ya se ha ido; semilla `exile_returns` (10–20 a) trae 3 personas y `threatened`. `believe_a` «{B} will not forget» → opinión −45 y recuerdo (cumple); `visible: douse smithy` no guarda relación con el robo. `a_new_latch` «Everyone stays, and everyone knows» → ánimo −10, fe −5; `visible: raise palisade` **sin `build`** (`famine.ts:160-182`).
- **Consecuencia:** persona-céntrica (opiniones, recuerdos, marcha), buena para la crónica; la «huella en el granero» que pide el plan **no existe**. Visible: sólo `believe_b` (reunión) es real.
- **Vínculos:** personas: A, B nombrados (bien); señales: ninguna; crónica: semillas con cita; meta: débil.
- **DICTAMEN: REESCRIBIR.** Añadir huella material (grano que falta, cerradura como obra o pérdida real) y una verdad de autoría que el jugador pueda acertar o fallar.

### 5.3 Peste

#### `plague_pit` · peste · etapa prevista: aldea/villa (cuando hay capilla)

- **M:** en 8/10 semillas; 1.ª planteada, mediana t1488 (a31,0, semana 0 del año, 347 h; rango t384–2448, 90 h–571 h); 1,0 por semilla (mín–máx 0–2; años 0–10/10–30/30–60: 3/1/6); personas al plantearla: mediana 53 (41–78).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t1128 (a23,5, semana 24 del año, 263 h; rango t384–2064; 4/4), con las condiciones cumplidas desde t1104; 2 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 0,46 % de los ticks, ofrecida 0,04 %, planteada 8 veces.
- **Condiciones:** brote en curso, > 12 personas, reparto `priest` (exige capilla o iglesia) + B nombrado (`plague.ts:14-22`).
- **Situación:** «Nine dead in eleven days. The churchyard is small and the ground is hard.» Razonable desde el año 8; el «nine dead» es un número fijo del texto, no la mortalidad real del brote.
- **Coste vs efecto:** `bless_them` «The sickness has more days to work» → +3 semanas de brote (cumple) **y** fe +18, ánimo +6 y un camposanto gratis (`plague.ts:29-42`): el beneficio supera con creces el precio visible, y con el camposanto ya construido (en 2 de 10 de las preguntas medidas) `build` no hace nada y la fe se cobra igual. `the_pit` «No one will forget who chose it» → opinión A→B −40 y recuerdo (cumple), brote −3 semanas, fe −20; `visible: scar grave_row` sin `kill` (es decorado, y la marca no se dibuja, `marks.ts:9-12`). `burn_the_houses` «Roofs for ash» → `destroy house ×2` con `blockYears 20`, brote −4, ánimo −14 (cumple en cantidad) **pero** `carryOutBuildings` toma «las dos primeras casas por id» (`sim.ts:1482-1486`), es decir las **más viejas —la casa fundadora incluida—**, no «las casas de los muertos» del texto.
- **Consecuencia:** visible real en dos de tres (camposanto, casas en ruina); diferida: `unquiet_ground` y `the_burnt_row` (esta última, sólo crónica).
- **Vínculos:** personas (A sacerdote, B nombrado), crónica y meta: proporcionada a la etapa; conecta con `outbreak` del motor.
- **DICTAMEN: CONSERVAR**, con dos correcciones puntuales (destino de `burn_the_houses` y opción de bendecir con coste proporcionado).

#### `plague_blame` · peste · etapa prevista: villa

- **M:** en 1/10 semillas; 1.ª planteada, mediana t2640 (a55,0, semana 0 del año, 616 h; rango t2640–2640, 616 h–616 h); 0,1 por semilla (mín–máx 0–1; años 0–10/10–30/30–60: 0/0/1); personas al plantearla: mediana 39 (39–39).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t1512 (a31,5, semana 24 del año, 353 h; rango t384–2640; 2/4), con las condiciones cumplidas desde t1512; 3 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 0,07 % de los ticks, ofrecida 0,04 %, planteada 1 veces.
- **Condiciones:** brote, fe > 55 y **sacerdote devoto** (`plague.ts:103-110`): tres condiciones a la vez. Elegible ≈ 0,04 % de los ticks; en la tirada oficial salió 1 vez en 8 semillas × 60 años (`eligibility`, 29 sep y hoy).
- **Situación:** «by the third day the village had decided whose». **B es un nombrado cualquiera** (`anyNamed`, `plague.ts:108-111`), no el más odiado ni nadie señalado: el texto afirma una decisión del pueblo que el reparto no modela. B puede ser el líder.
- **Coste vs efecto:** `give_them_b` «{B} does not come back» → `kill B` (cumple) + fe +25, ánimo +8; `silence_a` «The village keeps its priest and loses its faith» → fe −30, ánimo −5 (cumple); `say_nothing` «It will find its own end» → brote **+2 semanas**, ánimo −12, fe −8: el coste escrito suena a neutral y ejecuta un agravante.
- **Consecuencia:** persona-céntrica y fuerte (muere un nombrado), con semillas `blood_debt`, `no_shepherd`, `whispers`. Visible: reunión/douse de la capilla (reales si hay capilla).
- **Vínculos:** personas sí; señales no; meta: débil.
- **DICTAMEN: RETIRAR de la selección** (casi inalcanzable) y heredar la idea —entregar a un nombrado— como segundo paso de una cadena de peste, no como plantilla suelta.

### 5.4 Riña

#### `smith_feud` · riña · etapa prevista: aldea

- **M:** en 10/10 semillas; 1.ª planteada, mediana t182 (a3,8, semana 38 del año, 42 h; rango t68–374, 16 h–87 h); 4,0 por semilla (mín–máx 4–4; años 0–10/10–30/30–60: 10/10/20); personas al plantearla: mediana 53 (21–82).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t174 (a3,6, semana 30 del año, 41 h; rango t125–196; 4/4), con las condiciones cumplidas desde t174; 16 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 89,83 % de los ticks, ofrecida 0,99 %, planteada 32 veces.
- **Condiciones:** `grudge ≥ 45` **o** `feud_ripe`, y > 20 personas (`feud.ts:22-30`). Con un rencor ≥ 45 en 367 de 411 (89 %) de las preguntas posteriores al año 5, la condición es cierta casi siempre: lo que fija el ritmo es el reposo de 15 años, y se ve: **exactamente 4 por semilla en las 10 semillas, con 15,0 años de separación** (t190→911→1632→2353 en la semilla 7; frecuencia máxima que permite el reposo; `design.md` §8.1, «por encima del 70 % manda el reposo»).
- **Situación:** «It has been building for years. This morning {A} put a hand on {B}.» Llega desde las 21 personas y entre los ticks 68 y 374 (años 1,4–7,8): «for years» es falso en el primer caso. A y B son nombrados arbitrarios: el título «The Anvil and the Altar» promete al herrero y al cura, pero el reparto no los usa.
- **Coste vs efecto:** `side_with_a` «{B} withdraws» → **no se va**: el efecto inmediato es oscurecer la fragua, `works_slowed_85` 4 años, opinión −30 y recuerdo; B sólo «se retira» con la semilla `the_withdrawn` **6–14 años después** (`feud.ts:36-61`). `build_together` «Neither forgives it, and the wall goes up» → 4 empalizadas *gratis como proyecto* (las tiene que levantar la aldea), ánimo +8, opiniones −15/−15 (cumple) (`feud.ts:88-121`). Visible: `douse house who B` (real, la casa de B); `raise palisade` (real si hay sitio).
- **Consecuencia:** persona-céntrica y con semilla a 6–25 años; una de las pocas con visible «casa de B a oscuras». Pero repite cuatro veces por partida con el mismo guion.
- **Vínculos:** personas sí, señales no, meta: `build_together` adelanta muralla (útil a §1b) — la opción que elige `prudent` 30 de 40 veces.
- **DICTAMEN: REESCRIBIR.** Repartir herrero/sacerdote reales cuando existan, anclarlo a un rencor medido (no a la saturación), y que «B withdraws» ocurra o no se prometa.

#### `feud_inherited` · riña · etapa prevista: villa (generacional, año > 24)

- **M:** en 10/10 semillas; 1.ª planteada, mediana t1200 (a25,0, semana 0 del año, 280 h; rango t1200–1213, 280 h–283 h); 2,0 por semilla (mín–máx 2–2; años 0–10/10–30/30–60: 0/10/10); personas al plantearla: mediana 57 (32–83).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t1200 (a25,0, semana 0 del año, 280 h; rango t1200–1202; 4/4), con las condiciones cumplidas desde t1200; 6 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 56,58 % de los ticks, ofrecida 0,26 %, planteada 16 veces.
- **Condiciones:** año > 24, (`grudge ≥ 45` o `feud_ripe`), > 15 personas, B hijo de A (`feud.ts:131-139`); `childOf` reparte a cualquier hijo. **La riña de la que habla el texto no es la de A**: A y B son padre e hijo *arbitrarios* con un rencor *cualquiera* en el valle.
- **Situación (medida con `fi.ts` sobre la semilla 7):** en el tick 1200 (a25) B es una chica de **14 años sin nombre**: la tarjeta pendiente muestra la **llave `{B}` literal** en título, cuerpo y botones («Send {B} away», «Give {B} the smithy», «{B} was four years old…») porque `promoteToNamed` sólo corre al *resolver* (`resolve.ts:277-288`) y `textOf` no traduce un hueco anónimo (`render.ts:103-110`). `give_b_the_smithy` le dio el oficio de herrero a los 14 años (mínimo del rol: 20, `balance.ts` `ROLE_MIN_AGE`).
- **Coste vs efecto:** `let_it_be_settled` «One of them will not see the winter» → `kill B` (cumple, pero «one of them» sugiere A o B: es siempre B, hijo de A); `send_b_away` «The valley loses a pair of hands and a name» → `leave` B, ánimo −4, semilla `the_returned` (15–30 a) trae 4 personas y `threatened`; `give_b_the_smithy` «{A} watches it happen» → rol smith a B (aunque haya herrero: medidos dos `smith` a la vez), opinión A→B −50, ánimo +6, fragua encendida (`feud.ts:181-205`); `visible: raise smithy` sin `build`.
- **Consecuencia:** dos de tres opciones cambian una persona concreta (desaparece o cambia de oficio): es lo más «historia» del catálogo. Visible: reunión en el vado, `grave_row` (no se dibuja), fragua.
- **Vínculos:** personas fuertes (hijo de un nombrado); señales no; crónica sí; meta: no.
- **DICTAMEN: REESCRIBIR.** Reparto con B adulto y nombrado, ligado al rencor real entre A y su enemigo, sin dar oficios bajo edad.

### 5.5 Fe

#### `chapel_or_granary` · fe · etapa prevista: aldea naciente (la primera obra grande con madera para una)

- **M:** en 10/10 semillas; 1.ª planteada, mediana t305 (a6,4, semana 17 del año, 71 h; rango t209–1080, 49 h–252 h); 1,0 por semilla (mín–máx 1–1; años 0–10/10–30/30–60: 8/2/0); personas al plantearla: mediana 37 (31–42).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t236.5 (a4,9, semana 44 del año, 55 h; rango t206–344; 4/4), con las condiciones cumplidas desde t236.5; 11 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 78,89 % de los ticks, ofrecida 0,46 %, planteada 8 veces.
- **Condiciones:** ≥ 30 personas, **`not has chapel`**, madera > 200, fe > 45 (`faith.ts:12-17`). `has` cuenta `kind === 'chapel'` exacto (`building-counts.ts:14-22`, `conditions.ts:126`): **una iglesia (`church`, la mejora de piedra de la capilla) no cuenta como capilla**.
- **Situación (medida):** en 10 de 10 de las preguntas de esta plantilla **ya hay una iglesia en pie** (kinds del estado en el tick en que se plantea), y el granero está al tope de 3: «There is standing timber for one great work» es falso. La aldea levanta su capilla sola a 12 personas y fe ≥ 30 (`works.ts:251-256`, `BUILDING_RULES.CHAPEL_PEOPLE`), así que la pregunta «capilla o granero» casi nunca es una elección.
- **Coste vs efecto:** `the_chapel` «The next harvest comes in one fifth lighter» → `harvest ×0,8` (cumple) + fe +20, ánimo +10 **y** `build chapel`, que **falla en silencio** cuando ya hay iglesia (`withinCap` de la familia capilla, medido `caps.chapel=false`): se cobra la cosecha y se regalan fe y ánimo sin capilla (`faith.ts:25-47`). `the_granary` «{A} will remember which was chosen» → recuerdo `was_passed_over` (cumple), fe −10, `build granary` que falla con 3 graneros; la semilla `a_priest_without_a_roof` (8–16 a) quita el cargo a A (un nombrado cualquiera) y fe −15.
- **Consecuencia:** inmediata estadística, sin obra; `visible: raise chapel/granary` = enfoque de cámara sin nada nuevo.
- **Vínculos:** personas: A arbitrario (no el sacerdote: no existe antes de la capilla); meta: ninguna.
- **DICTAMEN: SUSTITUIR** por una elección real de «primera obra grande» a las 10–14 personas (cuando de verdad falte madera para dos), con condición de estado sobre `church`/`chapel`.

#### `relic_pedlar` · fe · etapa prevista: aldea

- **M:** en 5/10 semillas; 1.ª planteada, mediana t252 (a5,3, semana 12 del año, 59 h; rango t156–588, 36 h–137 h); 0,5 por semilla (mín–máx 0–1; años 0–10/10–30/30–60: 4/1/0); personas al plantearla: mediana 25 (24–27).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t252 (a5,3, semana 12 del año, 59 h; rango t204–300; 2/4), con las condiciones cumplidas desde t252; 1 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 0,50 % de los ticks, ofrecida 0,03 %, planteada 4 veces.
- **Condiciones:** verano, **`has chapel`**, fe > 30, `grainYears > 0.6`, reparto `priest` + líder (`faith.ts:79-90`). El mismo defecto que `chapel_or_granary` al revés: **en cuanto la capilla se mejora a iglesia la condición se apaga para siempre**; sólo vive en la ventana «capilla sin mejorar», que es lo que mide el 0,03 % de ticks elegibles y que sólo salga en 5 de 10 semillas (en las 5 preguntas medidas había capilla y ninguna iglesia).
- **Situación:** «A man came up the ford road with a box and a story … the finger of a saint.» Duplica **el medio `relic`** (30 de plata → fe alta y `watched`, `means.ts:88-96`) y los sucesos físicos `pedlar` y `pilgrims` (`fate.ts:157-158`, `:215`), que sí llegan por el camino con cuerpo (`life/visitors.ts`).
- **Coste vs efecto:** `buy_it` «Six weeks of bread» → grano ×0,85 (con 1.128 de grano son 169 ≈ seis semanas para 27; en una aldea de 80 son 15 % de otra cifra), fe +25, ánimo +8, semilla `the_relic_works` (+15 fe y 3 llegados con fe > 55) (cumple); `send_him_on` «{A} will preach about it for a year» → fe −8 y opinión −20 (el «un año» no existe, es una opinión); `take_the_box` «He will tell the road what happened here» → **`hostile` 8 años**, que cierra la inmigración (`demography.ts:328`) y las visitas (`fate.ts:256`): el precio real es una década sin gente nueva y el texto lo reduce a cotilleo.
- **Consecuencia:** inmediata estadística; diferida con semillas; visible: reunión en la capilla, banner rojo 2 a.
- **Vínculos:** personas (sacerdote y líder); señales: debería ser el buhonero; meta: `watched` no se escribe aquí.
- **DICTAMEN: SUSTITUIR** por la visita `pedlar`/`pilgrims` (ya física) con la oferta de reliquia del medio `relic`; dejar una sola vía hacia la fe.

### 5.6 Bosque

#### `forest_cut` · bosque · etapa prevista: aldea (años 3–6); villa sólo si el mapa se queda corto

- **M:** en 10/10 semillas; 1.ª planteada, mediana t224 (a4,7, semana 32 del año, 52 h; rango t119–514, 28 h–120 h); 4,0 por semilla (mín–máx 4–4; años 0–10/10–30/30–60: 9/11/20); personas al plantearla: mediana 48.5 (26–81).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t194.5 (a4,1, semana 2 del año, 45 h; rango t193–201; 4/4), con las condiciones cumplidas desde t194.5; 34 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 91,81 % de los ticks, ofrecida 0,99 %, planteada 32 veces.
- **Condiciones:** `forestLeft > 0.12` y > 25 personas (`forest.ts:21-26`): **ambientales y casi siempre ciertas** (91,8 % de los ticks cumplen condiciones, `eligibility`). Sale **exactamente 4 por semilla en 10 de 10** (años ~4, 19, 34, 49): la frecuencia la marca el reposo de 15 años.
- **Situación:** «The fields will not feed another winter of children. The nearest flat ground is under three hundred years of oak.» La falta de campos **no se comprueba** (el comentario del fichero admite que el DSL no sabe preguntar `neededFields > fields`). En 22 de 40 preguntas medidas (las posteriores a ~a18) los campos están **en el tope de 8** (`kinds.field = 8`, `caps.field = false`) y el texto sigue diciendo que faltan.
- **Coste vs efecto:** `fell_it` «The wood does not come back in a lifetime» → 2 campos gratis (`build field` ×2) + tala permanente de 900 + madera +900 + fe −10 (`forest.ts:28-40`): la tala y el cobro de madera son **reales** (hueco en el bosque); los dos campos **fallan en silencio** en el tope y la aldea cobra 900 de madera por nada. `take_the_edge` «Slower, and the children are hungry now» → 1 campo, tala no permanente 300, madera +300, `forced_hunger` **1 semana** (el «hungry now» es una semana): cumple a medias. `leave_it_standing` «{A} sleeps well; nobody else does» → ánimo −8, fe +12, recuerdo `was_saved`; semilla `the_wood_holds` (15–35 a) trae 3 y ánimo +10 si queda bosque > 0,5 (el bosque del corazón va de 0,18 a 0,26 en las 468 preguntas medidas y **nunca** pasa de 0,5) **⇒ la semilla se marchita siempre**.
- **Consecuencia:** la mejor relación visible/efecto del bloque (tala real, campo real mientras queda cupo).
- **Vínculos:** personas: el guarda del bosque (A) no interviene en ninguna opción; señales: ninguna (aquí encajaría una señal de «tala» sobre el árbol); meta: la riada (`fate.ts:140`) lee lo talado.
- **DICTAMEN: REESCRIBIR.** Condicionar a campos que faltan de verdad, sustituir el +900 por un valor de estado, y una semilla que pueda cumplirse.

#### `wolf_winter` · bosque · etapa prevista: caserío/aldea

- **M:** en 3/10 semillas; 1.ª planteada, mediana t140 (a2,9, semana 44 del año, 33 h; rango t85–180, 20 h–42 h); 0,3 por semilla (mín–máx 0–1; años 0–10/10–30/30–60: 3/0/0); personas al plantearla: mediana 19 (19–23).
- **E:** sondeo (4 semillas): nunca elegible (condiciones cumplidas nunca). `npm run eligibility` (8 semillas × 60 años): condiciones OK 0,26 % de los ticks, ofrecida 0,01 %, planteada 1 veces.
- **Condiciones:** invierno, **`forestLeft > 0.25`**, > 15 personas (`forest.ts:112-125`): el bosque medido está en 0,19–0,25 y el umbral sólo se cruza en los primeros años: 0,26 % de ticks con condiciones y 0,01 % elegible. Salió 1 vez en 8 semillas × 60 años (`eligibility`) y 3 veces en 10 semillas en esta muestra.
- **Situación:** «Three nights running. On the third, they took something.» El motor ya cuenta **lobos físicos** con el suceso `wolves_at_the_coop` (`fate.ts:142-150`; `life/wildlife.ts`, `village.ts:874`), con cuerpo en el mapa. La plantilla no saca ningún lobo a escena.
- **Coste vs efecto:** `hunt_them` «Men in the wood in February» → `kill 2 %` **(0 muertes con < 25 personas)**, ánimo +12, madera +120: es casi gratis; `build_the_palisade` «Timber that was meant for a house» → −180 madera, 6 empalizadas gratis, ánimo +5 (cumple); `keep_everyone_inside` «Nothing gets done for a month» → `works_slowed_40` 6 semanas (no «nada»: 40 % de velocidad), semilla `the_long_indoors` a 1 año exacto.
- **Consecuencia:** visible real en `raise palisade` y reunión; nada con lobos.
- **Vínculos:** personas: guarda del bosque y el más joven (B) sin consecuencia propia; señales: es exactamente el caso de la señal «presa» de la caza; meta: empalizadas.
- **DICTAMEN: SUSTITUIR** por una escena/señal sobre los lobos que ya existen como cuerpo (cazar, cercar, encerrar) con sus costes reales.

### 5.7 Forasteros

#### `strangers_at_the_ford` · forasteros · etapa prevista: aldea (≥ 12 personas)

- **M:** en 10/10 semillas; 1.ª planteada, mediana t241.5 (a5,0, semana 1 del año, 56 h; rango t102–480, 24 h–112 h); 2,7 por semilla (mín–máx 2–3; años 0–10/10–30/30–60: 9/7/11); personas al plantearla: mediana 42 (20–66).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t192 (a4,0, semana 0 del año, 45 h; rango t192–195; 4/4), con las condiciones cumplidas desde t192; 9 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 5,10 % de los ticks, ofrecida 0,23 %, planteada 22 veces.
- **Condiciones:** ≥ 12 personas, hueco de camas > 2 %, sin `hostile`, ánimo ≥ 55, primavera, `grainToHarvest > 1.4`, reparto líder + `reeve` (`stranger.ts:15-29`): **episódica y con sentido de estado** (llegan cuando hay grano).
- **Situación:** «Nine of them, with a cart and no oxen. They say their village is ash.» Llega a una aldea ya crecida (ver M). Dos defectos de mundo: (1) **los nueve no tienen cuerpo** (`arrive` no pasa por `life/visitors.ts`: las personas aparecen en el censo); (2) ya existe el suceso `refugees` («una familia que huye de un valle quemado», `fate.ts:227-232`) y `stranger_passes`.
- **Coste vs efecto:** `take_them_in` «Nine more mouths before the harvest» → `arrive 9`, grano −40, ánimo +6 (cumple); semilla `whoever_burned_it` (3–10 a) → `threatened` 3 a y **mata al 10 %** — el giro oculto es el «coste diferido» que pide §8.5. `feed_them_and_send_them_on` «Sixty bushels, and they leave before nightfall» → −60 (cumple al número). `turn_them_away` «The road will hear of it» → **`hostile` 10 años** (cierra llegadas y visitas, `demography.ts:328`, `fate.ts:207,256`), fe −18, ánimo −8: es el precio más alto del bloque y el texto lo dice en tono menor.
- **Consecuencia:** inmediata (población, grano), diferida con semilla, visible: reunión/banner rojo.
- **Vínculos:** personas: líder y `reeve` (B «counted the grain twice»); señales: debería ser una llegada física por el vado; meta: +9 manos = capacidad de defensa.
- **DICTAMEN: CONSERVAR** (con la llegada física de los nueve y el aviso honesto del `hostile` de 10 años).

#### `bandits` · forasteros · etapa prevista: aldea/villa sin cerco

- **M:** en 10/10 semillas; 1.ª planteada, mediana t1186 (a24,7, semana 34 del año, 277 h; rango t802–2338, 187 h–546 h); 1,6 por semilla (mín–máx 1–2; años 0–10/10–30/30–60: 0/9/7); personas al plantearla: mediana 52.5 (31–82).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t970.5 (a20,2, semana 10 del año, 226 h; rango t802–2242; 4/4), con las condiciones cumplidas desde t970.5; 2 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 1,98 % de los ticks, ofrecida 0,08 %, planteada 14 veces.
- **Condiciones:** otoño (≥ sem. 10), > 30 personas, **sin empalizada**, año > 15 (`stranger.ts:109-118`). La aldea levanta empalizada sola con herrería y amenaza (`works.ts`), de modo que desaparece con el cerco.
- **Situación:** «six men … at noon so that everyone would see them. They want a third of the granary.» Desde B2 el clan vecino (`raiders_coming`) hace **lo mismo con cuerpo y batalla**; el aviso, los rehenes y el saqueo físico ya existen. Aquí «six men and a horse» no aparecen.
- **Coste vs efecto:** `pay_them` «And every spring after» → grano ×0,67 (un tercio, cumple) **pero «every spring» es una sola semilla** `the_spring_visit` a 1–2 años **del mismo otoño** (el retardo es en años enteros: `resolve.ts:295-303`), ×0,75 si aún no hay empalizada (`stranger.ts:123-143`). `fight_them` «{B} leads it» → **mata al 10 %**, quema un campo, ánimo +18, madera +80, recuerdo `was_saved`: **el precio real (10 % de la población + un campo) no está en el texto**; `wall_the_village_first` «They take the harvest while the ditch is dug» → 10 empalizadas gratis y grano ×0,8 (cumple, pero «they take the harvest» es el 20 %).
- **Consecuencia:** inmediata; diferida con semillas; visible: `grave_row` (no se dibuja), reunión, empalizadas (reales).
- **Vínculos:** personas: líder y herrero; señales: ninguna; meta: es la versión sin cuerpo del asedio.
- **DICTAMEN: SUSTITUIR** por el clan vecino (incursión menor del mismo sistema B1–D6) o retirarla: hoy duplica a `raiders_coming` sin su representación física.

### 5.8 Caserío

#### `breaking_ground` · caserío · etapa prevista: caserío (años 1–2)

- **M:** en 8/10 semillas; 1.ª planteada, mediana t48 (a1,0, semana 0 del año, 11 h; rango t48–96, 11 h–22 h); 0,8 por semilla (mín–máx 0–1; años 0–10/10–30/30–60: 8/0/0); personas al plantearla: mediana 6 (5–8).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t0 (a0,0, semana 0 del año, 0,0 h; rango t0–0; 4/4), con las condiciones cumplidas desde t0; 16 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 0,76 % de los ticks, ofrecida 0,49 %, planteada 6 veces.
- **Condiciones:** < 10 personas y primavera (`hamlet.ts:50-56`). Como la primera ranura legal es el tick 15 (verano), llega a la **primavera siguiente**: t48–96, con 5–8 personas.
- **Situación:** «more good ground than the two of them can put under seed. {A} … {B} …». **No hay dos personas: hay 5–8** (la pareja queda sola sólo los ticks 0–3; al tick 4 llegan 3–4 más, medido en las semillas 7, 11, 23 y 37) y el ánimo está en 24–36. Los dos repartos son los fundadores (nombrados): correcto.
- **Coste vs efecto:** `break_more_ground` «Thin weeks now, and a field only next year» → tala permanente 40, grano −25, ánimo −6 y la semilla `the_cleared_strip` **a exactamente 1 año** construye un campo: **cumple al pie de la letra** (`hamlet.ts:62-86`). `let_it_wait` «The wood's edge stays the wood's edge» → ánimo +6 y reunión 2 sem.: sin coste (ver decisión de diseño, `hamlet.ts:87-103`).
- **Consecuencia:** inmediata (grano, ánimo), diferida exacta (un campo a los 12 meses), visible real (árboles talados y campo).
- **Vínculos:** personas: los dos fundadores; señales: encajaría con una señal «desmontar» sobre el lindero; meta: primer campo = primera cadena de obra.
- **DICTAMEN: CONSERVAR** (corregir el «two of them»).

#### `one_at_the_ford` · caserío · etapa prevista: caserío (minutos 3–14 a ×16/×64)

- **M:** en 10/10 semillas; 1.ª planteada, mediana t15 (a0,3, semana 15 del año, 3,5 h; rango t15–15, 3,5 h–3,5 h); 1,0 por semilla (mín–máx 1–1; años 0–10/10–30/30–60: 10/0/0); personas al plantearla: mediana 6 (4–8).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t12 (a0,3, semana 12 del año, 2,8 h; rango t12–12; 4/4), con las condiciones cumplidas desde t12; 4 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 0,63 % de los ticks, ofrecida 0,14 %, planteada 8 veces.
- **Condiciones:** < 10 personas y verano (`hamlet.ts:118-131`): **es la primera pregunta de las 10 fundaciones medidas, en el tick 15** (3,5 h a ×1; 13 min 8 s a ×16; 3 min 17 s a ×64).
- **Situación (medida):** al tick 15 hay **4–8 personas** (mediana 6), 57–116 de grano y `grainToHarvest` 0,47–1,07 (en 9 de 10 semillas por debajo de 0,8): la despensa no llega a la cosecha. El texto dice «A man … it is the counting that is the trouble», y el coste de `take_him_in` es «A third mouth»: **la boca no es la tercera, es la quinta o la novena**. El hombre no tiene cuerpo (nadie cruza el vado; ver `visitors.ts`, `stays`).
- **Coste vs efecto:** `take_him_in` → `arrive 1`, grano −20, ánimo +5; semilla `what_he_was_running_from` (3–8 a) → `threatened` 3 a y banner rojo: cumple, sin causa visible (nadie lo persigue); `feed_him_and_send_him_on` «A day of grain for nothing that stays» → −12; `turn_him_away` → ánimo −5, fe −4 (texto: «Nobody else saw it, and that is worse»: verdadero).
- **Consecuencia:** inmediata y de escala correcta; diferida por un único `threatened`; visible: reunión en el vado (real, pero vacía del hombre).
- **Vínculos:** personas: sólo el líder; señales: ideal para un cuerpo de visitante que se toca; meta: primera capacidad de manos (§7).
- **DICTAMEN: CONSERVAR** (candidata a primera elección, ver §8a; requiere cuerpo del forastero y texto conforme a 6–8 personas).

### 5.9 Asalto

#### `raiders_coming` · asalto · etapa prevista: asedio (aviso de ocho semanas)

- **M:** en 10/10 semillas; 1.ª planteada, mediana t408 (a8,5, semana 24 del año, 95 h; rango t240–624, 56 h–146 h); 7,9 por semilla (mín–máx 4–10; años 0–10/10–30/30–60: 9/29/41); personas al plantearla: mediana 53 (21–85).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t480 (a10,0, semana 0 del año, 112 h; rango t288–624; 4/4), con las condiciones cumplidas desde t480; 64 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 2,26 % de los ticks, ofrecida 2,22 %, planteada 63 veces.
- **Condiciones:** hay una partida en camino (`threat.comingTick`), categoría `raid` = crisis que salta el techo de §8.6 (`select.ts:38-47`). Medida: ver M.
- **Situación:** «the herdsmen came down early and {A} has their count: {count} men» (`{count}` lo suministra `textOf`, `screens/crossroad.ts:170-177`). Coherente con el clan B1 y con el asedio físico.
- **Coste vs efecto:** `brace` «A week of every pair of hands, and timber to bar what can be barred» → `braced` 1 año (lo lee `world/threat.ts`), madera −20, ánimo −4: la «semana de todas las manos» no se cobra en trabajo, sólo en ánimo y madera; `pay` «Thirty of silver, and they will remember the road» → plata −30 (si hay), `bought_off` y semilla `they_come_again` → `known_to_pay` 8 a (cumple, se lee); `wait` «Nothing today» → ánimo −2 («nothing» = −2).
- **Consecuencia:** inmediata (banderas que leen `threat.ts`), diferida (`known_to_pay`), visible real: reunión y banner gris. La respuesta física (garrison C2, flechas D2) la pone la capa de vida.
- **Vínculos:** personas: sólo el líder; señales: el aviso ya tiene crónica e imagen; meta §1b: núcleo de la fase 4.
- **DICTAMEN: CONSERVAR.** Es la pieza que enlaza decisión → asedio → `after_the_raid`.

#### `after_the_raid` · asalto · etapa prevista: asedio

- **M:** en 10/10 semillas; 1.ª planteada, mediana t430.5 (a9,0, semana 46 del año, 100 h; rango t257–641, 60 h–150 h); 6,8 por semilla (mín–máx 3–10; años 0–10/10–30/30–60: 8/24/36); personas al plantearla: mediana 55 (21–81).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t488 (a10,2, semana 8 del año, 114 h; rango t296–632; 4/4), con las condiciones cumplidas desde t488; 63 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 13,30 % de los ticks, ofrecida 2,33 %, planteada 53 veces.
- **Condiciones:** marca `just_sacked` (1 año) y sin partida en camino (`raid.ts:108-113`). **Sale ~7 veces por partida** y, junto con `raiders_coming`, es el 31 % (147 de 468) de todas las preguntas.
- **Situación:** «The raiders are a day gone and the tracks are still fresh in the mud by the ford.» No depende del resultado del parte de batalla (quién murió, qué se perdió, cuántos asaltantes): una aldea que perdió 2 casas y otra que perdió 40 personas reciben la misma pregunta.
- **Coste vs efecto:** `chase` «Some of what was taken comes back, and somebody does not» → grano +120 fijo, **mata a 1 al azar (puede ser un niño)**, ánimo +6 (cumple en forma, no en escala); `build_up` «Raise the wall higher» → madera −80, `threatened` 3 a, ánimo −3: **no levanta nada**, sólo activa la prioridad de empalizada de la aldea (`works.ts:62-64`, `raid.ts:132-145`); `bear_it` «Nothing, and everyone will remember that» → ánimo −8 y recuerdo (cumple).
- **Consecuencia:** inmediata; sin diferida; visible: sólo reuniones (nada en `chase` ni `build_up` que recuerde la batalla).
- **Vínculos:** personas: líder y un nombrado; señales: la escena del saqueo ya existe (`life/sack.ts`, `aftermath.ts`); meta: debería leer `ended`/parte.
- **DICTAMEN: REESCRIBIR** para que dependa del parte (bajas, botín, portón) y `build_up` construya de verdad.

### 5.10 Sucesión

#### `succession` · sucesión · etapa prevista: cualquiera (la muerte del líder)

- **M:** en 10/10 semillas; 1.ª planteada, mediana t894 (a18,6, semana 30 del año, 209 h; rango t226–1960, 53 h–457 h); 3,8 por semilla (mín–máx 2–6; años 0–10/10–30/30–60: 4/10/24); personas al plantearla: mediana 47.5 (19–81).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t392.5 (a8,2, semana 8 del año, 92 h; rango t210–1960; 4/4), con las condiciones cumplidas desde t392.5; 18 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 0,36 % de los ticks, ofrecida 0,36 %, planteada 35 veces.
- **Condiciones:** el líder no existe y no hay `interregnum` (`succession.ts:25-31`); repartos de 20–60 años con ensanche. Es la única que salta el techo *una vez por muerte* (`select.ts:68-78,296-300`).
- **Situación:** «The seat is empty. Two people in this valley expect to be asked.» Literal: A y B son los dos nombrados elegidos.
- **Coste vs efecto:** `choose_a/b` «{B} will remember it» → `role leader` (traspasa la corona si la hay, `resolve.ts:210-212`), opinión −45, recuerdo `was_passed_over` y semilla condicionada a rencor ≥ 60 (cumple); `no_one` «The valley decides things by shouting for a while» → ánimo −12, fe −6, `works_slowed_80` 2 a, semilla `the_leaderless_years` que **mantiene `interregnum`** exactamente lo que dura (cumple).
- **Consecuencia:** inmediata (cargo, corona), diferida (rencor ≥ 60 → `feud_ripe` → riñas), visible: reunión 3 sem. o fragua/casa a oscuras; el cambio de líder se ve en quién manda (cuerpo con bastón).
- **Vínculos:** personas (2 nombrados), crónica, meta: la corona es el estilo del valle (K-1–K-4).
- **DICTAMEN: CONSERVAR.** Es la más honesta del catálogo: coste = efecto y consecuencia que vuelve.

#### `first_stone` · sucesión (código) / «reserva» (plan) · etapa prevista: aldea (primera cantera), hoy villa

- **M:** en 10/10 semillas; 1.ª planteada, mediana t1969 (a41,0, semana 1 del año, 459 h; rango t1968–2160, 459 h–504 h); 1,0 por semilla (mín–máx 1–1; años 0–10/10–30/30–60: 0/0/10); personas al plantearla: mediana 57.5 (45–80).
- **E:** sondeo (4 semillas): elegible por primera vez, mediana t1968 (a41,0, semana 0 del año, 459 h; rango t1968–1968; 4/4), con las condiciones cumplidas desde t1968; 5 ticks elegibles por semilla. `npm run eligibility` (8 semillas × 60 años): condiciones OK 5,99 % de los ticks, ofrecida 0,15 %, planteada 8 veces.
- **Condiciones:** primavera, ≥ 45 personas, herrería, año > 40, `maxPerGame 1` (`succession.ts:143-148`). El propio fichero ya dejó escrito que la condición se dejó como estaba.
- **Situación (medida):** se plantea a los **años 41–42 (≈ 460 h)** con **muralla de piedra (73–101 tramos) ya en pie en 9 de 10 y bastiones en 8 de 10** (y en el resto, empalizada de 99 tramos), y la edad de piedra llega a las ~54 h. «There is nowhere left to build outward» **no se comprueba** y la frase «{A} will not live to see both finished» es falsa: la muralla de piedra se abre sola con el cerco (`upgrade.ts:66`, `wall_closed`).
- **Coste vs efecto:** `the_wall` «Cold houses for a generation» → `wall_unlocked` permanente (ya está abierto en 9 de 10 casos), `cold_houses` 20 años (la leña de invierno ×1,5: cumple), ánimo +6; semilla `behind_the_wall` (20–40 a) → `lord`/`stranger` ×0,4. `the_houses` «The valley is rich and open» → `stone_house_unlocked` (la **única** vía a la casa de piedra), ánimo +12; semilla `worth_taking` → `threatened` 8 a (cumple). El dilema es falso: la pared llega igual, la casa no: `prudent` elige las casas 10 de 10.
- **Consecuencia:** inmediata (banderas), diferida; visible: `raise wall`/`raise stone_house` **sin `build`** (enfoque de cámara).
- **Vínculos:** personas: líder y herrero sin papel; señales: ninguna; meta §1b: reclama la fase 3 cuando ésta ya ocurrió.
- **DICTAMEN: REESCRIBIR** (reubicar a la primera cantera, ~54 h, y dar a la casa de piedra una vía de estado, como hizo A4 con el muro).

### 5.11 Reserva

#### `quiet_years` · reserva (código: categoría `stranger`) · etapa prevista: cualquiera — **canario intencional**

- **M:** no se planteó en ninguna de las 10 semillas (60 años). — no se planteó nunca, como esperaba el plan.
- **Condiciones:** `grainYears > 1` (26 % de ticks), pero **no compite en el sorteo** (`select.ts:184`): sólo entra si la garantía (960 ticks sin ninguna pregunta) dispara y no hay ninguna elegible (`select.ts:322-333`). Con ~46 preguntas por partida esa garantía no llega a dispararse: es el canario correcto.
- **Situación/Coste vs efecto:** `a_free_work` «Some of it goes to the men who dig» → `build granary` (falla con 3 graneros) y grano ×0,94; `a_season_of_feasting` «A winter shorter than it looks» → ánimo +20, grano ×0,82 (cumple); sin semillas. Sin consecuencia diferida.
- **DICTAMEN: CONSERVAR** como canario (y nota de archivo: su categoría `stranger` es un resto de clasificación).

## 6. Las tres retiradas y los guardados

Plantillas: `cattle_drover`, `salt_carrier`, `grain_factor` (`catalog/trade.ts`).
Se comprobó con `retired.ts`/`retired2.ts` (scratchpad) sobre un estado real de
la semilla 7 serializado con `serialize()` y cargado con `deserialize()`.
**No se les asigna cadencia**: `eligible()` las salta (`select.ts:188`,
`isTrade`) y el camino las sirve como ofertas (`world/road.ts`).

| Caso | Resultado medido | Dónde |
|---|---|---|
| Decisión **ya contestada** de una retirada en `state.history` (esquema 12) | **Carga.** El validador busca en `[...CATALOG, ...RETIRED_TEMPLATES]` | `save.ts:101-107`, `:187-192` |
| Pendiente retirada en un guardado de esquema 12 | **Carga** (el validador la acepta) pero `crossroad` sigue apuntando a ella: la UI no puede mostrarla (`CATALOG.find` → `undefined`, el overlay no se monta y la tarjeta sellada de la crónica devuelve `null`) y `tick(state, CATALOG, decisión)` **no la resuelve** (`applyOption` no encuentra la plantilla). Tras 303 ticks seguía pendiente y **no se planteó ninguna otra pregunta** (sólo hay una a la vez, §8.6) | `ui/screens/crossroad.ts:247`, `ui/screens/chronicle.ts:462`, `ui/app.ts:1655`, `resolve.ts:247` |
| Pendiente retirada en un guardado **anterior a M-0** (sin `acts`) | La migración la **pone a `null`**: carga, no muestra título y la decisión se descarta | `save.ts:519-531` |
| Semillas plantadas por una retirada | No hay: las tres plantillas declaran `seeds: []` | `trade.ts` |
| Títulos y textos en el banco | Siguen: `title`/`body`/`label`/`cost` de las tres (`bank.en.ts:1552-1576`) **y las líneas de crónica de cada opción** (`crossroad.cattle_drover.buy_the_cow`, `…buy_the_salt`, `…sell_the_surplus`, `…keep_it_all`, etc., `bank.en.ts:1945-1985`): una decisión pasada se sigue leyendo en la crónica | `bank.en.ts:1552-1576,1945-1985` |
| Esquema 11 | **`deserialize` lo rechaza** («not one this build can read»): la lista aceptada es `[2,3,6,7,8,9,10]` + el actual (12) | `save.ts:444` |

**Lectura.** Las retiradas actuales se sostienen sólo porque *nadie puede tener una
pendiente*: la migración 6→7 las borró y `eligible()` ya no las propone. Eso no
es el contrato del plan («retirar no debe invalidar una decisión pendiente»):
si RD-3 retira una plantilla *viva* que un guardado tiene pendiente, ese guardado
carga, no muestra nada y **se queda sin preguntas para siempre**. Antes de
retirar ninguna de las 21 hay que dar a `app.ts`/`screens/*`/`tick` un catálogo
`[...CATALOG, ...RETIRED_TEMPLATES]` (o resolver la pendiente al cargar), y una
prueba que serialice una pendiente retirada. Y las semillas de una plantilla
retirada caerían en el `spec === null` de `seeds.ts:66` (se marcan disparadas
sin efecto ni crónica). El esquema 11, rechazado, es un hallazgo colateral:
confirmar si era un esquema publicado antes de tocarlo.

## 7. Hallazgos transversales

- **T1 · `has chapel` ignora la iglesia.** `has`/`count` comparan `kind` exacto
  (`building-counts.ts:14-22`). Consecuencias medidas: `chapel_or_granary`
  (`not has chapel`) se plantea con una iglesia ya construida en 10 de 10 casos y
  `relic_pedlar` (`has chapel`) sólo existe entre que se levanta la capilla y se
  mejora. La mejora a iglesia llega con la edad de piedra (~54 h, a ~4,8): ambas
  son anteriores a la piedra en el diseño y posteriores en la partida.
- **T2 · `build` silencioso en el tope.** `requestBuild` devuelve `null` si
  `withinCap` falla (`works.ts:435-437`; campo 8, granero 3, capilla/iglesia 1,
  camposanto 1). El coste de la opción se cobra y la obra no ocurre:
  `forest_cut.fell_it/take_the_edge` a partir de ~a18 (campos = 8),
  `chapel_or_granary.*`, `quiet_years.a_free_work`, `plague_pit.bless_them` con
  camposanto. Ninguna opción avisa ni se oculta por `requires`.
- **T3 · `visible` ≠ perceptible.** Sólo `gather` y `banner` son siempre reales;
  `raise`/`ruin`/`scar` son *enfoque de cámara* salvo que exista la obra
  correspondiente (`sim.ts:546-592`, `ui/screens/crossroad.ts:197-200`; el render
  sólo consume `visualEffects[0]`). Ver §0.4 para el recuento; la lista está en
  `vis.ts`.
- **T4 · Las llegadas no tienen cuerpo.** `arrive` crea aldeanos en `resolve.ts:128-142`;
  ni `render3d/life` ni `ui` leen `applied.arrived` (búsqueda en `src/`): los
  nueve del vado, el hombre del vado, el exiliado y `the_returned` aparecen en el
  censo. `life/visitors.ts` sólo sirve `HappeningId` (buhonero, forastero,
  familia que huye, visitas del camino).
- **T5 · Escala fija.** Los efectos son cifras absolutas (+900, +600, +300, −450,
  −180…) y las preguntas tempranas las heredan de aldeas de 40–80 personas:
  la pregunta `winter_grain_debt` llega con 119–838 de grano en 7 de 9 semillas y `kneel` da +900; `hungry_spring` da +300 con una mediana de 59.5 personas; `tithe_due` quita 450 a una aldea de cualquier tamaño.
- **T6 · Reposo que manda.** `deepestDislike` se satura cerca de −100 después del
  año 5 (campo `dis` de las preguntas medidas) y `forestLeft`/`people` no
  cambian: `smith_feud` y `forest_cut` no son episódicas (`design.md` §8.1 pide
  que lo sean) y salen exactamente cada 15 años.
- **T7 · El caserío habla de dos.** La pareja está sola los ticks 0–3; al tick 4
  llegan 3–4 personas (semillas 7, 11, 23, 37). Las dos plantillas del caserío hablan de
  dos o tres personas (`breaking_ground`: «the two of them»; `one_at_the_ford`:
  «a third mouth») con 4–8 en escena.
- **T8 · Duplicados de mecanismos posteriores.** `tithe_demand` ↔ diezmo
  automático (`road.ts:140`); `relic_pedlar` ↔ medio `relic` y sucesos
  `pedlar`/`pilgrims`; `wolf_winter` ↔ `wolves_at_the_coop`;
  `strangers_at_the_ford`/`one_at_the_ford` ↔ `refugees`/`stranger_passes`;
  `bandits` ↔ clan vecino (B1–D6); `first_stone.the_wall` ↔ `wall_closed` (A4).
- **T9 · Reparto anónimo.** `childOf` es el único reparto que admite no nombrados:
  `feud_inherited` enseña `{B}` literal (medido, semilla 7, a25) y puede dar un
  oficio a un menor (B de 14 años, `give_b_the_smithy`).
- **T10 · Variedad de las primeras diez.** Ver §3: en las semillas medidas las
  diez primeras son casi siempre 10 IDs distintos pero sólo 6–8 bloques (y la misma cabeza: `one_at_the_ford` primero en todas); a partir
  de la segunda década manda el asalto.
- **T11 · Modal, no escena.** Las 21 son una tarjeta a pantalla completa
  (`screens/crossroad.ts`), aplazable con el sello de la bandeja y sin caducidad
  (§8.7). Ninguna nace de una señal del mapa y ninguna se resuelve con aldeanos
  actuando; el enfoque de la cámara sólo apunta al primer efecto visible. Las
  ilustraciones de crónica no aplican (`chronicle-art.ts:13-16`: decisión y
  consecuencia llevan «documento sellado»), así que la regla de «crónica nueva,
  imagen pedida» no se dispara por estas plantillas.
- **T12 · Promesas por omisión.** Precio más alto que el texto: `turn_them_away`
  (10 años de `hostile`), `take_the_box` (8), `send_him_away` (12 % de muertos),
  `fight_them` (10 % + un campo), `kneel` (tercer diezmo). Promesa más grande que el
  efecto: `take_it_at_night` («if»), `pay_them` («every spring»), `side_with_*`
  («withdraws»), `build_up` («raise the wall»).

## 8. Conclusiones para RD-1/RD-3

### (a) Qué puede servir o inspirar una «primera elección de fundación» antes del minuto 10

Límite físico: la primera ranura legal es el tick 15 (`MIN_TICKS_BETWEEN = 16`
con `last = -1`, `select.ts:289,310`, `balance.ts:2026`), es decir
13 min 8 s a ×16 y 3 min 17 s a ×64. Antes de un minuto diez sólo cabe a ×64
(o a ×16 si el primer hueco se adelanta a ≤ 11 ticks, que es una decisión de
RD-1, no una medición). Y al tick 15 **hay 4–8 personas y `grainToHarvest`
0,47–1,07**, no dos.

1. **`one_at_the_ford`** (sale la primera en todas las semillas medidas, al tick 15). Por qué sirve: una boca más
   sobre una despensa corta, coste y beneficio en la misma escala, efecto
   demográfico visible y semilla de consecuencia. Qué le falta: el forastero con
   **cuerpo** (`life/visitors.ts`, `stays: true`), un texto que no diga «a third
   mouth», y que su semilla `threatened` tenga un rostro.
2. **`breaking_ground`** (t48–96). Es la **mejor alineada en contrato** de las
   21: coste = efecto, semilla a exactamente un año, efecto real (árboles y
   campo). Inspiración directa para cualquier elección fundacional («qué se
   rompe ahora, qué se ve el año que viene»). No cabe antes del minuto 10 salvo a
   ×64 y sólo si el suelo deja la primavera del año 0 (t≤11) o pasa a t48.
3. **`hungry_spring`** sólo como *idea* («seed or bread») a escala del primer
   invierno: la crisis `famine` ya es cierta desde el tick 0, pero la plantilla
   exige primavera, `reeve` y `midwife`.
4. **`winter_grain_debt`** sólo por su estructura (el mundo exterior ofrece a
   cambio de algo) y **no adelantada: ya está adelantada**. Sale en el primer
   invierno posible (t42: 9 min 12 s a ×64, 36 min 45 s a ×16) en 4
   semillas y antes del año 4 en 8 de 10, con un `kneel` de +900 que supera la
   despensa. Es el caso contrario al que pide el plan: una crisis de aldea
   madura que ya cae sobre el caserío.

**No sirven adelantadas sin más:** `smith_feud` (riña entre desconocidos al año
2,6–4), `forest_cut`, `chapel_or_granary`, `strangers_at_the_ford`, `bandits`,
`tithe_demand` y todas las de peste y sucesión: presuponen una aldea de 20–80.

### (b) Huecos por etapa

- **Caserío (0–~20 h):** dos preguntas propias (`one_at_the_ford`,
  `breaking_ground`) y, en el primer invierno (t42), `winter_grain_debt`, que es
  del señor y no de la casa. La despensa está por debajo de la cosecha desde el
  tick 0 (`grainToHarvest` 0,47–1,07 al tick 15) y aun así **no hay una pregunta
  de hambre a escala de caserío**: `hungry_spring` llega de mediana en el año
  18,2. Faltan: primer invierno de la casa, primera enfermedad, primera fricción
  de reparto de trabajo con 4–8 personas; una de escena (señal) y una de elección.
- **Aldea (~20–80 h):** saturada y repetida (`smith_feud` ×4, `forest_cut` ×4,
  `strangers` ×2–3, `raiders` ×8), con los arquetipos de aldea madura sobre 21–40
  personas. Faltan elecciones de **medios** (tablón, herrería, primer saqueo) y de
  relación (quién es el herrero, el cura, el guarda) que la aldea naciente ya tiene.
- **Villa (~80–460 h):** `tithe_demand`, `bandits`, `feud_inherited`,
  `hungry_spring`, `plague_*`, `succession`, `first_stone` llegan en los años 12–41,
  con el cerco y los bastiones ya construidos (primera piedra a las 54 h, cierre
  ~199 h). Faltan preguntas *sobre la muralla y la piedra* (quién entra por el
  portón, cuánto se racionaliza, qué se sacrifica) cuando el jugador las tiene
  delante.
- **Asedio:** sólo el aviso y el «después» (`raiders_coming`, `after_the_raid`,
  ~8 por partida); falta cualquier pregunta que lea el **parte** (bajas, botín,
  portón) o que aparezca *durante* el cerco; el «después» es ciego al resultado.
- **Transversal:** ninguna cadena de 2–3 eslabones con personas reconocibles;
  ninguna llegada física; ninguna señal; ninguna escena.

### (c) Qué refutaría esta auditoría

- Que **`chapel_or_granary` se plantee en una partida con iglesia** si se
  repite con más semillas de otro `rd0`: hoy ocurre en 10 de 10 (n = 10). Un solo
  caso limpio lo desmontaría; los kinds del estado están en `pure_*.json`.
- Que **`first_stone` llegue antes que la muralla de piedra** en alguna partida
  con la política `prudent`: hoy 9 de 10.
- Que la **premisa «las 4 por semilla»** de `smith_feud`/`forest_cut` no se
  deba al reposo: un cooldown de 15 años con la condición cierta predice
  exactamente 4 en 60 años (años ~4, 19, 34, 49); si una semilla da 5 o 3 sin
  cambiar la condición, el mecanismo es otro.
- Que los **costes opacos** sean legibles para una persona: esta auditoría lee
  código y banco de textos; no sabe si «Wealdmere does not forget» se entiende
  como «doce de cada cien morirán». La lectura humana en móvil (RD-1) puede
  refutar el dictamen de «opaco».
- Que la **política `prudent`** sesgue las cifras de «la opción elegida» y
  quizá las de `feud_ripe`/`watched` (elige siempre lo más barato): el reparto de
  primera elegibilidad es robusto a la política (las condiciones no dependen de
  la opción), pero los recuentos tardíos (rencores, `threatened`) no.
- Que alguno de los 7 **«no sostienen su premisa»** sea intencional: un
  diseñador puede querer `first_stone` como epílogo de la villa; entonces el
  dictamen sería «reescribir el texto», no «reubicar».

## 9. Reproducir

```bash
npm run eligibility                       # 8 semillas × 60 años (tabla oficial)
npx tsx <scratchpad>/rd0.ts <semilla> --years 60 --out <fichero>.json [--probe]
node   <scratchpad>/tables.js             # tablas de §3
npx tsx <scratchpad>/vis.ts               # efectos visibles sin respaldo (§7 T3)
npx tsx <scratchpad>/retired.ts           # §6, retiradas y guardados
npx tsx <scratchpad>/fi.ts 7 feud_inherited   # §5.4, {B} literal y menor con oficio
```

Los scripts de `rd0` leen el motor con rutas absolutas y no se añaden a
`tools/` (el catálogo de `tools/README.md` exige una fila por herramienta;
si RD-1 quiere reutilizar el sondeo, hace falta el brief separado que pide el
plan).
