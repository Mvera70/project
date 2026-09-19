# OBS-02 — contraste de traza (Terra)

Fecha: 2026-09-17. Este documento sucede al veredicto visual ya fijado en `terra-visual.md`; no lo reinterpreta ni lo modifica. Lectura selectiva: cabecera, resumen y posiciones/estados de muestras pertinentes, sin volcar el JSON completo.

## A y B — escena fija, 15 fps, semilla 11, año 20, `lead=1`

### Visible

En A (0000–0014) y B (0020–0034) se vio marcha continua, proximidad junto a la empalizada y una burbuja de conversación, sin cruce inequívoco de cuerpos o sólidos.

### Métrica

- Ambas trazas usan `production-renderer-fixed-state-30hz`, con 27 personas y un animal muestreados. No contienen errores; `meshDrift`, `peopleMeshDrift`, `penetratingCircles`, `penetratingBeasts` y `blockedCentres` son cero.
- El mayor desplazamiento consecutivo de persona es 0,11 unidades en A y 0,21 en B por 1/15 s, compatible con la continuidad visible.
- El menor espacio entre centros de personas en toda A es 0,275 (ids 14 y 34, fotograma 0051); en B es 0,251 (ids 22 y 30, 0044). Ambos registros marcan penetración ambiental cero.
- La traza identifica chat con participantes: id 29 se asocia a 16 y 19 y más tarde la burbuja pasa a 32. Es compatible con la burbuja observada, aunque la cámara no permitió asignarla visualmente.

### Hipótesis y conclusión

Las métricas refuerzan continuidad y ausencia de colisión contra el entorno en estas muestras. No cierran el contacto entre personas: la distancia entre centros no trae radio ni contador de solape persona-persona. La proximidad de A/B queda como observación a ampliar, no como fallo demostrado.

## C — modo vivo, 2 fps, semilla 7, año 1, `lead=0`, velocidad 64

### Visible

En los 17 PNG se vio una vivienda junto a río y huerto, dos residentes en parte de la secuencia y gallinas en el claro. La inspección inicial no resolvió rutas enteras por oclusión detrás de la casa; no mostró cruce humano inequívoco de agua, muro o persona.

### Métrica

- La traza declara `live-engine-browser-clock`, dos personas y tres animales, sin errores ni deriva de malla. Los contadores de penetración contra sólidos y centros bloqueados son cero.
- Los cuatro `nightOutcomes` registran 2 residentes, 2 durmiendo y `pending=[]`. Las transiciones alternan `day`, `sleeping`, `leaving` y `returning`, por lo que aparición/desaparición alrededor de la casa coincide al menos con estados de residencia.
- Sin embargo, `firstTick=lastTick=0`, pese a etiquetarse como modo vivo. Esto no acredita avance del motor durante la toma.
- El id 0 salta 12,71–14,52 unidades entre muestras de 0,5 s. Algunos saltos coinciden con `day → sleeping` o `sleeping → day`, pero uno de 13,83 es `day → day` (0003→0004). La vista amplia no pudo confirmarlo ni descartarlo.
- Los centros humanos llegan a 0,048 (0002), 0,013 (0006) y 0,041 (0010) unidades de separación, sin activar la penetración ambiental. La traza no ofrece un indicador explícito de solape persona-persona.

### Hipótesis y conclusión

C contiene dos problemas de evidencia, no una aprobación: telemetría de saltos muy grandes, incluido uno sin transición de residencia, y una toma «viva» sin avance de `engineTick`. Puede ser colocación instantánea, renovación de telemetría o defecto de avance; estos PNG y campos no permiten elegir. La coincidencia casi exacta de centros es sospecha fuerte de contacto persona-persona, pero no prueba visual de atravesamiento.

## Limitaciones y siguiente evidencia necesaria

No se ejecutaron builds, pruebas ni juego. A/B son estado fijo: describen esa escena, no evolución persistente. C usa 2 fps, útil para ciclos pero no zancada o contacto fino. Resolver las sospechas requiere una repetición reproducible a 15 fps que siga ids 0 y 1 de C, mantenga PNG/traza síncronos y confirme `lastTick > firstTick`; y una métrica de distancia frente a suma de radios, o un detector explícito de solape persona-persona.
