# E3b.2 · Fuente para el segundo bastión en codo cardinal

**24 sep 2026.** En seed 23, tick 3846, el bastión `building284` de (45,67)
recibe el anillo desde el este (1,0), lo entrega al sur (0,1), máscara 6,
y conserva la escalera interior hacia el norte (0,-1). La fuente295 sólo
ofrecía dos bocas opuestas; la 296 aborda una unión cardinal y diagonal.

Se creó una receta nueva bajo
`art/recipes/e3b-bastion-turn-candidate/e3b-bastion-turn-candidate.json`,
con generador y sonda propios. Parte de la cantería y plataforma de la
fuente295, refleja los 14 peldaños al norte, abre este y sur, cierra oeste
con pretil y mantiene los remates de esquina como guardas laterales de las
tres bocas. Las dos bocas del anillo reciben ménsulas de apoyo; el norte
recibe dos descansillos laterales. Una primera sonda reveló un hueco de
0,01 entre último peldaño y plataforma heredada: se añadió una losa de
costura con ménsula conectada al núcleo antes de repetirla.

**Verificación CPU:** `review.py` pasó con 358.329 muestras de disco de
radio 0,35 repartidas entre escalera alta, centro, este y sur. Comprueba
suelo a Y=1,02, ausencia de obstrucción superior, bocas de 0,70, 14
peldaños con dimensiones y alturas idénticas, y apoyos de las dos salidas.
El cargador nativo `loadRecipe` aceptó la receta: 112 cubos, dos materiales,
1.344 triángulos estimados antes de unir mallas. La prueba alcanza los
centros hasta 0,65 de cada salida; en la cara de la celda sólo certifica
la boca nominal. La continuidad del disco al cruzar cada junta necesita
ensamblar los tramos vecinos.

**Límites:** ninguna medición aquí acredita la unión real con muros,
estabilidad estructural, collider, navegación, animación, árboles cercanos,
sombras, coste GPU o apariencia final. No se usaron Blender, GLB, GPU ni
capturas; no se publicó ni modificó runtime o pruebas del proyecto.

Para una exportación posterior se necesita autorización de su invocación
exacta, con salida nueva y destino revisable. Primero se carga la receta y
se escribe su JSON resuelto en ese destino; entonces puede usarse el
generador existente con esta forma de orden, sustituyendo rutas absolutas
ya comprobadas:

```text
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python "D:\DESARROLLO\PROYECTOS\VALLEY\project\tools\art\blender-build.py" -- "<receta-resuelta.json>" "<directorio-nuevo>" "e3b-bastion-turn-candidate"
```

No se ejecutó esa orden: la skill `game-asset-production` exige autorización
de origen y destino exactos para normalización/exportación que escribe archivos.
