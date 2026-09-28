# The Valley — piel v5: el toque de calidad (28 sep 2026)

**Sobre la v4 de Codex** (su rama, `docs/ui-redesign/propuesta-piel-v4-2026-09-28.md`),
que Vera dio por buena: «ha mejorado mucho». Lo que pide para la v5, con el
mockup de Gemini del 24 sep delante: el pergamino con los bordes más reales,
los clavos del tablón más reales, ilustraciones a color como las del
prototipo (arado, cerdos, jarra, hacha), la ficha de coste con iconos a color
y el aro de cerrar de ese prototipo. «Los nuestros parecen pintados.»

## Lo que se decidió: pedir, no imitar

Vera, el mismo día: «los diseños complicados, pídelos o pregunta si no puedes
con esa calidad; muchas veces crees que sí pero no». Se probó a sacar el
marco rasgado y la placa verde recortando el mockup en nueve partes, y no
sirve: los bordes de esas tarjetas llevan la cinta y el texto dentro, y la
placa no encaja. Así que **todo lo que necesita dibujo nuevo va al encargo
para el generador de imágenes de Codex**: `docs/encargos/piezas-de-la-piel-v5.md`
(marcos en nueve partes, clavo, placa, aro, iconos de recurso a color, una
ilustración por cosa del carro y por misión, y la crónica a color).

## La lámina

`laminas-v5-2026-09-28/01-carro.png`: el carro de la v4 con las **piezas
reales** del mockup, recortadas tal cual: la ilustración a color de cada cosa,
la ficha de coste con sus iconos a color (las de arado, cerdos y cerveza
tienen justo los precios del juego) y el aro de cerrar. Es una referencia de
intención: los recortes llevan su fondo de pergamino, no son transparentes; el
encargo los produce limpios y a 2×. `referencia-piezas-mockup.png` es la hoja
de recortes.

El tablón no tiene lámina v5: lo que le falta (marco rasgado, clavos) es
justo lo que se encarga; se monta cuando lleguen las piezas.

## Orden, cuando lleguen las piezas

1. Marcos y controles en `src/ui/redesign/` como imágenes de nueve partes;
   `board.ts`, el carro y la etiqueta A1 los usan por `tokens.css`.
2. Los iconos de recurso a color en las fichas y en la cabecera.
3. Las ilustraciones del carro y del tablón; después la crónica a color, por
   tandas, empezando por las que más salen.
