# E3b.1d · Revisión de la primera junta en la app real

**Estado:** revisión realizada el 22 sep 2026; evidencia en
[E3b.1d](../historico/graphics-rounds/E3b1d-revision-app.md).
Vera autorizó abrir la app y usar GPU.
E3b.1a/b/c pasaron pruebas focales. Esta ronda valida lo que éstas no ven:
unión visible, guardia en movimiento y tiro en el navegador.

## Escenario controlado

Partir del estado real de semilla 7, año 50, verano. El bastión vivo en
`(18,59)` ya tiene escalera E3a orientada al este y el primer muro de piedra
en `(18,58)`. Para obtener la primera recta E3b sin rehacer la villa:
convertir en ruina de esa semana el muro diagonal `(17,57)` y añadir un muro
de piedra en `(18,57)` copiando la ficha del primer tramo con ID nuevo. La
sonda CPU comprobó que `bastionWalkwayOf` selecciona entonces IDs `180` y
`263`, acceso `(1,0)` y lado `(0,-1)`. Conservar el resto del estado y los
recursos. Declarar siempre que la junta es un **escenario controlado**, no
una disposición surgida espontáneamente en esa partida.

## Ficheros de soporte

Añadir una función de diagnóstico acotada en `src/ui/debug.ts`, invocada por
`src/main.ts` sólo bajo `?debug=1&live=1&e3b=1`. La función falla con error
explicativo si falta cualquiera de las piezas esperadas o el selector no
resulta positivo. No cambiar `src/engine/`, las reglas de construcción,
guardados, render, física, GLB o balance. Un script bajo
`artifacts/graphics/E3b1-review/` puede abrir la página empaquetada,
fotografiar la junta y guardar trazas `__valleyLife` del guardia y flechas.

## Observación

1. Empaquetar la app con `tools/graphics/bundle-game.ts` en directorio nuevo
   bajo `artifacts/graphics/E3b1-review/` y abrirla con Playwright/Chrome.
2. Capturar al menos una vista focal de la junta desde el interior. Registrar
   el ID del puesto y del guardia, X/Y/Z y fase de subida/ocupación/descenso
   en muestras sucesivas. Comprobar que Y llega a 1,02 sin salto y que la
   máscara pública sigue cerrada. Una captura fija no valida movimiento.
3. En la versión con `means=bows,arms` y amenaza, comprobar si el guardia
   ocupa el tramo; con asalto, registrar al menos una flecha real o informar
   exactamente por qué no se observó. No inferir éxito de disparo por la
   prueba unitaria física.
4. Informar errores de página, ausencia de modelo o solape, y límites de la
   revisión. Guardar capturas y JSON de traza en carpeta nueva. `git diff
   --check`, typecheck y ESLint focal. No hacer benchmark, commit ni push.
