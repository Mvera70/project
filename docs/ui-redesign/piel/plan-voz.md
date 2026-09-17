# Plan · La voz del valle: un sitio, una cola, una piel

**Estado:** plan, 17 sep 2026. Pendiente de que el dueño del diseño conteste
las tres preguntas de §3.4. Nada de esto está construido.

**Para quién:** para quien construya —agentes en el carril `construir` de
`docs/agents.md`, un brief cada uno— y para quien audite. Los briefs de §5 son
autocontenidos: contrato literal, ficheros, pruebas exigidas y criterio de
terminado, en el formato de `docs/design.md` §17.

---

## 0. Por qué este plan, con las palabras del dueño

Probando la demo en su tablet, 17 sep 2026, sobre la secuencia del inicio:

> «Esta forma de arreglarlo me parece una chapuza. Estos mensajes que salen por
> encima ahora no cuadran bien con la interfaz. Haz un plan para
> reestructurarlo. Mira cómo son los circuitos. Hay que darle un paseo a todo
> esto.»

Tiene razón, y conviene decir en qué exactamente. UI-V10 arregló que el listón
tapara la cartela de hito **anclando la cartela a la altura de la bandeja**,
que crece y decrece con su texto. Eso hace que la cartela **se mueva** cuando
la bandeja cambia de una a dos líneas, y deja en pantalla tres cosas flotando
sobre el valle —la cartela, la píldora de decisión y los círculos de
velocidad— cada una con su geometría, su papel y su temporizador. No es un
arreglo: es la cuarta capa de parches sobre una estructura que ya estaba mal.

Y la estructura correcta **ya estaba escrita**, dos veces, antes de que nadie
la construyera:

- `docs/visual-reference/README.md` §5: *«Una única pila de layout … no
  compiten cuatro `bottom` independientes … Un hito de `moment.ts` es otro
  emisor que debe someterse al arbitraje; **no conservar una quinta cartela
  flotante sobre esta pila** … Más de un aviso: uno según prioridad, agrupar
  novedad en crónica, sin una cola interminable de cartelas.»*
- El propio comentario de `app.ts` (U-09) sobre la cartela: *«el dueño del
  diseño la juzgó al probar la demo: “esto no aporta nada, mejorar o quitar” …
  la cartela y el aviso competían por el mismo sitio.»* Y sin embargo la
  cartela sigue montada para la fundación, que es justo lo que sale en las
  capturas.

Este plan hace lo que esas dos notas piden y nadie hizo: **una voz, un sitio,
una cola.**

---

## 1. El inventario: nueve circuitos, medidos en el código

Todo lo que el juego le dice al jugador fuera de la crónica, la ficha y las
órdenes. Cada fila está leída del código el 17 sep 2026, commit `bc01d72`.

| # | Voz | Módulo | Se dispara | Dónde se pinta | Piel | Vive |
|---|---|---|---|---|---|---|
| 1 | **Aviso de la crónica** (§11.6) | `notice.ts` → `notices.show` | Cada tick con una entrada de peso ≥ 2 (`noticeworthy`); la **respuesta a una orden** (`answerFor`, en `setIntent`); el **rasgo del valle** al fundar; y **cada hito** (U-09 lo desvió aquí desde la cartela) | Dentro de la bandeja: `.ui-shell-message .valley-notice`, en flujo (UI-V2) | Tinta sobre el papel de la bandeja, EB Garamond 17 | `TIME.NOTICE_MS` = 5 s reales, corte seco, un `setTimeout` propio |
| 2 | **Cartela de hito** | `moment.ts` → `moments.show` | **Sólo la fundación** (`founding.label` + `founding.settled`); el resto de hitos se apagó en U-09 | **Flotando** sobre el valle, `position: absolute`, anclada desde UI-V10 a `--ui-stack-height` + canto + 14 | Pergamino de **tokens de antes del rediseño** (`--parchment`, `--ink`, `--gild`), motas de latón | `TIME.MOMENT_MS` = 7 s, `setTimeout` propio |
| 3 | **Pista del inicio guiado** (U-11) | `app.ts` (`hint`, `showStep`) | Primera partida del navegador, tras el vuelo (`INTRO_FLIGHT_MS` 9 s) + 800 ms; dos pasos (`intro.orders`, `intro.time`) que se tocan para pasar | Dentro de la bandeja, **detrás de la línea de órdenes** (UI-V10) | Tinta cursiva sobre el papel, `›` de latón (UI-V10; antes cartón de noche) | Hasta que se toca; **cede al aviso** y vuelve (`resolveMessageSlot`) |
| 4 | **Frase de actividad** | `doing.ts` → `hud.ts` (`doing`) | Cada tick, es un **estado** (`doing.hungry`, `doing.raising.*`, `doing.nothing`…) | Dentro de la bandeja, `hud-say` | Tinta, EB Garamond 17 | Permanente |
| 5 | **Línea de órdenes** | `hud.ts` (`ordersNow`) | Siempre; tocarla abre las órdenes | Dentro de la bandeja, `hud-say-orders` | Cursiva 13, `›` | Permanente |
| 6 | **Píldora de decisión pendiente** (U-07) | `crossroad.ts` → `mountMarker` | Encrucijada aplazada | **Flotando**, `position: fixed`, `top: 92px + safe`, a la derecha | Chip de pergamino con sello (UI-V5c) | Hasta que se abre |
| 7 | **Parte de bienvenida** (§9.2, §13.2) | `welcome.ts` → `openWelcome` | Volver tras ≥ una estación de ausencia | Velo de **noche** a pantalla entera, `position: fixed`, z 11 | **Tokens de antes del rediseño** (`--night`, `--parchment`, `--voice`, `--plain`); **cero** clases `skin-` | Hasta tocar |
| 8 | **Epitafio** (§13.3) | `screens/epitaph.ts` | Aldea terminada | Velo de noche al 84 %, `position: fixed`, z 12 | **Tokens de antes del rediseño**; **cero** clases `skin-`; botones con `border-radius: 10px` | Hasta elegir |
| 9 | **Encrucijada** (§8, §11.2) | `crossroad.ts` → `mountOverlay` | Encrucijada planteada | Documento sellado a pantalla entera (UI-V5c) | Piel nueva: `--skin-page`, lacre, tinta roja | Hasta decidir |

