# P-1a.1 · Comparación controlada de la app real

**Cierre local:** 22 sep 2026. Esta subfase está cerrada; P-1a sigue abierta.

## Pregunta y método

¿La lluvia nocturna aumenta de forma consistente el coste frente a la misma
noche despejada? `bench-app.ts` abrió el preset real de semilla 11/año 21 en Edge
headless, a 390 × 844 y DPR 2. Tres réplicas por condición, diez segundos de
cadencia tras cinco de estabilización; cada réplica usó un contexto nuevo y el
orden de condiciones rotó. El control local fijó sólo fase solar y cielo del
renderer. El año, los 48 habitantes, el motor y los guardados no cambiaron.

Datos crudos:
`artifacts/graphics/P-1a-app/2026-09-22T13-12-06-413Z-00/run.json`.
Tabla, entorno y límites: [medida P-1a](../../medidas/p1a-rendimiento-seed11-year21-2026-09-22.md).

## Veredicto de esta subfase

Noche despejada y noche lluviosa dieron el mismo intervalo RAF p95/p99:
7,0/7,1 ms en las tres réplicas de cada una. Las tareas largas registradas
ocurrieron durante la entrada, antes de la cadencia estabilizada. No hubo
errores de página. **La lluvia no mostró sobrecoste consistente en este
entorno**; esta evidencia no justifica retocar el efecto.

El primer arranque de día despejado fue una excepción de entrada y p99, pero
no se repitió. El clic de entrada registró 480–792 ms en Event Timing. Esa
duración no es una medición de INP de la sesión ni atribuye la tarea larga a
una función. Tampoco se midieron GPU, Edge interactivo, caché caliente o móvil.
El fallo visual de sombras de día comunicado por Vera es otro diagnóstico.

## Puerta y siguiente ronda

Typecheck, ESLint focal y `git diff --check` pasaron; el runner terminó con
código 0 y conservó nueve muestras sin sobrescribir las anteriores. La puerta
de esta comparación queda cerrada. P-1a requiere medir respuesta real en Edge
interactivo, distinguir entrada de interacción posterior y atribuir la carga
antes de elegir un candidato de P-1b. El brief sigue en
[plan-rendimiento.md](../../plan-rendimiento.md).
