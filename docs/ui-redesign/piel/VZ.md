# VZ · La voz del valle: un sitio, una cola, una piel

**Entregado el 17 sep 2026.** El plan es `plan-voz.md`; esto es lo que se
construyó, lo que se midió y las tres cosas que la ronda destapó por el camino.

---

## 0. De dónde sale

El dueño del diseño, sobre el parche con el que UI-V10 había arreglado que el
listón tapara la cartela de hito:

> «Esta forma de arreglarlo me parece una chapuza. Estos mensajes que salen por
> encima ahora no cuadran bien con la interfaz. Haz un plan para
> reestructurarlo. Mira cómo son los circuitos. Hay que darle un paseo a todo
> esto.»

Tenía razón. UI-V10 ancló la cartela a la altura de la bandeja, y la bandeja
**crece y decrece con su texto**: la cartela se movía, y en pantalla quedaban
tres piezas flotando sobre el valle con tres geometrías, tres temporizadores y
dos arbitrajes que no se conocían entre sí.

Y la estructura correcta estaba escrita dos veces antes de que nadie la
construyera: en `docs/visual-reference/README.md` §5 —«una única pila … **no
conservar una quinta cartela flotante sobre esta pila** … más de un aviso: uno
según prioridad, **sin una cola interminable de cartelas**»— y en el propio
comentario de `app.ts` de U-09, que ya recogía su veredicto anterior sobre la
cartela: «esto no aporta nada, mejorar o quitar».

Las tres decisiones que el plan dejaba abiertas (§3.4) las contestó él, y las
tres con la recomendación: **la hoja de roble en oro** para el hito, **el sello
de lacre en el ornamento** para la decisión aplazada, y **cambiar el texto a
«the line below»** para la pista.

---

## 1. Lo que se construyó

### VZ-01 · La cola (`src/ui/voice.ts`, nuevo)

Módulo puro, sin DOM, sin banco y sin reloj: `nowMs` entra siempre por
parámetro. Cuatro papeles con prioridad —`milestone` > `event` > `hint` >
`state`—, tres casillas y ninguna lista: `transient` guarda **un** suceso o
hito, y el anterior no vuelve porque queda en la crónica.

Dos reglas heredadas que sobreviven intactas, ahora en un solo sitio:

- **U-02**: un hito gana a un suceso del mismo instante, y un suceso posterior no
  desplaza a un hito vivo. Se aplica sin pedir el reloj, usando el `saidAtMs` de
  la frase que se ofrece como «ahora».
- **UI-R1**: la pista cede el hueco **sin marcarse vista** y vuelve sola. Era la
  primera fila de la tabla de coincidencias de visual-reference §5, la guardaba
  `resolveMessageSlot` para dos voces y ahora se cumple para las cuatro.

Las dos vidas siguen saliendo de `balance.ts` —`NOTICE_MS` 5 s y `MOMENT_MS`
7 s—, así que se retiró la cartela pero no su medida.

**20 pruebas** en `tests/fast/ui-voice.test.ts`.

### VZ-02 · La bandeja habla

Un hueco, `.valley-voice`, entre el ornamento y la línea de órdenes, con
**altura fija de dos líneas (50 px)**. Los siete emisores de antes ofrecen a la
cola en el mismo sitio donde pintaban:

| Quién | Papel |
|---|---|
| `noticeworthy` de las entradas del tick | `event` |
| La respuesta a una orden imposible (`answerFor`) | `event` |
| El rasgo del valle al fundar | `event` |
| El mejor hito de `milestonesAt` | `milestone` |
| La frase de la fundación | `milestone` |
| Los dos pasos del inicio guiado | `hint` |
| `doingNow` | `state` |

Y un solo punto de pintado, en `paint`: `expire` contra el reloj de pared y
`speaking` para saber qué se lee. **Se fueron tres `setTimeout`**, el
`MutationObserver` que espiaba el atributo `hidden` del aviso, y
`resolveMessageSlot`.

El acento del hito es **sólo CSS**: `data-role="milestone"` en el hueco pone la
hoja de roble del ornamento en `--skin-gold`. Nadie toca una clase desde
JavaScript.

### VZ-03 · La decisión aplazada vive en el ornamento

Fuera `.crossroad-marker`, que era `position: fixed` a 92 px del techo y se
había ajustado a mano en dos rondas. El sello de lacre de UI-V5c ocupa el sitio
de la hoja mientras hay algo que decidir y **el ornamento es el acceso**: un
`<button>` con `disabled` cuando lleva la hoja, así el DOM no cambia de forma
entre los dos estados. Y aplazada es aplazada: `openCrossroad` no la vuelve a
plantear hasta que se toca el sello (§8.6).

### VZ-04 · Las dos pantallas que seguían sin vestir

El parte de bienvenida (§9.2) y el epitafio (§13.3) se pintaban con los tokens
de U-01 —la noche, la serif de voz, la letra llana— y **cero clases de la piel**,
mientras la crónica, la decisión y la portada usaban `--skin-page` con su grano.
Los dos toman ahora el lenguaje del documento sellado: velo del 18 % —el valle
atenuado y no tapado, §11.2—, franja de fusión **hermana y no fondo propio**, el
papel de la crónica y el contenido en la columna de 390. El epitafio además
lleva el sello a la izquierda de un título en tinta roja y los botones de la
piel.

**11 pruebas** en `tests/fast/ui-overlay-skin.test.ts`, que leen la hoja de cada
módulo y fallan si vuelve a aparecer un token de antes del rediseño.

