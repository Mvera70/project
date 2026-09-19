# IA-6 · Historia visible

**16 sep 2026.** Sexta fase de `docs/life-ai-implementation-prompt.md`.
Implementada por una sesión de Sonnet sobre `08a7130`, más tres cosas que el
coordinador añadió después (§4): la burbuja que hace que la riña **se vea**, la
reunión que se obedece, y una regresión de V-11 que el coordinador había
introducido en la ronda anterior.

---

## 1. Lo que se entrega: la riña de la plaza, con sus dos nombres

`state.happenings` guarda, para `quarrel_in_the_square`, **los `id`** de los dos
nombrados en `who` (R-1, §7.10). Ésa es la pieza que llevaba meses faltando: la
crónica sólo guardaba los **nombres**, así que la capa de vida no podía saber de
quién hablaba, y `docs/roadmap.md` lo tenía anotado como decisión 3 del dueño
del diseño, «la riña de §7.9 hay que revisarla».

- **`staging.ts`, `quarrelToday(state)`**: lee `state.happenings` buscando una
  riña de esta semana —`happening.tick === state.tick`, el mismo criterio que
  `render/reactions.ts`— y devuelve los dos `VillagerId`, o nada. Lectura pura,
  sin azar.
- **`scenes.ts`, `QuarrelScene` + `proposeQuarrel` + `playQuarrel`**: tres
  compases, encaro, paso atrás de quien responde, y bajar los brazos. **Nunca
  toca la velocidad del otro contra su voluntad**: no hay empujón, no hay
  reconciliación y no hay público obligatorio, que es literalmente lo que el
  cuaderno de referencia visual del dueño prohíbe añadir (`visual-reference`
  §2).
- **`village.ts`**: la monta, la cierra por plazo, la cancela si falta uno de
  los dos, libera el compromiso, y la prioriza **por debajo de la cesión de
  paso** —el paso físico manda— y **por encima de la charla y el saludo**,
  porque es un hecho real y no un cruce cualquiera.
- La reserva va por el registro de IA-2 (`reserveRaw`), el mismo que la riña y
  el empujón, **sin tocar el enum congelado** de `InteractionKind`.

**Un juicio del agente que merece quedar escrito:** intentó primero añadir
`'quarrel'` como cuarto `SceneKind`, y eso rompía el typecheck de cinco ficheros
que no estaban en su lista —todos enumeran `chat`/`shove`/`brawl` por nombre o
indexan un objeto con esas tres claves— sin que nada de lo que esos ficheros
guardan hubiera cambiado. Es exactamente lo que `CLAUDE.md` pide evitar, así que
hizo un tipo aparte con la misma forma. Decisión correcta.

## 2. Lo que **no** se entrega, y por qué es lo correcto

- **La celebración ya estaba servida** y no hacía falta nada: `wedding` y
  `harvest_feast` traen `{k:'gather', where:'chapel'|'square', days:2}`, que
  `derive/gatherings.ts` baja a una orden y `staging.ts` convierte en sitio con
  aforo de aldea. Es el mecanismo de V-11 tal cual.
- **El funeral y el incendio no se han construido.** `villager.diedTick` da el
  `id` del muerto, pero el muerto **no tiene cuerpo ese día**; y
  `{k:'ruin', kind}` da el edificio quemado. En los dos casos **el estado no
  dice quién asiste**, y poner un corro de gente concreta ahí sería el
  «espectador global» que el brief prohíbe. Quedan para R-5, que es donde
  `docs/historico/rework.md` ya los tenía planeados con los cubos de `props.ts` y el humo
  de `effects/`, que no existen.

Que el agente se negara a inventarlos es el resultado más valioso de la fase.

## 3. Lo medido

**La riña sale de un hecho real y no se queda colgada.** Jugado con `foundGame`
y la política prudente, nunca con `tick` en bucle:

| Muestra | Resultado |
|---|---|
| 6 semillas × 40 años | 80–91 riñas reales por semilla; de ellas 6–20 se montan, terminan y liberan **el mismo día del suceso** |
| Las ~514 riñas reales revisadas | **0 canceladas, 0 colgadas** |
| La semana entera (7 jornadas) en 10 semillas | la escena se monta al menos un día, media de 1 a 3 de 7; nunca colgada |

**Las cuatro cifras de movimiento**, idénticas antes y después de la fase
(comparadas contra un `git worktree` del commit base, porque otro agente estaba
tocando `decide.ts` en paralelo): centro en muro 0, círculo 0,08 %, giros
0,33 %, parados 0,06 %.

Nueve pruebas nuevas en `tests/fast/life-story.test.ts`, incluida la que más
vale: **si el segundo nombrado ya no está, la escena no se inventa** (cero
montajes, cancelación real).

## 4. Lo que el coordinador añadió encima

### 4.1 La riña no se veía. Ahora sí

El agente lo dejó dicho y era lo más importante de su informe: **nada del render
distinguía una riña de dos vecinos charlando.** `cast.ts` sólo leía
`Dweller.scene`, y `Dweller.quarrel` no lo leía nadie. Ya existía el icono
—`quarrel`, en `effects/bubbles.ts`— pero lo disparaba `derive/moods.ts` por
**rencores**, que es otra cosa: un rencor es un estado de fondo y esto es un
suceso que está pasando.

