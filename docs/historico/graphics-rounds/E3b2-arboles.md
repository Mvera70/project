# E3b.2 · Árbol adulto junto al tablero de la pasarela

**23 sep 2026.** Sonda CPU determinista de las aldeas actuales; sin tocar motor, recetas, escena, pruebas, guardados ni assets. El [probe ejecutable](../../../artifacts/graphics/E3b2-trees/probe.ts) deja su [resultado JSON](../../../artifacts/graphics/E3b2-trees/probe.json).

## Estado reproducido

Se reproduce con `foundGame(seed)` y `run(state, year * TIME.WEEKS_PER_YEAR + 6, 'prudent', CATALOG)`, que llega a la sexta semana de primavera del año pedido. No equivale a una partida guardada manual ni a un render de navegador.

| Muestra | Defensas vivas | Árboles adultos visibles | Bastiones con junta recta E3b elegible | Adultos que cruzan el tablero candidato |
|---|---|---:|---:|---:|
| Semilla 7, año 50, tick 2406 | 70 muros, 17 empalizadas, 1 portón, 0 bastiones | 394 | 0 | — |
| Semilla 91, año 80, tick 3846 | 85 muros, 0 empalizadas, 1 portón, 2 bastiones | 400 | 1 | 0 |

Esto actualiza la muestra archivada de E3b.2a: el inventario antiguo decía 79 muros y 2 bastiones para la semilla 7/año 50; el estado de motor actual ya da **cero bastiones**, así que esa vieja alarma de cinco troncos sobre el tablero no describe esta reproducción presente.

En la semilla 91, el bastión `295` está en `(24,52)`, tiene acceso hacia `+X`, y la junta válida corre al norte por los muros `174` y `175`. El segundo bastión, `296` en `(50,55)`, no tiene acceso compatible y no ofrece junta. Ningún tronco adulto tapa el tablero en la junta válida. Hay 400 árboles adultos en el bosque completo; el resultado cero se limita a los dos módulos de esa junta, no a todo el anillo.

## Regla precisa para esperar la tala normal

La geometría del tablero recto candidato cubre, en coordenadas locales de cada muro, `X=[0,1]`, `Z=[0.33,1.27]`; el suelo llega a Y=1.02. Los árboles se colocan con `scatterTransform(width, cell)` y el tronco de la receta tiene radio `0.34 / 3`, escalado por `scatter.scale`. Para cada módulo en `bastion + side * 1` y `bastion + side * 2`, proyectar el centro del tronco al eje del módulo `u` y al eje interior `v`; su disco cruza el tablero si:

```text
dx = max(0, -u, u - 1)
dz = max(0, 0.33 - v, v - 1.27)
blocked = hypot(dx, dz) <= (0.34 / 3) * scatter.scale
```

Evaluarlo sólo para `forestLooks(state)` con `stage === 'standing'`. Tocones y rebrotes no bloquean el paso: `forestLooks` ya los clasifica por separado, y el tronco adulto mantiene su escala aunque la copa se reduzca. El bloqueo termina cuando el motor agota la madera de esa celda y cambia el terreno forestal a claro (`src/engine/world/forest.ts`, consumo en `forestStock`); no requiere borrar árboles, cambiar stock ni inventar un disparador.

**Punto de integración recomendado:** un helper puro de presentación bajo `src/render3d/world/` que comparta `forestLooks` y `scatterTransform`. En `world/plan.ts`, si hay cruce, dejar el bastión con `bastion-access-candidate` y omitir `bastionWalkway`; así no se instancian ni el módulo de entrada ni el recto. En `life/garrison.ts`, usar el mismo resultado para no asignar la variante de ruta al segundo muro mientras el tablero está ausente; se conserva el puesto elevado E3a en el bastión. No introducir esta condición en `src/engine/world/bastion-walkway.ts`: ese selector también influye en qué obra de motor se elige y la madera no debe cambiar la simulación.

La comprobación incluida en el probe usa disco contra el rectángulo completo del tablero; es conservadora en las zonas que el tablero cubre aunque haya soportes abiertos. No mide el aspecto de copas/ramas contra los pretiles ni sustituye la inspección de colisiones y marcha en escena. Esa verificación sigue pendiente para el cierre de E3b.

## Reproducción

Desde la raíz del proyecto:

```powershell
npx tsx artifacts/graphics/E3b2-trees/probe.ts
```

La sonda no usa WebGL ni Blender; escribe sólo `artifacts/graphics/E3b2-trees/probe.json`.
