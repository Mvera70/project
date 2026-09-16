# IA-2 · Compromisos e interacciones

**16 sep 2026.** Tercera fase de `docs/life-ai-implementation-prompt.md`.
Implementada por una sesión de Sonnet sobre `1509121`, con cinco decisiones
arbitradas después por el coordinador (§5).

---

## 1. Qué había y qué falta ya no falta

`IA-0.md` §2 dejó escrito que el registro de compromisos **no existía**: había
dos mecanismos parciales y separados —un mapa de asientos que a los animales se
les pasaba vacío, y el objeto `Scene` compartido por los dos participantes— sin
propuesta, ni reserva atómica, ni caducidad, ni liberación idempotente. Y la
liberación estaba **escrita a mano y duplicada** dentro del bucle de
`village.ts`, en dos bloques `if` casi iguales.

Ahora existe `src/render3d/life/commitments.ts`, con los tres contratos del
brief **copiados tal cual, sin modificar**:

```ts
export type ActorRef = { kind: 'villager'; id: number } | { kind: 'beast'; id: number };
export type InteractionKind = 'greet'|'chat'|'yield'|'give'|'play'|'feed'|'pet'|'chase';
export interface InteractionProposal {
  id: string; kind: InteractionKind; initiator: ActorRef; recipient: ActorRef;
  spots: readonly [Point, Point]; expiresAtStep: number;
}
export interface InteractionLease {
  id: string; participants: readonly [ActorRef, ActorRef];
  spots: readonly [Point, Point]; expiresAtStep: number;
}
```

Y con el registro: `tryReserve` (atómica: o los dos actores y los dos sitios, o
nada), liberación idempotente, `expire(step)`, y `resolveBatch` que **ordena por
la clave de los actores y nunca por el orden en que llegue la lista**, de modo
que lo ya reservado no se desaloja.

`ActorRef` sale de `villager < 0`, que es la marca que ya distinguía una bestia
de una persona: **no hace falta un campo nuevo**, y el registro admite
`kind: 'beast'` sin rediseño, que es lo que IA-4 necesitará.

---

## 2. Lo que se entrega que se ve

- **`greet`, el saludo de paso.** Gira la cara un instante al cruzarse. **No
  toca la velocidad ni la posición**: siguen andando, que es lo que hace un
  saludo de paso y no una parada.
- **`yield`, la cesión de paso.** Dos cuerpos que convergen en un sitio
  estrecho: se detecta el paso estrecho con `clearBetween` a radio doble contra
  radio simple, la convergencia por producto escalar, y **quién cede se decide
  con `hash32`**, así que la misma jornada cede al mismo. Se aparta a suelo
  libre, o espera quieto si no hay hueco, y después **vuelve a su ruta intacta**.
  Es de lo que más se nota: hasta ahora se empujaban.
- **`chat`, `shove` y `brawl` se envuelven, no se tocan.** `propose`, `play`,
  `alive` y `Scene` siguen igual, y con ellos la propiedad de E.3.4 que importa:
  la escena se recalcula entera de `since` y `step`, así que una escena a medias
  se reconstruye sin haber guardado nada.
- **La liberación es una sola función** (`closeScene`) llamada desde un solo
  sitio, con `settleHeldBody` para cualquier cuerpo cuyo movimiento no gobierna
  el paso normal. Y hay **red de seguridad**: `commitments.expire(steps)` cuenta
  lo que encuentre sin liberar, y ese contador es `interactions.stuck`.
- **Los encuentros se conceden en orden canónico.** La sección de encuentros
  recoge **todos** los candidatos del paso antes de conceder nada, con prioridad
  por pareja y concesión ordenada por id de cuerpo, nunca por el orden de
  `around.near`.
- `moveSeat` en `decide.ts` recoge las tres líneas de soltar plaza vieja y
  ocupar la nueva que `village.ts` y `beasts.ts` tenían duplicadas.

---

## 3. Lo medido

`npx tsx tools/life-report.ts 7 23 97 --days 2`, 26 880 cuerpo-segundos.

| | IA-1 | IA-2 primera versión | **IA-2 final** |
|---|---|---|---|
| centro en muro | 0 | 0 | **0** |
| círculo en muro | 20 · 0,07 % | 19 · 0,07 % | **19 · 0,07 %** |
| giros > π/2 parado | 92 · 0,34 % | 116 · 0,43 % | **82 · 0,31 %** |
| parados con impulso ≥ 0,9 | 1 · 0,00 % | 0 | **0** |

**La primera versión empeoró los giros y el agente lo cazó él mismo**:
`playGreet` sobrescribía la cara sin comprobar la velocidad, que es exactamente
el defecto que `TURN_MIN_SPEED` y `TURN_MIN_PROGRESS` existen para evitar desde
IA-1. Corregido gateando el gesto, las cuatro cifras quedan iguales o mejores
que IA-1. Queda anotado porque es la clase de regresión que un arreglo nuevo
introduce sobre un arreglo viejo sin que ninguna prueba lo vea.

**Cuenta de interacciones**, seis semillas × tres jornadas con `foundTwenty`, y
las cinco clases juntas:

