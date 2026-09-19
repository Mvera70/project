# OBS-02 · Comparación final Luna, Terra y Sol

17 septiembre 2026. Finalizada la ampliación autorizada: tres Luna del piloto,
un Terra y un Sol. **Paramos aquí. No se lanza la batería ni se corrige el juego.**

## Resultado

Cambiar el modelo no resolvió la detección visual en estas tomas. Ningún revisor
localizó concretamente la marcha lateral ni el vado desplazado en su lectura
ciega. Los contrastes más elaborados produjeron datos útiles y también nuevas
interpretaciones erróneas. La cantidad de análisis no equivale a mejor diagnóstico.

| Revisor | Primera lectura visual | Contraste posterior | Evaluación del coordinador |
|---|---|---|---|
| Luna, 3 ejecuciones | Ninguno detecta los objetivos; uno sospecha proximidad | Predominan contadores generales y clips | No sirven aquí como aprobación visual autónoma |
| Terra, 1 ejecución | No encuentra anomalía inequívoca; prudente con oclusión | Extrae distancias, saltos y estados | Útil para localizar datos; omite efecto de ×64 y cuerpos ocultos al interpretar sospechas |
| Sol, 1 ejecución | Declara solapes humanos en el portón; no distingue mejora A/B; no detecta vado | Cuenta parejas cercanas y favorece B por mayor separación | Más detalle cuantitativo, pero interpreta la dirección del arreglo al revés y no demuestra penetración |

Esto compara ejecuciones concretas, no capacidades universales. Misma evidencia
y protocolo general; cada agente escogió sus auxiliares y cobertura. Luna revisó
hojas del conjunto; Terra revisó A0000–0014 y B0020–0034, que no son el mismo
intervalo; Sol revisó A/B0000–0014 y 0023–0037. Todos revisaron vistas C. Terra
empleó imágenes directamente y Sol hojas más originales seleccionados. Ninguno
aportó una medición de apoyo del pie ni detección visual concreta del defecto.

No hay base para pagar más esperando que solo el cambio de modelo resuelva esta
forma de observación. Tampoco hay medida comparable de coste monetario o tokens.

## Auditoría de Terra

- Distingue correctamente penetración contra sólidos de contacto entre personas.
  Los mínimos de distancia son datos candidatos, no conclusiones por sí solos.
- En C, las distancias casi nulas de frames 0002, 0006 y 0010 corresponden a ambos
  residentes **sleeping y sin cuerpos en renderedPeople**. No sustentan una
  sospecha fuerte de choque visible: comparten la vivienda y están ocultos.
- Sus saltos entre imágenes están separados por 0,5 s del navegador a ×64:
  **32 segundos escénicos**, no medio segundo de marcha normal. Por ejemplo,
  13,83 unidades en ese intervalo no demuestra teletransporte. Dos extremos
  `day → day` tampoco descartan estados intermedios en esos 32 segundos.
- Tick 0→0 no demuestra defecto: la toma suma 512 segundos escénicos y un tick
  semanal requiere 840. Solo limita la evidencia de persistencia.
- El visual llama 15 fps a C; el contraste lo corrige a 2 fps. A/B sí siguen un
  cuerpo (`follow 3`) aunque el campo de visión incluya muchos; la frase «no hay
  cámara de seguimiento» no describe correctamente la captura.

## Auditoría de Sol

- No usa ciegamente cero penetraciones para descartar contacto humano y distingue
  correctamente sueño oculto en C y duración insuficiente para un tick. Es un
  contraste más pertinente en esos puntos.
- Pero denomina «contactos severos» a distancias <0,4 o <0,5 sin demostrar la
  relación con mallas y tallas. Una pareja citada (3/30, A0032) combina adulto de
  45 años y niño de 4; el mínimo B0044 también incluye al niño 30. Un umbral de
  centros uniforme no puede convertirse directamente en gravedad de colisión.
- Su conclusión favorece B porque hay menos parejas cercanas. **B es la versión
  anterior con separación excesiva; A es la corrección de IA-14.** La reducción
  de distancia era intencionada. Esto no demuestra que A sea perfecto; demuestra
  que su criterio de mejora no permite evaluar el defecto solicitado.
- Superposición de siluetas en perspectiva no prueba intersección de volúmenes.
  La confianza alta en «anomalía de contacto» excede lo demostrado. Sus sospechas
  de cerca/atasco quedan pendientes, no se convierten en errores confirmados.
- También describe ausencia de seguimiento individual pese al `follow 3` original.

Conservamos las respuestas originales intactas para que se pueda auditar esta
conclusión, sin corregir retroactivamente a los revisores.

## Propuesta del usuario: Luna recopila, el coordinador analiza

**Sí, es un reparto más adecuado y distinto del que acabamos de evaluar.** Luna
puede ejecutar encargos cerrados, recopilar originales y trazas, registrar
parámetros y señalar ausencia del sujeto o errores de captura. El coordinador
analiza visualmente el conjunto y contrasta las métricas antes de diagnosticar.

Antes de una recopilación grande hace falta comprobar un pequeño lote: encuadre,
cuerpos suficientemente grandes, evento completo, tiempo y datos sincronizados.
Después puede recogerse el lote y analizarse al final. No hace falta que Luna
acierte el diagnóstico para producir evidencia útil, pero sí que no descarte
escenas porque sus contadores estén verdes.

El límite práctico será cuánto material puede revisar realmente el coordinador.
Evitar miles de imágenes con solo unas pocas inspeccionadas: casos numerados,
secuencias completas, índice y muestras sin alertas, además de candidatos. El
coordinador también debe justificar cada conclusión y admitir evidencia insuficiente.

[Reparto y ficha de recopilación](../collection-workflow.md), preparado, no ejecutado.

## Entrega y parada

- [Protocolo de comparación](comparison-protocol.md).
- Terra: [visual](terra-visual.md), [contraste](terra-contrast.md).
- Sol: [visual](sol-visual.md), [contraste](sol-contrast.md).
- [Piloto Luna y sus tres pares de informes](conclusions.md).

Cinco revisores en total, diez informes originales, tres casos archivados y 139
PNG únicos. Sin nuevas grabaciones, builds, tests, cambios al juego, commit o push.
El siguiente paso queda pendiente de decisión del usuario.
