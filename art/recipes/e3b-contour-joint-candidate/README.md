# E3b.2 · uniones de contorno candidatas

Fuentes aisladas para resolver recta, giro, diagonal y portón del adarve.
Las diez recetas `e3b-contour-*-candidate.json` tienen dos conectores abiertos,
suelo a Y=1,02 y pretiles sobre el borde exterior calculado. `pair-24-66`
es solo un estudio de dos celdas para el encuentro que Vera señaló en la
captura: no se monta en la escena como recurso independiente.

`generate.py` deja las recetas y las plantas SVG en
`artifacts/graphics/E3b2-candidates/round-5/`. `check.py` barre el disco de
radio 0,35 en CPU y `check-real-support.ts` compara los apoyos con los GLB
publicados de muro y portón. Los diez candidatos pasan el barrido y no tienen
componentes sin anclar en la comprobación estática. Estas pruebas no acreditan
todavía la colisión del juego, la resistencia de la piedra, el tiro ni el
recorrido completo de un guardia.

`build.ts` exporta únicamente las diez recetas de una celda a una carpeta
nueva `artifacts/graphics/E3b2-candidates/contour-review-01/`. Rechaza
sobrescritura; no modifica `public/`, catálogo ni manifiesto. Su invocación
de Blender queda pendiente de autorización exacta según Game Asset Production.
Después habrá que inspeccionar cada GLB, probar la unión entre vecinos reales
y admitir solo las variantes que pasen las pruebas en escena.
