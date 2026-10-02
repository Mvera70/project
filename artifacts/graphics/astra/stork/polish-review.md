# Revisión de estilo de fauna · 2 oct 2026

Origen: comentario de Vera de que algunos animales nuevos eran demasiado low-poly y no casaban con la fauna publicada. Base `9992f09e`, rama `art/astra-b6-fauna`.

## Diagnóstico visual

Se fotografiaron los cuatro candidatos y `hen.glb`, `bird.glb` (la golondrina), `fox.glb` y `mule.glb`, con la misma iluminación y cámara ortográfica de 1,4 celdas. Se evaluó el modificador de piel para encuadrar correctamente el zorro. El detalle ampliado se presenta aparte, identificado como encuadre individual: no se confunde con la comparación de escala física.

- **Cigüeña:** los dos anillos iguales hacían un pecho cilíndrico. Las alas negras parecían bloques separados. El cuello era una varilla recta. La gallina y la mula publicadas muestran cambios de sección y perfiles afinados.
- **Polluelo:** cabeza y cuerpo parecían dos poliedros apilados. El pico ocupaba demasiado de la cara. Su forma no recordaba al volumen redondo de la gallina.
- **Grulla:** alas planas compatibles con la golondrina publicada, pero cuerpo pequeño y cuello de sección constante. La silueta posterior del ala carecía de remate de plumas.
- **Mariposa:** las alas de doble cara encajan con la simplificación de la golondrina; se conserva. Nido fuera de esta corrección.

## Cambios y coste

| Recurso | Antes | Después / límite | Primitivas de dibujo |
|---|---:|---:|---:|
| stork | 158 | 230 / 250 | 2 → 2 |
| chick | 70 | 78 / 80 | 1 → 1 |
| crane | 88 | 148 / 150 | 3 → 3 |
| butterfly | 16 | 16 / 16 | 2 → 2 |

No se pide excepción. Cigüeña: cuerpo con latitudes reales y doce segmentos, cuello de cinco secciones con curva leve, cabeza más redonda, remiges delgadas y dedos. Polluelo: un volumen continuo con cabeza adelantada, pico reducido y alas cerradas discretas. Grulla: pecho redondeado, cuello de sección variable, alas con una ligera curvatura y puntas escalonadas. Sin suavizado de normales ni texturas: conserva facetado y paleta.

Estimación geométrica sobre los emisores de la base (no medición de GPU): dos cigüeñas seleccionadas por `storkSpots` añaden **144 triángulos**; la capacidad reservada de cuatro serían 288. Quince grullas añaden **900 triángulos**. Cada polluelo añade 8; son tres por gallina elegida en primavera, **24 por madre**, con selección del 34 %. No se inventa una población máxima de gallinas: el total de polluelos depende del valle. No hay llamadas adicionales por el cambio de geometría: se mantienen los mismos grupos y material; Sol debe confirmar el coste en la integración real.

## Evidencia y contrato

- `scale-comparison.png`: candidatos y referencias a escala idéntica.
- `detail-comparison.png`: comparación de lenguaje de formas, encuadre individual.
- `before-after.png`: los tres candidatos revisados, antes y después.
- Cada candidato conserva `sheet.png`, tres vistas, contexto con casa/aldeano y, donde corresponde, `poses.png`.
- `polish-verification.json`: compara pivotes, mallas y primitivas con el commit base; presupuestos comprobados desde los índices del GLB por el constructor.
- `stork_neck`, `bird_wing_l/r`, `wing_l/r` conservan nombres y coordenadas. No se añaden clips ni se cambia el motor o la animación procedimental.
- `stork-nest.glb` y `butterfly.glb` se verifican idénticos byte a byte con la base.

Pendiente: juicio del director en cámara de reposo y perfil de rendimiento en la escena integrada. La mejora de volumen tiene efecto evidente en detalle; la comparación física muestra el tamaño real pequeño del polluelo, por lo que no se afirma que todos esos detalles se lean desde la cámara de reposo.