| Empiezan | Terminan | Se invalidan | **Se quedan colgadas** |
|---|---|---|---|
| 1 144 | 1 122 | 0 | **0** |

Las 22 de diferencia seguían vivas al cortar la jornada en `STEPS_PER_DAY`, que
es lo esperado y no es un cuelgue. El contador de invalidaciones está en cero
porque **dentro de una jornada nadie muere ni se va**: existe y se ejercita en
las pruebas unitarias, pero el juego real no lo dispara en un día.

---

## 4. Verificación

```
npm run typecheck   → limpio
npm run lint        → limpio
9 ficheros de la capa de vida (life-motion, life-body, life-navigate,
  life-needs, life-terrain, life-orders, life-staging, animals, daylife)
  → 76 pruebas verdes, igual que IA-1
tests/fast/life-commitments.test.ts (nuevo) → 20 pruebas verdes
tests/journeys/life-scenes.test.ts → 11 pruebas, 9 verdes, 2 rojas
```

**Las dos rojas de jornadas ya estaban rojas en el commit base**, y el agente lo
comprobó revirtiendo sus cambios con `git stash` y volviéndolas a pasar:
idénticas antes y después. Son «el andar de `castOf` no patina» y «hay aldeas
casi de paz y aldeas de bronca», del lote de nueve de `rework.md` §2.8. No son
de esta fase.

Las veinte pruebas nuevas guardan las propiedades que el brief pedía: reserva
atómica, un fallo que no deja medio compromiso, un sitio ya reservado que
bloquea la reserva entera, liberar dos veces igual que liberar una, un actor en
un compromiso como mucho, caducidad sola, dos actores que no aceptan escenas
distintas en el mismo paso **con desempate independiente del orden de la
lista**, los compromisos existentes conservados primero, el disparo y el
no-disparo de `yield` en pasillo estrecho contra campo abierto contra mismo
sentido, que `yield` nunca aparta a nadie contra un muro, su determinismo, el
alcance y la frecuencia de `greet`, una jornada entera sin cuelgues, la
reconstrucción bit a bit de la misma jornada, y ningún cuerpo dentro de un muro.
**Ningún `it.fails` hizo falta.**

---

## 5. Las cinco decisiones arbitradas

| Decisión del agente | Arbitraje |
|---|---|
| **`shove`/`brawl` no son `InteractionKind`** —el enum del brief no los incluye— pero viven en el mismo registro vía `reserveRaw` | **Se acepta.** El enum lo congeló el dueño del diseño y una riña no es una interacción de ese catálogo: es conflicto. Compartir almacén y liberación es lo correcto; darle registro propio sería duplicar la parte difícil |
| **No reescribir la mecánica interna de `chat`/`shove`/`brawl`** | **Se acepta.** Su aproximación es orgánica (`position()` cierra el hueco desde el primer paso) y su recuperación es el enfriamiento que ya existe. Lo que faltaba de verdad —secuencia completa con estado propio— es lo que traen `greet` y `yield`. Si el dueño quiere además una recuperación **visible** para la riña, es trabajo aparte y no está hecho |
| **Prioridad por pareja `yield` > `chat`/`shove`/`brawl` > `greet`** | **Se acepta**, y por el motivo que da: el paso físico manda sobre la disposición social. Dos que no pueden pasar tienen que resolver eso antes de ponerse a hablar |
| **`GREET_ODDS = 0.2` sin medir**, documentado como tal | **Se acepta como provisional.** No hay número del que partir, y el que lo fija es el ojo: **se ajusta con la captura**, no con una prueba. Anotado en §6 |
| **`beasts.ts` no gana compromisos propios** | **Correcto.** `feed`/`pet`/`chase` son IA-4 y estaban fuera de alcance; el registro ya los admite sin rediseño |

---

## 6. Lo que queda abierto

1. **La frecuencia del saludo (`GREET_ODDS`) no está medida.** Es la única
   constante de esta fase sin número detrás, y el que lo dé es mirar la pantalla:
   un valle donde todos se saludan sin parar se lee como un mecanismo, y uno
   donde nadie se saluda no se ve.
2. **La deuda de `IA-1.md` §4.2** sigue: `ProgressState` en un `Map` de
   `village.ts` y en `Beast` en vez de en `Dweller`. El agente tenía permiso
   para cobrarla y no le hizo falta.
3. **`interactions.invalidated` no se ejercita en el juego real**, sólo en
   pruebas. Se verá cuando una interacción sobreviva a una muerte, y eso es
   IA-6 (escenas de historia: funeral).
4. **§3.5 punto 5**, la malla contra el radio, sigue siendo de `render3d/`.

---

## 7. Qué observación en pantalla refutaría esta fase

Dos que se cruzan en una puerta y se siguen empujando en vez de que uno se
aparte. Un saludo que congela a alguien o le hace girar en redondo estando casi
parado. Una cesión de paso que deja a alguien apartado para siempre. Cualquier
interacción que siga en pantalla después de que el contador diga que terminó.
Reconstruir el mismo día con la misma semilla y ver otra pareja saludándose.
