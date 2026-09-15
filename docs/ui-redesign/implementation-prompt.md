# Prompt de implementación — rediseño de interfaz de The Valley

Copia todo este documento y pégalo al agente que implementará el rediseño.

---

Implementa el rediseño de interfaz de The Valley descrito en:

- `docs/ui-redesign/implementation-plan.md`
- `docs/ui-redesign/acceptance-scenarios.md`
- `docs/ui-redesign/ui-redesign-proposal.md`
- `docs/design.md`
- `CLAUDE.md`
- `docs/agents.md`

Referencias visuales que debes abrir antes de diseñar:

- Prototipo principal: `docs/ui-redesign/ui-prototypes/01-living-valley.png`
- Prototipo de crónica: `docs/ui-redesign/ui-prototypes/02-chronicle-first.png`
- Prototipo de personas: `docs/ui-redesign/ui-prototypes/03-people-of-the-valley.png`
- Capturas actuales: `docs/ui-redesign/ui-captures/01-title.png`,
  `02-valley-new.png`, `03-valley-developed.png`, `04-orders.png`,
  `05-speed.png` y `06-storm.png`.

La carpeta de capturas muestra el producto actual; la carpeta de prototipos
muestra la dirección visual propuesta. Úsalas para comparar jerarquía, escala,
contraste y relación entre paisaje y paneles. No copies texto ficticio ni datos
dibujados de los prototipos: la implementación debe usar el estado real.

La dirección aprobada combina:

1. **Living Valley** como carcasa principal: el valle permanece visible.
2. **Chronicle First** para leer la crónica y resolver encrucijadas.
3. **People of the Valley** para consultar personas y fichas.

El resultado debe integrarse en el juego real usando estado, datos, textos y
APIs existentes. No conviertas literalmente los PNG en HTML ni inventes datos
que el motor no produzca.

## Alcance

Implementa solo el rediseño de interfaz. No modifiques el balance, la economía,
demografía, IA, sucesos, reglas del tick, modelos 3D, terreno, arte, formato de
guardado, dependencias ni configuración de tests.

El canvas, la cámara y el estado deben conservarse al cambiar de pantalla. Las
consultas no pueden consumir RNG ni alterar la simulación. Todo texto visible
debe proceder del banco de textos en inglés.

## Orden de trabajo

### UI-R0 — auditoría y cierre de especificación

Antes de implementar:

1. Comprueba Git, el commit base y los cambios documentales.
2. Lee `app.ts`, `index.html`, `vitals.ts`, `doing.ts`, `speed.ts`, `inspect.ts`,
   las pantallas existentes y el backend.
3. Verifica las discrepancias entre `docs/design.md` y el código actual:
   reloj, velocidades, órdenes, U-14, decisiones pendientes, Canvas/3D,
   epitafio, crónica archivada y letargo.
4. Actualiza `docs/design.md` y `docs/changelog.md` con las decisiones que deban
   formar parte de la normativa.
5. Escribe `docs/ui-redesign/rounds/UI-R0.md`.
6. Ejecuta typecheck, suite rápida, jornadas y lint.

Si una dependencia o contrato no está claro, detente y documenta el hallazgo.
No cambies una prueba para ocultar una incompatibilidad.

### UI-R1 — carcasa, tokens y navegación

Crea:

- `src/ui/redesign/contracts.ts`
- `src/ui/redesign/tokens.css`
- `src/ui/redesign/shell.ts`
- `src/ui/redesign/shell.css`

Integra lo necesario en `src/ui/app.ts` e `index.html`.

Usa estos contratos literales:

```ts
type SheetRoute =
  | { kind: 'valley' }
  | { kind: 'chronicle' }
  | { kind: 'people' }
  | { kind: 'inspect'; target: InspectTarget; from: 'valley' | 'people' }
  | { kind: 'orders' };

interface UiActions {
  navigate(route: SheetRoute): void;
  setSpeed(speed: Speed): void;
  setIntent(intent: Intent): void;
  track(id: number | null): void;
}

interface UiSnapshot {
  state: Readonly<GameState>;
  archive: readonly ArchivedGame[];
  speed: Speed;
}

interface UiPanel {
  element: HTMLElement;
  update(snapshot: UiSnapshot): void;
  dispose(): void;
}

type PanelFactory = (actions: UiActions) => UiPanel;

interface ShellHandle {
  element: HTMLElement;
  content: HTMLElement;
  setRoute(route: SheetRoute): void;
  dispose(): void;
}
```

Debe existir un único propietario del estado de navegación. Los paneles emiten
acciones; no abren pantallas por su cuenta ni insertan scrims globales.

Mantén un solo canvas, una bandeja principal, navegación Valley/Chronicle/People,
cierre visible, foco accesible, `safe-area-inset-*`, objetivos táctiles mínimos
de 44 × 44 px y compatibilidad con Canvas y 3D. Respeta
`prefers-reduced-motion`.

