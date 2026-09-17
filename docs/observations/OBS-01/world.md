# OBS-01 · Colocación visual y validez del instrumento

Coordinador. Auditoría sin cambios al juego.

## WLD-01 · Losa fuera de su celda por giro alrededor de la esquina

**Confirmado, prioridad alta visual.** G-24 corrigió qué celdas selecciona el
vado, pero no la transformación de su malla. En semilla 7/año 1, celda `(38,52)`,
`buildFord` aplica 180° al GLB con origen en la esquina. Los vértices quedan en
`x=37.0333…37.8879`, `z=52.2333…52.8400`: completamente fuera de la celda
seleccionada `[38,39] × [52,53]`. La raíz sigue en `(38,52)` y por eso la prueba
que sólo inspecciona `slab.position` pasa.

Esperado: la huella permanece en la celda de cruce después de girar.
Observado: la losa se desplaza hacia el almiar de la orilla. La segunda losa
queda en `x=39.2333…39.8400`, `z=52.1121…52.9667`; ambas quedan separadas.

Evidencia visual reabierta: `artifacts/graphics/G-24-ford/seed7-after/frames/0000.png`.
Es evidencia de la ronda anterior, no una nueva toma completada de OBS-01.
Hash de su bundle: `EBCDFB4B320C16B212C8A748081841FEB05B2A33E28C2138ED500E6F5C6530AE`.
Verificación independiente: GLTFLoader sobre el GLB publicado, Box3 después de
las mismas rotaciones y posiciones de `buildFord`, no sólo bounds del catálogo.

Comando reproducible desde la raíz (PowerShell):

```powershell
node --input-type=module -e 'import {readFileSync} from "node:fs"; import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js"; import {Box3} from "three"; const bytes=readFileSync("public/assets/valley3d/ford-stone.glb"); const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),""); for (const x of [38,39]) { const s=gltf.scene.clone(true); s.position.set(x,0,52); s.rotation.y=((52*72+x)*37%4)*Math.PI/2; const b=new Box3().setFromObject(s); console.log(JSON.stringify({cell:[x,52],rotation:s.rotation.y,min:b.min.toArray(),max:b.max.toArray()})); }'
```

Corrección sugerida para siguiente ronda: pivotar en el centro de la huella y
validar bounds transformados para las cuatro orientaciones. No ejecutada aquí.
Rectifica la conclusión de G-24 de que las dos losas estaban dentro del cauce.

## WLD-02 · El vado no recibe lámina de agua

**Confirmado en código; impacto estético pendiente de comparación.**
`buildWater` de `ground.ts` sólo incluye terreno 2 (agua), excluyendo terreno 8
(vado). El vado sí tiene color mezclado agua/camino, pero carece de esa lámina.
La especificación describe agua somera con piedras, no una interrupción del río.
No atribuir toda la separación visual al giro: interviene también este tratamiento
del suelo. Revisar cotas y continuidad del agua al corregir WLD-01.

## INS-01 · Bundle tomado durante una edición concurrente no arranca

**Bloqueo confirmado en ese artefacto; no regresión atribuida a una versión terminada.**
El primer bundle OBS-01 tiene hash
`5ACF3BBF46F435F2C9E3FFD5D2F13E6473E1ADCD9602AA0F66F3FC1C4894348D`.
Al pulsar nueva partida: `TypeError: Cannot read properties of undefined
(reading 'cell')` desde `paint` de la interfaz. `__valleyLife` existe pero no
se obtiene población; el observatorio agota su espera en línea 42.

Reproducción: `node artifacts/graphics/OBS-01/diagnose.mjs`.
Evidencias: `artifacts/graphics/OBS-01/startup.json` (stack), `startup.png`.
No se tocó la UI concurrente. Los agentes continúan con el control G-24 funcional.

## Límites

No se ha auditado todo el catálogo de sólidos, todas las orientaciones ni todas
las semillas. Los contadores de vida no miden intersecciones entre objetos estáticos.
La prueba de arranque fallida generó carpeta, pero ninguna toma válida: no contar
esa carpeta como cobertura. Esta auditoría no corrige ninguna anomalía.
