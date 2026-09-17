---
name: valley-life-ai
description: Diseña, corrige y valida la IA escénica de aldeanos y fauna de The Valley: rutinas diurnas, regreso nocturno, navegación, colisiones, encuentros, animaciones y observación en el navegador.
metadata:
  short-description: IA de vida, navegación y animaciones de The Valley
---

# IA de vida de The Valley

Usa esta skill cuando cambies el comportamiento visible de aldeanos, niños,
mayores, especialistas, animales o sus interacciones. Su objetivo es que la
aldea parezca ocupada y coherente sin convertir la capa de presentación en una
segunda autoridad del juego.

## Límites que hay que conservar

- `src/engine/` decide población, recursos, sucesos, opiniones y consecuencias.
  `src/render3d/life/` sólo mantiene el estado escénico y nunca escribe en
  `GameState`.
- El movimiento es determinista: usa `LIFE_STEP`, la semilla recibida y claves
  estables. No uses `Math.random`, reloj, `performance.now` ni un RNG compartido.
- Una rutina puede elegir un destino sólo si el disco completo del cuerpo cabe
  en origen, destino y cada tramo. Valida también muros, edificios, portones y
  otros cuerpos; no basta con comprobar el centro.
- No inventes empleo persistente, producción, rasgos o consecuencias mecánicas
  para hacer que una animación parezca más completa. Si falta un destino real,
  asigna ocio y documenta el límite.
- Mantén una sola fuente de movimiento por especie. La separación entre cuerpos
  puede corregir lateralmente, pero no debe empujar a un cuerpo contra una pared
  ni anular la ruta durante varios segundos.

## Rutinas humanas

Calcula un plan estable por jornada después de crear los cuerpos y conocer sus
hogares. Asigna primero cargos con destino claro y después las cuotas de
`allocateLabour`, repartiendo los puestos por proximidad y reservando cada plaza.
El plan debe conservar `place`, `offer` y, cuando exista, `seat`.

- Herrero: puesto de herrería y gesto de martillo.
- Cura: iglesia o capilla y gesto de rezo; conserva la sotana/modelo existente.
- Guardabosques: tajo de tala y gesto de cortar.
- Administrador: granero y gesto de ordenar suministros.
- Dirigente: plaza y conversación/gossip.
- Agricultores, taladores y constructores: cuotas reales disponibles.
- Partera, herbolario, cazador o pescador: no inventes una interacción si el
  edificio o el ancla todavía no existe; usa ocio hasta que haya contrato.

Los niños no trabajan: elige puntos de juego cercanos y transitables. Los
mayores pasean, conversan y alternan puntos de descanso; un descanso puede ser
sentado aunque todavía no haya banco. Los desempleados usan ocio y conversación.
El viaje no consume el plazo de actividad: al llegar, conserva `until` y ejerce
la acción hasta que una necesidad urgente o el cambio de fase la interrumpa.
Durante el horario de trabajo evita que una charla ambiental robe el puesto a
alguien asignado que aún no ha llegado.

## Noche, puertas y atascos

Calcula `returnAt` con la longitud real de la ruta al hogar, incluyendo rodeos,
antes del ocaso. Conserva la etapa (`returning`, `opening`, `entering`,
`sleeping`, `leaving`) al reconstruir el estado escénico; reiniciarla cada
actualización provoca aldeanos que nunca llegan a dormir.

Una casa tiene cola de puerta: un solo propietario abre/entra/sale y los demás
esperan en plazas laterales transitables, nunca pegados al umbral. Si un cuerpo
quieto bloquea un pasillo estrecho, propone cesión: apartarse a un lado si cabe,
o retroceder por un segmento completamente libre. Reintenta una ruta atascada,
pero conserva el desvío mientras progresa y sólo vuelve al camino corto cuando
todos sus tramos estén libres de otros cuerpos.

Nunca resuelvas un atasco teletransportando ni ocultando el cuerpo. Registra el
residente, tick, etapa y ruta pendiente para poder reproducirlo.

## Encuentros y animaciones

Las escenas de saludo, charla, conflicto y riña deben reservar actores de forma
exclusiva, comprobar alcance y alternar turnos. La burbuja sólo aparece cuando
la pareja ha llegado y el actor está hablando; no la derives sólo de que dos
personas estén cerca. Un actor que trabaja o reza en su destino no debe iniciar
charla casual.

Cuando falte un gesto, deriva un clip procedural del esqueleto GLB existente.
Comprueba los nombres reales importados por `GLTFLoader` (`forearm.R` llega como
`forearmR`, por ejemplo) y modifica pistas de extremidades, no sólo el nombre
del clip. Los clips añadidos en la ronda de referencia son `sit`, `talk`, `pray`,
`hammer`, `chop`, `play`, `drink` y `sort`; mezcla las transiciones y conserva
la distancia recorrida al pasar de caminar a quieto. Las herramientas pequeñas
son geometría propiedad del actor y deben liberarse al cambiar de modelo.

## Método de comprobación

Antes de editar, lee `CLAUDE.md`, `docs/design.md` y el brief del módulo.
Después:

1. Ejecuta `npm run typecheck`, `npm run lint` y las pruebas rápidas dirigidas.
2. Empaqueta en una carpeta aislada con `npm run bundle -- --out ...` para no
   pisar el trabajo de otro agente.
3. Usa `tools/graphics/observe-life.mjs` sobre el bundle real. Para el día,
   genera `day-report.mjs` y comprueba puestos asignados/llegados, edad, acción,
   burbujas y clip aplicado. Para la noche, usa `--live --speed 64` y cuenta
   residentes durmiendo, pendientes, penetraciones, errores y deriva de malla.
4. Repite al menos dos semillas y anota semilla, año, fase, fps, velocidad,
   tick y cualquier pendiente en `docs/life-rounds/IA-<n>.md`.
5. Revisa capturas consecutivas de cada gesto nuevo y una toma de un niño y un
   mayor. Una captura aislada no demuestra que la animación se use.

Los fallos heredados se deben conservar como mediciones explícitas, nunca
convertirse en `it.fails` sólo para ocultar una regresión. Entrega el diff
completo, las rutas de evidencia seleccionadas y los límites que aún requieren
contratos de motor, anclas de edificios o revisión por especie.
