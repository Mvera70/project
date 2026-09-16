# Petición G-17 · Rediseño de aldeanos low-voxel

**Fecha:** 16 de septiembre de 2026  
**Estado:** petición preparada; pendiente de ejecución y validación estética.  
**Propietario de la decisión visual:** Vera.

## Encargo

Rediseñar la apariencia de los aldeanos 3D de *The Valley* con un lenguaje
**low-voxel**: formas volumétricas simples, silueta clara, facetas legibles y
una estética medieval cálida que encaje con el valle actual. El objetivo no es
crear personajes realistas ni sustituir el sistema de animación, sino dar a la
aldea más identidad y variedad cuando el jugador se acerca con zoom.

Cada oficio debe conservar una lectura cromática clara a distancia y añadir un
detalle identificativo visible de cerca. Como referencias iniciales:

- cura: colgante o cruz sencilla;
- granjero: sombrero de paja;
- herrero: cinturón o conjunto de herramientas;
- herbolista: cesta o pequeño hatillo de hierbas;
- guardabosque: gorro y hacha al cinto.

Estos ejemplos son dirección, no una lista cerrada. La forma final debe
validarla Vera mirando capturas dentro del visor Three.js.

## Restricciones que siguen vigentes

- Mantener la escala del aldeano en **0,65 celdas** y la referencia de **1,95 m**
  antes de aplicar la escala de la receta.
- Mantener la convención de recetas: modelado en metros, `scale` de
  `0.3333333333333333` y unidad de escena en celdas.
- Mantener el esqueleto compartido de 16 huesos, los conectores `hand_l` y
  `hand_r`, y los clips `idle`, `walk`, `work_hoe` y `carry_walk`.
- Priorizar silueta, contraste y lectura móvil sobre el detalle invisible.
- Usar únicamente la paleta declarada en `art/recipes/palette.json`; no añadir
  colores arbitrarios.
- El recurso debe seguir siendo reproducible mediante
  receta → Blender → `.blend` → `.glb` → visor Three.js.
- No cambiar el motor, la capa de vida, el estado guardado ni el contrato de
  `src/render3d/world/cast.ts` durante esta ronda.

## Modo de trabajo solicitado

La primera iteración debe hacerse **en directo en Blender**, con el addon MCP
conectado y con Vera presente para juzgar la estética. Antes de producir
variantes de oficio, preparar una variante base del aldeano y compararla con el
modelo actual en una cámara común.

El trabajo manual de exploración no se considera terminado hasta que sus
decisiones se hayan traducido a una receta reproducible. La propuesta de forma
puede explorarse en Blender, pero el resultado promovible debe quedar descrito
en `art/recipes/` y regenerarse con `tools/art/blender-build.py`.

## Entregables

1. Una variante base low-voxel del aldeano.
2. Tres variantes de oficio como mínimo: cura, granjero y herrero.
3. Si la primera comparación es aprobada, variantes para los oficios restantes
   ya existentes, reutilizando el rig y los clips comunes.
4. Recetas, artefactos de Blender/GLB, capturas del visor Three.js y un informe
   de ronda en `docs/graphics-rounds/G-17.md`.
5. Una comparación a escala de juego y otra con zoom, incluyendo una versión en
   escala de grises para evaluar la silueta sin depender del color.

## Criterios de aceptación

- La silueta se distingue del fondo en la cámara de juego.
- El oficio se reconoce por color a distancia y por accesorio al hacer zoom.
- Los accesorios no deforman el cuerpo ni interfieren con los cuatro clips.
- No aparecen penetraciones graves, piezas flotantes ni cambios de escala entre
  variantes.
- El GLB carga en Three.js sin errores y conserva la jerarquía exigida.
- La receta reconstruye el mismo recurso aprobado y el catálogo registra hashes
  y procedencia.
- La aprobación visual final la hace Vera; pasar las validaciones técnicas no
  equivale a aceptar el aspecto.

## Ficheros en alcance

Durante la exploración y producción de esta ronda se pueden tocar únicamente:

- `art/recipes/villager/`;
- nuevas carpetas `art/recipes/villager-<role>/`;
- `art/catalog.json`, solo al promover recursos aprobados;
- `artifacts/graphics/G-17/`;
- `docs/graphics-rounds/G-17.md`;
- `tools/art/`, solo si hace falta una primitiva general reutilizable y se
  documenta el motivo.

No tocar `src/render3d/world/cast.ts`, `src/render3d/renderer.ts` ni
`tools/graphics/bundle-game.ts` hasta que la ronda tenga aprobación visual y se
abra una tarea de integración separada. Si finalmente se introducen modelos
separados por oficio, esa integración debe revisar también el coste de descarga
del manifiesto y el contrato que consume la capa de vida.

## Decisiones pendientes

- Qué `.blend` será la base de trabajo.
- Si los accesorios se modelan como piezas integradas o como objetos separados
  unidos a conectores/huesos.
- Cuántos oficios se producen en la primera tanda.
- Si la variante base reemplaza a `villager` o convive temporalmente con ella.

La ronda no debe cerrar estas decisiones por suposición: deben quedar en
`G-17.md` con una captura y la validación de Vera.
