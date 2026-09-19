# OBS-02 · Plan de auditoría visual y de comportamiento

17 septiembre 2026. **Plan original; piloto posteriormente ejecutado y cerrado.** Véase [conclusión del piloto](pilot/conclusions.md). El texto siguiente conserva el alcance de la planificación inicial. El usuario ha pedido organizar la
batería y diagnosticar el método antes de lanzar agentes. No autoriza todavía su
puesta en marcha. Este documento no certifica el estado actual del juego.

## Diagnóstico del método anterior

Base documental: [conclusiones OBS-01](../OBS-01/conclusions.md), sus informes y
[IA-14](../../historico/life-rounds/IA-14.md). No se han repetido sus pruebas para este plan.

- Nueve tomas y 627 imágenes no equivalen a 627 imágenes inspeccionadas. Se revisó
  una selección; los planos generales ocultaban pies, manos y contactos.
- Los ámbitos día/noche/fauna eran demasiado amplios. Llegar al puesto y elegir
  un clip correcto no demuestra una zancada, un gesto o una interacción creíble.
- La batería no detectó la repulsión y la marcha lateral que señaló el usuario.
  Los contadores verdes generaron una confianza que las imágenes no justificaban.
- Hubo errores de interpretación: agrupar noches por tick escondió una noche
  fallida; un seguimiento posterior arrancó en otro tick y no reprodujo el caso.
- La ausencia de especies y ancianos dejó huecos. Una gallina de unos pocos
  píxeles no permitía evaluar articulación. Fauna ambiental y física se mezclaron.
- El primer bundle no arrancaba por una edición concurrente. Faltó comprobar una
  versión estable antes de repartir el trabajo.

Conclusión: hace falta mejorar selección de escenas, escala, revisión temporal e
independencia de los juicios. Multiplicar agentes con el protocolo anterior
multiplicaría informes y podría repetir sus omisiones. No conocemos aún todos los
fallos actuales; este es un diagnóstico de nuestra capacidad para encontrarlos.

## Responsabilidades y límites

El coordinador prepara casos, controla versiones, revisa contradicciones y decide
qué conclusiones tienen evidencia. Luna observa y mide; no modifica código,
modelos, umbrales, pruebas ni documentación normativa. Cada encargo escribe solo
su informe y sus artefactos, en una carpeta propia. Ningún agente hace commits,
merge o push durante la auditoría. Los cambios concurrentes quedan fuera del
bundle fijado. Los arreglos serán una ronda posterior.

Usar la [skill de observación](../../../.claude/skills/observe-valley-life/SKILL.md)
y su contrato. Los nombres de archivos y campos existentes no implican que ya
haya herramientas para todas las mediciones propuestas abajo.

## Fases propuestas, pendientes de lanzamiento

1. **Preparación técnica:** elegir commit estable, empaquetar una vez, registrar
   hash y confirmar arranque, renderer 3D y población. Inventariar qué sujetos,
   edificios y especies hay realmente. Ningún trabajador recompila el bundle.
2. **Piloto de calibración:** tres Luna revisan de forma independiente las mismas
   secuencias archivadas: contacto humano, marcha y vado, incluyendo controles
   anteriores y posteriores cuando existan. Se ocultan las etiquetas de resultado
   y los resúmenes previos, no los datos necesarios para interpretar la escena.
   Cada uno entrega primero observación visual; después contrasta la traza.
3. **Puerta de ampliación:** cada defecto conocido debe ser localizado en una
   secuencia concreta por al menos dos revisores y confirmado por el coordinador.
   Revisar también falsos positivos y controles sin defecto conocido, que no se
   presuponen perfectos. Si no se logra, mejorar encuadre, secuencia o herramienta
   y repetir el piloto; no lanzar los 24 encargos para compensarlo con volumen.
4. **Batería:** ejecutar los 24 encargos siguientes en olas de hasta tres Luna.
   Empezar por movimiento/contactos y puertas. Reutilizar capturas cuando sirven;
   inicialmente solo un productor de capturas para evitar contención de navegador.
   Los otros agentes pueden revisar evidencia ya generada.
