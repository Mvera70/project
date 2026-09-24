# Bastión cardinal E→S · fuente candidata aislada

Caso observado: seed 23, tick 3846, `building284` en (45,67), máscara 6.
Entrada del anillo por este, salida por sur y escalera interior hacia norte.
Una única receta completa, derivada de la fuente de acabado del bastión295.
No sirve para el bastión296, cuya unión es cardinal y diagonal.

## Geometría

En coordenadas del juego X/Z, la celda ocupa X=0…1 y Z=0…1; el norte es
Z<0. En la receta `(bx, by, bz) = (X, -Z, Y)`. La plataforma conserva
Y=1,02. Las tres bocas tienen anchura libre nominal 0,70:

| Acceso | Centro en X/Z | Soporte y protección |
|---|---|---|
| Norte, escalera | (0,50; 0) | 14 peldaños originales reflejados hacia norte; losa de costura de 0,01, ménsula y dos descansillos laterales con ménsulas; remates de esquina |
| Este, muro cardinal | (1; 0,50) | Plataforma hasta la cara; ménsula bajo la boca; remates norte y sur |
| Sur, muro cardinal | (0,50; 1) | Plataforma hasta la cara; ménsula bajo la boca; remates este y oeste |

El cuarto lado lleva pretil oeste. Los cuatro remates de esquina hacen de
pretiles laterales de las bocas sin estrecharlas. El borde de cada boca queda
abierto para la conexión prevista. La fábrica inferior, la paleta de piedra y
mortero, y las cotas de los 14 peldaños proceden de la fuente295. La escalera
se refleja en planta; no se cambia su pendiente, alzada, huella o ancho.

`build.py` reproduce el JSON final a partir de la fuente indicada en la
metainformación. `review.py` lee sólo fuentes y comprueba por CPU las bocas,
peldaños y el disco de Ø0,70 sobre tres radios que confluyen en el centro.
No produce vistas ni otros archivos.

```powershell
python art/recipes/e3b-bastion-turn-candidate/build.py
python art/recipes/e3b-bastion-turn-candidate/review.py
npx tsx -e "import { loadRecipe } from './tools/art/recipe.ts'; loadRecipe('art/recipes/e3b-bastion-turn-candidate/e3b-bastion-turn-candidate.json').then(r=>console.log(r.id, r.primitives.length))"
```

La sonda local no demuestra la junta con los muros vecinos, los colliders,
la animación en escalera ni el aspecto de un GLB. Las salidas requieren que
el suelo adyacente continúe a Y=1,02. Los triángulos contados son la suma
sin unión de los 112 cubos (1.344); el coste de un GLB queda sin medir.
