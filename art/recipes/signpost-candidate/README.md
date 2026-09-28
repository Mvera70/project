# Cartel del camino — candidato de Astra

Modelo original conforme a `docs/encargos/cartel-del-camino.md`. Poste tallado,
tablilla ligeramente torcida, cantos biselados, una astilla lateral, flecha
excavada y dos clavos. Sin texto ni texturas. Se entrega sólo `signpost`;
la variante opcional de villa queda fuera de esta ronda.

## Contrato y medidas

| Propiedad | Valor |
|---|---|
| Unidad | Celda del juego, escala 1 |
| Caja total XYZ | 0,563148 × 1,100000 × 0,128464 |
| Origen | Base del poste, (0, 0, 0) |
| Arriba / frente | +Y / +Z en GLB; +Z / −Y en Blender |
| Tablilla local | 0,56 × 0,20 × 0,045 |
| Centro de la tablilla | Y = 0,90 |
| Inclinación | 2° alrededor del frente |
| Poste en la base | 0,08 × 0,08 |
| Triángulos | 300 |
| Mallas / materiales | 1 / 4 |
| Texturas / animaciones | 0 / 0 |

Madera del poste `#6b4a2e`, tablilla `#a8845a`, talla `#795636`, hierro
`#49423a`; colores sRGB convertidos a lineal al crear los materiales.
La flecha señala +X local. La geometría no incorpora lógica estacional.

## Reproducir

PowerShell, desde la raíz del repositorio, con Blender 5.2.1 LTS:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python art/recipes/signpost-candidate/build.py
```

La receta geométrica completa es `build.py`: no depende de operaciones manuales.
Genera `artifacts/graphics/astra/signpost/`: `signpost.glb`, `signpost.blend`,
`metrics.json`, `three-quarter.png`, `front.png`, `rear.png`, `detail.png` y
`scale.png`. Esta última usa el aldeano publicado sólo como referencia visual.
El `.blend` contiene exclusivamente el modelo. Las capturas y las medidas
`reimportedGlb` de `metrics.json` proceden del GLB vuelto a importar; incluyen
caja, triángulos, pivote y normal de la talla. Los hashes identifican fuente y GLB.
`artifacts/` está ignorado por Git: los productos se regeneran desde la fuente.

## Entrada al catálogo

El comando del encargo `npm run art -- all signpost` **todavía no acepta este
candidato**: `tools/art/index.ts` exige una receta JSON de primitivas y el
generador `tools/art/blender-build.py`. La flecha excavada y el contorno tallado
usan malla propia y una operación booleana, siguiendo los candidatos de
`burnt-house` y `great-oak`.

Se integró por `tools/art/adopt-models.mjs` con `adopt.json` y se publicó en
`public/assets/valley3d/signpost.glb`. Para repetir la admisión y publicación:

```powershell
node tools/art/adopt-models.mjs art/recipes/signpost-candidate/adopt.json
npx tsx tools/graphics/publish-assets.ts --ids signpost
```

Para que funcione literalmente `npm run art -- all signpost`, hace falta una
ronda del pipeline que admita generadores Python propios y sus recibos de
construcción. Darlo de alta como si fuera una receta de primitivas no basta.
`src/render3d/world/road.ts` instancia el GLB en las dos entradas del camino.

## Revisión pendiente

Las capturas permiten revisar el candidato aislado y junto a un aldeano.
Vera aceptó el candidato y pidió integrarlo. No se han ejecutado pruebas
automatizadas ni se ha revisado aún una captura dentro del valle.
