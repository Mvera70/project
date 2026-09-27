> **Recuperado el 27 sep 2026** de la rama `codex/3d-tree-variant`, donde se
> quedó sin subir. Comparte número con el G-26 del bastión (`G-26.md`), que se
> escribió después sin saber de éste. Estado hoy: el arado **sí** tiene GLB en
> `main` (M-3); el barril sigue en respaldo procedural. La receta de este estudio no se
> sube a `art/recipes/barrel/` para no pisar la que haga Astra; está en el
> commit `68416af` (`git show 68416af:art/recipes/barrel/barrel.json`).

# G-26 · objetos del juego de los medios

17 septiembre 2026. Tanda de objetos 3D para hacer visibles los medios que el
jugador entrega al valle. La construcción usa el pipeline reproducible de
`tools/art`; la selección runtime queda separada en `life/props.ts`.

## Arado `plough` · pendiente

Los dos estudios realizados se descartan por indicación del dueño: el primero
no se reconocía como arado y el segundo, aunque seguía la referencia de mangos
altos y larguero curvo, tampoco alcanzó el resultado visual buscado. Se retiran
la receta y la entrada del catálogo para impedir su publicación accidental.

El encargo continúa pendiente de un enfoque visual distinto. La integración
prevista sigue siendo junto al campo más antiguo cuando el valle posea el rasgo
`plough`, pero no debe implementarse hasta tener una malla aprobada.

## Barril `barrel`

Estudio visual construido y validado, todavía sin promoción ni selección
runtime. El encargo posterior fija madera `timber`, aros `timberDark`, altura
0,9 m y un máximo de 250 triángulos; debe ajustarse a esas condiciones antes de
publicarlo.
