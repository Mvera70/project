# E0a · La aldea se prepara para el asedio

**Fecha:** 20 sep 2026.  
**Alcance:** exclusivamente la fila **Prepararse** de `docs/encargos-3d.md` §1.

## Qué se entregó

La capa de vida lee la decisión `braced` sólo mientras la bandera está vigente,
hay una partida en camino y `state.tick < comingTick`. En esa ventana reparte
de forma determinista entre dos y cuatro adultos disponibles, después de la
guarnición. Cada porte tiene dos rutas reales: suelo exterior de campo/reserva,
carga visible de grano o haz y granero/molino; si no existe ninguno, una casa
en pie. Una ruta inexistente reduce el reparto: no teletransporta ni finge la
entrega.

La cabaña conserva su cuenta y sus cuerpos. Durante la preparación usa primero
casas interiores alcanzables; en particular las vacas dejan sus anclas de
campo. Fuera de esa ventana el reparto anterior es idéntico. Noche, reuniones,
necesidades y huida siguen mandando, y un guardia nunca entra en el reparto.

`?braced=2` representa ahora la decisión real (amenaza y bandera). El nuevo
control `?coming=2` construye la misma víspera sin `braced`. No cambia ninguna
partida normal.

## Evidencia del navegador

Observatorio real sobre el bundle, estado fijo a 30 Hz, 2 fps. Las tomas activa
y control de cada semilla comparten semilla, año, estación y amenaza; sólo
difieren en `braced`.

| Valle | Población / ganado | Preparado | Porteadores | Máx. con carga | Entregas | Defensores | Errores / penetraciones / bloqueados / deriva / atascados |
|---|---:|---:|---:|---:|---:|---:|---:|
| semilla 7, año 20 | 47 / 10 | sí | 4 | 2 | 3 antes del regreso nocturno | 1 | 0 / 0 / 0 / 0 / 0 |
| semilla 7, control | 47 / 10 | no | 0 | 0 | 0 | 1 | 0 / 0 / 0 / 0 / 0 |
| semilla 23, año 20 | 49 / 0 | sí | 4 | 3 | 4 | 2 | 0 / 0 / 0 / 0 / 0 |
| semilla 23, control | 49 / 0 | no | 0 | 0 | 0 | 2 | 0 / 0 / 0 / 0 / 0 |

En la semilla 23, el fotograma central (15 s) enseña tres porteadores andando
con grano hacia el almacén; a los 20 s las cuatro cargas están entregadas. En
la 7, tres de cuatro completan antes de que la noche corte la jornada; el cuarto
vuelve a casa sin quedar fuera. Los diez animales de ese valle nacen junto a
las casas interiores en la toma activa. El control conserva sus anclas normales.
El detector sólo considera atascado a quien mantiene una intención `prepare-*`
durante la jornada activa; una ruta de porte ya interrumpida por el regreso
nocturno no se confunde con un atasco.

Capturas y trazas:

- `artifacts/graphics/E0a/seed-7-braced/{before,middle,after}.png`,
  `summary.json`, `trace.json`, `index.html`: recorrido largo de 90 s que incluye
  el corte nocturno y termina con cero porteadores atascados.
- `artifacts/graphics/E0a/seed-7-braced-30/{before,middle,after}.png`,
  `summary.json`, `trace.json`, `index.html`.
- `artifacts/graphics/E0a/seed-7-control/{before,middle,after}.png` y resumen.
- `artifacts/graphics/E0a/seed-23-braced/{before,middle,after}.png`, con tres
  cargas visibles en `middle.png`, y resumen.
- `artifacts/graphics/E0a/seed-23-control/{before,middle,after}.png` y resumen.

Comando base de las tomas de 30 s: `node tools/graphics/observe-life.mjs --seed
<7|23> --year 20 --<braced|coming> 2 --seconds 30 --fps 2 --out <ruta>`.
La comprobación nocturna repitió la semilla 7 con `--braced 2 --seconds 90`.

## Pruebas

- `tests/fast/life-preparation.test.ts`: 6 verdes. Ventana exacta; gancho de
  captura; determinismo; prioridad defensiva; 2–4 porteadores y ambas rutas;
  `carry_walk`; anclas seguras de vaca y reparto normal idéntico; pureza del
  estado en dos semillas durante una jornada completa.
- Regresiones focalizadas: `life-beasts.test.ts` y `garrison.test.ts`; 22
  pruebas en total, verdes.
- `npm run typecheck` y `npm run lint`, verdes.
- No se lanzaron suites largas.

## Límites

- No hay animación ni malla nueva: la lectura depende de la trayectoria y de la
  carga existente, como pedía el brief.
- Los valles jugados de las tomas no conservaban vacas a los veinte años (uno
  conservaba diez gallinas y el otro no tenía ganado). La propiedad específica
  de vacas se verifica en la prueba con dos vacas y el mismo trazado activo/
  inactivo; no se falseó el motor para fabricar ganado en la captura.
- No se tocaron motor, balance, economía, daño, aviso, pago, secuela, fuego ni
  gore. E0 sigue abierto por sus otras filas.
