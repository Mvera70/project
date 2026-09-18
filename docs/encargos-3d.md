# Encargos de 3D y Blender — el registro

**Todo lo que el juego necesita de Blender se apunta aquí en cuanto hace
falta**, aunque el código ya funcione sin ello. Lo pidió el dueño del diseño el
18 sep 2026: «el tema de la malla, todo lo que se vaya haciendo falta en Blender
y en 3D se va anotando y se va apuntando».

Los encargos grandes tienen su propio documento con medidas y presupuesto de
triángulos (`encargo-arado.md`, `encargo-fuente.md`); esta es **la lista de
todo**, para que nada viva sólo en un comentario del código.

| Qué | Para qué | Estado hoy en el juego | Dónde está el detalle |
|---|---|---|---|
| **El portón** (`gate`) | A2 · la puerta del anillo | Usa la malla de la empalizada; las jambas las dibuja `obstacles.ts` | Abajo, «El portón» |
| El arado | M-3 · el medio que libera brazos | Sin malla; el barril lo tiene el dueño casi hecho | `encargo-arado.md` |
| La fuente | P-3 · el centro de la plaza | Tres primitivas | `encargo-fuente.md` |
| La sala del rey (`hall`) | K-4 · la casa del que manda | Más alta que una casa, con tejado burdeos | `plan-rey.md` §8 |
| **Clips de combate** | E1 · la fase 4 entera | **No existe ninguno** | Abajo, «Combate» |
| **El clan vecino** | E2 · quien ataca (§1b) | No existe | Abajo, «Combate» |
| Muralla de piedra y torre | A4 · la villa de piedra | La muralla de piedra usa su propio material; la torre existe | — |
| Fuego, humo y gore | E4 · cuando el valle cae | No existe; **el gore es decisión del dueño** | — |

---

## El portón (A2, 18 sep 2026)

**Lo que hay.** El portón es un edificio de 1×1 que ocupa una celda del anillo
de muralla. Hoy se dibuja con la malla de la empalizada (`BUILDING_ASSETS.gate`
apunta a `palisade`) y `world/obstacles.ts` le pone dos jambas en su celda.

**Lo que hace falta.** Una malla propia, del tamaño de una celda, en la línea de
la muralla de madera que ya existe, **con una hoja separada llamada
`gate_door`**. Ese nombre no es decorativo: `world/buildings.ts` busca un hijo
llamado `<recurso>_door`, lo cuelga de un gozne y lo gira noventa grados. Es el
mismo mecanismo con el que se abren las puertas de las casas, y es idea del
dueño del diseño («para la animación de la puerta, algo similar a lo que se hace
con las casas»). Con la hoja bien nombrada, **el portón se abre de día y se
cierra de noche sin tocar una línea de código**.

Dos cosas más que el modelo tiene que admitir, porque la fase 4 las va a pedir:
una **versión rota** (o que la hoja pueda desprenderse), y que se lea a la
distancia de la cámara ortográfica, que es desde donde se mira todo.

## Combate (E1 y E2, por empezar)

**Clips (E1), y es el camino largo del proyecto:** tensar el arco, soltar,
golpe de espada, recibir un impacto, caer y quedar. Hoy no existe **ni uno**, y
sin ellos la batalla física de §1b no se puede ver por muy bien que funcione.

**Modelos (E2):** el clan vecino. Por decisión del dueño (§1b) quien ataca es
**otro valle**, así que son aldeanos armados —no soldados de cota ni bandidos
andrajosos—, con arco, flecha, espada y escudo. Reaprovechan el aparejo del
aldeano que ya existe.

---

**Cómo se mantiene esto.** Cuando una ronda necesite algo de 3D que no existe,
se añade aquí **en la misma ronda**, con una línea de qué es, para qué, y qué
hace el juego mientras tanto. Un encargo que sólo vive en un comentario del
código es un encargo que nadie hará.
