# E3b.2a · Topología real y bosque junto al adarve

**22 sep 2026.** Inventario CPU, sin abrir la app, Blender ni GPU. El script
[inventory.ts](../../../artifacts/graphics/E3b2-study/inventory.ts) parte de
`foundGame` y avanza con política `prudent` hasta primavera, semana 6, de dos
años de referencia. Su [JSON](../../../artifacts/graphics/E3b2-study/inventory.json)
conserva las cuentas y las máscaras. Es un estudio de geometría; no prueba
tránsito, colisiones ni aspecto en el juego.

| Villa | Piedra | Bastiones | Portones | Uniones cardinales | Diagonales efectivas |
|---|---:|---:|---:|---:|---:|
| Semilla 7, año 50 | 79 | 2 | 1 | 65 | 15 |
| Semilla 91, año 80 | 80 | 2 | 1 | 65 | 16 |

Una diagonal sólo se cuenta si no hay ya codo cardinal, como en
`defenceConnections`. En la semilla 7 los bastiones tienen dos vecinos
cardinales; el portón enlaza por un lado cardinal y otro diagonal. En la
semilla 91 un bastión enlaza por cardinal y diagonal, y el portón sólo por
diagonal. Son formas reales del anillo que el primer módulo recto no resuelve.
`e3b-walkway-candidate` está publicado, pero todavía no figura entre los
recursos que carga la escena y no se instancia más allá de la entrada.

La semilla 7 conserva **15 árboles adultos visibles** en celdas forestales
cardinales hacia el centro del mapa contiguas a piedra; la semilla 91 no
conserva ninguno en esa franja. Es una heurística de interior basada en el
centro del mapa, no una certificación del lado interior del anillo. Con el
desplazamiento determinista del árbol, su radio de tronco de receta y la
intrusión de 0,27 del tablero, **cinco de esos 15** podrían cruzar el volumen
del tablero. Es una alarma aproximada: no incorpora orientación real de cada
módulo ni colisión de malla evaluada. Antes de colocar una pasarela allí debe
verificarse el volumen exacto; la tala existente debe seguir quitando árboles
gradualmente y mover el recurso semanal de forma normal.

## Consecuencia para E3b.2

El cierre necesita variantes medibles para recta, giro de 90°, transición
diagonal y coronación del portón. El portón debe conservar su abertura y hoja
móvil. Un tramo de madera no puede recibir la pasarela de piedra por analogía:
queda excluido hasta tener variante validada. Ninguna pieza se marcará
navegable por existir en el dibujo: primero habrá superficie continua de
ancho ≥0,70, después ruta privada y colisiones correspondientes. El
[encargo de modelos](../../encargos/encargo-e3b2b-modelos-candidatos.md)
recoge los casos que este inventario destapó.

No se modificaron `src/engine/`, escena, GLB ni guardados; sin benchmark,
commit ni push.
