---
name: director
description: El índice y la dirección de The Valley — qué dirección (motor, jugabilidad, interfaz, gráficos, modelos, animación, vida, física y combate, sonido, rendimiento, comercial) lleva cada cosa, qué skill la gobierna y qué documento manda, dónde están las fronteras entre ellas, y cómo se orquesta una tanda de varias sesiones o ramas a la vez sin pisarse. Úsala al empezar cualquier tarea para saber qué skill cargar, al repartir trabajo entre sesiones o agentes, al abrir o integrar varias PR a la vez, y cuando algo toque dos direcciones.
---

# El director

Una skill para las demás. No dice cómo se hace nada: dice **quién lo hace, con
qué skill, contra qué documento, y cómo se reparte el trabajo cuando hay más de
una sesión a la vez**. Nació el 30 sep 2026, al día siguiente de la tanda de
cuatro ramas —animación, modelos, gráficos y sonido— que entraron en `main` en
una noche y dejaron tras de sí dos choques de versiones, un arreglo hecho dos
veces, papeles desordenados y 21 jornadas rojas que nadie había visto
(`docs/medidas/fusion-cuatro-ramas-2026-09-29.md`). Todo lo de §3 viene de ahí.

**Por encima de esta skill siguen mandando** `CLAUDE.md` (los innegociables),
`docs/design.md` (la especificación) y `docs/plan-meta.md` (el orden contra la
meta). Esta skill no los resume: dice cuándo abrir cada uno.

---

## 1 · El mapa: cada dirección, su skill y su documento

Primero se decide **qué dirección toca la tarea**; después se carga su skill y
se lee su documento. Si toca dos, se leen las dos y se mira §2.

| Dirección | Qué gobierna | Skill | Documento que manda | Código |
|---|---|---|---|---|
| **Meta** | Qué fase va antes, qué es «caer» | `goal` | `docs/plan-meta.md`, `docs/design.md` §1b | — |
| **Motor y arquitectura** | La partida, el tick, el estado, el determinismo, las cuatro capas | *(sin skill: `CLAUDE.md`)* | `docs/design.md` §1–4, §12 · `balance.ts` | `src/engine/`, `src/derive/` |
| **Jugabilidad** | Cómo actúa el jugador: señales en el mundo, el carro, las encrucijadas | `senales-en-el-mapa` | `docs/design.md` §8, `docs/historico/rework.md` §4b | `src/ui/`, `src/engine/` |
| **Interfaz** | Papel, cabeceras, tipografías, tokens, iconos | `piel-del-valle`, `calcar-iconos` | la propia skill `piel-del-valle` §0 | `src/ui/` |
| **Gráficos 3D** | Luz, suelo, bosque, cámara, suavizado, perfiles de calidad | `performance` *(no hay skill de dirección visual)* | `docs/encargos/profundidad-visual-movil-*.md` | `src/render3d/world/`, `effects/`, `renderer.ts` |
| **Modelos 3D** | Mallas, recetas, GLB, catálogo | `animacion` (clips) *(no hay skill de modelado)* | `docs/encargos-3d.md`, `docs/encargos/` | `art/`, `tools/art/`, `public/assets/valley3d/` |
| **Animación** | Clips, marcha, gestos, fauna | `animacion` | `docs/medidas/animacion-matriz-2026-09-29.md` | `render3d/clips.ts`, `action-clips.ts`, `effects/animal-motion.ts`, `world/cast.ts` |
| **Vida del valle** | Rutinas, rutas, encuentros, sueño | `valley-life-ai`, `observe-valley-life` | `docs/design.md` Anexo E | `src/render3d/life/` |
| **Física y combate** | Rapier, flechas, lanza, portón, caza | `fisica-combate`, `battle-sandbox` | `docs/diagnostico-fisica-combate-2026-09-29.md` | `life/physics.ts`, `archery.ts`, `melee.ts`, `hunt-*.ts`, `raiders.ts` |
| **Sonido** | Interfaz, ambiente, sucesos que suenan | `sonido-del-valle` | `docs/plan-audio.md`, `docs/plan-audio-mundo.md` | `src/ui/sound.ts`, `ambience.ts`, `moments.ts`, `public/audio/` |
| **Rendimiento** | Fotogramas en tablet y móvil | `performance` | la propia skill, y `docs/medidas/bucle-villa-2026-09-29.md` | todo lo que pinte |
| **Enseñar** | Capturas, paquete de prensa, tráiler | `press-kit` | `tools/README.md` | `tools/graphics/` |
| **Comercial** | Precio, plataformas, lanzamiento | `monetizacion-marketing-valley` | la propia skill | — |

