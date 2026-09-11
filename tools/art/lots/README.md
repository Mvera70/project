# Los lotes de G-10 — de dónde salen las recetas

Cada fichero de aquí **escribe** las recetas de un lote en `art/recipes/<id>/` y
da de alta lo que falte en `art/catalog.json`. No construyen nada: de eso se
encarga `tools/art/index.ts`.

```bash
python tools/art/lots/lot_village.py        # casa, granero, molino, herrería…
python tools/art/lots/lot_field_defence.py  # campo, empalizada, muralla, cementerio
python tools/art/lots/lot_ruin.py           # ruina de madera y de piedra
python tools/art/lots/lot_reed.py           # juncos de la orilla
python tools/art/lots/lot_fauna.py          # vaca, cerdo, gallina, lobo, cuervo, pez

npx tsx tools/art/index.ts all <id>         # construir, validar y promover
npx tsx tools/graphics/publish-assets.ts    # copiar lo aprobado a public/
```

`lot_village.py` tiene además los ayudantes —`cube`, `gable`, `cyl`, `cone`,
`sphere`, `recipe`, `mat`— y los demás lotes los importan de ahí. Importar ese
fichero **vuelve a escribir su propio lote**, que es inofensivo porque el
resultado es el mismo, pero explica por qué al ejecutar un lote se listan
también los ids del otro.

**Por qué están aquí.** Vivieron tres rondas en el scratchpad de la sesión.
Retocar la chimenea de la casa obligaba a editarlos allí, y una receta cuyo
autor se pierde es una receta que sólo se puede tocar a mano en su JSON. Lo
mismo que pasó con la plantilla de la demo, que ya está en
`tools/graphics/pilot-page.html`.

**Todo va en metros** y `scale` lo lleva a celdas (design.md D.6.2): una celda
son tres metros, así que una huella de 2×2 celdas es una casa de seis por seis.
Los colores no se escriben aquí: se piden por papel a `art/recipes/palette.json`,
que es lo que decidió P1.
