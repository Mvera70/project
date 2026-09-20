# E0b · El mensajero trae el aviso

**Cerrado el 20 sep 2026.** Entrega producción; E0 global continúa abierto.

## Qué se corrigió

El primer prototipo ligaba la escena a la modal pendiente y exigía encontrar a
alguien que ya estuviera en el corredor exterior. La semilla 7 produjo cero
candidatos. La corrección separa dos momentos: B2 se resuelve y queda en
`state.history`; en la primera jornada visible posterior, un adulto existente
se reconstruye en el acceso real y sólo vive el regreso.

La revisión encontró dos fallos que las pruebas aisladas no veían:

- el renderer conservaba la posición del cuerpo anterior y anulaba el origen
  del mensajero en una partida continua;
- un tick tiene siete jornadas, por lo que el historial semanal repetía la
  escena cada amanecer.

El relevo deja de copiar la posición anterior únicamente para
`Dweller.warning`, y la ventana queda limitada al primer día de la semana del
registro. Todos los demás cuerpos conservan la continuidad normal.

## Evidencia

Pruebas focalizadas: **21/21** verdes —8 de E0b, 6 de E0a y 7 de guarnición—,
más typecheck y lint. La propiedad nueva cubre también la no repetición en el
segundo día. El estado serializado permanece idéntico tras construir y avanzar
la escena.

El observatorio ejecutó el flujo real **modal B2 → elegir `brace` → tick →
primera jornada** en las semillas 7 y 23, a través del renderer de producción:

| Semilla | Mensajero | Origen | Ruta inicial | Resultado |
|---|---:|---|---:|---|
| 7 | 68 | 23,5 · 72,5 | 20 hitos | regreso continuo, termina y no reaparece el día 20294 |
| 23 | 43 | 33,5 · 64,5 | 1 hito | llegada corta, termina y no reaparece el día 20294 |

Máximo simultáneo: **uno**. En ambas: 0 errores de página, 0 centros bloqueados,
0 penetraciones y 0 deriva entre cuerpo y malla. Los controles con la misma
amenaza y sin B2 registran cero mensajeros. La traza ya publica explícitamente
`warning`, `origin`, `phase` y `route`; no se infiere por diferencias de
posición.

Evidencia reproducible:

- `artifacts/graphics/E0b-messenger-live-final/seed-7-warning/`
- `artifacts/graphics/E0b-messenger-live-final/seed-23-warning/`
- `artifacts/graphics/E0b-messenger-final/seed-7-control/`
- `artifacts/graphics/E0b-messenger-final/seed-23-control/`

## Límite visual aceptado

A escala normal el cuerpo ocupa pocos píxeles: el significado no depende de un
gesto fino, sino de una silueta aislada que recorre desde fuera hacia la villa y
de la reunión que B2 ya provoca. No hay caballo, humo, marcador, texto ni cámara
forzada en el juego.

## Fuera de esta ronda

Pago de plata, semana posterior, segunda puerta, transición estacada→piedra,
ambiente por era, identidad del clan, adarve, fuego, gore y persistencia de
restos. No se tocó motor, balance ni resultado del asedio.