Y dos arbitrajes, que no se conocen entre sí:

- `resolveMessageSlot(aviso, pista)` en `shell.ts`: pura, probada, **sólo sabe
  de dos voces**.
- `moments.clear()` suelto en `runTick` cuando llega un hito, y
  `notices.clear(); moments.clear()` en `finish`/carga. La píldora no entra en
  ningún arbitraje: es un `fixed` independiente.

---

## 2. El diagnóstico

Cuatro cosas, y son la misma:

1. **Tres piezas flotan** sobre el valle con tres geometrías distintas: la
   cartela (`absolute`, anclada a una altura que cambia), la píldora (`fixed`,
   92 px del techo) y los círculos de velocidad (`fixed`, 50 px sobre la
   pila). Cada una se ha ajustado por separado tres veces en tres rondas
   (U-02, UI-V5c, UI-V8, UI-V10). **Mientras haya piezas flotando habrá que
   volver a ajustarlas cada vez que cambie la bandeja.**

2. **La bandeja cambia de altura** porque enseña dos frases a la vez —la
   actividad (4) y el aviso (1), o la actividad y la pista (3)— y el prototipo
   01 enseña **una**: *«The mill is waiting for oak.»* bajo la hoja de roble.
   Lo que crece no es la bandeja, es el número de voces metidas en ella.

3. **Tres pieles para el mismo verbo.** El aviso es tinta sobre papel; la
   cartela es pergamino de antes del rediseño con motas; el parte de bienvenida
   y el epitafio son velos de noche de U-01 con tipografías de U-01 (`--voice`,
   `--plain`) y **ni una clase de la piel**. El dueño del diseño lo dijo con la
   crónica en la mano: «los fondos detrás de los textos, usa siempre el
   mismo». Aquí hay dos pantallas enteras sin vestir.

4. **Tres temporizadores y dos arbitrajes** para decidir qué se lee, y la
   regla «uno según prioridad, sin cola de cartelas» de visual-reference §5
   no está implementada en ningún sitio: está repartida entre `resolveMessageSlot`
   (dos voces), `moments.clear()` (a mano) y el orden de llamadas en `runTick`
   («después del aviso a propósito», dice el comentario).

Lo que **sí** está bien y no se toca: el filtro `noticeworthy` (§9.2) y sus dos
cotas medidas en `tests/journeys/notices.test.ts`; que un hito quede **marcado
en la crónica** (`screens/chronicle.ts`); el acento sonoro (`accentFor`); las
reglas de §11.6 (se retira sola, corte seco, muda en letargo, cede a la
superposición); la encrucijada de UI-V5c; y `doing.ts`, `answer.ts`,
`milestones.ts`, que son derivación pura y siguen valiendo tal cual.

---

## 3. El diseño objetivo

### 3.1 La regla

**El valle habla desde un sitio, con una frase, elegida por una cola.**

- **Un sitio:** la bandeja, bajo la hoja de roble, donde el prototipo 01 pone
  la frase. Nada transitorio flota sobre el valle. Lo único que cubre el valle
  son las **superposiciones** de §11.2 —la encrucijada y el epitafio— y el
  parte de bienvenida, que es una página que se abre y se cierra.
