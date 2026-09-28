# The Valley — piel v3: sólo madera, y las piezas del juego (28 sep 2026)

**Propuesta para revisión de Vera. Sustituye a la v2 de Codex** (en su rama
`art/astra-modelos`, `docs/ui-redesign/propuesta-piel-v2-2026-09-28.md`), que
Vera rechazó con estas palabras: «no cumple para nada con lo que habíamos
dicho, parece totalmente lo contrario. Necesita darle más estilo videojuego…
parece de móvil, hemos perdido el sol, hemos perdido un montón de cosas
importantes que teníamos ya que son muy buenas. La brújula 3D tampoco se
quita. El contador de recursos con cada icono. Los iconos de las pestañas de
abajo, aunque cambie el fondo».

Y tres decisiones más, del mismo día: **las texturas no se hacen con CSS**
(«quedan horribles»), **la madera tiene que parecer madera**, y la carcasa es
**sólo madera** —la barra de piedra agrietada del mockup del 24 sep «dije que
no me gustaba»—.

## Las láminas

Montadas con Playwright a 390 × 844 sobre la captura despejada del 27 sep,
con la tipografía, el sprite de iconos y el arco del sol **del propio juego**
(`laminas-v3-2026-09-28/lamina.src.html` es la fuente; se regenera con las
mismas piezas).

| | Qué enseña |
|---|---|
| `01-valle.png` | Una sola tabla de madera arriba: la placa de la fecha con el arco del sol, y los cinco contadores hundidos con su icono. La misma tabla abajo con las tres pestañas y su icono; la activa en placa iluminada con canto de latón. Brújula abajo a la izquierda; vista, pausa y velocidad en botones redondos de madera. Cabecera de 96 px (hoy 125). |
| `02-etiqueta-a1.png` | Papel = leer: pergamino junto a la cosa tocada, con punta; nombre, una frase, dos datos; se cierra tocando fuera. Sustituye a la hoja de inspección que tapa medio valle. |
| `03-tablon-b1.png` | Madera = decidir: el tablón con un aviso clavado por misión (cuántos con − y +, coste, semanas, riesgo con palabras, Send en el verde de actuar); un aviso que no se puede mandar dice por qué; abajo, quién está fuera. Es la ventana que ya existe en `ui/redesign/board.ts`, con esta piel. |

## Las texturas: imagen, no CSS

La madera de las láminas está **recortada del mockup de Gemini del 24 sep**
(`docs/visual-reference/ui-wood/`, la banda inferior sin texto, 590 × 90:
`laminas-v3-2026-09-28/muestra-madera.png`), repetida por tablas. Para el
juego hacen falta losetas sin costuras de 512 × 512, que se piden a Gemini o
Higgsfield con estos prompts (van en `docs/encargos/texturas-de-la-piel.md`):

- **Madera**: seamless tileable texture, dark walnut wooden planks, painted
  game-UI style, warm brown, soft grain, subtle plank seams, no text, no
  objects, flat even lighting, 512×512.
- **Pergamino**: seamless tileable texture, aged cream parchment paper, faint
  fibres and mottling, very low contrast, no text, no burns, flat lighting.
- **Placa clara** (la fecha y los papeles clavados): seamless tileable
  texture, pale sanded oak wood, light cream-brown, fine grain, no text.

Entran como `src/ui/redesign/*.png` (donde hoy están `wood-planks.png`,
`parchment.png`) por `--plank-texture` y `--skin-story-texture` en
`tokens.css`; `cobble.png` y `metal.png` dejan de usarse.

## Reglas que quedan fijas

- **No se quita**: el arco del sol, la brújula 3D, los cinco contadores con
  icono, los iconos de las pestañas, el verde de actuar (`--give`), el sello
  de lacre.
- **Sólo madera**: cabecera, barra, botones redondos y ventanas de decidir.
  Nada de piedra, tampoco al llegar la edad de piedra (`uiMaterialOf` deja de
  cambiar la carcasa).
- **Pergamino para leer**: etiquetas, avisos clavados, crónica; con textura de
  imagen.
- **Tipografía**: Cinzel para fechas, cifras, títulos y pestañas; EB Garamond
  para lo que se lee. Ninguna sans de app.
- **Móvil primero**: 390 × 844 con áreas seguras, blancos de 44 px, la ventana
  del tablón nunca tapa la barra.

## Lo que sigue, si Vera acepta

1. Las tres losetas de textura (Vera, con los prompts de arriba).
2. `wood.css`: la cabecera a una tabla de 96 px y la barra sobre la misma
   madera, sin piedra; `board.ts` y una etiqueta A1 genérica para edificio y
   persona (`inspect-panel.ts` deja de ser hoja).
3. Capturas reales con `npm run shot` y `press-kit.mjs --only valle,tocar`, de
   día y de noche, y la skill `piel-del-valle` §0 reescrita con esta piel.

Página con las láminas y la comparación con la v2:
https://claude.ai/artifact/79XswA98E9TQsbDeqrm16t
