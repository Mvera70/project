# Auditoría de cosas a medias en la aldea — 24 sep 2026

**Quién lo pidió:** el dueño del diseño, tras probar la demo y ver «montones de
material tirados y olvidados en el suelo, la herrería vacía, el granero sin
nadie que lo lleve, demasiada gente en el campo en villas grandes, gente
reunida sin hacer nada» y avisar de que «habrá más cosas a medias».

**Qué es esto:** sólo observación. No se ha tocado ningún fichero de `src/`.

**Cómo se midió:** `node tools/graphics/observe-life.mjs`, modo fijo (sin
`--live`), 60 s a 1 fps, sobre el paquete ya empaquetado
`artifacts/graphics/G-10/game/valley.html` (no se ha vuelto a empaquetar).
Cuatro villas — los tres presets de la demo más una intermedia:

| Semilla | Año | Gente | Etapa |
|---|---|---|---|
| 7 | 1 | 2 | caserío |
| 11 | 21 | 48 | aldea |
| 23 | 30 | 58 | aldea grande |
| 7 | 60 | 36 | villa cerrada |

Evidencia en `artifacts/graphics/IA-audit-2026-09-24/<semilla>-<año>/`
(`trace.json`, `frames/*.png`, `index.html`). Se leyó `trace.json` entero por
persona/prop/actor con scripts puntuales, se corrió `day-report.mjs` sobre cada
traza y se miraron varios PNG de cada toma.

**Límite de la evidencia:** modo fijo (sin `--live`): reproducible, pero es
una sola jornada congelada por villa, no una muestra de varios días. Lo que
aquí se mide como «no llega a tiempo» puede depender de a qué hora del día
fijo empieza la toma (`--lead` no se usó, fase inicial 0,28). No se ha medido
`--live` ni varias semillas del mismo hallazgo salvo donde se indica.

---

## Hallazgos, de más grave a menos