- **Una frase:** la bandeja enseña **una** frase de voz de hasta dos líneas y,
  debajo, la línea de órdenes. Siempre esas dos piezas, siempre la misma
  altura. Con la altura fija, **nada de lo que hay encima necesita moverse
  nunca**: el rincón de velocidad vuelve a un desplazamiento constante y el
  `ResizeObserver` de `--ui-stack-height` deja de sostener nada.
- **Una cola:** un módulo puro decide qué frase se lee ahora entre las que
  piden hablar, con prioridad y caducidad, y es el único temporizador.

### 3.2 La anatomía de la bandeja, fijada

De arriba abajo, y no cambia con lo que diga:

```
┌─ listón de madera (skin-scroll-edge, 46 px, tres piezas · UI-V9)
│  ── hoja de roble entre filetes ──          (skin-ornament · o el sello, §3.4-B)
│  «The woodpile will not last the winter.»    (.valley-voice · 1–2 líneas, alto fijo a 2)
│  › Sowing enough · hands to both · building  (.valley-orders-now · sin cambios)
└─ navegación
```

El hueco de la voz mide **siempre** dos líneas de EB Garamond 17/1,45 sobre 32
caracteres de ancho (medido en la piel actual: 2 × 24,6 = 49 px, más el
respiro). Una frase de una línea deja aire; una de dos lo llena; ninguna hace
crecer la bandeja. Las frases del banco que hoy hablan aquí caben en dos líneas
a 390 px de ancho, salvo `intro.orders` e `intro.time` (tres líneas): la
prueba de VZ-02 lo mide para todas.

### 3.3 La cola: prioridades y vidas

| Papel (`role`) | Quién la produce | Prioridad | Vive | Si llega otra |
|---|---|---|---|---|
| `milestone` | `milestonesAt` (peso ≥ 2) y la fundación | 4 | `TIME.NOTICE_MS` × 1,4 = 7 s (hoy `MOMENT_MS`, que se retira) | Sustituye a lo transitorio que hubiera; **gana a un `event` del mismo instante** (regla U-02, conservada) |
| `event` | `noticeworthy(entradas del tick)`, la respuesta a una orden, el rasgo del valle al fundar | 3 | `TIME.NOTICE_MS` = 5 s | Sustituye al `event` anterior: la anterior queda en la crónica, **no hay cola** (visual-reference §5) |
| `hint` | El inicio guiado (dos pasos) | 2 | Hasta que se toca | Cede a 3 y 4 **sin marcarse vista**, vuelve sola al retirarse (regla UI-R1, conservada) |
| `state` | `doingNow` | 1 | Siempre, es el fondo | Se sustituye cada tick; se lee cuando nadie más habla |

Se lee **la de mayor prioridad viva**. La caducidad se evalúa con el reloj de
pared en `paint`, cada fotograma, contra `saidAtMs`: **sin `setTimeout`**.
Eso cumple §11.4 mejor que hoy —la voz tiene estado definido en cada instante y
un salto del reloj del juego no la pilla a medias— y elimina tres
temporizadores.

Silencios, exactamente los de §11.6: durante un letargo la cola **no acepta**
`event` ni `milestone` (la ausencia la cuenta el parte de bienvenida); con la
encrucijada o el epitafio abiertos, la bandeja entera se oculta como hoy
(`html.crossroad-open`, `html.epitaph-open`), y al volver la cola sigue donde
estaba: lo transitorio habrá caducado por reloj, lo pegajoso (`hint`, `state`)
sigue.

### 3.4 Tres decisiones que son del dueño del diseño

Cada una con lo que recomiendo. Sin respuesta, los briefs asumen la
recomendación.

**A · Cómo se distingue un hito de un aviso corriente**, ya sin cartela.
Recomiendo: **la hoja de roble del ornamento pasa a oro** (`--skin-gold`, es
tinta hoy) mientras habla un `milestone`, y vuelve a tinta al caducar. Es un
acento en una pieza que ya existe, no una pieza nueva; se lee como que algo ha
entrado en la crónica, que es lo que ha pasado. Alternativa: ningún acento; el
hito ya queda marcado en la crónica. Lo que **no** propongo: motas, cartela,
sonido nuevo.

**B · Dónde vive la decisión aplazada**, ya sin píldora flotante.
Recomiendo: **el sello de lacre ocupa el sitio de la hoja de roble** en el
ornamento mientras hay una decisión aplazada, y tocarlo abre el documento
sellado. El sello ya existe (`.skin-seal`, `seal-tree`, UI-V5c), mide lo que la
hoja y está en el sitio al que el jugador ya mira. Es el «acceso persistente a
la decisión» de visual-reference §5 sin geometría propia. Alternativa: un chip
en la fila de las cifras, a la derecha; ocupa sitio que a 390 px no sobra.

