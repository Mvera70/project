# ¿Decide la física las batallas? Diagnóstico y primer experimento (29 sep 2026)

**Pregunta de Vera (29 sep 2026, al cerrar la ronda AN de animación):** «mi
objetivo a futuro es que las batallas tengan consecuencias físicas reales —que
impactos, bloqueos, empujes, caídas y proyectiles respondan a posiciones y
colisiones—. Me preocupa que tener Rapier para flechas y ragdolls dé apariencia
de física mientras el resultado siga dependiendo de distancias y
temporizadores.» Este documento es el diagnóstico honesto, leído del código de
la rama `ccr-48790acc-ibi65c` a esta fecha, y una propuesta de siguiente paso.
**No abre ninguna reescritura del combate.**

El documento que el encargo citaba, `docs/ideas-fisica-y-app-nativa-2026-09-29.md`,
no existe en esta rama, en `main` ni en ninguna rama del remoto (buscado el
29 sep); si aparece, este diagnóstico se concilia con él.

## 1 · Qué decide Rapier hoy, y qué no

**La preocupación es correcta.** Rapier decide por dónde vuela una flecha y si
una muralla la para; todo lo que convierte un encuentro en un resultado —si
alguien recibe, si cae, si el portón cede— es una distancia y un reloj. La
caída física (ragdoll) y los cascotes pintan un hecho que ya estaba decidido.

| Decisión | Quién la toma | Dónde |
|---|---|---|
| Trayectoria de la flecha: gravedad, arrastre, choque con suelo, muralla y almenas | **Rapier** (bola de 0,08, CCD) | `life/physics.ts`, `launch`, `addObstacles`, `addWallCollider` |
| A dónde se apunta | Cálculo analítico sin arrastre, adelantando al blanco | `life/archery.ts`, `aimAt`, `targetFor` |
| Si la flecha **alcanza a alguien** | **Lógica**: un cilindro de 0,45 × 0,7 celdas contra la posición de la capa de vida, cada paso. Las personas no son colliders de Rapier | `life/archery.ts`, `stepArchery`, `HIT_REACH`, `BODY_TOP` |
| Qué hace un flechazo | **Regla**: una flecha tumba | `stepArchery`, `raider.phase = 'down'` |
| Cadencia de tiro | Reloj: 63 pasos | `archery.ts` (la prueba de E1 guarda `[0, 63, 126]`) |
| Cuerpo a cuerpo: quién pega, cuándo y cuánto | **Lógica**: el más cercano a menos de 0,9 celdas, un golpe cada `BLOW_STEPS`, cae a los `BLOWS_TO_FALL` golpes; el arquero devuelve la mitad. Sin dados y sin física | `life/melee.ts`, `stepMelee` |
| Golpe al portón y rotura | **Lógica**: un golpe por segundo a menos de 2,6 celdas; 60 golpes lo rompen | `life/raiders.ts`, `BLOW_STEPS`, `BLOW_REACH`, `GATE_BLOWS` |
| La hoja rota y las tablas | **Rapier**, cosmético (cascotes con tope y vida) | `physics.ts`, `debris` |
| Movimiento, choques y empujes entre cuerpos | **Integrador propio en rejilla**: círculos contra celdas bloqueadas y una separación blanda entre vecinos. No hay empuje físico | `life/body.ts`, `integrate`, `fitsCircle`; `separate` en `village.ts` |
| La caída | El hecho lo decide la regla; **Rapier pinta la caída**: un ragdoll de once segmentos sembrado desde la pose `fall` en t=0, **sin el impulso del golpe**. Tope 24; sin Rapier o por encima del tope, cae el clip `fall` de respaldo | `life/ragdoll.ts`, `buildRagdoll`; `physics.articulate`; `world/cast.ts`, `captureRagdoll` |
| La caza | **Sin Rapier**: proyectiles propios con gravedad explícita y prueba de segmento contra círculo; lanza por distancia; y una tirada de suerte decide rozar o fallar | `life/hunt-shot.ts`, `stepHuntShots`, `spearCanHit`; `life/hunt-encounter.ts`, `LUCK` |
| Las animaciones de combate | **Fechan los hechos, no los deciden**: el contacto está en t=0 del hecho (`since`) | `clips.ts`, `combatClip`, `clipTime`; `life/cast.ts` |
| El resultado para la partida | El parte de la capa de vida (`life.defence`: abatidos, caídos, si entraron) entra al motor como dato por `PlayerAct` `kind: 'battle'`; si nadie miró, decide la cuenta de B3. El parte sólo salva si adelgazó la partida | `engine/world/threat.ts`, `settle`; `engine/world/garrison.ts` |

