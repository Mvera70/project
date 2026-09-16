# UI-R0 · Auditoría y cierre de especificación

**16 sep 2026.** Primera ronda de `docs/ui-redesign/implementation-prompt.md`,
hecha por el coordinador (sesión de Opus 5). Rama `rework/parada-a-media`,
commit base **`1509121`** (IA-1). No implementa nada del rediseño: comprueba que
se puede implementar, y cierra la especificación donde estaba abierta.

---

## 1. Estado de Git y del árbol

| Qué | Valor |
|---|---|
| Rama | `rework/parada-a-media` |
| Commit base | `1509121` · «IA-1 · Los animales tienen a dónde ir, y del río se puede beber» |
| Antes de él | `0a45e0c` (IA-0), `f05dabe` (la documentación de rediseño del dueño del diseño), `43e29a3`, `d2b85b7` (`main`) |
| Sin seguimiento, conservado | `docs/life-ai-implementation-prompt.md` — es del dueño del diseño y se deja para que lo commitee él |
| En marcha en paralelo | La fase IA-2 sobre `src/render3d/life/`. **Esta ronda no toca ni un fichero de `src/`**, y por eso se puede hacer a la vez |

---

## 2. Los contratos que el plan nombra: **existen todos**

Comprobado uno a uno contra el código, porque el plan de UI-R2 dice «no
reconstruyas opciones con literales» y eso sólo vale si lo que hay que usar
está donde dice:

| Símbolo | Dónde vive | Estado |
|---|---|---|
| `vitalsOf`, `trendsOf` | `src/ui/vitals.ts` | existe |
| `doingNow` | `src/ui/doing.ts` | existe |
| `answerFor` | `src/ui/answer.ts` | existe |
| `INTENT_STOPS`, `PRIORITY_STOPS`, `stopOf` | `src/engine/state.ts` | existen |
| `speedLabel` | `src/ui/speed.ts` | existe |
| `panelFor` | `src/ui/inspect.ts` | existe |
| `UI_BANK` | `src/engine/chronicle/bank.en.ts` | existe |
| `TIME.SPEEDS` | `src/engine/balance.ts` → `[0, 1, 4, 16, 64]` | existe y **coincide con §12.1** |
| `backend.live.track(id \| null)` | `src/ui/backend.ts`, `src/render3d/contracts.ts`, `renderer.ts` | existe en las tres capas |

**Ningún contrato bloquea el rediseño.** Los cinco tipos literales que UI-R1
tiene que crear (`SheetRoute`, `UiActions`, `UiSnapshot`, `UiPanel`,
`PanelFactory`, `ShellHandle`) son nuevos y no chocan con nada que ya exista con
ese nombre.

**Un aviso sobre `track`, que el propio plan ya da y el código confirma:**
`renderer.ts` lo implementa **marcando** a la persona, no centrando la cámara en
ella. El plan dice «no afirmes que la cámara centra a una persona si el backend
sólo la marca», y es exacto: quien escriba el texto de ese botón tiene que
llamarlo seguir o marcar, no centrar.

---

## 3. Las dos discrepancias que se han cerrado en la normativa

### 3.1 §11.2 mezclaba rutas con superposiciones, y no contaba a la gente

§11.2 decía «cinco pantallas en la partida» y listaba: el valle, la ficha, la
encrucijada, la crónica y el epitafio. Tres problemas para una carcasa de
navegación:

- **No contaba la pantalla de la gente**, que existe desde U-08 y que el
  rediseño convierte en una de sus tres patas («People of the Valley»).
- **No contaba las órdenes**, que son las tres palancas permanentes de la
  versión 2.0 y hoy viven en una bandeja.
- **Mezclaba dos cosas distintas.** La encrucijada ocupa la pantalla entera y
  manda sobre todo (§11.2 punto 3); el epitafio sólo existe cuando la aldea ha
  terminado. Ninguna de las dos es una ruta: no se navega a ellas ni se sale de
  ellas por la barra. Las otras sí.

**Cerrado así** (§11.2, y fila 3.77 del changelog): cinco **rutas** —valle,
crónica, gente, ficha, órdenes, que son exactamente las de `SheetRoute`— y dos
**superposiciones** —encrucijada y epitafio—. Con eso, el «único propietario del
estado de navegación» que UI-R1 exige tiene una lista que gobernar y una regla
clara sobre lo que no gobierna.

**Y se ha escrito como regla lo que estaba como anécdota:** de toda ruta se
sale, siempre. U-14 lo arregló en v3.73 porque el dueño del diseño dijo «no hay
forma de volver atrás», y aparecía una sola vez en toda la especificación, como
el número de una ronda. Cualquier panel nuevo la cumple o está roto.

### 3.2 La puerta `?render=canvas` había perdido su condición

La tabla de decisiones (§0) justificaba conservar el render 2D así: «no se da
[el paso irreversible] hasta que alguien abra el juego en un teléfono». **Eso ya
pasó**: el dueño del diseño lo abrió en su iPad y su iPhone el 15 sep 2026 y
funciona, y `CLAUDE.md` ya lo recogía. La fila seguía diciendo lo contrario, así
que quien la leyera creería que hay un bloqueo abierto.