**C · La pista del inicio guiado dice «the line above».** Con la voz encima
de las órdenes, la línea de órdenes queda **debajo**. Recomiendo cambiar el
texto del banco a *«The line below is the standing orders…»*, que es un cambio
legítimo —el texto sólo vive en `bank.en.ts`— y deja la pista donde va toda
voz. Alternativa: mantener la pista detrás de las órdenes como hoy, que es una
tercera línea y rompe la altura fija.

### 3.5 Lo que se borra

- `src/ui/moment.ts` entero, `mountMoments`, `TIME.MOMENT_MS`, y la regla de
  anclaje de UI-V10 (`--ui-batten-height` se queda: la lee el listón).
- La banda propia de `notice.ts` y su `STYLE` (el cartón oscuro de M-28 lleva
  muerto desde UI-V2; `mountNotices` pasa a ser un productor de `event`, sin
  DOM).
- `resolveMessageSlot` y sus pruebas (las sustituyen las de la cola).
- `.crossroad-marker` (`mountMarker`), si B se acepta.
- El CSS de `.valley-hint` en `index.html` y la reubicación en `shell.css`; el
  CSS de `.valley-notice` en `shell.css`.
- Los tokens de U-01 que sólo sostenían el parte y el epitafio (`--night`,
  `--voice`, `--plain`, `--paper-dim`), cuando VZ-04 termine y `grep` diga que
  nadie más los lee.

### 3.6 Lo que se escribe en la norma (carril `diseñar`, no de agente)

Cuando el dueño conteste §3.4, la sesión —no un agente— aplica esto:

- `docs/design.md` §11.6, un párrafo nuevo tras «Reglas»: *«**El valle habla
  desde un sitio.** Lo que acaba de pasar, lo que está haciendo, la pista del
  inicio y el hito se leen en la bandeja, bajo la hoja de roble, una frase cada
  vez y por prioridad (hito > suceso > pista > estado). Nada transitorio flota
  sobre el valle; sólo las superposiciones de §11.2 lo cubren.»*
- `docs/visual-reference/README.md` §5: la tabla de coincidencias pasa a
  describir la cola de §3.3, y la frase «no conservar una quinta cartela
  flotante» se marca como cumplida.
- `.claude/skills/piel-del-valle/SKILL.md` §7 se reescribe: en vez de «lo que
  flota lee la altura de la bandeja», «**nada flota**; la bandeja mide siempre
  lo mismo».

---

## 4. Orden y dependencias

```
VZ-01 la cola (pura)  ──►  VZ-02 la bandeja habla  ──►  VZ-03 el sello (B)
                                                    └──►  VZ-05 limpieza
VZ-04a el parte de bienvenida ─┐
VZ-04b el epitafio ────────────┴── independientes de los de arriba
VZ-06 verificación con capturas: el último, con todo fusionado
```

VZ-01 y VZ-04a/b pueden ir en paralelo desde hoy. VZ-02 espera a VZ-01. VZ-03
y VZ-05 esperan a VZ-02. Cada brief en su worktree, anclado a `main`, y se
audita como dice `docs/agents.md` §«Cómo se audita»: diff entero, pruebas
leídas con desconfianza, remedido por quien audita.

**Puerta de cada brief:** `npm run typecheck && npm run lint` y las pruebas
que el brief nombra. La suite entera y los recorridos, al cierre (VZ-06).

**Reglas de la casa que aplican a todos** (`CLAUDE.md`): ni una frase en el
código, todo texto sale de `bank.en.ts`; ningún `Math.random` ni reloj del
juego dentro de la cola; comentarios en español; sin backticks dentro de
plantillas de CSS en `.ts` (rompen el build en silencio y `bundle-game.ts` no
lo dice); nada de `src/render3d/` ni `art/`.

---

## 5. Briefs

### VZ-01 · La cola de la voz

**Objetivo.** Un módulo puro que decide qué frase lee el valle ahora, con las
prioridades y vidas de §3.3, sin DOM, sin temporizadores, sin banco.

**Depende de.** Nada.

**Ficheros.** Nuevo `src/ui/voice.ts`. Nuevo `tests/fast/ui-voice.test.ts`.
`src/engine/balance.ts` **no se toca**: las vidas se leen de `TIME.NOTICE_MS`
(la del hito es `NOTICE_MS * 1.4`, con la constante local y su `// TUNE:`
señalando que sustituye a `MOMENT_MS`, que VZ-05 retira).

