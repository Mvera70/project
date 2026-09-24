# E3b.0 · Viabilidad del adarve continuo

**22 sep 2026.** Auditoría estática de especificación, recetas y código. No se
abrió la app, no se usó GPU ni se cambió Blender o las mallas publicadas.
El candidato geométrico aislado se entregó después de esta auditoría. Su
[revisión dimensional](../../../art/recipes/e3b-walkway-candidate/README.md)
rechazó la junta lateral con G-27 intacto; en ese momento faltaba decidir
una variante de acceso antes de integrar.

**Adenda del mismo día:** Vera señaló que esa salida debía abrirse. La
[variante de junta](../../../art/recipes/e3b-bastion-joint-candidate/README.md)
alcanza 0,70 de corredor en la comprobación geométrica CPU y conserva los
14 peldaños. No sustituye G-27 ni valida todavía la malla en Blender, la
colisión o la navegación en partida. La decisión pendiente es la aceptación
visual del primer borde sin pretil alto durante 0,25 celdas.

## Costura medida en las fuentes

| Pieza | Cota o regla | Fuente |
|---|---:|---|
| Muralla compuesta | grosor 0,34; corona a 0,76; almenas a 0,88 | `src/render3d/world/defences.ts`, `art/recipes/wall/wall.json` |
| Bastión accesible | plataforma a 1,02; paso libre mínimo 0,70; cuerpo de diámetro 0,64 | `art/recipes/bastion-access-candidate/README.md`, `src/render3d/life/elevated-post.ts` |
| Portón | dintel hasta 0,93; hojas hasta 0,78 | `art/recipes/gate/gate.json` |
| Terreno público | muralla, bastión y huella de escalera cerrados | `src/render3d/life/terrain.ts` |
| Física | obstáculo genérico hasta 2; bastión accesible rebajado a plataforma 1,02 | `src/render3d/life/physics.ts` |

La diferencia entre corona y plataforma es **0,26**. Un guardia de diámetro
0,64 no cabe sobre un muro de 0,34. Además, `buildDefence` fuerza el espesor
de cualquier malla de muro a 0,34 y recorta los brazos de giros y diagonales.
Por eso un GLB de muro ensanchado no arreglaría el paso por sí mismo.

## Propuesta para la primera unión

**Pasarela interior modular, independiente de la malla de muralla.** Su suelo
empalma a cota 1,02 con el bastión y deja al menos 0,70 de ancho libre, medido
después de cualquier pretil. La extensión se apoya visualmente en el muro y
en soportes del lado interior; el hueco de 0,26 no se cubre con un collider
invisible. El paramento exterior y el grosor del muro aprobado permanecen.
La ruta de E3a se prolonga sólo para el guardia asignado.

La [sección esquemática](E3b0-seccion.svg) ilustra la diferencia de altura y
anchura. No fija material, espesor del tablero ni forma final de los soportes.

La alternativa de ensanchar el muro completo exige cambiar tanto el GLB como
`buildDefence`, el recorte diagonal, la huella y los obstáculos. Tiene más
superficie de regresión que una pieza de pasarela separada. Esta preferencia es
una **inferencia técnica**, aún sin aprobación visual.

Para llegar a un adarve continuo, la propuesta debe resolver cuatro uniones:
recta, giro cardinal, diagonal sin codo y puente sobre el portón. El puente
debe dejar funcionales las hojas y el paso libre. Si un tramo está perdido,
en obra o todavía es empalizada, el grafo elevado se corta; no aparece un
suelo invisible. El criterio para cubrir tramos de madera queda abierto para
la decisión de alcance, porque E3 habla de muralla de piedra.

## Lo que falta para despachar implementación

1. El módulo recto y dos tramos ya tienen planta, sección y cotas. La conexión
   con G-27 se falsó: pretil lateral a Y=1,02…1,16, almenas hasta 1,36,
   hueco X=0,99…1,00 y solape lateral de sólo 0,57 frente al mínimo 0,70.
   Falta decidir una variante de acceso, modelarla y verificar su giro.
2. Después, resolver esquina, diagonal y portón y revisar la geometría antes
   de publicarla o conectarla a la partida. Una
   vista aislada sólo valida encaje geométrico, no navegación ni combate.
3. Con esa geometría fijada, contrato literal del grafo elevado y sus ficheros
   de producción. Pruebas puras de continuidad/denegación antes de abrir la app.
4. Captura y traza del juego real con autorización independiente para app/GPU.

`game-dev` CLI **1.0.2** respondió a `--version` y `capabilities --json`; esto
confirma disponibilidad del CLI, no conexión con Blender ni validación de una
malla. Un futuro trabajo de asset seguirá el catálogo nativo del proyecto y
comprobará el candidato antes de cualquier publicación. No se ejecutó
`doctor` ni una operación de producción.

[Brief E3b](../../encargos/encargo-e3b-adarve-continuo.md). Sin commit ni push.