### UI-R2 — cabecera, actividad, órdenes y velocidad

Implementa sobre datos reales:

- hora y fecha;
- cuatro indicadores de `vitalsOf`;
- tendencia de `trendsOf`;
- actividad de `doingNow`;
- respuesta de `answerFor`;
- órdenes `fields`, `timber` y `priority`;
- velocidad y pausa mediante `TIME.SPEEDS` y `speedLabel`.

Usa `INTENT_STOPS`, `PRIORITY_STOPS`, `stopOf`, `answerFor`, `TIME.SPEEDS` y
`speedLabel`. No reconstruyas opciones con literales.

Abrir o cerrar la bandeja no puede cambiar intención, velocidad, tick ni estado.
Mientras el juego está pausado, navegar no avanza el tick.

### UI-R3 — crónica

Migra la crónica al contenedor común conservando años, orden, selector de
archivos, retorno desde el epitafio, composición narrativa y lectura estable.

Una entrada nueva no debe robar el desplazamiento. No mezcles fuentes ni
analices frases para descubrir identidades. Solo enlaza persona o lugar si
existe un identificador estable real.

### UI-R4 — personas y fichas

Migra People y las fichas al contenedor común. La lista muestra personas
nombradas y presentes, aclarando ese alcance. Las fichas reutilizan `panelFor`
y solo muestran datos reales.

Debe funcionar para persona, edificio, terreno, muerte, emigración y referencia
desaparecida.

El seguimiento usa:

```ts
backend.live.track(id);
backend.live.track(null);
```

No afirmes que la cámara centra a una persona si el backend solo la marca.
Cerrar una ficha cancela el seguimiento iniciado desde ella.

### UI-R5 — integración, decisiones y salida

Integra todos los paneles y conserva `App.decide`.

La encrucijada debe tener prioridad sobre la bandeja normal, mostrar título,
contexto, verbo y precio, conservar el precio junto a cada opción, permitir
scroll, tener salida visible al valle, conservar la decisión al aplazar,
reabrir la misma decisión, impedir doble aceptación y respetar la pausa.

Mantén epitafio, crónica archivada y parte de bienvenida. Al cerrar o cambiar
un panel elimina sus listeners, evita elementos invisibles capturando eventos,
devuelve el foco y no duplica acciones.

### UI-R6 — validación

Ejecuta:

```text
npm run typecheck
npm test
npm run test:journeys
npm run lint
npm run test:shots
```

Si afecta al empaquetado o service worker, ejecuta también `npm run build` y
`npm run test:pwa`.

Valida los 20 casos de `docs/ui-redesign/acceptance-scenarios.md`, especialmente
reposo, obra, órdenes, pausa, crónica, archivos, personas, seguimiento, muerte,
decisiones pendientes, doble toque, letargo, epitafio, persistencia, desmontaje,
Canvas y 3D.

Usa fixtures válidos y reproducibles. No esperes sucesos tras un número fijo de
segundos ni dependas de una trayectoria antigua. Las capturas 3D deben demostrar
que el backend real era 3D; las Canvas se etiquetan como Canvas.

## Ficheros y propiedad

El integrador es el único que modifica simultáneamente:

- `src/ui/app.ts`
- `index.html`
- `src/ui/redesign/contracts.ts`
- `src/ui/redesign/tokens.css`
- `tools/ui-redesign.shots.ts`
- `UI_BANK`
- documentación normativa.

Respeta los ficheros de cada ronda. Si necesitas cambiar un fichero fuera de tu
brief, documenta el motivo antes de hacerlo. No edites configuraciones ni
exclusiones para hacer pasar verificaciones.

## Evidencia obligatoria

Para cada ronda escribe `docs/ui-redesign/rounds/UI-R<n>.md` con:

- commit base y ancla del worktree;
- ficheros modificados;
- decisiones tomadas;
- tests ejecutados y salida real;
- capturas, semilla, tick, velocidad y backend real;
- casos de aceptación cubiertos;
- fallos heredados y pendientes;
- observación que podría refutar la propuesta.

Lee el diff completo antes de declarar una ronda terminada. No declares verde
una prueba que no se haya ejecutado.

Termina con un informe breve de qué implementaste, qué verificaste, qué queda
pendiente, qué decisiones nuevas requieren arbitraje y qué commit contiene la
ronda.

## Secuencia de delegación

- Integrador: UI-R0, UI-R1 y UI-R2.
- Agente de crónica: UI-R3.
- Agente de personas: UI-R4.
- Integrador: UI-R5.
- Coordinador: UI-R6.

UI-R3 y UI-R4 pueden ejecutarse en paralelo después de congelar el contrato de
UI-R2, en worktrees distintos.