**Cerrado así:** la puerta se queda **por si acaso y no porque haga falta**, lo
que sigue sin existir es una medida de fotogramas en dispositivo, y borrarla
pasa a ser una decisión del dueño cuando quiera tomarla, no un paso bloqueado.
Para el rediseño el efecto práctico no cambia: UI-R1 tiene que seguir siendo
compatible con Canvas y con 3D, porque la puerta sigue puesta.

---

## 4. Lo que esta ronda **no** ha cerrado, y por qué

El plan de UI-R0 pide verificar nueve áreas de discrepancia. Tres se han
cerrado (§3, contando §11.2 como dos). De las demás:

| Área | Estado |
|---|---|
| Reloj y velocidades | **Sin discrepancia.** `TIME.SPEEDS` y §12.1 coinciden; el reloj de U-12 está descrito en §11.2 punto 1 con su forma actual |
| Órdenes | **Sin discrepancia de contrato**: `INTENT_STOPS`, `PRIORITY_STOPS`, `stopOf` y `answerFor` existen. Queda por comprobar en UI-R2 que los textos de los topes salgan del banco y no de literales en el panel |
| U-14 | Cerrado en §3.1 |
| Canvas / 3D | Cerrado en §3.2 |
| Decisiones pendientes, epitafio, crónica archivada, letargo | **Descritos en la especificación y con API viva** (19 menciones del letargo, 9 del epitafio, 9 del archivo). No se ha hecho la comprobación línea a línea contra el comportamiento del código, porque eso es trabajo de UI-R5 y de los veinte casos de aceptación, y hacerlo aquí sería medir dos veces. **Queda dicho que no está hecho** en vez de darlo por bueno |

---

## 5. Verificación

El plan de UI-R0 pide typecheck, suite rápida, jornadas y lint. Lo ejecutado:

```
npm run typecheck   → limpio (en el commit base 1509121)
npm run lint        → limpio (en el commit base 1509121)
```

**La suite rápida y las jornadas no se han pasado en esta ronda, y es
deliberado.** Dos motivos, los dos escritos y ninguno cómodo:

1. **El dueño del diseño lo pidió expresamente**, con estas palabras: «deja de
   hacer estas pruebas tan largas. Si eso al final del todo hacemos algún tipo
   de suite completa, pero no podemos estar parando a hacer pruebas de 15, 30,
   45, una hora». La verificación por defecto de esta sesión es typecheck, lint
   y los ficheros que cada ronda toca.
2. **Esta ronda no toca ni una línea de `src/`.** Cambia dos documentos
   normativos y añade este informe, así que no hay nada que la suite pudiera
   romper.

Y lo que arrastra de antes, dicho aquí para que nadie lo descubra a mitad de
UI-R6: **un trabajador de vitest se cae en la suite rápida en paralelo**
(`IA-0.md` §5; no es montículo, con 4 GB cae igual) y **la suite rápida ya no
cabe en treinta segundos**. UI-R6 pide `npm test`, `npm run test:journeys` y
`npm run test:shots` enteros: esa ronda tendrá que resolver o rodear las dos
cosas, y conviene saberlo antes de llegar.

---

## 6. Referencias visuales

Los seis PNG de `docs/ui-redesign/ui-captures/` y los tres de
`ui-prototypes/` **no se han abierto en esta ronda**. El plan pide abrirlos
«antes de diseñar», y esta ronda no diseña: audita contratos y cierra
especificación. **Los abre UI-R1**, que es quien decide jerarquía, escala y
contraste, y quien tiene que comparar prototipo contra captura.

---

## 7. Casos de aceptación cubiertos

Ninguno de los veinte de `acceptance-scenarios.md`. Esta ronda no implementa
comportamiento.

---

## 8. Qué observación refutaría lo que esta ronda afirma

- Que alguno de los diez símbolos de §2 no sirva para lo que UI-R2 quiere
  —existir no es lo mismo que devolver lo que hace falta—. Se comprobó el
  nombre y el fichero, no la forma del valor: eso lo verá UI-R2 al usarlos, y
  si alguno no sirve, es un hallazgo suyo y no un error de esta auditoría.
- Que `SheetRoute` necesite una sexta ruta al implementarla. Entonces §11.2
  vuelve a estar mal y hay que reabrirla, no añadir la ruta en silencio.
- Que la encrucijada o el epitafio resulten necesitar ruta propia. Serían
  superposiciones mal clasificadas y §3.1 estaría equivocada.

---

## 9. Lo siguiente

**UI-R1** (carcasa, tokens y navegación), y es del integrador. Antes de
empezar: abrir los nueve PNG, y leer `implementation-plan.md` y
`acceptance-scenarios.md` enteros. El orden que el dueño del diseño fijó pone la
interfaz **después** de las fases de IA (IA-2 a IA-6), así que UI-R1 no empieza
hasta que esas cierren; lo de esta ronda se adelantó porque es auditoría y no
toca código.