Sin esto la fase entera era invisible, así que: `Actor` gana `arguing` en
`contracts.ts`, `cast.ts` lo rellena leyendo `Dweller.quarrel`, y
`renderer.ts` pinta la burbuja de riña **por encima del humor y de la charla**,
porque un suceso con dos nombres detrás manda sobre un estado de fondo.

### 4.2 Una convocatoria se obedece, no se sopesa

V-11 se rompió: **18 de 33 en la capilla de la semilla 23**, por debajo del
suelo de 0,6 que esa prueba guarda. No era de IA-6 y tampoco de lo que yo creía:
probé dos arreglos plausibles —el alcance por edad de IA-3, y el recorte del
radio de búsqueda— y **ninguno movió el número**, que es la tercera vez esta
sesión que me pasa lo mismo.

Trazando a los quince que no iban: estaban **a tres o cinco celdas del sitio**,
lo veían perfectamente, y estaban **en pausa**. La causa era mía, de la ronda
anterior: la reunión da compañía y quita aburrimiento, así que a quien no le
falta ninguna de las dos **no le ofrece nada** y `worth` le da cero; y desde que
la pausa es local, la pausa le mantiene el aburrimiento bajo, así que nunca
vuelve a tener ganas. Lo veían y no iban.

Arreglado con un suelo para la reunión convocada (`GATHER_FLOOR = 0.8`), que la
pone por encima de estar de brazos cruzados sin taparle una necesidad de verdad,
y con un límite (`GATHER_URGENT = 0.95`) que deja fuera a quien tiene una
necesidad al borde —lo que el brief de IA-3 prohíbe pisar—. V-11 vuelve a
verde.

### 4.3 El plazo vencido de las personas: probado, medido y **retirado**

El fallo que se arregló para los animales una ronda antes —`until` comprobado
sólo después de haber llegado, así que quien no llegaba se quedaba con el viaje
puesto— **está igual en las personas**. Se aplicó el mismo arreglo y **empeora
lo que importa**: «parados con un impulso al máximo» sube de **0,06 % a
0,20 %**, que es exactamente la cifra de partida de toda la tanda.

La causa del choque: con las estancias fijas de `SEAT_DWELL`, al soltar el viaje
se vuelve a elegir **la misma plaza inalcanzable** —la llave del sorteo no
cambia en treinta segundos— y se reintenta en bucle con la necesidad a tope.

**Retirado, con el número y el motivo escritos en el propio sitio del código.**
Falta la pieza que no existe: que una plaza que ya falló se descarte para la
elección siguiente. Con eso el arreglo entra solo.

## 5. Verificación

```
npm run typecheck   → limpio
npm run lint        → limpio
life-story (nuevo, 9), life-staging, life-commitments, life-motion,
  life-needs, daylife, life-beasts, animals        → 98 de 98 verdes
graphics-world, graphics-picking (por el contrato nuevo)  → verdes
tests/journeys/life-scenes.test.ts                → 9 de 11
```

Las dos rojas de jornadas son las dos del lote de nueve de `docs/historico/rework.md` §2.8, y
el agente lo comprobó **con un `git worktree` del commit base** en vez de con
`git stash` sobre el árbol, que es la trampa que IA-3 documentó.

## 6. La captura, y lo que no prueba

```
node tools/graphics/serve.mjs --port 8137
node tools/graphics/shot.mjs --page "http://127.0.0.1:8137/valley.html" \
  --seed 11 --settle 12 --advance 129 --sequence 8 --every 1.2 \
  --out artifacts/graphics/IA/historia/rina.png
```

Backend 3D real, camino del jugador, año 3. **Se ve el aviso de crónica con los
dos nombres reales**: «A quarrel between Grimbald and Merewenna in year 3, loud
enough to stop the work», y los dos cuerpos juntos.

**Lo que la captura no prueba, dicho por el propio agente:** no cazó el
fotograma del encaro. La riña dura unos 2,7 segundos escénicos dentro de una
jornada de 3 600 pasos, y con ocho disparos cada 1,2 s la ventana es estrecha.
Lo verificó aparte sobre el mismo estado exacto: en 6 de los 7 días de esa
semana la escena se monta y termina limpia.

La semana del suceso se encuentra con un guion de tres líneas sobre
`state.happenings`, no con `tools/reports/fate-report.ts`, que da totales por semilla y
no semanas. Queda anotado porque el brief sugería lo segundo.

## 7. Qué observación refutaría esta fase

Los dos nombrados en pantalla sin haberse acercado nunca. Uno de los dos con la
velocidad puesta por un empujón, que el boceto prohíbe. La escena visible
después de que el contador diga que terminó. Reconstruir el mismo día y ver otra
pareja, u otro reparto de quién reclama y quién responde. Y ahora también: dos
que se gritan con la burbuja de charla, o una burbuja de riña sobre alguien que
no está en ella.
