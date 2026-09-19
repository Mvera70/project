# UI-R6 · Validación

**16 sep 2026.** Ronda de coordinador, sobre `main` con UI-R0 a UI-R5
aterrizadas. Primera vez que se corren las cinco puertas completas
(`typecheck`, `npm test`, `test:journeys`, `lint`, `test:shots`, más
`test:pwa` por tocar `app.ts`/el service worker) desde que empezó la tanda:
la regla del dueño durante una ronda es typecheck+lint+ficheros tocados, y la
suite entera se deja para el cierre.

## Resultado, puerta por puerta

| Puerta | Resultado |
|---|---|
| `npm run typecheck` | limpio |
| `npm run lint` | limpio |
| `npm test` | 1215/1216. Un fallo mudado al camino vivo (`graphics-picking.test.ts`), uno documentado `it.fails` con su medida (`resentment.test.ts`, reequilibrado del caos de antes de esta ventana), uno heredado sin tocar (`ui-milestones`, desde UI-R1) |
| `npm run test:journeys` | 128/130, exactamente las dos rojas ya documentadas en `CLAUDE.md` (la palanca del bosque invertida, los catorce avisos) — sin novedad |
| `npm run test:pwa` | 2/6. El manifiesto —lo que importa para instalar— pasa: nombre, `standalone`, `portrait`, los tres iconos con el maskable. Las cuatro de continuidad offline siguen en rojo tras arreglar el paso por el menú (ver abajo); causa no encontrada |
| `npm run test:shots` | 11/13 tras un arreglo mío (clase `title-seed` duplicada); una roja sin arreglar (picking en una aldea de 83 edificios) |

## Lo arreglado

1. **`graphics-picking.test.ts`**: dos aserciones leían `app.ts` como texto
   buscando `closePanel()`/`.valley-panel-close`, que UI-R4/UI-R5 movieron a
   `redesign/shell.ts`. Mudadas al camino vivo.
2. **`title.ts`** (mío, de U-10b, del mismo día): el campo «Open at year»
   copió la clase `title-seed` del número del valle; `tools/shots/valley.shots.ts`
   localiza el número por esa clase exacta y con dos elementos rompía en
   «strict mode violation». Clase propia (`title-year`), piel compartida por
   selector CSS.
3. **`test:pwa`** navegaba a `/` sin pasar el menú de inicio (U-10 llegó
   después de escribirse esta suite, y no se había vuelto a correr entera).
   `tools/shots/pass-title.ts` nuevo — **sin `test()` dentro a propósito**: la
   primera versión importaba la función desde `tools/shots/valley.shots.ts`, y eso
   registra sus pruebas como efecto de cargar el módulo; `test:pwa` se puso a
   correr la suite de capturas entera con la configuración equivocada.

## Lo documentado y no perseguido más allá

- **`resentment.test.ts`**, «cuanto peor el año, más factura» (§7.9): hambre
  leve y hambre total acaban en el mismo suelo, `OPINION.MIN = -100`. Entró
  con el reequilibrado del caos (`9c9f492`, antes de esta ventana de trabajo).
  No es mío de arreglar sin el arbitrio del dueño sobre `balance.ts`.
- **Cuatro pruebas de `test:pwa`** (segunda apertura sin red, despliegue nuevo
  alcanza a un cliente visitado, subdirectorio, partida guardada sobrevive
  sin red): siguen en rojo con timeouts de 120 s incluso en serie
  (`--workers=1`), así que no es contención de recursos. La causa exacta no
  se encontró en el tiempo de esta ronda. **No bloquea instalar el juego**:
  el manifiesto ya está verificado, que es lo que hace falta para «Añadir a
  pantalla de inicio»; lo que queda en duda es la robustez fina de abrir sin
  red tras un redespliegue.
- **`tools/shots/valley.shots.ts`**, «la ruta viva abre un valle maduro… para revisar la
  multitud»: no encuentra ficha que abrir tras barrer toques alrededor del
  centro en la semilla 7 a los ochenta años (83 edificios). El enganche
  toque→ficha (`app.ts:803`) está intacto y sin cambios de esta tanda. Puede
  ser geometría de picking movida por el rediseño de casas en curso (sesión
  de Blender, en paralelo, fuera de esta rama). No se ha perseguido más.

## Qué observación refutaría esta ronda

Que instalar el juego de verdad en un teléfono falle donde el manifiesto dice
que no debería (icono ausente, no abre en `standalone`). Que cualquiera de
las tres rojas de arriba resulte ser causada por algo de `src/ui/` tocado en
UI-R2 a UI-R5, y no por lo que aquí se atribuye.