**Contrato.**
```ts
export type VoiceRole = 'state' | 'hint' | 'event' | 'milestone';

/** Una frase ya compuesta por quien la produce. Aquí no se escribe texto. */
export interface Utterance {
  readonly role: VoiceRole;
  readonly text: string;
  /** Reloj de pared en el que se ofreció (`Date.now()`); lo pone el productor. */
  readonly saidAtMs: number;
}

export interface VoiceState {
  /** Lo que la aldea está haciendo: el fondo. */
  readonly state: Utterance | null;
  /** La pista pendiente: pegajosa hasta `dismissHint`. */
  readonly hint: Utterance | null;
  /** Un `event` o un `milestone`, con caducidad. */
  readonly transient: Utterance | null;
}

export const SILENT: VoiceState;

/** Vida de lo transitorio, por papel, en ms de reloj de pared. */
export function ttlMs(role: 'event' | 'milestone'): number;

/** Ofrece una frase. Pura. Aplica §3.3: un `milestone` gana a un `event`;
 *  un `event` nuevo sustituye al `event` anterior y **no** a un `milestone`
 *  vivo; `hint` y `state` se guardan en su casilla. */
export function offer(v: VoiceState, u: Utterance): VoiceState;

/** Retira lo transitorio caducado a `nowMs`. Pura. */
export function expire(v: VoiceState, nowMs: number): VoiceState;

/** La pista se ha tocado: se retira. Pura. */
export function dismissHint(v: VoiceState): VoiceState;

/** Lo que se lee: transitorio vivo > pista > estado, o `null`. Pura. */
export function speaking(v: VoiceState, nowMs: number): Utterance | null;

/** Letargo: la cola no acepta `event` ni `milestone` mientras `muted`. */
export function offerUnlessMuted(v: VoiceState, u: Utterance, muted: boolean): VoiceState;
```

**Reglas.** Pura de verdad: no importa nada de `document`, `window`,
`@engine/chronicle` ni `Date`; `nowMs` entra siempre por parámetro. No conserva
más de un transitorio: **no hay cola de cartelas** (visual-reference §5). Un
`milestone` vivo no lo sustituye un `event` posterior; sí lo sustituye otro
`milestone`. `expire` no toca `hint` ni `state`. `SILENT` es el único estado
inicial. Comentarios en español.

**Tests** (`tests/fast/ui-voice.test.ts`, describen propiedades, no llamadas):
- Prioridad: con `state`, `hint` y `event` vivos se lee el `event`; caducado el
  `event` se lee la `hint`; retirada la `hint` se lee el `state`.
- U-02 conservada: `milestone` y `event` ofrecidos en el mismo `saidAtMs` → se
  lee el `milestone`, y un `event` ofrecido mientras el `milestone` vive **no**
  lo desplaza.
- Sin cola: dos `event` seguidos → sólo el segundo existe; el primero no
  reaparece nunca.
- La pista no se marca vista por ceder: `event` encima de `hint`, caduca el
  `event`, la `hint` vuelve con el mismo texto.
- Vidas: `speaking` devuelve el transitorio en `saidAtMs + ttl − 1` y no en
  `saidAtMs + ttl`; `ttlMs('milestone') > ttlMs('event')`.
- Letargo: `offerUnlessMuted(v, event, true)` devuelve `v` sin cambios y
  `offerUnlessMuted(v, hint, true)` sí guarda la pista.
- Pureza: cada función devuelve un objeto nuevo y no muta la entrada
  (`Object.isFrozen` sobre entradas congeladas).

**Terminado cuando.** Las siete propiedades pasan; `npm run typecheck && npm
run lint` limpios; el módulo no importa nada fuera de `@engine/balance`.

---

### VZ-02 · La bandeja habla

**Objetivo.** Que la bandeja enseñe la frase que `voice.ts` elige, en un hueco
de altura fija, y que todos los productores de hoy —aviso, respuesta, rasgo,
hito, fundación, pista, actividad— ofrezcan a la cola en vez de pintar por su
cuenta. Con esto desaparecen la cartela y los tres temporizadores.

**Depende de.** VZ-01. Respuesta a §3.4-A y §3.4-C (o la recomendación).

**Ficheros.** `src/ui/app.ts` (los sitios de disparo de §1: `setIntent`,
la fundación, `runTick`, el inicio guiado, `finish`, la carga),
`src/ui/redesign/hud.ts` (retirar `doing` del DOM de `hud-say`; `ordersNow` se
queda), `src/ui/redesign/shell.ts` (montar `.valley-voice` entre el ornamento
y el hueco de órdenes), `src/ui/redesign/shell.css` y `skin.css` (el hueco de
altura fija; retirar las reglas de `.valley-notice` y `.valley-hint`),
`src/ui/notice.ts` (se queda `noticeworthy`; se retira `mountNotices` y su
`STYLE`; se añade `noticeText(state, entries)` que devuelve la frase del
último `noticeworthy` con el discriminante de `renderEntry`, o `null`),
`src/engine/chronicle/bank.en.ts` (sólo si C: `intro.orders` dice «below»),
`tools/valley.shots.ts` (el recorrido de §11.6 pasa de `.valley-notice` a
`.valley-voice[data-role="event"]`; el de U-02 en `notice.test.ts` se muda a
`ui-voice.test.ts` si aún no está cubierto), `tests/fast/ui-redesign-shell.test.ts`
(retirar las pruebas de `resolveMessageSlot`).