**Huecos del mapa, a 30 sep 2026.** Tres direcciones trabajan sin skill y se
notó: **motor y arquitectura** (vive en `CLAUDE.md` y `design.md`, y basta
mientras sólo lo toque una sesión), **dirección visual 3D** (gráficos midió
con `performance` y dejó sus reglas en encargos sueltos) y **modelado** (la
rama de modelos no tenía skill y su regresión —de 1 a 16–27 mallas por
animal, RV-1— no la cazó nadie hasta la revisión). Cuando una de ellas abra su
siguiente ronda, **su primera tarea es escribir su skill**, con este mismo
formato: qué gobierna, qué se mide, qué ya costó.

**Dónde está lo demás:** qué documento es cada cosa, `docs/README.md`; qué
herramienta mide qué, `tools/README.md`; en qué punto está todo,
`docs/task-log.md`; qué modelo lleva qué tarea delegada, `docs/agents.md`.

---

## 2 · Las fronteras: dónde se tocan dos direcciones

Casi todo lo que salió mal el 29 sep estaba en una frontera: cada rama hizo su
parte bien y nadie hizo la de en medio. **Una frontera tiene contrato escrito
y prueba, o no existe.** Las que hay:

| Frontera | Contrato | Lo guarda | Quién lo cambia |
|---|---|---|---|
| Motor → todo | El estado es plano y se lee, nunca se escribe desde fuera; la batalla entra por `PlayerAct` | ESLint (`src/engine/` no importa de fuera), `CLAUDE.md` | Sólo el motor, subiendo `SCHEMA_VERSION` |
| Vida/combate → sonido | `GraphicsStats.moments`: cuentas que sólo suben (flechas, aciertos, golpes, caídos, portón, caza, oso) | `ui/moments.ts` y sus pruebas (v5.22) | Quien añade un suceso **publica su cuenta**; sonido decide si suena |
| Combate → sonido (K5) | `moments.battle.jerkinBlows`: golpes que los del cerco reciben sobre un peto de cuero (opcional; v5.80) | `tests/fast/melee.test.ts` (la cuenta sale de `jerkinTally`) | Combate; sonido decide si el golpe sobre cuero suena distinto |
| Render → sonido | `GraphicsStats` (`contracts.ts`): cámara, fase del sol, cielo | `sound.test.ts` | Gráficos avisa si renombra |
| Modelos → caza | La cápsula de cada presa sale del tronco del GLB | `hunt-bodies.test.ts` | Modelos: **un modelo nuevo mide su tronco** |
| Modelos → rendimiento | Una llamada de dibujo por animal (RV-1, PR #11) | la prueba de RV-1 | Modelos |
| Motor → pantalla | Toda mecánica sin representación va a `docs/encargos-3d.md`; toda crónica nueva, a `docs/plan-arte-pendiente.md` | `goal` §4b y §4c | Quien diseña la mecánica, en la misma ronda |

**Regla de la frontera nueva:** si tu trabajo produce algo que otra dirección
tendrá que consumir —un suceso que debería sonar, un cuerpo que debería
proyectar sombra, un modelo que la física medirá—, **escribe el contrato y su
fila aquí antes de escribir el código**, y apunta en `docs/encargos-3d.md` lo
que la otra dirección tiene pendiente. La caza física y el sonido se hicieron
a la vez sin contrato y la caza salió muda: el contrato llegó un día después.

---

## 3 · Orquestar una tanda: varias sesiones o ramas a la vez

Se aplica cuando hay **dos o más sesiones o agentes escribiendo en el
repositorio al mismo tiempo**. Una sesión hace de **director**: reparte,
integra y cierra. Las demás son **carriles**.

### 3.1 · Antes de lanzar: la hoja de reparto

El director escribe la hoja **antes** de abrir las sesiones, en
`docs/task-log.md` (una entrada «Tanda del <fecha>»), y copia a cada sesión su
fila en el encargo. Por carril:

| Campo | Qué pone | Por qué (lo que costó el 29 sep) |
|---|---|---|
| **Rama** | nombre fijo | — |
| **Ficheros propios** | lista o carpetas; nadie más los toca | dos sesiones con el mismo fichero es un conflicto seguro |
| **Ficheros compartidos que toca** | `renderer.ts`, `balance.ts`, `contracts.ts`, `CLAUDE.md`… con qué parte | tres ramas tocaron `renderer.ts`; salió bien por suerte |
| **Versiones reservadas** | un bloque del changelog, p. ej. v5.30–v5.34 | **dos choques**: sonido usó v4.97–5.02 y luego v5.22–5.24 sobre números ya tomados |
| **Contratos que publica o consume** | fila de §2 | la caza salió muda |
| **Puerta** | typecheck, lint, los ficheros tocados y qué jornada | — |
| **Qué no hace** | lo que está en otro carril | el arreglo del `AudioContext` se hizo **dos veces**, en dos ramas, la misma tarde |

**Los ficheros de todos** —`docs/changelog.md`, `docs/task-log.md`,
`docs/plan-meta.md`, `tools/README.md`, `docs/README.md`— no tienen dueño y
chocan siempre. Regla: cada carril escribe **sólo su propia entrada, arriba,
con su versión reservada**, y **al final**, justo antes de abrir la PR, no a
mitad de trabajo. Un conflicto ahí se resuelve **conservando las dos**, la más
reciente arriba; nunca se reescribe la entrada de otro.

### 3.2 · Mientras trabajan

- **Rama fresca.** Cada carril trae `main` a su rama **cada vez que entra otra
  PR** (merge, no rebase) y antes de abrir la suya. Sonido llegó a ir 90
  commits por detrás.
- **Un hallazgo en terreno ajeno se avisa, no se arregla.** Se le dice al
  director, que se lo pasa al dueño. Arreglarlo uno mismo es la receta del
  arreglo duplicado.
- **Commits por rutas explícitas**, nunca `git add -A`, y con la identidad
  `noreply@anthropic.com`: un autor de pega deja commits «Unverified».
- **Nada de `pkill -f <palabra>` a la ligera.** Si la palabra va en el propio
  comando, se mata a sí mismo; y un patrón corto se lleva lo ajeno: `vite`
  casa con `vitest`, que puede ser la suite de otro agente. Se mata por PID
  (`pgrep -f 'node_modules/.bin/vite$'`) o se deja el servidor vivo. **Y
  `pgrep`/`pkill -f` con un patrón que esté en tu propio comando también te
  encuentra a ti**: el 1 oct 2026 un `kill $(pgrep -f "vitest run …")` mató la
  medida y su propia terminal. Primero se listan los PID, después se mata cada
  uno por número.
- **Cada `push` a una rama cancela la CI que esa rama tenga en marcha**
  (`cancel-in-progress` en `ci.yml`). Subir un arreglo a media vuelta tira los
  minutos que llevaba y lo que iban a decir los otros trabajos. Se espera a que
  la vuelta acabe, se juntan **todos** los arreglos que pidió y se sube una
  vez. Medido el 1 oct 2026: dos vueltas canceladas y unos 25 minutos perdidos
  en una sola PR.
- **Las horas que se le dan a Vera, en hora de Madrid** (lo pidió el 1 oct
  2026). El reloj del contenedor va en UTC: `TZ=Europe/Madrid date`.

### 3.3 · Integrar: de una en una

1. **`main` en verde primero.** Si `main` ya está rojo, **no se integra nada
   encima**: se arregla o se declara con `it.fails` y la medida escrita. «Ya
   estaba rojo» no es un estado, es deuda: así se acumularon 21 jornadas rojas
   y 12 recorridos que nadie veía.
2. **Una PR cada vez.** Tras cada fusión, las demás traen `main` y vuelven a
   pasar su puerta **antes** de fusionarse.
3. **El orden** lo pone la dependencia: quien publica un contrato entra antes
   que quien lo consume (modelos antes que caza; el contrato de sucesos antes
   que los sonidos).
4. **La CI tiene que terminar.** Si un trabajo se corta por tiempo, se trocea
   (`--shard`), no se ignora: un trabajo cortado no dice nada. **Y una vuelta
   cancelada sin que nadie empujara** (pasó el 1 oct 2026) se relanza tal cual
   (`rerun_workflow_run`): no es un fallo de la PR ni un motivo para un commit.
5. **Se fusiona con los cinco trabajos en verde sobre el último commit**, no
   con el primero que acaba. Las jornadas van en tres trozos y cada uno puede
   traer lo suyo.

### 3.4 · Cerrar la tanda

Cuando la última PR está dentro, el director hace **el informe de la fusión**
(`docs/medidas/fusion-<fecha>.md`, con el del 29 sep de plantilla):

- esquema de qué trajo cada carril y en qué orden;
- **cómo combinan**: las pruebas de cada frontera de §2, y una partida real;
- **la medida combinada en el aparato** (la tablet de Vera): cada rama mide
  sola en un portátil, y la villa a 0 fps sólo apareció con todo junto;
- los huecos entre carriles, **repartidos por dueño**;
- el papel en orden: versiones seguidas, cuaderno con un solo «Abierto».

### 3.5 · Plantilla del encargo de un carril

```
Carril: <dirección> · Rama: <nombre> · Skill: <skill>
Tuyo: <ficheros/carpetas>
Compartido (sólo esta parte): <fichero: qué>
Versiones reservadas: vX.YY–vX.ZZ
Publicas: <contrato, fila de director §2> · Consumes: <contrato>
No es tuyo: <lo que hace otro carril; si lo ves roto, avisa>
Puerta: typecheck, lint, <ficheros>, <jornada>
Al terminar: trae main, entrada arriba en changelog y task-log con tu versión, PR.
```
