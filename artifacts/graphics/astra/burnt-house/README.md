# Casa quemada aún en pie

Modelo original reproducible para la transición casa → derrumbe → `ruin-wood`.
Conserva la cubierta a dos aguas, el hueco de puerta y el entramado; faltan paños de cubierta y tablas de pared, con bordes quebrados y madera carbonizada. No contiene fuego ni animación: el runtime mueve las piezas.

- **996 triángulos** de un máximo de 1200; ocho piezas estructurales, cinco materiales, cero texturas.
- Caja glTF/Three en celdas: mínimo **(0, 0, -2)**, máximo **(2, 1.489025354, 0)**. Una celda = 3 m; huella exacta **6 × 6 m**, altura **4.467076 m**.
- Frente hacia **+Z**, izquierda **-X**, cumbrera a lo largo de Z. Mismo origen de parcela que `house` y `ruin-wood` publicados.
- Los ocho nodos son raíces hermanas, sin padre transformado. **Rotación identidad, escala identidad, Y arriba**. Cada `translation` es el pivote; la geometría ya está desplazada respecto a él.
- Cada pieza contiene varias primitivas de material. GLTFLoader puede devolver un `Group` con hijos `Mesh`: animar el nodo encontrado por su nombre, sin asumir `isMesh` ni mover sólo el primer hijo.

## Pivotes para el derrumbe

Coordenadas Three.js en celdas. Todos los nombres llevan el prefijo literal `burnt_house_`.

| Nombre completo | Pivote XYZ | Uso |
|---|---|---|
| `burnt_house_base` | (1, 0, -1) | Basamento inmóvil |
| `burnt_house_wall_front` | (1, 0.076667, -0.176667) | Caída alrededor de X |
| `burnt_house_wall_back` | (1, 0.076667, -1.823333) | Caída alrededor de X |
| `burnt_house_wall_left` | (0.176667, 0.076667, -1) | Caída alrededor de Z |
| `burnt_house_wall_right` | (1.823333, 0.076667, -1) | Caída alrededor de Z |
| `burnt_house_roof_left` | (1, 1.466667, -1) | Soltar y girar alrededor de Z |
| `burnt_house_roof_right` | (1, 1.466667, -1) | Soltar independientemente y girar alrededor de Z |
| `burnt_house_chimney` | (1.493333, 0.066667, -1.58) | Caída desde el pie |

Las paredes incluyen sus tablas, postes y testeros; cada faldón incluye sus propios cabios. El desplazamiento descendente de los faldones debe acompañar a su giro si se quiere que caigan, pues sus pivotes empiezan en la cumbrera.

## Materiales y reproducción

Colores de `art/recipes/palette.json`: `char` #3F2B22, `soot` #08090B, `ash` #77796F, `stone` #9B958A, `wood` #6B4932. Rugosidad 1, metal 0 y normales planas; ninguna textura ni emisión.

Fuente: `art/recipes/burnt-house-candidate/build.py`. Desde la raíz del repositorio, PowerShell:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/recipes/burnt-house-candidate/build.py
```

El comando reconstruye el GLB, las métricas y las cinco imágenes en esta carpeta. Usa Blender sin interfaz y reimporta los bytes exportados antes de renderizar. `sheet.png`: arriba izquierda tres cuartos; arriba derecha frente; abajo izquierda lateral; abajo derecha casa publicada, casa quemada, aldeano y ruina publicada, todos a su escala original. Los PNG individuales permiten revisar a mayor tamaño.

Revisión realizada: imagen de tres cuartos y hoja de contactos; estructura de nodos glTF inspeccionada directamente. No hay raíz rotada ni escalada, ni texturas. La captura es de Blender; la comprobación del derrumbe dentro de Three.js corresponde a la integración. Sin preguntas de diseño pendientes.
