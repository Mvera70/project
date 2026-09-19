# Prompt de entrega · G-17

Ya están entregados los cuatro aldeanos de Blender según
`docs/historico/graphics-rounds/encargo-blender-aldeanos.md`: `villager`, `villager-smith`,
`villager-priest` y `villager-farmer`. Usad la entrega G-17 de la rama
`rework/parada-a-media`; el informe está en `docs/historico/graphics-rounds/G-17.md`.

Las fuentes son `art/recipes/<id>/<id>.json`; catálogo, GLB publicados y manifiesto
están actualizados. Los directorios aprobados incluyen Blender, renders y huellas.
Los tres primeros sustituyen a los anteriores. `villager-farmer` es independiente
del base y entra por la selección de actividad que el juego ya tiene.

Todos miden 0,65 celdas, tienen cuatro materiales/mallas y mantienen los 16 huesos,
los clips `idle`, `walk`, `work_hoe`, `carry_walk`, y conectores `hand_l`/`hand_r`
libres. El cura lleva sotana negra; el granjero, sombrero de paja; el herrero,
delantal oscuro y herramientas al cinto. No se han modificado `src/` ni los
constructores Python, ni el trabajo de otros agentes.

Validado: typecheck, lint, 16 pruebas del rig, las cuatro construcciones oficiales,
auditorías de animación y reproducción de los clips del base sobre las cuatro
mallas. La revisión y las salidas están en `artifacts/graphics/G-17/delivery/`.
Al empaquetar, conservad los cuatro ids y sus huellas del manifiesto; no hace falta
añadir oficios ni cambiar las reglas de selección para incorporar esta entrega.