**Contrato.**
```ts
// shell.ts · HudShell gana:
readonly voice: HTMLElement;   // <p class="valley-voice" aria-live="polite" data-role="state|hint|event|milestone|">
// app.ts · un solo estado de voz y un solo punto de pintado:
let voice: VoiceState = SILENT;
const say = (u: Utterance): void => { voice = offerUnlessMuted(voice, u, catchingUp); };
// en paint(), cada fotograma:
voice = expire(voice, Date.now());
const now = speaking(voice, Date.now());
shell.voice.textContent = now?.text ?? '';
shell.voice.dataset.role = now?.role ?? '';
```
Quién ofrece qué (los papeles de §3.3), en el mismo sitio donde hoy llama a
`notices.show`/`moments.show`:
- `runTick`: `noticeText(state, report.entries)` → `event`; el mejor de
  `milestonesAt` → `milestone` (después del `event`, como hoy).
- `setIntent`: `answerFor` → `event`.
- La fundación: `founding.settled` → `milestone`; el rasgo → `event`.
- El inicio guiado: cada paso → `hint`; tocar `.valley-voice` mientras
  `data-role === 'hint'` → `dismissHint` y siguiente paso.
- Cada tick: `doingNow` → `state`.
- `finish`, la carga de otra partida: `voice = SILENT`.

**Reglas.** El hueco mide siempre dos líneas (`min-height` calculado en la
hoja, no en JS). `.valley-voice` es un `<p>`, no un `<button>`; la pista se toca
sobre él y el manejador comprueba el papel. El acento del hito (§3.4-A) es
**sólo CSS**: `.ui-shell-message:has(.valley-voice[data-role="milestone"]) .skin-ornament .skin-icon { color: var(--skin-gold); }`.
Nada de `setTimeout`. `hud.ts` deja de conocer `doingNow`. Ni una frase en
`app.ts`. La cartela **no se toca todavía** (la retira VZ-05) pero **deja de
montarse**: `mountMoments` no se llama.

**Tests.**
- `tests/fast/ui.test.ts` o nuevo `tests/fast/ui-voice-tray.test.ts` con DOM:
  montada la carcasa, el hueco de la voz existe entre el ornamento y las
  órdenes, y su `min-height` es el de dos líneas.
- **La altura de la bandeja no cambia**: con `state` de una línea y con un
  `event` de dos líneas, `.ui-shell-stack` mide lo mismo (prueba con DOM y
  `getBoundingClientRect`, o en el recorrido de VZ-06 si jsdom no mide).
- Todas las claves que hablan aquí caben en dos líneas a 390 px: prueba que
  recorre `doing.*`, `answer.*`, `founding.settled`, `valley.*`, `intro.*` y
  falla si alguna pasa de 64 caracteres × 2 (o lo que mida la hoja); si C se
  rechaza, `intro.*` queda en `it.fails` con su medida.
- El recorrido §11.6 de `valley.shots.ts` sigue verde con el selector nuevo.

**Terminado cuando.** `document.querySelector('.valley-notice')` y
`.valley-moment` son `null` en el juego empaquetado; el recorrido §11.6 pasa;
la fundación de una partida nueva se lee en la bandeja (`data-role="milestone"`)
y no flota nada sobre el valle en una captura a 390 y a 750 (VZ-06 lo remide).

---

### VZ-03 · La decisión aplazada vive en el ornamento

**Objetivo.** Retirar la píldora flotante y poner el sello de lacre en el
sitio de la hoja de roble mientras hay una decisión aplazada, según §3.4-B.

**Depende de.** VZ-02. Respuesta a §3.4-B (o la recomendación).

**Ficheros.** `src/ui/screens/crossroad.ts` (retirar `mountMarker` y
`.crossroad-marker`; exponer `openPending()` para abrir el documento),
`src/ui/redesign/shell.ts` (el ornamento acepta dos estados: hoja o sello, y
un manejador de toque cuando es sello), `src/ui/redesign/skin.css`,
`src/ui/app.ts` (poner el ornamento en «sello» cuando
`state.crossroad !== null` y está aplazada; en «hoja» al resolverse),
`tools/valley.shots.ts` (el recorrido de la encrucijada que hoy busque la
píldora pasa a tocar el ornamento).

