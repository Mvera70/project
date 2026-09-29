# Encargo para Codex · profundidad visual del valle en móvil

**29 sep 2026 · propuesta técnica, sin implementar.** Esta ronda mejora el 3D
que el jugador mira habitualmente. No rediseña la interfaz ni cambia el motor.
Se evalúa en el encuadre real de 390×844 y 320×568, con el valle sin interfaz
como apoyo, y en la aldea y la villa.

## Punto de partida

- [Captura móvil reciente](../ui-redesign/opciones-graficas-v10-2026-09-29/capturas/valle-390x844.png)
  y [vista amplia](../../artifacts/graphics/env/after9-overview.png): el estilo
  low poly y la paleta están decididos, pero la aldea se lee poco anclada al
  suelo y el prado pierde estructura en el zoom habitual.
- `renderer.ts` ya usa ACES, sombra PCF, niebla, ciclo de luz y resolución
  adaptativa. En táctil limita DPR a 1,5, usa mapa de sombra 1024 y desactiva
  MSAA por el coste medido. El mapa de sombra es 2048 en escritorio.
- `world/ground.ts` ya tiene `mottleAt`, `patchAt` y `meadowWeight` para manchas
  amplias y suelo más oscuro bajo hierba. `effects/clouds.ts` proyecta sombras
  de nubes. Se afinan esas capas antes de añadir otra técnica de terreno.
- `forest.reveal` ya deja ver caza y frente de asalto; el velo de montaña actúa
  al bajar la cámara. Falta cubrir el seguimiento normal de una persona.
- La sombra solar tuvo un defecto temporal difícil (`S-1`, v4.90–v4.92). No
  cambiar su cámara, sesgo, resolución o cadencia sin vídeo antes/después y
  `shadow-flicker.mjs`. La confirmación en la tablet sigue pendiente.

## Objetivo y contrato

La imagen debe ganar profundidad **a tamaño normal de juego**, conservar la
lectura low poly clara y mantener el presupuesto móvil. Todo lo nuevo es
presentación efímera: misma semilla y estado dan la misma colocación; ninguna
entrada nueva en `GameState`, guardados, `src/engine/` o `src/derive/`.

El trabajo se divide en tres entregas implementables y un experimento de
filtrado. Codex debe cerrar una entrega con capturas y coste comparado antes de
pasar a la siguiente. Si hay trabajo de animación AN en curso, usar checkout
aislado y conservar los cambios ajenos; ambas tandas podrían tocar
`renderer.ts`.

### GV-0 · Línea de base

**Ficheros:** solo evidencia bajo `artifacts/graphics/visual-depth/` y el
informe de esta ronda.

Capturar la aldea semilla 11/año 21 y la villa semilla 7/año 60 con cámara,
hora, estación, viewport y opciones fijas. Guardar vista normal con interfaz y
`--scene-only`; al menos día despejado y otra condición que ponga a prueba
sombras/contraste. Medir ambas escenas con `gl-probe.mjs` y
`scene-report.mjs`. Registrar llamadas, triángulos, programas y JS por
fotograma. SwiftShader sirve para comparar versiones, **no** para afirmar FPS
de iPhone o iPad.

**Terminado cuando:** hay imágenes y cifras reproducibles con sus comandos y
parámetros exactos. Si la captura cambia de cámara entre versiones, se repite.

### GV-1 · Contacto y suelo

**Ficheros permitidos:** `src/render3d/world/ground.ts`, un módulo nuevo
`src/render3d/world/contact-shade.ts`, `src/render3d/renderer.ts`,
`src/render3d/visual-config.ts` y pruebas focales si hay lógica nueva.

1. Añadir oscurecimiento suave y local bajo la huella de edificios con techo,
   derivado de `Plan.buildings`/`PlannedBuilding` y adaptado a la cota del
   terreno. Construirlo en lote y rehacerlo solo cuando cambien edificios o
   terreno; un objeto y una luz nuevos por edificio quedarían fuera del
   presupuesto. Mantenerlo legible en nieve y junto a caminos, plaza y agua.
   Probar primero la aldea y la villa antes de extenderlo a otros elementos.
2. Afinar las capas **existentes** de `ground.ts`: tamaño y contraste de manchas,
   `meadowWeight` y desgaste visible alrededor de la aldea. No añadir hierba
   densa al mapa entero ni una textura repetida que haga visible la cuadrícula.
   El prado, caminos, campos y orillas deben seguir distinguiéndose en las
   cuatro estaciones. Guardar dos variantes comparables antes de elegir.
3. Conservar sombras solares, ACES, niebla y luz de día tal como funcionan,
   salvo una corrección que la evidencia muestre imprescindible.

**Terminado cuando:** las casas tocan el suelo sin halos flotantes, z-fighting
ni manchas negras; el prado gana estructura a escala móvil sin moteado de
cuadrícula; una villa grande no multiplica llamadas por cada edificio.

### GV-2 · Oclusión de quien se sigue

**Ficheros permitidos:** `src/render3d/renderer.ts`,
`src/render3d/world/forest.ts`, `src/render3d/world/forest-occlusion.ts` y sus
pruebas focales.

Reutilizar `forest.reveal` y **unir** sus objetivos actuales de caza/asalto con
la persona seguida por `track(id)`. El seguidor no debe borrar la revelación de
un asalto ni atenuar todo el bosque. Al dejar de seguir, restaurar los árboles.
Comprobar en una secuencia corta de movimiento la aparición/desaparición de las
copas y suavizarla solo si el salto se aprecia y el coste lo permite.

**Terminado cuando:** la persona seguida permanece visible al cruzar detrás de
copas; un asalto y una caza conservan su lectura; la escena sin objetivo mantiene
el bosque opaco.

### GV-3 · Filtrado: experimento acotado

**Ficheros:** candidato aislado en el render y capturas/medidas; no activar por
defecto hasta comparar en dispositivo real.

Comparar el estado táctil actual con un antialias de pantalla de bajo coste
aplicado solo al lienzo 3D (por ejemplo FXAA), con la misma escala de render y
cámara. Inspeccionar tejados, ramas, aldeanos y hierba **en movimiento**:
nitidez, parpadeo y estelas. Registrar memoria, llamadas, programas y tiempo.
El filtrado anisotrópico tiene poca utilidad aquí porque predomina el color por
vértice y el material liso. Si el filtro borra a los aldeanos o empeora el
coste, documentar el descarte y conservar el render actual.

## Verificación y cierre

- Comparativas antes/después para GV-1 y GV-2 con iguales semilla, estado,
  cámara y viewport; incluir el recorte normal del móvil, no solo ampliaciones.
- Medir otra vez aldea y villa con las herramientas de GV-0. Si se añaden o
  cambian materiales/sombreadores, pasar `shader-churn.mjs`. No aceptar una
  mejora que degrade la villa sin mostrar el coste y la alternativa probada.
- `npm run typecheck`, lint focal y pruebas afectadas durante la ronda;
  cierre amplio según `CLAUDE.md`. Pruebas nuevas solo para propiedades de
  colocación/oclusión que una captura no pueda proteger.
- Actualizar `docs/task-log.md`, `docs/changelog.md` y este brief con el
  resultado real. Documentación en español; identificadores en inglés y
  comentarios del código en español. Las constantes visuales ajustadas deben
  llevar motivo y evidencia; no inventar cifras de balance.
- Entregar capturas, vídeo breve si cambia una transición, comandos de
  reproducción, métricas antes/después, archivos tocados y límites pendientes
  de comprobar en iPad/iPhone. La aprobación visual del acabado corresponde a
  Vera; la ausencia de respuesta no equivale a aprobación.
