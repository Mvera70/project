# E0e · Aceptación histórica del ambiente de las eras

## Objetivo

Cerrar o refutar la lectura visual de caserío, aldea y villa en el juego 3D
real, tras la progresión tierra → mezcla → piedra de `design.md` §7.4b. Esta
ronda no reabre la mecánica ni confunde tres apariencias forzadas de la misma
villa con tres partidas históricas. La piedra lisa sin juntas sigue como deuda
de acabado separada.

## Depende de

- `docs/encargos/encargo-e0-ambiente-eras.md`, incluida la autorización del 22
  sep 2026; `docs/historico/life-rounds/E0e-ambiente-eras.md` y
  `docs/plan-meta.md` §2.
- `src/derive/era.ts`, `src/render3d/world/ground.ts`, `tools/graphics/shot.mjs`.
- Las fases espaciales ya aceptadas: plaza fija, fuente, pasos y vado.

## Ficheros y papeles

Sol dirige la lectura, el arbitraje y los documentos. Luna obtiene el inventario
y capturas o ejecuta comprobaciones mecánicas. Terra sólo implementa un cambio
visual si la evidencia falsara el contrato y Sol puede escribirle una corrección
concreta; no se encarga a Astra sin autorización nueva. Las únicas fuentes de
producción que podrían cambiar en tal caso son `src/render3d/world/ground.ts`
y sus pruebas focales. La herramienta de captura puede ampliar su encuadre sin
cambiar el juego. Si hiciera falta nueva geometría, textura o dirección
artística, parar antes de ampliar este presupuesto.

## Protocolo de ejecución

1. Reconstruir el bundle actual y registrar hash. Capturar, sin `preview-era`,
   dos historias reales con las tres fases: 7/años 0, 4, 30 y 23/años 0, 3,
   31. Confirmar era real y ausencia de errores. Cerrar decisiones que tapen la
   vista por el camino del jugador; nunca etiquetar una captura de una fase
   basándose sólo en el año.
2. Añadir una vista comparable de la plaza a tamaño móvil y tableta para cada
   historia, mediante el encuadre de observación sin alterar `GameState` ni
   fingir una era. Conservar la captura completa y una copia de lectura sin
   cabecera/pie. La copia oculta sólo UI, no elimina árboles, casas ni suelo.
3. Mantener aparte dos tríos controlados de la misma villa con `preview-era`,
   en ambas resoluciones. Sirven para atribuir la diferencia del pavimento,
   no para demostrar reconocimiento de historia.
4. Leer individualmente las historias sin rótulo antes de ver los controles:
   decir qué fase parece y qué pistas la sostienen; anotar confusiones y
   oclusiones. La plaza debe leerse como tierra, mezcla y piedra en ese orden.
   Verificar además fuente, accesos, vado, caminos reales, humo doméstico y
   ausencia de cambios topológicos o de coste de escena.
5. Si la lectura es ambigua, formular una sola hipótesis visual falsable y
   hacer una corrección acotada; repetir las capturas y pruebas. No afinar
   color indefinidamente ni subir el coste sin arbitraje.

## Pruebas y regresión

- `era-ambience`, `graphics-world` y `graphics-effects` focales; `typecheck`,
  `lint`, `git diff --check`, capturas 3D con cero errores de página.
- Al final de la tanda completa que pidió Vera: `npm test`, jornadas y
  recorridos de interfaz relevantes, con sus fallos clasificados; no mover
  listones de balance ni llamar verde a una prueba que no corrió.
- Comparar la nueva evidencia con los invariantes de G-27 (bastión y escalera
  opcional) y la máscara de vida: una corrección de suelo no puede moverlos.

## Terminado cuando

Las historias reales de dos semillas muestran las tres superficies normativas
desde un encuadre de uso, sin necesidad de leer era/HUD, y la lectura no se
debe sólo a más casas o a la muralla; los controles aíslan el acabado. Los
invariantes visuales y técnicos anteriores siguen probados. Si no se puede
obtener esa evidencia, se informa con exactitud de qué falta y E0e sigue
abierto: una comparación controlada, un test unitario o una captura tapada no
constituyen aceptación.
