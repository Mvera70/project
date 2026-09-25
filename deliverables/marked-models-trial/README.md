# Modelos candidatos para revisión e integración

Once propuestas de reemplazo para los modelos señalados por Vera el 25 sep 2026.
Todavía no están publicadas ni conectadas al juego. El zorro y la piedra del
vado quedan fuera del encargo. `bear-v2.glb` es la revisión vigente del oso;
`bear.glb` fue descartado y no forma parte de esta entrega.

| ID del juego | Modelo candidato | Vista previa |
|---|---|---|
| `wolf` | [wolf.glb](wolf.glb) | [PNG](wolf.png) |
| `bear` | [bear-v2.glb](bear-v2.glb) | [PNG](bear-v2-preview.png) |
| `partridge` | [partridge.glb](partridge.glb) | [PNG](partridge.png) |
| `boar` | [boar.glb](boar.glb) | [PNG](boar.png) |
| `dog` | [dog.glb](dog.glb) | [PNG](dog.png) |
| `mule` | [mule.glb](mule.glb) | [PNG](mule.png) |
| `hoe` | [hoe.glb](hoe.glb) | [PNG](hoe.png) |
| `bucket` | [bucket.glb](bucket.glb) | [PNG](bucket.png) |
| `arrow` | [arrow.glb](arrow.glb) | [PNG](arrow.png) |
| `shield` | [shield.glb](shield.glb) | [PNG](shield.png) |
| `pickaxe` | [pickaxe.glb](pickaxe.glb) | [PNG](pickaxe.png) |

La [perdiz al despegar](partridge-takeoff-preview.png) tiene una captura
adicional. Los GLB del lobo, oso y perdiz incluyen, respectivamente, los clips
`attack`, `rear` y `takeoff`.

El [script de autoría](build-models.py) reproduce los once modelos con Blender
desde esta carpeta. El modelo del oso se exporta como `bear-v2.glb`.

**Límite para la integración:** los animales nuevos están articulados con nodos
rígidos y no conservan el esqueleto ni los clips `idle`/`walk` de los GLB
publicados. Hay que adaptar o rehacer esas animaciones antes de sustituir los
archivos del juego. El resto de assets publicados permanece intacto.
