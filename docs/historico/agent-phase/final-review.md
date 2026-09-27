# Auditoría final de la tanda P0–P7

17 de septiembre de 2026. Revisión del coordinador sobre la rama
`codex/valley-next-review`, desde la base
`141652d6e0f9c0b89881edc9faad7474a21a80fa` hasta P7
`79656f5137163c24d603b018390a57fc9e178c79`.

## Veredicto

La tanda es **apta para revisión**, pero todavía no para afirmar que toda la vida
del valle está validada. Acepto los cambios de P1, P4 y P5 y acepto P0, P2, P3,
P6 y P7 como documentación/evidencia dentro de sus límites. No rechazo ningún
commit. No recomiendo fusionar afirmaciones más amplias que las siguientes:

- el índice de evidencia comprueba integridad básica de una toma y distingue una
  grabación fija de una viva sin avance;
- las losas del vado giran dentro de su celda en las cuatro orientaciones;
- los clips exportados y las acciones procedurales tienen contratos separados y
  comprobables contra el GLB publicado;
- la cosecha atraviesa en vivo las semanas 34–37 con recogidas, cargas y entregas
  en la partida observada;
- las dos aldeas nocturnas observadas completan sus resultados de sueño y la
  puerta del id 85 muestra `returning → opening → entering → sleeping`;
- la muestra de fauna sólo acredita presencia/transición de gallina y presencia
  ambiental de peces. No acredita articulación fina ni las otras cuatro especies.

La rama no se ha fusionado ni subido. Los artefactos están ignorados y sólo
existen en este worktree; deben conservarse hasta tomar una decisión.

## Decisión por fase

| Fase | Decisión | Motivo y alcance real |
|---|---|---|
| P0 | Aceptar | Base, worktree y bundle reproducible identificados por hash. No cambia el juego. |
| P1 | Aceptar | CLI pequeña, sin dependencias, rutas confinadas y seis casos dirigidos. La auditoría reforzó el caso de escape con un PNG externo existente. |
| P2 | Aceptar como evidencia | El cruce vivo de cosecha es válido. La entrega larga de seed 7 no termina antes de la noche y la cantera queda como caso ausente; no se convierten en éxitos ni fallos inventados. |
| P3 | Aceptar como evidencia | El tick 2834 histórico no reproduce pendiente en esta base: 32/32 residentes duermen; cuatro `no-home` quedan fuera correctamente. Esto no prueba todas las noches. La puerta sí completa la secuencia observada. |
| P4 | Aceptar código | El cambio conserva API y selección del vado. Tests sintético y del GLB real miden `Box3` mundial en cuatro giros; 46/46 dirigidas, typecheck y lint verdes. |
| P5 | Aceptar tests | Mantiene duración, loop y zancada exportados; prueba el generador real, huesos, valores finitos, respaldo de nombres y no mutación de `idle`. 11/11 dirigidas, typecheck y lint verdes. |
| P6 | Aceptar como cobertura insuficiente | La matriz dice con precisión qué apareció. La gallina es demasiado pequeña y el acercamiento no se mantiene; vaca, cerdo, lobo, cuervo y encuentros quedan sin validar. |
| P7 | Aceptar con corrección de hash | Inventario y puerta completa conservados. El índice llevaba un hash provisional; se corrige aquí a `79656f5`. |

## Hallazgos que requieren trabajo posterior

1. **El observatorio no sirve aún para articulación fina de fauna.** `--follow`
   recentra, pero `--zoom` sólo afecta de forma útil al primer fotograma de esta
   secuencia; los posteriores vuelven al plano general. Antes de repetir fauna,
   hay que mantener cámara y escala durante toda la toma y calibrarlo con un solo
   animal. Esta es la mayor ganancia práctica descubierta por P6.
2. **La ruta agrícola larga no cierra dentro de la jornada observada.** En seed 7,
   cinco cuerpos llevan grano y lo dejan al comenzar noche; `harvestDeliveries`
   permanece en cero. Hace falta decidir y observar qué política corresponde a
   una carga interrumpida: terminar, devolver o cancelar de forma visible. La
   muestra no demuestra atasco ni pérdida económica.
3. **El cierre de cantera sigue sin prueba viva.** Seed 11/año44 ya no contiene
   una obra de piedra identificable. El contador escénico llega a mostrar 3 sin
   actor de cantera/carga asociado en los fotogramas citados; es una señal para
   una reproducción dirigida, no una conclusión.
4. **La fauna sigue mayormente sin cobertura.** Vaca, cerdo, lobo y cuervo no
   aparecieron en las dos partidas permitidas; tampoco hubo encuentros completos.
   No se debe interpretar ausencia de muestra como funcionamiento correcto.
5. **El agua del vado sigue cortada visualmente.** P4 corrige exclusivamente el
   pivote. `ground.ts` continúa excluyendo `TERRAIN_CODE.ford` de la lámina de agua.
6. **La puerta completa del repositorio permanece roja.** La tanda termina con
   1390/1392 pruebas rápidas y 122/130 jornadas correctas. Los diez fallos están
   fuera de los ficheros modificados y varios ya estaban documentados antes de
   esta rama; siguen siendo deuda real del proyecto y no deben ocultarse.

## Calidad y límites de la verificación

El coordinador leyó el diff agregado, repitió las pruebas dirigidas de P1, P4 y
P5, typecheck y lint, contrastó hashes e índices y abrió fotogramas originales de
la calibración de gallina. La suite completa y las jornadas fueron ejecutadas una
vez por P7. No se volvió a ejecutar `test:balance`, conforme al brief.

Los artefactos verificables viven bajo `artifacts/graphics/agent-phase/`. Los
bundles conservan estos SHA-256:

- P0: `8A47FB0CC8EB38469103BEBB4B5FE1BBD2AC987E31C6C9291F21014936348737`.
- P4: `F81F9B826520328637CAD30734281F4EB944610E961F4D28DC9DE43261BF34F8`.

Los informes P2–P6 distinguen observación, inferencia y límite. Sus contadores
no sustituyen la inspección temporal y sus ausencias no certifican catálogo.

## Recomendación para integrar

Revisar primero P4 en el juego y P1/P5 como herramientas/tests. Si se acepta la
tanda entera, integrar la rama sólo después de preservar o trasladar las
evidencias ignoradas que se quieran conservar. Al integrar, volver a ejecutar
las pruebas dirigidas, typecheck y lint sobre `main` actualizado. Registrar por
separado las diez rojas conocidas; no relajar sus umbrales dentro de esta tanda.

El siguiente trabajo funcional debería empezar por la cámara persistente del
observatorio y después repetir un único animal. Sólo si ese piloto permite ver
la articulación merece lanzar la matriz completa de especies y encuentros.
