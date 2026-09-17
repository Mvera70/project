# OBS-01 · Conclusiones auditadas

Tres agentes `gpt-5.6-luna`, con revisión de evidencia por el coordinador.
17 septiembre 2026. Esta tanda observa y documenta; no modifica el juego.

## Resultado

La batería sirve para separar una rutina que se ejecuta de una representación
correcta. Reproduce un regreso nocturno incompleto y detecta que G-24 dejó una
losa desplazada, pese a tener pruebas y contadores verdes. No certifica toda la IA.

| Prioridad | Hallazgo | Evidencia y conclusión |
|---|---|---|
| Alta | WLD-01: una losa gira fuera de su celda | GLB real transformado: la raíz está en x=38, pero todos sus vértices en x=37.033…37.888. Corregir pivote y probar cuatro orientaciones. |
| Alta | Regreso nocturno del residente 155 | Semilla 43/año 60, tick 2834: una noche termina 31/32. A 35 s, frame 0070, sigue `returning` con rodeo pendiente. Fallo ya documentado en IA-12, reproducido aquí. |
| Media | WLD-02: continuidad del agua del vado | `buildWater` excluye el terreno de vado. Confirmado en código; verificar impacto visual junto al arreglo del pivote. |
| Instrumentación | INS-01: captura de una edición incompleta | Bundle inicial falla en `paint` con undefined reading cell. No atribuirlo a versión terminada. Añadir prueba de arranque antes de repartir tomas. |

La frase anterior de G-24 «ambas losas dentro del cauce» queda rectificada por
WLD-01. El arreglo de selección de celdas existe, pero era insuficiente.

## Qué sí se ha comprobado

| Ámbito | Cobertura real | Resultado |
|---|---|---|
| Día | 11/20 y 43/60, 45 s a 2 fps; 27 y 36 personas | 15/15 y 21/21 puestos alcanzados; cero discrepancias de charla o clip según day-report. |
| Noche viva | 7/1 y 43/60, 42 s a 2 fps y ×64 | 22/22 y 21/22 noches completas. Ticks 0→3 y 2832→2835: el motor sí avanzó. |
| Fauna general | Dos tomas de 15 s a 2 fps | Una gallina física en 11/20; peces ambientales en ambas. |
| Animación | Dos seguimientos de 4 s a 15 fps | Gallina y pez. El tamaño en píxeles limita la articulación fina; intención peck/scratch no demuestra un gesto diferente. |
| Geometría | Semilla 7/1 y GLB publicado | Confirmado desplazamiento por pivote. No es una auditoría de todos los sólidos. |

Nueve tomas válidas, 627 fotogramas capturados, incluyendo un seguimiento nocturno
adicional de 6 s a 15 fps y ×64. Este seguimiento comienza en tick 2832 y no
reproduce el amanecer fallido de tick 2834; no sirve para darlo por resuelto.
Los agentes y el coordinador han inspeccionado una selección documentada, no
los 627 individualmente. Todos los
resúmenes de esas tomas tienen cero errores, deriva y penetraciones muestreadas.
Esos contadores físicos no cubren peces ambientales ni intersecciones entre mallas
estáticas. Los habitantes sin casa no se cuentan como fallos de regreso.

## Cobertura pendiente

Ancianos, clasificación individual de desempleados, vaca, cerdo, lobo, cuervo,
encuentros completos persona-animal y articulación fina de todos los gestos.
No aparecieron en las muestras o no tuvieron encuadre suficiente. No se ha
demostrado que fallen ni que funcionen. Los planos generales tampoco permiten
certificar cada contacto de manos, herramienta y puesto.

Siguiente tanda: escoger primero partidas que contengan esos casos, registrar
ids y encuadrarlos; una toma sin el sujeto no consume la casilla como «aprobada».
Para puertas conservar entrada y salida completas a 15 fps con suficiente cercanía.

## Revisión de los informes

Se contrastaron las noches contra `nightOutcomes`, incluida la fallida, y los
frames 0069–0071 de la aldea 43. Se reabrieron PNG diurnos y de gallina. Se midió
la malla del vado con GLTFLoader y Box3. Se pidieron correcciones de atribución de
tiempos, hash, enlaces y distinción entre intención y animación a los agentes.
El primer resumen nocturno agrupó por tick y ocultó la noche fallida: se corrigió
contando cada entrada de `nightOutcomes` (un tick contiene varias noches).

Las observaciones válidas pertenecen al bundle de control G-24, hash
`EBCDFB4B320C16B212C8A748081841FEB05B2A33E28C2138ED500E6F5C6530AE`.
El bundle inicial OBS-01 fallido se conserva separado. No se certifica la UI
concurrente posterior. Capturas y trazas permanecen en `artifacts/graphics/OBS-01/`;
los comandos y límites están documentados para repetir la tanda.

## Informes y repetición

- [Protocolo y matriz](protocol.md)
- [Rutinas diurnas — Luna](day.md)
- [Noche, puertas y rutas — Luna](night.md)
- [Fauna y animaciones — Luna](animals.md)
- [Geometría e instrumentación — coordinador](world.md)
- [Mediciones extraídas de las nueve trazas](measurements.json)