5. **Auditoría:** una segunda lectura independiente de cada hallazgo y de los
   casos declarados sin anomalías, sin enseñar el veredicto inicial. El coordinador
   resuelve discrepancias contra evidencia y publica prioridades y cobertura.

Los tres revisores del piloto y las segundas lecturas son trabajo adicional a
los 24 encargos temáticos, no 24 procesos simultáneos. Antes de ampliar se medirá
el coste y tiempo del piloto; no hay estimación fiable todavía. Cada bloque debe
ser revisable en menos de media hora: si no responde a su pregunta, se acota o se
corrige la instrumentación. No encadenar horas de capturas sin revisión.

## Reparto de los 24 encargos Luna

| ID | Ámbito | Casos que debe distinguir |
|---|---|---|
| 01 | Marcha recta | Pies en apoyo, deslizamiento, velocidad y longitud de paso |
| 02 | Giros | Esquinas, inversión de rumbo, cuerpo frente a dirección real |
| 03 | Arranque y parada | Transiciones idle/walk, frenado, vibración |
| 04 | Tallas y carga | Niño/adulto/anciano; marcha con objeto y sin él |
| 05 | Cruce frontal | Separación visible, desvío y recuperación de ruta |
| 06 | Cruce lateral | Alcances, adelantamientos, desplazamiento lateral brusco |
| 07 | Grupos | Plaza y cuello de botella; inmóviles junto a caminantes |
| 08 | Obstáculos | Fachadas, esquinas, carro, troncos y lápidas |
| 09 | Murallas | Portón, pasos estrechos y ruta alternativa ante bloqueo |
| 10 | Puertas | Acercamiento, apertura, entrada, cierre y salida completos |
| 11 | Campo y acarreo | Puesto dentro del campo, herramienta, manos y entrega |
| 12 | Oficios interiores | Herrero, cura y demás puestos presentes; llegada y gesto |
| 13 | Otros trabajadores | Catálogo real restante; puesto, tarea y fin del turno |
| 14 | Niños | Juego individual y conjunto, encuentro y separación |
| 15 | Ancianos | Paseo, charla, descanso sentado y retorno a actividad |
| 16 | Desempleados | Paseo, charla, espera y ausencia de bucles repetitivos |
| 17 | Gallina | Andar, picotear, rascar, transiciones y reacción |
| 18 | Vaca | Marcha, reposo, alimentación y encuentros disponibles |
| 19 | Cerdo | Marcha, reposo, alimentación y encuentros disponibles |
| 20 | Lobo | Marcha/carrera, reacción e interacción disponible |
| 21 | Fauna ambiental | Pez y cuervo por separado; trayectoria y articulación |
| 22 | Interacciones y burbujas | Humano-humano y humano-animal: inicio, gesto, texto y fin |
| 23 | Noche y continuidad | Cada amanecer, residentes pendientes, día siguiente con motor vivo |
| 24 | Entorno y exploración libre | Vado, rocas, cultivos, mallas giradas; anomalías no anticipadas |

El inventario inicial ampliará especies/oficios si el catálogo real contiene más.
Cada encargo tendrá casos numerados separados: cubrir uno no aprueba sus vecinos.
En movimiento poblacional, usar al menos dos aldeas y varias jornadas; incluir
una escena poco densa y otra concurrida. No se fijan semillas para sujetos raros
sin comprobar primero que existen. Registrar cuántos casos quedaron sin observar.

## Cómo construir una evidencia útil

- Dos vistas cuando proceda: contexto para ruta y primer plano para cuerpos.
  El encuadre debe permitir distinguir pies/manos y el contacto que se juzga.
  Si están ocultos o demasiado pequeños, la toma es insuficiente.
- Movimiento: secuencia de 4–8 segundos a 15 fps, a velocidad normal, con antes,
  durante y después del contacto. Si el evento no cabe, ampliar o dividir sin
  perder continuidad. Revisar la secuencia completa y los apoyos cuadro a cuadro;
  una hoja de contactos por sí sola no prueba una zancada.
