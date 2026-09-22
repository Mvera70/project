# Bastión E3 · fuente canónica

Fuente canónica: `bastion.json`. El `.blend` es un producto generado, no una
segunda fuente editable. `review.py` sólo importa el GLB candidato y los GLB
aprobados de referencia para medir y fotografiar; no exporta otros modelos.

El CLI genérico `game-dev` no estaba disponible. Se utilizó el pipeline nativo
del repositorio con Blender 5.2.1 LTS, sin proveedor ni generación de pago.
`G-26` estaba libre y es el identificador técnico de corrida porque el esquema
del runner sólo admite `G-XX`. Vera aprobó la apariencia el 22 sep 2026; la
entrada de catálogo conserva `status: study` como los demás activos publicados,
pero ya tiene recibo `approved` y hash. La integración en escena se contrasta
por separado en `docs/encargos/encargo-e3-integracion-bastion.md`.

## Forma y coordenadas

- Bastión de cuatro caras simétricas: piedra maciza, ocho almenas y plataforma
  abierta. No tiene cubierta, galería de madera ni puerta de la atalaya.
- Caja local del GLB: mínimo `(0,0,0)`, máximo `(1,1.36,1)`, vertical `+Y`.
  Blender usa X positivo, Y negativo y Z vertical; el exportador convierte una
  sola vez. Frente nominal `+Z`; las cuatro fachadas son equivalentes.
- Base 1×1, frente a 0,767×0,767 del pie de la atalaya de referencia.
  Plataforma a 1,02 y almenas a 1,36; la atalaya alcanza 2,75033.
- Cuatro recibidores centrales de ancho 0,36 llegan al borde de la huella.
  Su altura 0,13–0,79 solapa el cuerpo del muro. El resto de la fachada también
  llega al borde; las almenas del muro a 0,885 encuentran piedra sin hueco.
- Plataforma exclusivamente visual. No define puestos, rutas, colisión,
  escalera, conectores de juego, animación ni comportamiento.

## Reproducción

Desde la raíz del proyecto, secuencialmente:

```powershell
node node_modules/tsx/dist/cli.mjs tools/art/index.ts build bastion
node node_modules/tsx/dist/cli.mjs tools/art/index.ts validate bastion
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python art/recipes/bastion/review.py
```

Build crea otra corrida sin sustituir productos aprobados. Review escribe sus
vistas en `review/` de la corrida indicada por `latest-bastion.json`; repetirlo
reemplaza únicamente esas vistas de revisión. Paleta y exportador proceden del
repositorio. No se ha modificado ninguna herramienta compartida.

## Evidencia entregada

Corrida final: `artifacts/graphics/G-26/runs/2026-09-21T23-56-06-389Z-6004/`.
La corrida anterior conserva la primera iteración, descartada por cuatro
entrantes pequeños en las esquinas que se cerraron con piedra.

| Medida | Resultado |
|---|---:|
| Objetos GLB, incluido Root | 3 |
| Mallas / materiales | 2 / 2 |
| Triángulos | 1.092 |
| GLB | 78.812 bytes |
| Blend generado | 104.636 bytes |
| Rugosidad stone / mortar | 0,95 / 1 |
| Metalicidad / texturas externas / clips | 0 / 0 / 0 |
| Caras degeneradas / normales inválidas / vértices no finitos | 0 / 0 / 0 |

El GLB tiene SHA-256
`F3596D92F98E34A6CF90E1C7CF6BDA9490FFCB853CA301F3AC6C4F9F9AE8663F`.
`build.json` guarda los hashes de GLB, blend, receta resuelta y render.
`validation.json` recoge importación real Three.js, caja, materiales, dos
capturas repetibles y cero errores del navegador. `review/review.json` recoge
reimportación Blender del GLB, normales, materiales, caja y hashes de las
referencias y vistas. La geometría se compone de sólidos superpuestos unidos
por material, como el muro existente; no es una malla booleana para físicas.

Vistas revisadas visualmente: `three/capture-1.png`, su versión en grises,
`review/bastion-side.png`, `review/bastion-top.png`,
`review/comparison-iso.png`, `review/comparison-side.png` y
`review/comparison-gray.png`. El banco comparativo coloca dos tramos aprobados
a ambos lados del bastión y una atalaya aparte, todos a escala real. La
silueta del bastión queda separada de la atalaya también en grises.

## Límites

La comparación aislada muestra contacto cardinal ideal; **no prueba el
ensamblador del juego**. La aprobación visual y la publicación del GLB no
demuestran todavía la lectura dentro del valle a tamaño móvil ni en sus
estaciones. El apoyo elevado real de la guardia permanece fuera de esta ronda.
La producción del modelo no cambió física, navegación ni balance.