**Contrato.**
```ts
// shell.ts
setOrnament(kind: 'leaf' | 'seal', onTap?: () => void): void;
```

**Reglas.** El sello es el `.skin-seal` de UI-V5c con `seal-tree`, al mismo
tamaño que la hoja (26 px). `aria-label` = `crossroad.waiting` cuando es sello;
sin `aria` cuando es hoja (`aria-hidden` como hoy). El ornamento entero es lo
que se toca (≥ 44 px de área táctil: la fila del ornamento ya mide más).
**Ninguna posición `fixed` nueva.** Documentado en español dónde estaba la
píldora y por qué se retira (§2 de este plan, visual-reference §5).

**Tests.** Con DOM: `setOrnament('seal', fn)` pone el sello y `click` llama a
`fn`; `setOrnament('leaf')` vuelve a la hoja y deja de llamar. En el
empaquetado: con una encrucijada aplazada (`openAtYear` la predice fuera del
navegador: `foundGame` + `run(…, 'prudent')`, ver `UI-V5.md`) no existe
`.crossroad-marker` y el ornamento lleva `.skin-seal`.

**Terminado cuando.** `grep crossroad-marker src/` no devuelve nada y el
recorrido de la encrucijada abre el documento tocando el ornamento.

---

### VZ-04a · El parte de bienvenida, vestido

**Objetivo.** Que el parte de §9.2 sea una página de la crónica puesta al día
—como su propio comentario dice que quiere ser— con la piel del rediseño, y no
un velo de noche con tipografías de U-01.

**Depende de.** Nada (independiente de VZ-01/02).

**Ficheros.** `src/ui/welcome.ts` (sólo `openWelcome` y `STYLE`; `welcomeLines`
no se toca), `tests/fast/welcome.test.ts` (no se toca: mide `welcomeLines`).

**Contrato.** La firma `openWelcome(app, digest)` no cambia. El DOM:
```
.welcome-scrim   velo del 18 % sobre el valle (el mismo de la encrucijada, UI-V5c)
  .welcome-fade  franja de fusión de 64 px, hermana (no fondo), como .crossroad-fade
  .welcome       skin-paper skin-paper--page · columna de 390 (max-width, margin-inline: auto)
    h1           «While you were gone» en Cinzel (--skin-font-display), tinta
    p.headline   EB Garamond 17, --skin-ink
    p            EB Garamond 17, --skin-ink-soft
    p.count      --skin-font-voice, tabular-nums, --skin-ink-faded, filete --skin-rule-gold encima
```
Cierra con cualquier toque o deslizamiento hacia abajo, como hoy.

**Reglas.** La directriz de `piel-del-valle` §1: la superficie cruza la
pantalla, el contenido va en la columna de 390. Cero tokens de U-01
(`--night`, `--parchment`, `--voice`, `--plain`, `--paper-dim`, `--gild-lit`):
la prueba lo comprueba con un `grep` del `STYLE`. Sin `border-radius` en
botones ni tarjetas (no hay ninguno en la piel). Ni una frase nueva.

**Tests.** Nuevo `tests/fast/ui-welcome-skin.test.ts`: el `STYLE` exportado (o
leído del fichero) no contiene `--night|--voice|--plain|--paper-dim|--gild-lit`;
con DOM, `openWelcome` monta `.welcome.skin-paper--page` y cierra al `click`.

**Terminado cuando.** Captura a 390 y a 750 (VZ-06) del parte tras una ausencia
de una estación, al lado de la página de la crónica, y **no se distinguen de
papel**.

---

### VZ-04b · El epitafio, vestido

**Objetivo.** Que el fin de una aldea (§13.3) se lea como el documento sellado
de la encrucijada (UI-V5c), no como un cuadro de diálogo de U-01.

**Depende de.** Nada.

**Ficheros.** `src/ui/screens/epitaph.ts` (`STYLE` y el DOM de `openEpitaph`;
la lógica de heredar/fundar no se toca), la jornada de `valley.shots.ts`
«una aldea terminada deja epitafio…» (selectores, si cambian).

**Contrato.** Firma sin cambios. El DOM sigue la encrucijada:
```
.epitaph-scrim   velo del 18 % (como .crossroad-scrim), no del 84 % de noche
  .epitaph-fade  franja de fusión de 64 px, hermana
  .epitaph       skin-paper skin-paper--page · columna de 390
    .skin-seal + h1   sello de lacre a la izquierda, título en --skin-red-ink, Cinzel
    p                 EB Garamond 17, --skin-ink
    .epitaph-actions  dos botones: «Found again» skin-button--wood (primario),
                      «Inherit» skin-button--parchment
```

**Reglas.** Las de VZ-04a. `html.epitaph-open` sigue ocultando la bandeja y
la velocidad. Los botones conservan `min-height: 44px` (`--ui-tap-min`).