- Rutas: tomas de 30–45 segundos a 2 fps para localizar eventos, seguidas de detalle.
  Puertas necesitan detalle temporal de la hoja además del estado lógico.
- Ciclos: modo vivo; registrar ticks y cada entrada de nightOutcomes. Nunca usar
  ×64 para juzgar la naturalidad de piernas. Reproducir el instante fallido exacto,
  no solo el mismo id en otro momento de la partida.
- Los escenarios naturales prueban ocurrencia. Una escena controlada con el
  renderer real puede aislar un cruce o una especie rara, pero se etiqueta como
  artificial y no demuestra frecuencia ni activación normal. Preparar ese soporte
  será trabajo futuro si no existe; no inventar comandos de herramientas.
- La primera lectura describe únicamente lo visible. La segunda compara intención,
  velocidad real, orientación, clip y estado. Una discrepancia entre ambas es un
  hallazgo para investigar, no una razón para ignorar la imagen.
- Medidas propuestas: ángulo orientación/avance, salto de posición, distancia
  corporal visible, deriva del pie durante apoyo y tiempo sin progreso. Identificar
  cuáles aporta ya la traza y cuáles requieren nueva instrumentación. No imponer
  umbrales universales antes de calibrarlos por talla, velocidad y perspectiva.
- Cero penetración de discos no prueba cero intersecciones de mallas. Medir la
  geometría transformada cuando el problema sea visual. Un nombre de animación no
  prueba movimiento de huesos; un estado de puerta no prueba giro de su hoja.

## Brief reutilizable para cada encargo

> Tier: medir. Modelo solicitado por el usuario: gpt-5.6-luna.
> Encargo OBS-02-[ID]. Lee la skill y el contrato de observación del proyecto.
> Examina únicamente los casos asignados del manifiesto y el bundle indicado.
> No modifiques el juego ni reconstruyas el bundle. No leas otros veredictos antes
> de entregar tu primera observación visual. Describe secuencias concretas y luego
> contrasta la traza. No confundas ausencia, mala visibilidad o estado lógico con
> éxito. Escribe solo tu informe y artefactos en las rutas asignadas. Si falta el
> sujeto, el evento o una herramienta necesaria, informa el bloqueo y detente en
> ese caso; continúa únicamente los independientes. No declares causas demostradas
> a partir de una apariencia. Entrega el siguiente formato, con límites explícitos.

Antes de enviarlo, el coordinador debe rellenar ID, casos, rutas, bundle/hash,
parámetros, sujetos, comportamiento esperado y presupuesto de tiempo del encargo.
El manifiesto de casos se creará después de inventariar el bundle, no se simula hoy.

## Formato de cada resultado

1. Caso, versión/hash, comando exacto, semilla/año, id, jornada/tick/fase y velocidad.
2. Comportamiento esperado y fuente (diseño, brief o criterio visual acordado).
3. Intervalos efectivamente revisados, enlaces a secuencia y fotogramas relevantes.
4. Qué se ve, qué dice la traza y en qué coinciden o discrepan.
5. Resultado: **anomalía confirmada**, **sospecha**, **sin anomalía en el intervalo**,
   **no apareció** o **evidencia insuficiente**. Nunca «todo funciona».
6. Impacto, reproducción mínima, hipótesis causal separada de los hechos y límites.

El coordinador entregará un índice de casos cubiertos y pendientes, hallazgos
agrupados sin borrar reproducciones diferentes, prioridad según impacto visible,
y correcciones propuestas. Diferenciar problemas del juego de fallos del banco de
pruebas. No usar el número de PNG o tests verdes como porcentaje de calidad visual.

## Estado de entrega de esta planificación

Solo documentación. Cero agentes lanzados, cero pruebas o grabaciones nuevas.
Pendiente: decisión del usuario sobre iniciar preparación y piloto. La batería
completa depende además de que el piloto demuestre capacidad de detectar fallos.