| # | Qué se ve | Dónde | Causa probable | Gravedad | Tamaño del arreglo | Ya anotado |
|---|---|---|---|---|---|---|
| 1 | Haces de leña, piedra y grano se quedan fijos en el suelo junto a la descarga, sin que nadie los recoja, el resto de la jornada | Semilla 11/año 21: 2 haces (`bundle`, id −10000001/-10000002) aparecen en el segundo 21 y 26 junto a `wood-store:3915`, en (27,05; 52,99) y (26,54; 55,05), y siguen ahí en el segundo 60. Semilla 23/año 30: 3 haces junto a (≈42,9; 54,5), desde el segundo 21/23/33 hasta el 60 | `src/render3d/life/village.ts` (versión con la que se empaquetó el juego) creaba un `Prop` fijo (`fixed:true`, nunca recogible) por cada entrega de leña/piedra/grano, hasta tres por clase, con ids `-10_000_000 - n` / `-20_000_000 - n` / `-30_000_000 - n` | **Alta** | **Pequeño — ya escrito, falta empaquetar** | **Ya corregido, sin commit.** `git diff src/render3d/life/village.ts` (árbol de trabajo, sin commit) quita exactamente esa creación de props; el comentario que deja en su lugar dice literalmente: «IA-piles · La carga se guarda: entra en el leñero y no se deja al lado. Hasta el 24 sep quedaban hasta tres haces sueltos junto a la descarga toda la jornada, y Vera los vio como material olvidado.» El paquete usado en esta auditoría (`artifacts/graphics/G-10/game/valley.html`, generado hoy a las 16:38) es anterior a ese cambio o no se ha vuelto a empaquetar desde él. **Falta:** confirmar el commit y volver a `npm run bundle` + reobservar para cerrar |
| 2 | En una villa grande, un campo pequeño queda con un cuerpo por celda: la gente se ve apretujada trabajando la tierra | Semilla 23/año 30, segundo ≈20: `field:4` y `field:34` (3×2 = 6 celdas cada uno) tienen **6 trabajadores simultáneos cada uno** — la máxima densidad posible, un cuerpo por celda. En ese instante 21 de los 58 vecinos están en el campo a la vez | No localizada con precisión en esta ronda (falta seguir `allocateLabour`/el reparto de cuotas en `src/render3d/life/day.ts:163-179`); la cuota de campo parece salir de la población total y no del área de suelo disponible por campo | **Alta** | **Medio** | **Ya anotado.** `docs/task-log.md`, pedido de Vera del 24 sep 2026, punto 2: «Desorden en el reparto: en las villas grandes se ve a demasiada gente en el campo, más de la que el espacio aguanta.» Sin empezar. Esta auditoría aporta la medida exacta (6/6 celdas) |
| 3 | El herrero, con la herrería asignada como su oficio del día, no llega a currar: camina toda la tarde, se le echa la noche encima a medio camino, vuelve a casa y se queda parado sin hacer nada | Semilla 7/año 60, persona 155: `dayPlan.job.place = smithy:286` (celda 23,40); su casa está en (33; 60,5) — unas 23 celdas de distancia. Camina del segundo 1 al 26 sin llegar (`there: false`, ruta con 5 tramos aún pendientes en el segundo 26); en el segundo 27 `residence.stage` pasa a `returning` (se le echa la noche encima) y a partir del segundo 49 se queda inmóvil en (32,9; 60,4) sin ninguna tarea (`doing: null`) hasta el final de la toma (segundo 60). `day-report.mjs` lo confirma de forma independiente: `"pendingWorkers": [155]` | `src/render3d/life/day.ts:139-151` asigna el oficio (herrero → `smithy:`, cura → `church:`, guardabosques → `felling`, administrador → `granary:`) sin mirar cuánto se tarda en llegar desde la casa de quien tiene el rol. Si a quien le toca el oficio esa partida le cae lejos, pasa el día entero yendo y volviendo sin trabajar nunca | **Media-alta** | **Medio** | **Nuevo**, aunque conecta con el pedido de Vera del 24 sep «Diseñar los oficios: la herrería, por ejemplo, está vacía» (task-log punto 4, sin empezar). En la misma semilla, el granero (persona 150) y la iglesia (persona 149) sí llegan a tiempo, así que no es un fallo sistemático de toda la aldea, sino de la distancia concreta casa↔puesto |
| 4 | El molino nunca tiene un trabajador de verdad: la gente que se ve junto a él está mirando, no trabajando | `src/engine/state.ts:87-95` — el motor sólo tiene siete oficios (`leader`, `smith`, `midwife`, `priest`, `woodward`, `reeve`, `herbalist`); no existe molinero. `src/render3d/life/day.ts:139-146` asigna edificio a smith/priest/woodward/reeve, pero nunca a `mill:`. La gente que aparece junto al molino llega por la oferta ambiental `watch` (`src/render3d/life/offers.ts:90,192` — ocio, «mirar trabajar»), nunca por `work` | Confirmado por código; no depende de una toma concreta | **Media** | **Medio-grande** (añadir un oficio de molinero al motor, o hacer que `reeve` cubra molino además de granero) | **Nuevo.** `docs/encargos-3d.md` no lo menciona; el task-log sólo habla de «la herrería» y «el granero» sin nombrar el molino |
| 5 | En la traza, alguien trabajando en la herrería, la iglesia o el granero sale con `occupation: null` en vez de con una etiqueta propia | Cualquier semilla con esos edificios (11/21, 23/30, 7/60) | `occupationOf` (`src/render3d/world/models.ts:223-230`) sólo reconoce `field`, `felling`, `building` (obra), `herding` y `water`; no reconoce smithy/granary/church/mill/watchtower. La malla por oficio no depende de esto — depende de `dweller.dayPlan.role` vía `VILLAGER_BY_ROLE` (`villager-smith`, `villager-priest`, `villager-reeve`, ya publicados en `art/catalog.json`) — así que el herrero **sí** cambia de malla y de clip (`hammer`) cuando llega a currar; sólo el campo `occupation` de la traza queda vacío | **Baja** | **Pequeño** (consistencia/documentación, no bloquea nada visible) | **Nuevo**, y menor: se anota porque puede confundir a quien mire la traza («occupation: null» parece decir que nadie trabaja ahí cuando sí lo hace, ver hallazgo 3 para el caso en que de verdad no llega) |
| 6 | No hay pelotas, palos ni cubos sueltos por el prado en ninguna villa | Las cuatro semillas: `props` de la traza está vacío salvo por los haces del hallazgo 1 | **No es un fallo.** `scatter()` (`src/render3d/life/props.ts:266-306`) sólo se activa si `options.props === true`, y `src/render3d/renderer.ts:1293` nunca pasa esa opción. Es la decisión explícita de Vera del 15 sep 2026, citada en el propio código: «esas pelotas eran de prueba, ahora mismo no tiene ningún sentido que haya pelotas por ahí» | — | — | Ya decidido — se anota para que nadie lo reabra por error |
| 7 | Comprobado y **no reproducido**: gente reunida sin hacer nada, parada varios días | Las tres villas con gente (11/21, 23/30, 7/60): nadie se queda completamente inmóvil durante los 60 s observados (comprobado comparando posición del primer y último fotograma, umbral 0,05 celdas) | El commit de hoy `a21de60` («IA-anim: meetings that end, and real chop and mine gestures») y el de `task-log.md` del 24 sep («reuniones que se acaban») describen exactamente ese síntoma —reproducido antes en semilla 7/año 30, 45 de 63 parados— y dicen haberlo corregido | — | — | Puede que ya esté cerrado; esta muestra no lo contradice, pero es una sola jornada por villa y no sustituye la medida ya hecha en su propio informe (`docs/historico/life-rounds/IA-anim-reuniones-y-gestos.md`) |

---

## Lo que no se llegó a mirar en esta ronda

Por presupuesto de tiempo (~40 min), quedó fuera:

- Villa de semilla 7/año 1 (caserío, 2 personas): no tiene aún herrería, granero,
  iglesia ni molino — es esperable en esa fase y no se cuenta como hallazgo.
- Observación `--live` (varias jornadas/noches seguidas) para ver si el hallazgo
  3 (herrero que no llega) es raro o frecuente entre días.
- Inspección sistemática de solapes/objetos flotando en más de 4 fotogramas por
  villa; las capturas miradas (semilla 23/año 30 seg. 40, semilla 7/año 60
  seg. 50) no mostraron nada fuera de sitio a simple vista.
- Mecánicas del motor sin representación: no se encontró ninguna que falte en
  `docs/encargos-3d.md` aparte del molino (hallazgo 4), que no estaba anotado.

## Próximo paso sugerido

Para cerrar el hallazgo 1 (el más grave y el más barato de arreglar): confirmar
el diff de `src/render3d/life/village.ts`, hacer commit, `npm run bundle` y
repetir esta misma observación (semillas 11/21 y 23/30) para comprobar que los
haces fijos ya no aparecen.
