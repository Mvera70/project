# La piel v8, al juego — plan de integración (29 sep 2026)

**Quién:** Claude Code integra; Codex genera las imágenes que falten, por
encargo. **Qué se integra:** la piel aprobada en las láminas v6–v8 de Codex
(`art/astra-modelos`, `6e4aea4`): `propuesta-piel-v6…v7` y
`propuesta-barra-v8-2026-09-28.md`. Las dos decisiones que quedaban, con la
recomendación de Codex y el visto de Vera: **placas de actuar de madera con
brasa ámbar** y **«Open the cart» en la bandeja, junto a la frase de estado**.

**Cómo:** por tandas, cada una con typecheck, lint, las pruebas de los
ficheros tocados y captura de cada pantalla (`npm run shot`, `press-kit.mjs
--only …`) antes de la siguiente. Las capturas y la suite entera hacen ruido:
se hacen cuando Vera lo diga. Sin ellas una tanda se deja **en local, sin
subir**.

## Las piezas

Todas de Codex (ImageGen), a 2×, en `src/ui/redesign/` y
`public/ui/art/cards/`; los tokens de imagen en `tokens.css` (`--frame-*`,
`--chip-cost`, `--plaque-wood*`, `--btn-close`, `--nail*`, `--res-*`,
`--nav-*`). **CSS coloca y estira; no dibuja.** `cobble.png` y `metal.png`
quedan sólo para el pie de la portada hasta que se rehaga.

## Las tandas

| Tanda | Qué | Ficheros | Estado |
|---|---|---|---|
| **1 · La base** | Tokens de imagen; correa de cuero con medallones (la activa elevada y encendida); iconos a color en grano, leña, piedra y plata (la cara del ánimo sigue siendo del sprite: es información); placas de madera para GIVE, SEND, Open the cart, seguir, coronar; aro de cerrar de imagen (toque 44, dibujo 32); fuera la edad de piedra de la carcasa | `tokens.css`, `wood.css`, `shell.ts` (medallón), `hud.ts` (`data-res`), `cart.ts` (`data-res`) | **Hecha en local** (29 sep): typecheck, lint y 45 pruebas de piel en verde. Sin captura |
| **2 · Tablón y carro** | Tarjetas de pergamino rasgado en nueve partes, cinta de imagen, ficha de coste, clavos, ilustraciones a color (64×54 carro, 56×48 tablón), −/+ de 40 | `wood.css` (carro), `board.ts` (CSS propio), `cart.ts` (`cards/means-*.png`) | **Hecha en local** con la 1. Y el fallo abierto: tocar el tablón no abre su ventana |
| **3 · Lo que se lee** | La etiqueta A1 de pergamino para casa y persona (sustituye a la hoja de `inspect-panel.ts`, que se queda para la lista de gente); la crónica con viñeta apaisada de 130 px y fecha por entrada, **con las 7 a color cuando estén las 51** (hasta entonces, sepia) | `label.ts` (nuevo), `app.ts` (ruta `inspect` desde el valle), `shell.ts` (`contentRouteFor`), `backend.ts` y `renderer.ts` (`screenOf`), `screens/chronicle.ts`, `bank.en.ts` (`chronicle.entry_date`) | **Hecha en local** (29 sep): la etiqueta sigue a la cosa cada fotograma por `screenOf`; la crónica en viñeta de 130 px con «Anno 50 · Spring» por entrada (sepia hasta tener las 51 a color). 91 pruebas de interfaz en verde. Sin captura |
| **4 · Cierre** | Capturas de día y noche a 390 y 320, tablet; `press-kit`; la skill `piel-del-valle` §0 reescrita con la piel v8; `docs/design.md` §11 y changelog | — | Pendiente; hace ruido |

## Lo que no cambia

El arco del sol con sus cinco cuentas, la brújula, los tres iconos de las
pestañas, Cinzel y Garamond, el sello de lacre sólo para riesgo, el verde
azulado desaparece de la interfaz.
