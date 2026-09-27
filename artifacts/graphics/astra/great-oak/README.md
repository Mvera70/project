# Gran roble icónico · candidato

Interpretación tridimensional del árbol de `public/ui/art/title-logo-en.png`: tronco grueso, raíces abiertas y brazos extendidos bajo una copa horizontal. Colores naturales de la paleta, caras planas y ninguna textura.

- **2346 triángulos**, siete mallas, cinco materiales, **182112 bytes** de GLB.
- Anchura × altura × fondo: **3.748944 × 3.400000 × 3.506433 celdas**, equivalentes a **11.246832 × 10.200000 × 10.519298 m**.
- Caja Three.js: mínimo `(-1.895501, 0, -1.786677)`, máximo `(1.853443, 3.400000, 1.719755)`.
- Origen en el centro del pie; suelo Y=0, Y arriba. Nodos raíz con transformaciones identidad. El modelo ya tiene la altura final: integrarlo con escala **1**, sin volver a aplicar el `SCALE=1.35` del roble procedural.

## Nombres y estaciones

Madera: `great_oak_trunk`, `great_oak_roots`, `great_oak_branches`, `great_oak_twigs`.

Copas separadas para tintado estacional:

| Malla | Material | Color de paleta |
|---|---|---|
| `great_oak_canopy_shadow` | `great_oak_foliage_shadow` | `forestGreen` #344D35 |
| `great_oak_canopy_mid` | `great_oak_foliage` | `foliage` #62864F |
| `great_oak_canopy_light` | `great_oak_foliage_light` | `foliageLight` #7F9F64 |

La corteza usa `great_oak_bark` (`trunk` #735338) y `great_oak_bark_dark` (`houses.tiled.timberDark` #3F2B22). Todas las superficies tienen rugosidad 1. Las copas tienen un solo material por malla; pueden ocultarse en invierno si la integración lo requiere, dejando ramas completas debajo. El candidato no lleva animaciones ni cambio estacional embebido.

## Reproducción y evidencia

Fuente autónoma: `art/recipes/great-oak-candidate/build.py`. Desde la raíz, PowerShell:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/recipes/great-oak-candidate/build.py
```

Reconstruye GLB, métricas y capturas. Reimporta el GLB antes de renderizar. `sheet.png`: arriba izquierda cámara inclinada de juego, arriba derecha frente, abajo izquierda perfil y abajo derecha escala con casa y aldeano publicados sin modificar su tamaño. También se entregan las cuatro vistas individuales.

Revisados visualmente la hoja de contactos y el frente corregido; comprobados en los bytes del GLB los 2346 triángulos, siete nodos y ausencia de texturas/transformaciones. La captura es de Blender. La integración y la captura dentro del juego están documentadas en `docs/historico/graphics-rounds/G-42.md`. Sin preguntas pendientes.

Revisión acotada de silueta: trece grupos terminales de hojas repartidos en tres pisos, con huecos reales entre la copa baja y las ramas altas. La bifurcación central queda visible desde el frente y desde la cámara inclinada. Se conserva la familia de siete mallas, la paleta y la altura final de 3,4 celdas.
