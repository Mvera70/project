# E2 · Modelo del valle vecino

Fuente canónica: `villager-neighbor.json`; paleta semántica compartida con dos
roles nuevos, `neighborLinen` y `neighborOchre`. Modelado original del proyecto,
sin proveedor, armas incorporadas ni cambios de rig/animación.

Gorro de lana bajo y ancho, esclavina corta triangular visible por delante y
espalda, túnica de lino crudo y piernas oscuras. El borde del gorro ensancha el
contorno de la cabeza; la esclavina termina en el torso y deja brazos/manos
libres. Se corrigió el primer candidato porque dependía demasiado del color.

## Candidato entregado

- GLB: `artifacts/graphics/G-28/approved/28b40fdbc007f27a/villager-neighbor.glb`.
- SHA-256: `28B40FDBC007F27A8635C5B03CF724527C588D997A761064E03AA92F0D39987C`.
- Render y validación: en ese mismo directorio, `villager-neighbor-blender.png`,
  `capture-1.png`, `capture-1-gray.png`, `validation.json`, `build.json`.
- Comparativa: `artifacts/graphics/G-28/comparison.png` y `comparison.html`;
  incluye adulto base, forastero, vecino, grises, miniaturas y espalda.
- Evidencia estructural: `artifacts/graphics/G-28/model-comparison.json`,
  reproducible con `node artifacts/graphics/G-28/verify-model.mjs`.
- Recibo de construcción final:
  `artifacts/graphics/G-28/runs/2026-09-22T07-03-21-410Z-11944/report.json`.

`npm run art -- all villager-neighbor` pasó construcción Blender, GLB y carga
real Three.js con dos capturas idénticas y cero errores de navegador. El
directorio se llama `approved` por el pipeline; el catálogo conserva `study`
y esta entrega no sustituye la aceptación visual de Vera ni publica nada.

Dimensiones XYZ: **0,35 × 0,65 × 0,183333** celdas, mínimo Y=0. Cuatro mallas y
cuatro materiales. **1.060 triángulos**, frente a 1.044 del adulto base y 936
del forastero: +16 y +124 respectivamente. La diferencia con el forastero
proviene sobre todo del pelo biselado de la base; el gorro y la esclavina
añaden sólo 16 triángulos netos al adulto. No hay texturas adicionales.

Se compararon recetas y bytes del GLB: 16 huesos con nombre, orden y geometría
idénticos; matrices inversas de enlace idénticas; todos los canales y datos
binarios de `idle`, `walk`, `work_hoe`, `carry_walk` idénticos. `hand_l` y
`hand_r` conservan sus nodos y transformaciones exactas.

## Revisión y límites

La comparación frontal/trasera y en grises muestra cabeza más ancha con
borde horizontal y espalda con punta corta, frente a capucha envolvente y
capa rectangular del forastero. A miniatura de 32 px de lienzo se conserva
la diferencia de gorro; a 12 px queda poco detalle y manda la masa tonal.
Esto no certifica aún distancia de partida ni identificación sin rótulos.

La cámara es `iso-ne`/`iso-se` del visor nativo; la pose es la exportada,
no una escena de combate. Integración debe revisar aproximación, puerta,
armas/escudo, carga y caída en la cámara real. Los conectores son idénticos,
pero esa igualdad no demuestra por sí sola ausencia de contactos durante
cualquier gesto procedural. No se cambió software, public/, historia,
física ni animación. El primer candidato `f1793f7ed5ec2a2c` y `G-28/back/`
quedan como evidencia de iteración y **no deben publicarse**.
