# Trazado espacial: medida final del motor

21 sep 2026. Estado local de la ronda espacial, **después** de corregir los
destinos de bosque que seguían figurando bajo los edificios. No hay commit ni
despliegue asociado a esta medida.

## Método y resultado

Fundación real `foundGame`, avance con `run` y política `prudent` sobre el
catálogo completo. Se contestan las encrucijadas. No se avanza con un bucle de
`tick`, no se conceden recursos ni se neutralizan ataques.

| Semilla | Año pedido | Tick alcanzado | Casas en pie | Radio guardado | Puertas | Defensas | Cierre real | Tiempo tramo (ms) | Tiempo acumulado (ms) |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 7 | 40 | 1920 | 16 | 13 | 1 | 81 | Sí | 5635 | 5635 |
| 7 | 60 | 2880 | 13 | 13 | 1 | 81 | Sí | 2768 | 8404 |
| 23 | 40 | 1920 | 12 | 14 | 1 | 97 | Sí | 6497 | 6497 |
| 23 | 60 | 2880 | 13 | 14 | 1 | 97 | Sí | 2992 | 9489 |
| 41 | 40 | 1920 | 16 | 11 | 1 | 74 | Sí | 8714 | 8714 |
| 41 | 60 | 2880 | 14 | 11 | 1 | 74 | Sí | 3645 | 12359 |
| 11 | 40 | 1497 | 13 | — | 0 | 0 | No | 1627 | 1627 |

Casas suma `house` y `stone_house`; defensas suma `palisade`, `wall` y `bastion`,
sin contar la puerta. Cierre es `ringClosed(state)`, no la bandera histórica.
Los tres primeros valles llegan vivos a sesenta años. La semilla 11 termina
tomada (`stormed`) en el tick 1497, año **31,1875**: pedir cuarenta no hace que
una partida terminada alcance cuarenta.

Los tiempos son observación local, con otros trabajos de verificación activos;
no constituyen un benchmark de rendimiento ni un umbral. El segundo tramo
continúa la misma partida de cuarenta a sesenta años.

## Causas comprobadas durante la ronda

- El cierre anterior significaba agotar solares, incluso cuando quedaba un
  paso físicamente transitable. Ahora el cierre se contrasta con una inundación
  del suelo interior y exige una puerta real sobre el anillo.
- La primera validación estricta del círculo impedía construir muralla en las
  cuatro semillas: la marisma de ribera es transitable para los cuerpos pero
  no admitía defensas. Se autorizó explícitamente hincar defensas de una celda
  en marisma; casas y campos siguen necesitando suelo seco. No se autorizó
  edificar sobre agua ni vados. Se examina cada radio entero, sin saltos de tres.
- La semilla 11 tiene trazado viable: una comprobación al año 28 encontró
  `placeBuilding(state, 'palisade') = { x: 17, y: 53 }`, con radio 12.
  Sin embargo, su bandera `threatened` había caducado en el tick 1105 antes de
  reunir las condiciones de obra. Esta ronda no cambia esas condiciones ni
  garantiza que toda aldea construya muralla.
- Los cinco falsos trabajadores invernales del campo eran destinos de tala:
  el byte `forest` persistía bajo una casa y la ruta acababa en su fachada,
  situada en un campo. Se excluyen volúmenes bloqueados antes de seleccionar
  bosque y orillas. Las dos pruebas estacionales originales pasan intactas,
  junto a una regresión específica con árboles bajo tejados.

## Reproducción

Desde la raíz del proyecto, en PowerShell:

```powershell
npx tsx -e '
import { foundGame } from "./src/engine/found.ts";
import { run } from "./src/engine/sim.ts";
import { CATALOG } from "./src/engine/crossroads/catalog/index.ts";
import { ringClosed } from "./src/engine/world/placement.ts";
for (const seed of [7,23,41,11]) {
  const s = foundGame(seed);
  const start = performance.now();
  for (const year of seed === 11 ? [40] : [40,60]) {
    const before = performance.now();
    run(s, year * 48 - s.tick, "prudent", CATALOG);
    const live = s.buildings.filter(b => b.lostTick === null);
    console.log(JSON.stringify({
      seed, requestedYear: year, tick: s.tick, actualYear: s.tick / 48,
      houses: live.filter(b => b.kind === "house" || b.kind === "stone_house").length,
      ring: s.ring, gates: live.filter(b => b.kind === "gate").length,
      walls: live.filter(b => ["palisade","wall","bastion"].includes(b.kind)).length,
      closed: ringClosed(s), ended: s.ended,
      segmentMs: Math.round(performance.now() - before),
      totalMs: Math.round(performance.now() - start)
    }));
  }
}'
```

## Límites de esta medida y de la implementación

- Cuatro semillas son evidencia acotada, no una garantía sobre todos los valles
  ni un estudio de mortalidad o balance. No se ajustaron costes, daño, tiempos,
  población ni umbrales para compensar el trazado.
- Los guardados conservan edificios, plaza y radio: **no se relocaliza** una
  aldea existente. El cierre actualizado puede detectar un hueco legado sin
  repararlo automáticamente; las banderas históricas de era siguen siendo historia.
- El trazado defensivo continúa siendo un círculo rasterizado fijo. No hay
  contorno dinámico que esquive obstáculos pieza a pieza, ni un anillo nuevo
  alrededor de cada expansión.
- Agua, lago, montaña y roca pueden ser frontera física. **Un vado transitable
  no lo es**: si comunica dentro y fuera, el recinto no se declara cerrado.
  Bosque y marisma tampoco sustituyen una defensa.
- Se comprueba cierre y acceso con topología de celdas. Esta tabla no mide
  congestión, tiempos de recorrido, colisiones de cuerpos ni rendimiento móvil;
  la revisión visual y la capa de vida tienen sus pruebas y capturas aparte.

## Corrección del aserto de terreno de las jornadas

La pasada amplia detectó `gate#96 en 34,40`, semilla 0, en el aserto
`onForbiddenGround` de `tests/journeys/works.test.ts`. Una consulta independiente
de `foundTwenty(0)` confirma que esa celda es `TERRAIN_CODE.marsh` (4) desde
la generación. El helper todavía rechazaba toda marisma, incluida la excepción
de defensa ribereña autorizada en esta ronda. No era un diagnóstico de
solapamiento: el aserto de solapamientos de esa semilla precede al de terreno.

Se actualizó **sólo el helper de prueba**: admite marisma exclusivamente para
`palisade`, `wall`, `gate` o `bastion` de 1×1. Agua y vado se rechazan para
todos; se añadieron asimismo montaña y lago a la prohibición explícita.
El detector de solapamientos permanece intacto.

Verificación sintética del mismo helper: las cuatro defensas pasan en marisma,
fallan en agua/vado; casa y defensa de ancho 2 fallan en marisma; dos piezas
superpuestas siguen siendo detectadas. Una prueba, 67 ms; lint verde.

```powershell
npx vitest run --config vitest.journeys.config.ts tests/journeys/works.test.ts -t 'la excepción de ribera'
```

**No se repitió la simulación de 150 años ni se afirma una pasada integral verde
posterior al cambio del aserto.** Esta comprobación valida la corrección precisa
del helper, no aporta un nuevo resultado de las cinco partidas largas.
