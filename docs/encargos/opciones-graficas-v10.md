# Encargo a Codex · la pantalla «Graphics» de la portada (29 sep 2026)

**Qué hay.** Desde `main` la portada tiene un rótulo «Graphics» junto a «The
annals» que abre un documento de papel (`paper-document`) con dos preguntas
—calidad (Auto, High, Medium, Low) y fotogramas por segundo (30, 60)— y un
«Done». La opción elegida va en la placa de madera (`plaque-wood`, madera =
decidir) y las demás en el botón de pergamino (`button-parchment`). Está en
`src/ui/screens/graphics.ts`; captura en el mensaje que acompaña a este
encargo. Lo pidió Vera: «en el menú principal añadir un botón para abrir un
menú de opciones gráficas».

**Qué se pide.** Está montada sólo con piezas que ya existen. Lo que falta
es mirarla con el ojo de la piel y decidir si le hace falta algo propio:

1. **Una lámina de revisión** a 390×844 y 320×568, con la captura del juego
   al lado y lo que cambiarías: jerarquía, aire, si la placa de madera como
   «elegido» se lee o si hace falta un estado propio del botón de pergamino
   (un `button-parchment-on.png`, 400×80 a 2×, la misma placa con la tinta
   más oscura y el canto encendido).
2. **Si hace falta un adorno de cabecera** para que el documento no sea sólo
   texto: un pequeño grabado en sepia de 120×48 (a 2×) para encabezar
   «Graphics» —una lente, un compás de dibujo, algo del taller de un
   miniaturista—, en la línea de las viñetas de la crónica.
3. **Nada de dibujar con CSS**, y las piezas por `art/astra-modelos` con
   maestros, prompts y `verification.json`, como la v9.

**Qué no se pide.** Ni más opciones ni cambiar dónde está el botón: la
portada 04 se queda como está.
