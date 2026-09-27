# D6 · Saqueo visible y acabado físico

20 sep 2026 · Encargo autorizado por el dueño: «Haz D6 y el acabado físico».

## Objetivo

Que el clan que entra alcance lugares reales, saquee y salga con cargas; que
la derrota deje ver ese desenlace antes del epitafio. Que los caídos de ambos
bandos tengan articulaciones físicas y apoyo sobre el terreno y los obstáculos,
y el portón roto produzca tablas físicas visibles. Se conserva la caída animada
como respaldo cuando Rapier no esté disponible.

## Depende de

E1, D1–D5, la huida civil y la separación entregadas en `66dc27f`. La regla de
§1b sigue vigente: sólo el parte B4 escribe consecuencias por `PlayerAct`.
Esta ronda no añade pérdidas económicas, muertes, sangre ni incendios. El saqueo
representa el hecho existente; una carga escénica no descuenta grano otra vez.

## Ficheros y reparto

- Sol D6: `life/raiders.ts`, nuevo `life/sack.ts`, `life/village.ts`,
  `life/cast.ts`, `render3d/renderer.ts`, `ui/app.ts`, nuevo
  `ui/stormed-transition.ts` y pruebas propias.
- Sol física: `life/physics.ts`, nuevo módulo ragdoll/battle-physics,
  `world/cast.ts`, `render3d/contracts.ts` y pruebas físicas/esqueleto.
- Terra escombros: `world/buildings.ts`, nuevo `world/battle-debris.ts`
  y pruebas de rotura/render.
- Principal: contrato, especificación, índices e informe de observación.

Las rutas `life/` y `world/` son relativas a `src/render3d/`. Los agentes
coordinan contratos antes de integrarlos; un solo dueño por fichero.

## Contrato

La escena de saqueo nace una vez por asalto, con objetivos derivados de edificios
en pie y rutas de `pathTo`. Se considera saqueado sólo al llegar; el gesto acaba,
aparece la carga y se toma una ruta de salida. La traza expone destino, fase,
carga y huellas. La huida civil y el combate reconocen las nuevas fases vivas.

El mundo físico se carga también para batalla sin arqueros. Conserva `launch`,
`step`, `count`, `dispose`; añade creación de cuerpos rígidos y articulaciones
para el acabado. El terreno usa la misma función de altura que el renderer.
La representación del esqueleto recibe poses absolutas de Rapier; pintar un
fotograma no avanza el mundo ni vuelve a aplicar impulsos.

`Village.dispose()` libera la física al sustituir jornada, reiniciar o cerrar.
Las promesas que terminan después de dispose liberan su resultado. Un getter
de un cuerpo retirado responde su último estado, nunca un handle WASM liberado.
La telemetría cuenta ragdolls, cuerpos y escombros para comprobar los límites.

La transición terminal conserva y guarda el resultado antes de mostrar la escena.
Sólo retiene un `stormed` nuevo que tenía asalto visible en esta sesión. El motor
queda parado; la escena avanza con reloj real. Parámetro visual inicial: 8 s,
tope 12 s; movimiento reducido, Canvas y cargar un final guardado abren el
epitafio sin retención. Ningún callback, archivo o descuento se repite.

## Reglas

Paso fijo de 1/30 s, azar separado, recursos propios liberados, cantidades de
fragmentos/ragdolls acotadas y documentadas como `TUNE`. Los escombros no cierran
el camino lógico. Nada toca `deliverables/`. No se sube ni despliega esta ronda.
Las firmas concretas y límites que resulten del experimento se registran al cierre.

Contratos de portón ya fijados: `world/Village.breakGate(id): boolean` oculta
la hoja una vez; `BattleDebris.breakGate(gate, groundFloor): boolean` crea seis
tablas, `step()` copia poses y `clear()/dispose()` liberan sus recursos. Cada
tabla parte de la altura real; a 3600 pasos conserva su última pose visible
y libera su cuerpo dinámico. El tope es de 24 escombros dinámicos: al llenarse,
se retira el más antiguo y su representación conserva la última pose. El tope
de ragdolls es de 24; cada uno tiene once segmentos y duerme tras ocho segundos
de física. Si no cabe otro ragdoll o no hay rig válido, queda la caída animada.

## Tests exigidos

Objetivos alcanzables en dos aldeas, llegada antes de carga, saqueo único y salida;
conservación del estado del motor. Caídos finitos, articulados, apoyados en suelo
no plano; obstáculos, límites y dispose seguro. Portón íntegro/roto idempotente,
sin duplicar fragmentos y restituido en nueva escena. Transición terminal finita,
sin doble cierre, carga terminal inmediata y respaldo sin física.

## Terminado cuando

Pruebas focalizadas, typecheck y lint pasan; PNG secuenciales y traza del juego
real muestran saqueo, transición a epitafio, caídas físicas y tablas que reposan.
Dos semillas para movimiento, 15 fps para caída. Se falsaría el resultado si
hubiera carga antes de llegar, una caída rígida presentada como ragdoll, cuerpos
bajo el suelo, mundo que sigue creciendo, pérdida de guardado o epitafio bloqueado.
