# The Valley — instrucciones para agentes

Simulación idle de una aldea medieval para móvil. TypeScript, Canvas 2D, PWA.

**La especificación completa es `docs/design.md`.** Este fichero es solo lo que
hay que tener en la cabeza siempre. Cuando algo no esté aquí, está allí.

---

## Antes de tocar nada

1. Lee `docs/design.md` §1–4 (decisiones, convenciones, modelo de dominio, tick).
   Son quince minutos y evitan reescrituras.
2. Localiza tu módulo en `docs/design.md` §17 y lee **tu brief**. Define los
   ficheros que tocas, el contrato de API literal, los tests exigidos y el
   criterio de terminado.
3. Trabaja solo en los ficheros que tu brief lista. Si necesitas cambiar uno
   ajeno, dilo en el PR; no lo hagas.

---

## Innegociables

**El motor no sabe que existe una pantalla.** En `src/engine/` está prohibido
`Math.random`, `Date`, `performance.now`, `document`, `window`, e importar de
`src/render/` o `src/ui/`. ESLint lo verifica.

**Todo determinista.** Misma semilla y mismas decisiones → misma partida, byte a
byte. La aleatoriedad viene de flujos con nombre (`weather`, `births`,
`crossroads`…), nunca compartidos. Añadir una tirada en el render jamás puede
desplazar la simulación.

**Ningún número se inventa.** Todas las constantes del juego viven en
`src/engine/balance.ts` y salen de `docs/design.md` §12. Si necesitas una que no
existe, añádela ahí con `// TUNE:` y menciónalo en el PR.

**El orden del tick es normativo.** Los 17 pasos de `docs/design.md` §4.2, en
ese orden, con los comentarios numerados. Cambiarlo cambia el balance y rompe
las partidas guardadas.

**Toda opción de encrucijada cambia algo en pantalla.** `visible.length >= 1`,
siempre. Hay un test que lo comprueba. Es el principio 1 del juego convertido en
aserto.

**El estado es plano y serializable.** Sin clases, sin `Map`, sin `Set`, sin
referencias circulares. Objetos, arrays y referencias por `id`.

**Nada de texto en el código.** Todo lo que lee el jugador va en inglés y sale
del banco de plantillas de `src/engine/chronicle/bank.en.ts`. Los sistemas
empujan claves y parámetros, no frases.

---

## Idiomas

| Qué | Idioma |
|---|---|
| Identificadores, tipos, ficheros, comentarios | Inglés |
| Contenido del juego (crónica, UI, nombres) | Inglés |
| Documentación y conversación | Español |

---

## Comandos

```bash
npm run dev          # servidor con recarga en caliente
npm run typecheck    # tsc --noEmit
npm test             # suite rápida — debe tardar < 20 s
npm run test:balance # suite de balance — minutos, se lanza aparte
npm run chronicle -- --seed 7 --years 60   # runner del hito 0
npm run shots        # capturas Playwright
npm run lint
```

Antes de dar un módulo por terminado: `npm run typecheck && npm test && npm run lint`.

---

## Estado del proyecto

Andamiaje (M-00) hecho. **Siguiente: M-01 (rng y tiempo) → M-02 (tipos y
balance) → M-03…**

Ruta hasta el hito 0, que es el que decide si el proyecto sigue:

```
M-01 rng/time → M-02 state/balance → M-03 people → M-04 demography
                                   → M-05 opinions
                                   → M-06 subsistence
                                   → M-09 chronicle
                                   → M-07 crossroads → M-08 catalog
                                                     → M-10 sim + CLI  ← HITO 0
```

**M-19 (capturas Playwright) va antes que M-17 (sprites).** No es orden de
conveniencia: desarrollar sin poder ver el juego es el riesgo número uno de este
proyecto (`docs/design.md` §14.3).

---

## Cómo se escriben los tests

Describen **propiedades del diseño**, no detalles de implementación. Nada de
comprobar que una función llama a otra.

Los umbrales nunca se fijan con una sola semilla: dos partidas divergen desde el
primer tick y una sola es ruido. Suma varias.