### VZ-05 · Limpieza

Borrado `src/ui/moment.ts` entero. Retirados `resolveMessageSlot`,
`MessageSlotState`, `mountNotices` y su hoja, el CSS de `.valley-notice`,
`.valley-hint` y `.valley-doing` —de `index.html` y de `shell.css`—, y
`.crossroad-marker`. `notice.ts` se queda en lo que siempre debió ser: dos
funciones puras, `noticeworthy` y `noticeText`.

---

## 2. Lo medido

Capturado y **mirado** con paquete propio (`artifacts/graphics/VZ/`), a 390 × 844
y 750 × 1200 —750 es la tablet del dueño del diseño—, en los cuatro momentos del
arranque que él mandó más la pista, el parte y el epitafio.

| | 750 × 1200 | 390 × 844 |
|---|---|---|
| Alto de la pila, en los cinco momentos | **200 en todos** | **200 en todos** |
| Alto del hueco de la voz | 50 | 50 |
| `y` del rincón de velocidad | **906 en todos** | **550 en todos** |
| Piezas flotando sobre el valle | **ninguna** | **ninguna** |
| Errores de página | ninguno | ninguno |

Esa columna de constantes es el arreglo entero: la bandeja mide lo mismo diga lo
que diga, así que el rincón de velocidad no se recoloca nunca y la próxima ronda
no tiene nada que reajustar.

Lo demás que se comprobó mirando: la hoja de roble sale en oro (`rgb(124,92,31)`)
mientras habla la fundación y vuelve a tinta al caducar; la pista se lee en
cursiva con su `›` y dos toques la pasan y la cierran (`data-intro` = `done`); el
parte y el epitafio se leen como el mismo documento que la decisión.

---

## 3. Tres cosas que la ronda destapó

**Una variable en la zona muerta, cazada por la primera captura.** `say` lee
`catchingUp` y la frase de la fundación se ofrece en el arranque, así que con la
declaración en su sitio de siempre —abajo, junto al letargo— el juego arrancaba
con `ReferenceError: Cannot access before initialization` y el hueco de la voz
se quedaba vacío. Las cifras de esa primera medida eran perfectas —pila 200, nada
flotando— porque nada hablaba. **Una medida no es una captura**, y esta vez lo
dijo la captura.

**La pista no cabía en dos líneas.** `intro.orders` medía 129 caracteres y
ocupaba tres líneas, que es exactamente lo que la altura fija prohíbe: la pila
pasaba de 200 a 216. Medido en el navegador con la hoja de verdad: 97 caracteres
caben en dos, 129 no. Se acortó conservando las tres palancas —«what to sow,
where hands go, what to raise»— y lo vigila `ui-voice-fits.test.ts` desde el
banco, con el tope en 104 y la medida escrita al lado.

**El `›` flotaba.** En una caja `flex` un pseudo-elemento es **otro ítem**, no
texto en línea: el `›` de la pista salía a media altura y separado de la última
palabra. La frase va en un `span` dentro del párrafo, y el párrafo sigue
centrando.

---

## 4. Dos defectos anteriores que las capturas sacaron

Ninguno es de esta ronda; los dos se arreglan aquí porque se vieron.

**El parte de bienvenida se leía detrás de la bandeja.** La pila va en
`z-index: 14` —por encima de las cuatro superposiciones a propósito— y cada una
la aparta por su nombre; el parte **no estaba en la lista** desde que la pila
existe. El título salía cortado por el listón. Se añade `html.welcome-open`,
como ya hacían la encrucijada y el epitafio.

**El recorrido de la ruta viva pasaba por accidente.** Medía `canvas:visible`
cuando el visible era el 2D ya dimensionado (360 × 560) y tocaba esas
coordenadas en el 3D (390 × 844): apuntaba a (180, 280), que es donde la aldea
cae. Desde UI-V10 el 2D va oculto mientras el 3D carga, así que lo primero
visible es el 3D **recién montado**, que mide `300 × 150` —el tamaño por defecto
de un `<canvas>`— y el «centro» pasó a ser la esquina de arriba: ochenta y un
toques sin abrir nada. Ahora la prueba **espera a que el lienzo esté
dimensionado** y barre el encuadre de treinta en treinta píxeles desde el centro,
que es lo que hace un dedo que busca una casa. Pasa en 2,6 s.

---

## 5. Verificación

- `npm run typecheck` y `npm run lint` limpios.
- **Los trece recorridos de interfaz en verde** (`tools/shots/valley.shots.ts`), tres
  de ellos declarados (`test.fail()`) desde antes de esta ronda.
- 76 pruebas rápidas de interfaz en los ocho ficheros tocados, con 31 nuevas
  (20 de la cola, 11 de las superposiciones) más 3 de la medida del hueco.
- **Tres fallos de la suite rápida que no son de esta ronda**, comprobado
  ejecutándolos en un árbol limpio de `origin/main` con los mismos números:
  `graphics-clock` (12 clips contra 4), `life-staging` (0,51 contra 0,6) y
  `ui-milestones` (18 hitos contra 20). Los dos primeros son de
  `src/render3d/`, que la otra sesión está tocando.

## 6. Lo que este trabajo no resuelve

- El candado de navegación de la encrucijada pendiente (`app.ts`, `paint`).
- La silueta del aldeano seleccionado.
- Las tres formas de cerrar (`piel-del-valle` §11), que siguen siendo tres.
