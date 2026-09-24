# E3b.0 · Candidato de pasarela interior — encargo sólo de modelo

**Despachado con autorización de Vera el 22 sep 2026; entregado como candidato
aislado.** Astra preparó la receta y vistas técnicas por CPU. La junta lateral
con G-27 se rechazó al medir los pretiles y el ancho de paso; véase el
[resultado y sus cotas](../../art/recipes/e3b-walkway-candidate/README.md).
Vera aclaró después que esa salida debía abrirse. Una
[variante candidata](../../art/recipes/e3b-bastion-joint-candidate/README.md)
con abertura y descansillo pasa la comprobación geométrica por CPU, sin
modificar el bastión publicado. No se abrió Blender ni el juego, y no se
publicó un recurso.

## Objetivo

Proponer **un módulo recto de una celda y su junta con el bastión G-27** para
un adarve interior bajo en polígonos. Esta es la primera costura que se
revisará; después vendrán giro, diagonal y paso sobre portón. El entregable
es exclusivamente geometría candidata y sus cotas, sin navegación ni código
de juego.

## Depende de

- [Brief E3b](encargo-e3b-adarve-continuo.md) y
  [auditoría E3b.0](../historico/graphics-rounds/E3b0-viabilidad-adarve.md).
- `art/recipes/{wall,gate,bastion-access-candidate}/` y `docs/design.md`
  D.3–D.4. La malla aprobada de muro se conserva.

## Ficheros y salida propuesta

Una carpeta candidata nueva `art/recipes/e3b-walkway-candidate/` para la
fuente reproducible y su README de cotas. Las vistas y el GLB de revisión,
cuando su ejecución se autorice por separado, irán bajo
`artifacts/graphics/E3b-walkway-candidate/`. No tocar `public/assets/`,
`art/catalog.json`, `src/`, el `.blend` abierto ni las recetas G-26/G-27.

## Contrato geométrico

- Suelo de pies a **Y=1,02**, enlazado sin escalón con la plataforma G-27.
- Ancho **libre neto ≥0,70** después de pretiles, soportes y juntas; disco de
  radio 0,32 centrado sobre el recorrido. El muro actual tiene 0,34 de
  grosor: la pieza añade superficie hacia el interior, sin engordar su cara
  exterior ni confiar en escalar `wall.glb`.
- Cubrir visualmente los **0,26** entre corona del muro a 0,76 y suelo nuevo
  a 1,02 con apoyos propios. Los apoyos no pueden invadir el paso libre.
- Caja, origen, eje de interior, encaje con cada lado de la plataforma y
  coordenadas de colisión propuestos por escrito. La pieza debe girar a las
  cuatro orientaciones cardinales sin otra malla.
- Silueta y materiales coherentes con la piedra del muro aprobado. **Propuesta
  estética:** ménsulas de piedra del lado interior; Vera revisará esta elección
  antes de integrarla. Se permite una variante de soporte de madera sólo como
  alternativa visual explícita, no como segundo entregable obligatorio.

## Evidencia y falsación

Entregar planta, sección y una vista oblicua junto al bastión y dos tramos
existentes, con cotas legibles. Un corte lateral debe mostrar apoyo real y
paso libre. Si el ancho neto baja de 0,70, el suelo no empalma a 1,02, se
ve un hueco exterior o la junta exige alterar G-27, el candidato se rechaza
antes de producción. El modelo aislado no certifica tránsito, flechas ni
sombras del juego.

**Resultado:** el módulo recto aislado no conecta con G-27 intacto. La variante
de junta abre la salida y cabe geométricamente, pero E3b.1 espera revisión
visual y validación de la malla real. La ejecución de Blender, juego o GPU
requiere autorización independiente.