**Tests.** Nuevo `tests/fast/ui-epitaph-skin.test.ts` con la misma comprobación
de tokens que VZ-04a, y que los dos botones existen con sus clases de la piel.
La jornada de §13.3 sigue verde.

**Terminado cuando.** Captura a 390 y 750 del epitafio de una semilla que
termina (VZ-06 la elige con `openAtYear`), al lado de la encrucijada, y son el
mismo documento.

---

### VZ-05 · Limpieza

**Objetivo.** Que no quede código de las voces retiradas ni regla de anclaje.

**Depende de.** VZ-02 y VZ-03 fusionados.

**Ficheros.** Borrar `src/ui/moment.ts`. `src/engine/balance.ts`: retirar
`MOMENT_MS` (con su nota en `docs/design.md` §12 si allí figura: **eso lo hace
la sesión**, un agente no toca `design.md` ni `balance.ts`; el brief lo deja
señalado en el informe). `src/ui/notice.ts`: sólo `noticeworthy` y
`noticeText`. `src/ui/redesign/shell.ts`: retirar `resolveMessageSlot`.
`index.html`: retirar el CSS de `.valley-hint`. `shell.css`/`skin.css`: retirar
`.valley-notice`, `.valley-hint`, y la regla del rincón de velocidad vuelve a
un desplazamiento **constante** (la bandeja ya no cambia de alto). `index.html`:
retirar `--night`, `--voice`, `--plain`, `--paper-dim`, `--gild-lit` **sólo si**
`grep` en `src/` e `index.html` no encuentra lectores. `.claude/skills/piel-del-valle/SKILL.md`
§7: la sesión lo reescribe (§3.6).

**Reglas.** `grep -rn "moment\|MOMENT_MS\|resolveMessageSlot\|valley-notice\|valley-hint\|crossroad-marker" src/ tools/ tests/ index.html` devuelve cero
líneas de código (los informes de `docs/` se quedan como historia).

**Tests.** La suite rápida entera y `npm run lint`. Ninguna prueba nueva: este
brief sólo quita.

**Terminado cuando.** El `grep` de arriba está vacío, `npm run typecheck &&
npm test && npm run lint` en limpio, y el `dist/` del `build` **no contiene**
`valley-moment` ni `crossroad-marker`.

---

### VZ-06 · Verificación con capturas (carril `medir`)

**Objetivo.** Mirar, no sólo medir: es la lección de UI-V8/UI-V9.

**Depende de.** Todo lo anterior fusionado en `main`.

**Ficheros.** Sólo `artifacts/graphics/VZ/` y el informe
`docs/ui-redesign/piel/VZ.md`. No toca código.

**Contrato.** Con paquete propio (`npx tsx tools/graphics/bundle-game.ts --out
artifacts/graphics/VZ/game`) y **a 390 × 844 y 750 × 1200**, nueve capturas:
la secuencia del inicio en cuatro momentos (300 ms, 900 ms, 2,5 s, 6 s tras
fundar), un `event` (ruta `?hunger=1`, como el recorrido §11.6), la pista del
inicio guiado, una decisión aplazada (año predicho con `openAtYear`), el parte
de bienvenida (ausencia de una estación) y el epitafio (semilla que termina).
Cada captura recortada y puesta **al lado del prototipo 01** o de la página de
la crónica en la misma imagen.

**Reglas.** `npx tsc --noEmit` antes de empaquetar (skill `piel-del-valle`
§10). Las cifras que se citen —altura de la pila en cada captura, `y` del
rincón de velocidad— se leen del DOM y se ponen en tabla.

**Tests.** `npm run test:shots` completo y `npm run test:pwa`, con el resultado
copiado literal en el informe, fallos incluidos y con su causa.

**Terminado cuando.** En las dieciocho capturas **nada flota sobre el valle**
salvo los círculos de velocidad, la altura de `.ui-shell-stack` es la misma en
todas las de una misma anchura, y el informe está enlazado desde
`docs/task-log.md`.

---

## 6. Qué cuesta y qué se gana

Se borran un módulo entero, tres temporizadores, dos arbitrajes, una posición
`fixed` y una `absolute`, y cinco tokens de U-01. Se añade un módulo puro de
unas cien líneas y sus pruebas. Se visten las dos únicas pantallas que seguían
sin vestir. Y la bandeja deja de cambiar de altura, que es lo que hacía que
cada ronda volviera a ajustar lo mismo.

Lo que **no** resuelve este plan, para que nadie lo espere de él: el candado de
navegación de la encrucijada pendiente (`app.ts`, `paint`, anotado en
`task-log.md`), la silueta del aldeano seleccionado, y las tres formas de
cerrar de `piel-del-valle` §11. Son rondas propias.
