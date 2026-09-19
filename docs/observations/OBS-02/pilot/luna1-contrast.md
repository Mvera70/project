# OBS-02 pilot — luna1, contraste con trazas

Este informe se hizo después de cerrar `luna1-visual.md`. No se consultaron informes, código ni el plan de OBS-02.

## Caso A

**Visible.** En `0000–0060` vi movimiento de muchas personas en el poblado, con agrupaciones y siluetas muy próximas alrededor de la valla/entrada. La perspectiva y las casas impiden decidir si esas proximidades son contacto.

**Métrica.** La traza tiene 61 frames, `errors: []`, 27 personas muestreadas y 1 animal. `meshDrift` y `peopleMeshDrift` son 0; `penetratingCircles`, `penetratingBeasts` y `blockedCentres` son 0. El contador de interacciones evoluciona de `started: 7, completed: 5` en el frame 0 a `started: 10, completed: 8` en el frame 60, sin invalidadas ni atascadas. Los frames mantienen `engineTick: 912`, por lo que es una toma fija y no una partida que avance.

Como comprobación descriptiva derivada de `renderedPeople` (no un contador del observatorio), hubo pares a menos de 1.5 unidades en los frames muestreados; por ejemplo, frame 30: ids 3/30 a 0.294 y 15/25 a 0.399. Esa cercanía geométrica no produjo `penetratingCircles`.

**Hipótesis/lectura.** La sospecha visual de aglomeración es compatible con la geometría cercana y con interacciones activas, pero no hay evidencia de penetración o bloqueo. El resultado no permite afirmar fallo de contacto: la métrica de colisión es cero en las muestras y los pares cercanos pueden ser posiciones válidas de reunión. La observación visual se mantiene como sospecha de proximidad, no como anomalía confirmada.

## Caso B

**Visible.** La secuencia muestra movimiento y concentraciones semejantes junto a la valla/entrada; algunos cuerpos parecen acercarse mucho, con oclusión por construcciones. No vi una penetración inequívoca en la imagen.

**Métrica.** También hay 61 frames, `errors: []`, 27 personas y 1 animal; `meshDrift: 0`, `peopleMeshDrift: 0`, `penetratingCircles: 0`, `penetratingBeasts: 0` y `blockedCentres: 0`. Las interacciones pasan de 7/5 (started/completed) a 10/8, siempre con `invalidated: 0` y `stuck: 0`. `engineTick` es 912 en toda la toma. La distancia mínima derivada de posiciones renderizadas llega a 0.433 entre ids 15/25 en el frame 30 y a 0.627 entre 13/30 en el frame 60; son cercanías, no una métrica de solape.

**Hipótesis/lectura.** La proximidad que sugerían los PNG coincide con pares geométricamente cercanos e interacciones en curso, pero el contrato de colisión no registra penetración ni bloqueo. Mantengo la clasificación visual como sospecha de contacto potencial, con contacto no demostrado.

## Caso C

**Visible.** En los 17 frames se ve una vista amplia con río, árboles, una casa y una parcela. Solo se distinguen dos personas al principio; más adelante dejan de verse en el encuadre al cambiar a estado nocturno. No observé una interacción entre personas ni un cruce inequívoco del entorno.

**Métrica.** La traza tiene 17 frames, `errors: []`, 2 personas y 3 animales; todos los contadores de drift, penetración y bloqueo son 0. `firstTick` y `lastTick` son 0. Las cuatro medidas de noche reportadas tienen 2 residentes, 2 durmiendo y `pending: []`; las transiciones incluyen `sleeping`, `leaving`, `returning` y `day`. En los frames donde aparecen, ambas personas están en `stage: day`; en un frame posterior no se renderizan por estar durmiendo.

**Hipótesis/lectura.** La desaparición visual posterior es consistente con la transición nocturna de la traza, no evidencia de pérdida o fallo de colocación. La muestra no prueba interacciones ni navegación detallada del río: la clasificación visual de sin anomalía se limita al encuadre.

## Conclusión y límites

El contraste refuerza movimiento visible y entorno estable en A/B, y un ciclo de noche coherente en C. Las sospechas de contacto de A/B no quedan confirmadas: las métricas de penetración y bloqueo son cero, aunque sí hay pares cercanos derivados de posiciones renderizadas e interacciones contabilizadas. Todas las conclusiones son de muestras discretas; A/B no avanzan de tick (`912→912`) y C cubre solo 17 frames y dos residentes.
