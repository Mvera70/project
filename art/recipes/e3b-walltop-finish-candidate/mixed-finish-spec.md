# Acabado común para los ocho adaptadores mixtos

Esta especificación corresponde a `mixed-n-se`, `mixed-n-sw`, `mixed-e-sw`, `mixed-e-nw`, `mixed-s-ne`, `mixed-s-nw`, `mixed-w-ne` y `mixed-w-se` de `art/recipes/e3b-walltop-mixed-candidate/`. **No se modifican esas ocho fuentes en esta ronda.** Conservan su condición de mallas explícitas candidatas, ajenas al esquema de primitivas de `loadRecipe`.

## Contrato de color — corregir antes de exportar

Un material `stone` con roughness0,95, sin textura, base blanca multiplicada por color de vértice. Usar valores lineales medidos del muro publicado:

| Uso | RGB lineal exacto de referencia | sRGB aproximado para herramientas que sólo aceptan ese espacio |
|---|---|---|
| Piedra, tablero, pretil, almenas | (155/255;149/255;138/255) | #CDC9C2 |
| Juntas rellenas | (134/255;96/255;68/255) | #C0A58D |

`prepare-blender-export.py` convierte actualmente cada `part.color` desde sRGB a lineal. Aplicar esa conversión a #9B958A produce una piedra **más oscura que `wall.glb`**. Para coincidencia exacta, una futura versión debe aceptar `colorLinear` explícito y escribirlo sin nueva conversión al atributo FLOAT_COLOR. Alternativa aproximada sin cambiar código: introducir #CDC9C2/#C0A58D en los campos interpretados como sRGB; la cuantización impide igualdad exacta. No cambiar el shader para multiplicar otra vez por #9B958A: el atributo ya contiene el color completo.

Para esta familia dejar uniformes los cuatro `StoneCourse*` en el color base y permitir sólo variación lineal multiplicativa determinista entre0,97 y1,03 por bloque si hace falta romper repetición. El `Deck` actual #AAA497 no debe convertirse de forma diferente al resto; usar la misma piedra base. La forma y la iluminación aportan el contraste principal.

## Hiladas y juntas

Conservar los cuatro cuerpos `StoneCourse1…4`, cada uno de altura0,235, el tablero Y=0,94…1,02 y sus polígonos exactos. En las tres cotas internas de hilada, reservar una banda de0,006 para color de mortero, **rellena y sin mover la envolvente**. Se puede subdividir cada prisma en la banda y su cuerpo, reutilizando el mismo polígono XZ y winding; no extruir decoración hacia el corredor ni cortar un hueco real.

En cada fachada exterior suficientemente larga, dividir el color de la cara con una junta vertical de0,006; alternar la posición al34% y50% de su arista en hiladas sucesivas. Es subdivisión de caras y color, no escalado de vértices de contorno. Las caras interiores de pretil no reciben relieve. No se colorea un triángulo grande entero como mortero: hay que cortar las aristas donde cruza la banda, para que aparezca una junta estrecha.

## Almenas y presupuesto

Añadir como máximo cuatro almenas por módulo, alto0,06, longitud≤0,16 y grosor igual al pretil0,10. Ubicarlas sobre los tramos rectos más largos, completamente dentro del polígono de pretil. Mantenerlas apartadas al menos0,12 de la junta a inglete y de los conectores. Si no cabe una almena sin invadir esos límites, omitirla; no ensanchar el contorno.

Coronación nueva1,26, fondo1,20; paso útil≥0,70 y suelo1,02 intactos. Una almena añadida no se considera balísticamente aprobada por conservar el paso. Los tiros descendentes deberán comprobarse después.

Presupuesto objetivo **≤360 triángulos por variante**, frente a148 de la fuente volumétrica: hasta~60 adicionales por tres bandas de hilada,~64 para juntas verticales y48 para cuatro almenas dejan margen limitado para remates. Es presupuesto de producción propuesto, no recuento de una malla todavía inexistente. Mantener **un material con color por vértice**, sin texturas; si el aparejo excede360, reducir juntas verticales antes de eliminar espesor o invadir el paso.

## Comprobación cuando se produzcan

Conservar idénticos `routeXZ`, `ports`, `sectionEnds`, anchura0,90 exterior,0,70 útil, cotas del tablero y polígonos de apoyo. Repetir winding/manifold, distancia del disco a todo pretil/almena y soporte del suelo. Comparar bounds X/Z y volumen cerrado antes/después: las juntas sólo recolorean/subdividen; las almenas únicamente aumentan el volumen dentro de pretiles. Guardar hashes de las ocho fuentes y un recuento real por variante. La exportación sigue necesitando autorización específica y no se ha ejecutado.
