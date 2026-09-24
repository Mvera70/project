# Bastión ancla 66 — fuentes aisladas

Candidato geométrico E3b.2: boca este y diagonal suroeste, escalera sur (+Z), suelo Y=1,02. Coordenadas locales de mundo X/Y/Z; la receta usa Blender [x,-z,y]. Colocación identidad, con origen en la esquina del bastión. No sustituye el catálogo ni acredita integración.

## Fuentes y alcance

- `e3b-bastion-anchor-66-candidate.json`: para vecino SO **muro**, 122 primitivas, 1.432 triángulos. Incluye soporte diagonal macizo hasta el centro de la primera celda vecina. En seed23 tick3846: bastión283 (36,41), vecino SO muro192 (35,42), vecino E muro194 (37,41). Debe sustituir la mitad de muro192 correspondiente; no superponerse a su malla completa.
- `e3b-bastion-anchor-66-gate-candidate.json`: alternativa **incompleta y bloqueada en la junta**, 121 primitivas, 1.420 triángulos. Retira el soporte diagonal macizo, conserva la plataforma hasta centro vecino. En seed91 tick3846: bastión295 (34,39), vecino SO portón71 (33,40), vecino E muro199 (35,39). No usar la variante maciza aquí.

La segunda fuente todavía se solapa con el tablero del conector `e3b-gate-crossing-24-light-finish-candidate.mesh.json`. Hace falta una unión explícita de ambas superficies, con sus pretiles y apoyos. No se aprueba el ensamblaje por superposición. Cortar toda la fuente por el plano diagonal z−x=1 tampoco sirve: corta el descansillo x=0,05…0,95/z=1…1,65 y parte del disco de acceso a escalera. No se ha acreditado un apoyo continuo sobre la fuente nueva del dintel ligero.

`generate.ts` refleja en X la fuente b296 mixta (respecto X=0,5). Conserva la partición de suelo en cubos/prismas triangulares sin duplicación coplanar interna. Registra SHA256 de la fuente de origen y la sonda exige igualdad byte por byte al regenerar. No invoca el antiguo `review.ts`, que tiene escrituras adicionales. La b295 antigua sólo sirve de control negativo porque tiene bocas E/O.

## Escalera y contrato futuro de vida

Prolonga el descansillo 0,65 hacia +Z y traslada los catorce peldaños esa distancia. Ancho 0,72, huella 1/14, alzada 1,02/14=0,07285714; recorrido de peldaños de Z=2,65 a Z=1,65. No conserva la huella vieja Z=1…2. El conflicto del diseño original es entre la diagonal de ancho útil 0,70, su pretil interior y el acceso inmediato a la escalera.

La metadata `lifeRouteXYZ` contiene la polilínea escalonada completa: approach=foot=(0,5;0;2,65), exit=(0,5;1,02;1,65), post=(0,5;1,02;0,58). La subida debe usar cada arista vertical y huella, seguida del descansillo hasta post; la bajada invierte esos puntos. `elevatedPostRoute` actual Z=2…1 **no sirve**. La aproximación coincide con el pie para mantener el disco radio0,35 dentro de Z≤3. Su alcance por terreno, desnivel local y comportamiento en vida deberán comprobarse al integrar.

El nuevo volumen de acceso ocupa x=0,05…0,95, z=1…2,65; los peldaños, x=0,14…0,86. Invade 0,65 de la segunda celda interior, ya considerada por `bastionAccessOf`; con radio0,32 en el pie llega a Z=2,97, con radio0,35 a Z=3 exacto. La reserva comprueba +Z1, +Z2 y los dos laterales de +Z2: la extensión cabe geométricamente en esas celdas. Esta comprobación de disponibilidad no es una reserva persistente de suelo.

`state.ts` reproduce ambas partidas con `run(...,'prudent',CATALOG)`, nunca con tick aislado. `state-measurements.json`: acceso {x:0,z:1}, cero edificios, obras y troncos contra la extensión de escalera. Mide huellas lógicas y tronco conservador de radio(0,34/3)*escala; no acredita aleros, copas ni volumen real de otras mallas.

