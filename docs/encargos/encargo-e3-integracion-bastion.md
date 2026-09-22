# E3 · Integración del bastión aprobado

## Objetivo

Sustituir la atalaya escalada que representa `bastion` por el modelo propio
G-26 aprobado visualmente por Vera el 22 sep 2026. El bastión debe ocupar su
celda 1×1 y cerrar visualmente los tramos cardinales de muralla que llegan a
ella, sin alterar la topología ni los obstáculos del motor. Esta ronda **no**
crea un puesto navegable sobre el adarve ni cambia el combate.

## Depende de

- `docs/design.md` §1–4, §7.3–7.4c y D.3–D.4, D.9 y D.12.
- `docs/encargos/encargo-e3-modelo-bastion.md` y
  `art/recipes/bastion/README.md` (fuente y evidencia del candidato).
- `src/render3d/world/{buildings,defences,plan}.ts`,
  `tools/art/index.ts`, `tools/graphics/publish-assets.ts` y
  `tests/fast/graphics-defences.test.ts`.

## Ficheros

Se permiten `src/render3d/world/buildings.ts`, `src/render3d/world/defences.ts`,
`tests/fast/graphics-defences.test.ts`, `tests/fast/render.test.ts`, la entrada
`bastion` de `art/catalog.json`, `public/assets/valley3d/bastion.glb` y su
`manifest.json`. La promoción nativa escribe evidencia ignorada bajo
`artifacts/graphics/G-26/`. Si hace falta otro fichero, elevarlo antes de
tocarlo. No modificar la receta aprobada, `tools/art/`, balance, motor,
navegación ni assets ajenos.

## Contrato y reglas

1. Verificar que la corrida final G-26 sigue siendo la validada: GLB SHA-256
   `F3596D92F98E34A6CF90E1C7CF6BDA9490FFCB853CA301F3AC6C4F9F9AE8663F`.
   Promover sólo `bastion` con el runner nativo y publicar sólo ese ID; el
   publicador debe conservar intactos los demás GLB/entradas y verificar el
   hash del destino. Sin `game-dev` disponible, no inventar un paquete ni un
   lock externo; usar los recibos nativos de catálogo y manifiesto.
2. `BUILDING_ASSETS.bastion` apunta a `bastion`. La malla G-26 tiene caja
   local X/Z de 0 a 1, mientras edificios anteriores pueden ocupar Z negativo.
   Ubicarla por sus límites reales para que su caja mundial sea exactamente
   `[x,x+1] × [y,y+1]`; no mover todos los edificios para encajar una pieza.
3. Las murallas y empalizadas vivas deben reconocer un bastión vivo como vecino
   cardinal y, cuando corresponda, diagonal. El bastión **no** entra en la
   lista de tramos a ensamblar con `buildDefence`: conserva intacta su malla.
   Un bastión perdido deja de unir. El portón conserva su trato actual.
4. La conexión es visual; no cambia las celdas ocupadas, la transitabilidad,
   las físicas, la posición de la puerta ni la lógica de cierre del anillo.
   No prometer un apoyo elevado accesible por IA.

## Tests exigidos y falsación

- Prueba focal de `defenceConnections` con bastión vivo al norte, este, sur y
  oeste de un muro, bastión perdido, y una diagonal sin codo. El mapa de
  conexiones no debe incluir al bastión como tramo.
- Prueba de `planFor`/`buildFromAsset`: `asset === 'bastion'`, sin
  `connections` en el bastión, caja en su celda, y cambio incremental del muro
  vecino al construir/perder un bastión. No mutar el estado del motor.
- `npm run typecheck`, `npm run lint` y tests focales de arte/render/defensas.
  Captura real del valle con bastión si se dispone de escenario; si no,
  señalarlo como límite sin usar la comparativa aislada como prueba jugable.
- Falsa el cierre cualquier atalaya en lugar del bastión, desplazamiento de una
  celda, hueco entre piezas adyacentes, alteración de assets ajenos o afirmación
  de que existe adarve navegable. No mover umbrales de tests para pasar.

## Terminado cuando

El GLB aprobado queda distribuido con hash, el render usa su malla en la celda
real y las conexiones con el muro pasan las pruebas y la revisión visual.
Documentar por separado el adarve/puesto elevado aún pendiente de E3.
