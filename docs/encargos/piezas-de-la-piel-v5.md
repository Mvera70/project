# Las piezas de la piel v5 — encargo de imagen para el generador de Codex (28 sep 2026)

Vera, 28 sep 2026, con el mockup de Gemini del 24 sep delante: «nos falta darle
un toque de calidad: el pergamino con los bordes más reales, los clavos del
tablón más reales… ilustraciones como tenía la crónica pero a color, como en el
prototipo… los nuestros parecen pintados». Y la regla que lo acompaña: «los
diseños complicados, pedirlos; muchas veces crees que sí pero no». Así que
**nada de esto se dibuja con CSS ni a mano**: se genera con la referencia del
mockup (`docs/visual-reference/ui-wood/mockup-cart-2026-09-24.jpg`) y entra
como PNG.

Estilo de todo: el del mockup —dibujo a color, contornos suaves, luz de arriba
a la izquierda, sin texto—. PNG con transparencia, a 2× (la medida es en
píxeles CSS; el fichero, el doble).

## 1 · Los marcos y controles (nueve partes)

Cada uno se recorta en nueve partes (`border-image`): las esquinas no se
estiran, los lados sí. Por eso el centro tiene que ser liso y los bordes no
pueden llevar nada que se note al repetirse.

| Fichero | Qué es | Medida CSS | Prompt |
|---|---|---|---|
| `frame-parchment.png` | La tarjeta de pergamino con bordes rasgados y la filigrana en las cuatro esquinas, como las tarjetas del carro del mockup. **Sin cinta ni texto**: centro liso | 320 × 200, bordes de 28 | Aged parchment card with torn, slightly uneven edges and small ink flourishes in the four corners, plain empty centre, painted game-UI style, top-left light, transparent background, no text |
| `frame-ribbon.png` | La cinta de pizarra del título, con su doblez a la derecha | 300 × 40, bordes de 14 | Dark slate-blue title ribbon for a game card, slightly worn edges, small fold at the right end, flat centre, no text, transparent background |
| `chip-cost.png` | La pastilla hundida de la ficha de coste | 180 × 44, bordes de 14 | Sunken beige parchment pill with a soft inner shadow, rounded corners, empty centre, no text, transparent background |
| `plaque-green.png` | La placa verde lacada de actuar (ENTREGAR / GIVE / SEND) con canto de latón y escalón | 200 × 46, bordes de 18 | Lacquered green wooden plaque with a brass bevelled edge and a short drop step, clipped corners, flat centre, no text, transparent background |
| `plaque-green-off.png` | La misma placa apagada, para «no se puede» | 200 × 46, bordes de 18 | Same plaque, desaturated and dimmed, dusty green-grey |
| `btn-close.png` | El aro «cerrar»: disco de madera con aspa crema y canto de latón | 44 × 44 | Round wooden button with a brass rim and a cream X, painted game-UI style, transparent background |
| `nail.png` | El clavo del tablón: cabeza de hierro forjado con brillo y sombra corta | 16 × 16 (y 24 × 24) | Small forged iron nail head seen from the front, slightly domed, one highlight top-left, short soft shadow, transparent background |
| `nail-bent.png` | Un segundo clavo, un poco torcido, para que no sean todos iguales | 16 × 16 | Same, slightly tilted and worn |

## 2 · Los iconos a color de los recursos

Los cinco iconos del sprite (`public/ui/icons.svg`: `face`, `wheat`, `logs`,
`stone`, `silver`) son de trazo. En las fichas de coste y en los contadores
de la cabecera van **a color**, como los troncos y la moneda del mockup.

| Fichero | Medida CSS | Prompt |
|---|---|---|
| `res-people.png` | 20 × 20 | Small painted icon of a round smiling face, warm ochre, game-UI style, transparent |
| `res-grain.png` | 20 × 20 | Small painted icon of a wheat ear, golden, game-UI style, transparent |
| `res-wood.png` | 20 × 20 | Small painted icon of three stacked logs, brown, game-UI style, transparent |
| `res-stone.png` | 20 × 20 | Small painted icon of a grey stone block, game-UI style, transparent |
| `res-silver.png` | 20 × 20 | Small painted icon of a silver coin with a rim, game-UI style, transparent |

## 3 · Las ilustraciones a color

Una por cosa del carro (las cuatro del mockup ya existen a tamaño de captura;
se regeneran limpias) y una por misión del tablón. Cabecera de tarjeta,
arriba a la derecha, asomando sobre la cinta.

| Fichero | Qué | Medida CSS |
|---|---|---|
| `means-plough.png` `means-pigs.png` `means-ale.png` `means-axe.png` | El arado, el cerdo con su comedero, la jarra de cerveza, el hacha (como el mockup) | 96 × 80 |
| `means-relic.png` `means-hand.png` `means-arms.png` `means-bows.png` `means-tower.png` `means-gate.png` | Un relicario, un hatillo de forastero, un haz de lanzas, un arco con carcaj, una atalaya de madera, un portón con herrajes | 96 × 80 |
| `mission-mushrooms.png` `mission-herbs.png` `mission-wolf-den.png` `mission-high-seam.png` `mission-market.png` | Cesta de setas, manojo de hierbas, cráneo de lobo sobre una roca, pico y cuerda, fardo de mercado atado | 96 × 80 |

Prompt base: `Small painted illustration of {cosa}, medieval, warm colours,
soft outline, no background, no text, game card art, 3/4 view`.

## 4 · La crónica, a color

Los 51 grabados de `public/ui/art/*.png` (640 × 512, sepia) se regeneran **a
color**, con la misma composición y el mismo estilo que las ilustraciones de
arriba: es lo que Vera dijo del prototipo, «es algo que no se incorpora y me
gusta mucho». Se empieza por las que más salen (`harvest`, `birth`, `death`,
`built`, `pedlar`, `wedding`, `fire`) y se comprueba en la crónica antes de
seguir. Prompt base: `Painted colour illustration, medieval village, {escena
del grabado}, warm palette, soft outlines, storybook style, no text, 640×512`.

## Cómo entra

`public/ui/art/` para las ilustraciones (mismo nombre, se sustituye);
`src/ui/redesign/` para marcos, controles e iconos, referenciados desde
`tokens.css` como imágenes (`--frame-parchment`, etc.). Ninguna de estas
piezas se dibuja con CSS: CSS sólo coloca y estira las nueve partes.