## Evidencia CPU

`measurements.json` y `gate-measurements.json`:

- Esquema existente y regeneración determinista válidos.
- 67.328 muestras de suelo del recorrido E→centro→centro vecino SO y 41.098 del descansillo: cero faltas, Y=1,02. Centro y coronas de radios0,175/0,32/0,35; separación longitudinal ≤0,005, 64 ángulos por corona.
- Radio0,35 cabe tangente al peor pretil; margen radio0,32=0,03. Las cinco uniones de pretil medidas se tocan. No hay tolerancia extra para un cuerpo de radio0,35.
- 882 rayos sobre los catorce peldaños, repartidos a lo largo y en tres posiciones transversales: superficie expuesta correcta; sin tablero encima de los peldaños. Alzadas, huellas contiguas y unión superior coinciden.
- La receta b295 E/O falla con 29.501 faltas de suelo; un tapón artificial en boca E también falla. Son controles negativos de la sonda.

En los planos abiertos de interfaz se recorta sólo la porción del disco que pertenece al siguiente módulo. Se recorta X>1 para E, z−x>2 para SO y Z>1,65 al medir el final de descansillo. Los puntos exactamente sobre un plano terminal reciben un sesgo interior de 1e−7 para evitar falsos negativos Float32 (se detectaron siete, todos sobre dichos planos). No se recortan laterales del paso.

`gate-clearance-measurements.json` lee por CPU el GLB ancho aislado existente: vano0,840000066, cero invasiones añadidas bajo Y0,599 en2.193 muestras, cero choques conservadores AABB de hoja contra fuente nueva en91 posiciones de apertura. La hoja alcanza Y0,59333336. El dintel original empieza Y0,60000002: ese GLB tiene la holgura antigua ~0,0067. La coronación antigua llega a Y0,76333337 y no acredita contacto con intradós del nuevo tablero Y0,94 (separación0,17666663). El futuro portón ligero cambia ese marco; su apoyo todavía no tiene GLB ni prueba conjunta. La comprobación del GLB anterior sólo acredita vano, transformación y que esta fuente no añade un choque de hoja.

## Presupuesto y límites

Presupuesto de fuente ≤1.800 triángulos, dos materiales de paleta, cero texturas, sin animaciones nuevas. Bounds locales X=−0,818198…1, Z=0…2,65, Y=0…1,36. Materiales conservados de fuente; no se afirma igualdad de color con muro publicado ni draw calls finales. La variante del portón queda bloqueada por unión/apoyo; la de muro queda pendiente de encaje con siguiente mitad vecina. Muestreo CPU no demuestra física de cápsula, rigidez, manifold del objeto combinado, balística, revisión visual ni GPU. No se ha exportado GLB, renderizado, abierto preview ni modificado runtime.

## Reproducir (PowerShell desde raíz del proyecto)

```powershell
npx tsx art/recipes/e3b-bastion-anchor-66-candidate/generate.ts --write
npx tsx art/recipes/e3b-bastion-anchor-66-candidate/probe.ts --record
npx tsx art/recipes/e3b-bastion-anchor-66-candidate/probe.ts --gate --record
npx tsx art/recipes/e3b-bastion-anchor-66-candidate/state.ts --record
npx tsx art/recipes/e3b-bastion-anchor-66-candidate/gate-clearance.ts
npx tsc --noEmit -p art/recipes/e3b-bastion-anchor-66-candidate/tsconfig.json
```

Las escrituras quedan en esta carpeta. `gate-clearance.ts` ejecuta también la sonda base al importar su conversor CPU. No autoriza exportaciones. El coordinador debe registrar estos comandos en `tools/README.md` y la ronda en `docs/task-log.md`; esos ficheros quedan fuera del alcance de esta subtarea.
