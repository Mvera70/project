# Modelos candidatos para revisión e integración

Once modelos rehechos para los señalados por Vera el 25 sep 2026. Se integraron
en el juego mediante `tools/art/rigid-clips.mjs` y `tools/art/adopt-models.mjs`.
El zorro y la piedra del vado quedaron fuera. `bear-v3.glb` es la revisión
vigente del oso; `bear-v2.glb` y `bear.glb` son versiones anteriores.

| ID del juego | Modelo candidato | Vista previa |
|---|---|---|
| `wolf` | [wolf.glb](wolf.glb) | [PNG](wolf.png) |
| `bear` | [bear-v3.glb](bear-v3.glb) | [Tres cuartos](bear-v3-three-quarter.png) |
| `partridge` | [partridge.glb](partridge.glb) | [PNG](partridge.png) |
| `boar` | [boar.glb](boar.glb) | [PNG](boar.png) |
| `dog` | [dog.glb](dog.glb) | [PNG](dog.png) |
| `mule` | [mule.glb](mule.glb) | [PNG](mule.png) |
| `hoe` | [hoe.glb](hoe.glb) | [PNG](hoe.png) |
| `bucket` | [bucket.glb](bucket.glb) | [PNG](bucket.png) |
| `arrow` | [arrow.glb](arrow.glb) | [PNG](arrow.png) |
| `shield` | [shield.glb](shield.glb) | [PNG](shield.png) |
| `pickaxe` | [pickaxe.glb](pickaxe.glb) | [PNG](pickaxe.png) |

Hay capturas adicionales del [oso de perfil](bear-v3-profile.png), del
[oso erguido](bear-v3-rear.png) y de la
[perdiz al despegar](partridge-takeoff-preview.png). Los GLB fuente del lobo,
oso y perdiz incluyen, respectivamente, los clips `attack`, `rear` y `takeoff`.

El [script de autoría](build-models.py) reproduce los once modelos con Blender
desde esta carpeta. El modelo del oso se exporta como `bear-v3.glb`.

Los GLB de esta carpeta están articulados con nodos rígidos y no incorporan
`idle`/`walk`; `rigid-clips.mjs` añade esos movimientos a los archivos
publicados. El `rear` del oso se publica como `attack`. La revisión v3 cambia
solo la anatomía del oso; los otros diez modelos permanecen intactos.