**Lo que sí es físico en el resultado, y es poco:** una flecha que choca con
una almena no llega al cilindro, así que **cubrirse tras la muralla funciona de
verdad**, y el arrastre del aire hace que el apuntado analítico yerre un poco
a distancia. Medido en el banco sin navegador (`battle-report.ts`, semilla 7
año 60, 6 arqueros contra 24): 45 flechas y 24 aciertos. Ninguna otra parte
del resultado depende de una colisión.

## 2 · ¿Se puede avanzar sin migrar a Godot o Unity?

**Sí, de forma gradual, y el cuello de botella no es el motor gráfico sino qué
decide la física.** La arquitectura ya tiene las tres piezas que hacen falta:
un paso fijo compartido (`world.timestep = LIFE_STEP`, 1/30 s, el mismo de la
vida), la frontera que deja entrar un resultado no determinista como dato
(§1b, `PlayerAct`), y un banco donde medirlo (`?sandbox=battle`, con ms del
paso de Rapier en directo).

**Los límites reales, de más a menos duros:**

1. **Los cuerpos vivos no están en Rapier.** Sin un collider por persona no
   hay contacto flecha–persona, persona–persona ni empuje. Es el primer muro.
   La salida gradual es un collider **cinemático** por combatiente (la vida
   sigue moviéndolo; Rapier sólo informa de contactos), no convertir la marcha
   en física.
2. **La API de `physics.ts` no expone contactos ni consultas**: ni cola de
   eventos de colisión ni `castRay`/`intersectionsWithShape`. Hay que
   añadirlos antes de poder decidir nada con Rapier.
3. **La animación es binaria: clip o ragdoll entero.** Un tambaleo, un empuje
   que no tumba o un escudo que para piden mezclar pose animada con física
   parcial (reacción procedural o *active ragdoll*), que no existe.
4. **Dos fuentes de verdad.** Si nadie mira, decide B3; si alguien mira,
   decide la escena. Cuanto más decida la física, más importa que mirar no
   cambie sistemáticamente las probabilidades (hoy lo acota la regla «el parte
   sólo salva si adelgazó la partida»).
5. **Determinismo.** `@dimforge/rapier3d-compat` 0.20 no promete el mismo
   resultado entre aparatos (la variante `-deterministic` sí). Hoy da igual
   —la batalla no es determinista por decisión (§1b)— pero las pruebas de
   combate tendrán que ser estadísticas, sobre muchas batallas.
6. **Escala.** Una celda son tres metros y la gravedad va dividida por tres;
   masas, impulsos y fricciones hay que pasarlos con cuidado o los números
   «parecen» bien y se comportan raro.

**Qué hay que comprobar en el móvil, y nada de esto se puede medir aquí**
(SwiftShader no es un teléfono): el ms del paso de Rapier con 24–40 colliders
cinemáticos más los ragdolls activos, en el iPhone y en el iPad
(`?sandbox=battle&defenders=6&raiders=24`, «Copiar métricas» en el pico de la
pelea); la memoria y el tiempo de carga del WASM; y si una batalla larga
calienta el aparato y baja los fotogramas a los dos o tres minutos.

**Qué obligaría a pensar en un motor nativo**, y hoy no se ha visto: que el
paso de Rapier en el teléfono no quepa en el presupuesto con los colliders de
una batalla real, o que la mezcla de animación y física necesite
herramientas que three.js no tiene. Las dos cosas se miden antes de decidir.

## 3 · El primer experimento: «la flecha que toca», en sombra

**Qué.** Un collider cinemático en cápsula (radio 0,32, alto 0,7 celdas) por
asaltante y por defensor **sólo durante una batalla**, movido cada paso a la
posición de la capa de vida, en un grupo de colisión que sólo choca con
proyectiles; eventos de colisión en las flechas; y la cola de eventos vaciada
tras `world.step()` en `physics.ts`. **En sombra**: el cilindro de
`stepArchery` sigue decidiendo, y cada flecha apunta además qué dijo Rapier
—si tocó, a qué altura (piernas, tronco, cabeza), con qué velocidad— y si una
almena la paró antes.

**Cómo se mide.** En `tools/reports/battle-report.ts` (Rapier corre en Node),
decenas de batallas por configuración (6 contra 12, 6 contra 24, arco y lanza):
una tabla de acuerdo —los dos aciertan, ninguno, sólo el cilindro, sólo Rapier—
con el motivo de cada desacuerdo, y el ms que añaden las cápsulas. Después, en
el aparato, el mismo banco con el ms del paso.

