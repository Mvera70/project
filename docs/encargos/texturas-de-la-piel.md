# Texturas de la piel — encargo de imagen (28 sep 2026)

Vera, 28 sep 2026: «las texturas no se hacen con CSS, quedan horribles; la
madera no parece madera». Las tres losetas se generan con Gemini o Higgsfield
(como el mockup de `docs/visual-reference/ui-wood/`) y entran como PNG en
`src/ui/redesign/` sustituyendo a `wood-planks.png` y `parchment.png`;
`cobble.png` y `metal.png` dejan de usarse (sólo madera).

Todas: **512 × 512, sin costuras al repetirse**, luz plana, sin texto ni
objetos, sin viñeta. Una versión a 1024 si el generador la da.

| Fichero | Prompt |
|---|---|
| `wood-planks.png` | Seamless tileable texture, dark walnut wooden planks, painted game-UI style, warm brown, soft grain, subtle plank seams, no text, no objects, flat even lighting, 512x512 |
| `parchment.png` | Seamless tileable texture, aged cream parchment paper, faint fibres and mottling, very low contrast, no text, no burns, flat lighting, 512x512 |
| `oak-light.png` (nuevo: la placa de la fecha y los papeles clavados) | Seamless tileable texture, pale sanded oak wood, light cream-brown, fine grain, no seams, no text, flat lighting, 512x512 |

Referencia de tono: la banda inferior del mockup de Gemini
(`docs/ui-redesign/laminas-v3-2026-09-28/muestra-madera.png`), que es la
madera de las láminas de la v3.
