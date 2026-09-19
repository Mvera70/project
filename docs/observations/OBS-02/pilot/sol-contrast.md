# OBS-02 — piloto ciego — contraste de Sol

Fecha: 2026-09-17. Segunda fase. Este documento contrasta las trazas con el veredicto visual ya fijado en `sol-visual.md`; no lo reescribe.

## A

**Visible.** En 0023–0037 se observó una concentración persistente en el acceso cercado, con parejas superpuestas o cruzándose y figuras alineadas con las estacas. Fuera de ese cuello, la marcha fue continua y legible.

**Métrica.** La toma contiene 27 personas y un cuerpo animal, sin errores, drift de malla, centros bloqueados ni penetraciones registradas. El tick permanece en 912, coherente con estado fijo. Las distancias entre centros sí apoyan el contacto visual: en 0023–0037 hay 22 contactos persona-persona por muestra por debajo de 0,4 unidades y 34 por debajo de 0,5; la mínima es 0,293 en el fotograma 0032 (ids 3 y 30). En toda la toma hay 61 muestras-pareja bajo 0,4 y 105 bajo 0,5. Una pareja (22, 25) permanece bajo 0,75 durante 34 de 61 muestras. Las interacciones pasan de 7 iniciadas/5 completadas a 10/8, sin inválidas ni atascadas.

**Hipótesis.** El fallo que se ve es separación insuficiente entre personas, sobre todo en el cuello del acceso; no parece teletransporte ni desajuste entre estado y malla. `penetratingCircles: 0` no refuta el solape visual: ese contador mide sólidos del entorno, mientras que la distancia entre personas mide otro contrato. El posible contacto con estacas sigue siendo sólo sospecha visual porque los contadores de sólidos están a cero y la perspectiva ocluye los pies.

## B

**Visible.** También se observó aglomeración en la boca del acceso. En píxeles, 0023 parecía incluso una pila de tres cuerpos; el intervalo no daba una mejora clara frente a A. No se observaron saltos grandes ni giro errático global.

**Métrica.** Mismos 27 habitantes, semilla, año, fps, duración y tick fijo que A. No hay errores, drift, centros bloqueados ni penetraciones de personas o bestias. En 0023–0037 aparecen 7 muestras-pareja bajo 0,4 y 9 bajo 0,5; la mínima del intervalo es 0,310 (ids 15 y 25, fotograma 0032). En toda la toma hay 11 bajo 0,4 y 18 bajo 0,5, aunque existe un mínimo aislado aún menor, 0,251 entre ids 22 y 30 en 0044. La pareja (14, 16) está bajo 0,75 durante 52 de 61 muestras. Las interacciones tienen exactamente los mismos totales iniciales y finales que A y tampoco registran atascos.

**Hipótesis.** B reduce mucho los contactos más severos respecto de A (11 frente a 61 muestras-pareja bajo 0,4; 18 frente a 105 bajo 0,5), aunque no los elimina y mantiene parejas próximas durante mucho tiempo. Esto explica por qué la panorámica aún parece congestionada. La comparación métrica favorece B para separación personal, pero no autoriza afirmar que el problema esté resuelto.

## C

**Visible.** Las dos personas y las gallinas se desplazaron alrededor de una casa junto al río. No se vio un cuerpo inequívocamente dentro del agua, de la casa o de los árboles. El encuadre general no permitía seguir identidades durante cada salida y reaparición.

**Métrica.** Hay dos personas y tres bestias de vida, sin errores, drift, centros bloqueados ni penetraciones. Las cuatro noches registradas terminan con 2 de 2 residentes durmiendo y ningún pendiente. La secuencia de residencia contiene entradas a `sleeping`, una transición `returning` y una `leaving`; al final ambos vuelven a `day`. Los tres animales conservan penetración cero en todas las muestras y recorren rangos limitados próximos a la casa. `firstTick` y `lastTick` son ambos 0: la toma recorre ciclos escénicos a velocidad alta, pero no alcanza un tick semanal del motor; por tanto no demuestra evolución persistente. La distancia casi nula entre las dos personas en el fotograma 0006 ocurre cuando ambas están `sleeping` dentro de la misma vivienda y no constituye por sí sola un contacto visible. Los grandes saltos de posición entre algunas muestras coinciden con ciclos acelerados y ocultación/reaparición en la vivienda; a 2 fps no sirven para juzgar continuidad fina.

**Hipótesis.** C respalda colocación ambiental básica y un ciclo nocturno completo para los dos residentes, pero no es evidencia suficiente sobre gait, continuidad de trayectorias entre muestras ni progreso del motor. No detecté una anomalía de entorno en la muestra.

## Comparación y límites

El hallazgo principal es una diferencia que la inspección visual general no resolvía: A y B comparten congestión visible, pero B reduce aproximadamente cinco a seis veces los contactos severos medidos, sin llegar a cero. En ninguno de los dos casos hay evidencia de penetración contra sólidos o drift de malla. C no aporta un contrajemplo de colocación defectuosa y sí registra cuatro resultados nocturnos completos, aunque cubre sólo 17 vistas a 2 fps y ningún tick del motor.

La cámara panorámica, la oclusión isométrica y la ausencia de seguimiento individual limitan el diagnóstico de pies, articulación, contacto exacto con cercas y causalidad de las rutas. Las distancias usadas aquí son un contraste descriptivo de estas tomas, no un umbral universal ni una prueba de propiedad.