**Cómo se integra con las animaciones nuevas, sin tocarlas.** Cuando Rapier
dice «tocó», el golpe ya tiene fecha (`hitAt`) y `hit_take` lo enseña en su
instante; se le añade la dirección del impacto como dato de presentación
(igual que `meleeFacing`), para que el retroceso vaya **en contra** de la
flecha, y el ragdoll recibe la velocidad de la flecha en el segmento tocado en
vez de caer desde el reposo. El clip `fall` sigue de respaldo.

**Qué demostraría que merece la pena seguir** (las tres a la vez):
1. **Cambia resultados de forma legible**: al menos una de cada diez flechas
   acaba distinto con Rapier que con el cilindro, y los casos se explican
   (una almena que cubre, una flecha que pasa por encima del hombro).
2. **Se ve en el móvil**: en una tira a 390×844 el caído se va en la dirección
   de la flecha (la cadera se desplaza en ese sentido en nueve de cada diez
   caídas medidas en la traza).
3. **Cabe**: menos de medio milisegundo más por paso en el teléfono con las
   cápsulas de una batalla de 6 contra 24.

**Qué diría «parad aquí»**: que Rapier y el cilindro coincidan casi siempre
(la física no añade resultados, sólo coste), que el coste no quepa en el
aparato, o que los resultados nuevos no se lean a escala de móvil. Cualquiera
de las tres.

**Por qué éste y no otro:** es el único cambio que convierte una decisión ya
existente (¿le dio?) de distancia en contacto, sin tocar el motor, sin cambiar
el reloj de nadie y con una vuelta atrás de una línea (volver a mandar el
cilindro). Empujes, bloqueos con escudo y reacciones parciales vienen después
y dependen de lo que este experimento mida.

## 4 · Lo que conviene cuidar ya del rework de animación

1. **Que las animaciones sigan fechando hechos y no decidiéndolos**
   (`combatClip`, `since`, `until`). Es lo que permite que mañana el hecho lo
   ponga un contacto de Rapier sin tocar un clip.
2. **Que la pose siga siendo función del instante** (el mezclador se pone en
   un tiempo absoluto, `world/cast.ts`, `pose`). Es la condición para mezclar
   después animación y física por hueso.
3. **Que el esqueleto no cambie de nombres ni de jerarquía.** Los once
   segmentos del ragdoll se leen del rig publicado (`RAGDOLL_SEGMENTS` en
   `world/cast.ts`); el horneado sin Blender (`tools/art/bake-clips.mjs`)
   respeta los nombres, y así debe seguir.
4. **Nada de desplazamiento de raíz en los clips**: la marcha va en el sitio y
   la mueve el suelo recorrido. Un cuerpo empujado por la física tiene que
   poder moverse sin que el clip lo arrastre a otro lado.
5. **Los datos de presentación en el `Actor`, no lógica en el render**: la
   dirección del impacto, cuando llegue, es un campo como `meleeFacing`.
6. **Pensando en una app nativa**: los 21 clips fabricados viven en código
   (`action-clips.ts`, sobre three.js) y no viajan a otro motor; los del GLB,
   sí (glTF). Si la app nativa es probable, conviene hornear los fabricados al
   GLB con la misma vía de AN-1a (`plant-gait.mjs` + `bake-clips.mjs`), para
   que sean datos y no código. Es trabajo de una ronda, no urgente.
7. **La traza del observatorio**: `hunt`, `defence`, `physics.stats` y
   `trace-strip.py` son los instrumentos que el experimento necesitará para
   medir acuerdo y dirección de caída.

## Riesgos y dudas

- **Que la física sea invisible a esta escala.** Un cuerpo mide 10–20 px en
  el móvil; un roce o un desvío pueden no leerse. Por eso el criterio 2 de
  arriba es obligatorio, no decorativo.
- **Que más física signifique partidas más difíciles de probar.** Cada
  prueba de combate pasa a ser una distribución; los listones, con muchas
  batallas y varias semillas.
- **Que mirar cambie el resultado.** Si la escena física es más dura o más
  blanda que B3, mirar se vuelve una estrategia; hay que medirlo antes de dar
  más peso a la escena.
- **El coste en teléfonos modestos** no está medido; todo lo medido es de un
  portátil y de SwiftShader.
- **Duda de diseño para Vera:** qué resultados quieres que decida la física
  primero —¿el acierto de las flechas, el empuje en el portón, las caídas?—.
  Este documento propone el acierto porque es el único que hoy ya pasa por
  Rapier a medias; el orden es tuyo.
