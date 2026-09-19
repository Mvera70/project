# OBS-02 · Conclusión del piloto

17 septiembre 2026. **Piloto cerrado. Batería completa no iniciada.**

## Decisión

No ampliar con el método actual. Tres agentes Luna independientes no localizaron
los defectos conocidos de marcha lateral y colocación del vado. Tampoco confirmaron
la separación excesiva entre personas. La puerta exigía detección concreta por dos
revisores y contraste del coordinador: no se cumple.

Esto no demuestra que Luna sea incapaz de ayudar ni mide toda su capacidad visual.
Demuestra que esta combinación de encargo, imágenes y revisión no es fiable para
el objetivo. La preparación del coordinador también falló: permitió reducir las
secuencias a miniaturas y no aseguró un ejemplo inequívoco de cada contacto.

## Ejecución y evidencia

Tres instancias nuevas `gpt-5.6-luna`, sin historial de la conversación. Cada una
recibió los mismos casos anónimos y guardó primero su lectura visual; después hizo
un contraste separado con trazas. No se les reveló cuál era anterior o posterior
ni se les corrigieron respuestas durante la prueba. Son independientes entre sí,
pero comparten modelo, instrucciones y evidencia: no equivalen a tres métodos.

Se reutilizaron 139 PNG archivados (61 + 61 + 17), copiados sin modificación y con
igualdad de hash verificada para todos. No hubo nuevas capturas, builds ni pruebas
del juego. Los revisores declararon inspección de todas las imágenes mediante
hojas de contacto y, dos de ellos, originales seleccionados. Eso no equivale a
reproducir una secuencia ni a revisar cada pie a tamaño suficiente.

Procedencia, hashes, criterio previo y alcance en [manifest.md](manifest.md).

| Objetivo | Luna 1, lectura visual | Luna 2, lectura visual | Luna 3, lectura visual | Auditoría |
|---|---|---|---|---|
| Marcha lateral, B frente a A | No localizada | Sin anomalía clara | Sin anomalía visible | 0/3 detecciones concretas; el contraste tampoco calcula orientación/avance |
| Separación excesiva entre humanos | Sospecha de proximidad, no de repulsión | No localizada | No localizada | 0/3; falta un evento aislado con espacio y cuerpos legibles para calibrar este defecto por separado |
| Vado colocado fuera del cauce, C | Sin anomalía visible | Cruce descrito como plausible | Disposición descrita como coherente | 0/3; la estabilidad de una malla no prueba que esté bien colocada |

A corresponde al arreglo IA-14 y B a la versión anterior. A no es un control
negativo certificado: no se ha probado que esté libre de todos los defectos.
Por ello no calculamos especificidad, tasa global de acierto ni calidad de toda
la IA a partir de estos tres casos.

El coordinador recalculó en las trazas archivadas la desalineación >60° cuando
la velocidad supera 0,5: **B 485/1063 (45,6 %), A 44/1089 (4,0 %)**. Confirma el
contraste documentado en IA-14. Incluye personas fuera de cámara, por lo que no
es una tasa de fallos visibles ni mide apoyo del pie. Se revisaron además A/B
0023–0037 en recortes del portón y B0030 a tamaño original: la orientación de los
cuerpos varía entre versiones, pero el contacto sigue ocluido en varios momentos.

C0000 muestra una losa a la derecha sobre terreno verde y otra bajo un montón,
sin una continuidad visual clara del cruce. El desplazamiento por transformación
ya estaba medido en OBS-01. La imagen permite cuestionar su colocación; no permite
diagnosticar por sí sola el pivote exacto. Ninguno de los revisores lo señaló.

## Por qué no funcionó

1. **Se perdió detalle al organizar las imágenes.** Las hojas de 15 fotogramas
   miden 1600×600, 1200×555 y 1200×525. Son útiles para localizar eventos, pero
   reducen cada cuerpo a una miniatura. Ampliar tres fotogramas no recupera la
   continuidad de una zancada. El piloto no aseguró reproducción temporal real.
2. **Se buscó atravesar paredes más que caminar bien.** Los informes describen
   posiciones cambiantes, entorno estable y ausencia de penetración; no identifican
   pie en apoyo, eje corporal o instante de separación. Parte del problema es que
   el encargo seguía reuniendo tres objetivos visuales diferentes.
3. **La traza volvió a dar una tranquilidad indebida.** Cero penetración y clips
   presentes son compatibles con marcha lateral, repulsión excesiva y losas mal
   situadas. Los agentes no calcularon la diferencia rumbo/avance que estaba
   disponible, ni aislaron un par de cuerpos en contacto durante un intervalo.
4. **La unanimidad no basta.** Los tres omitieron los mismos problemas. No se puede
   aprobar por mayoría sin evidencia que corresponda al comportamiento juzgado.

## Rectificaciones de los informes, conservados sin reescribir

- Luna 3 propone sospecha de instrumentación porque C es live y su tick no cambia.
  C dura 8 s a ×64: 512 segundos escénicos, menos que los 840 de una semana/tick.
  Por tanto, tick 0→0 no demuestra fallo. Luna 2 lo formula más prudentemente como
  falta de evidencia de avance persistente; esa limitación sí es válida. No era
  necesario validar persistencia para juzgar la colocación estática del vado.
- La frase de Luna 2 «visualmente, los 27 aldeanos» excede la evidencia: 27 es la
  población de la traza, no un inventario de cuerpos visibles y seguidos en cámara.
- Proximidad o solape por perspectiva no demuestra contacto físico; del mismo modo,
  cero penetraciones no refuta una repulsión anticipada. La sospecha de Luna 1 no
  cuenta como detección del defecto que queríamos reconocer.

## Propuesta para una decisión posterior, no ejecutada

No lanzar todavía los 24 encargos. Preparar primero un único cruce humano con
cámara fija y cuerpos grandes, recorrido completo a velocidad normal y revisión
cuadro a cuadro de pies. Separar después una prueba de marcha de otra de contacto.
Añadir vistas del vado con límites de terreno como evidencia de contraste, después
de la lectura visual sin ayudas. Exigir coordenadas/frames del defecto y conservar
el «no puedo verlo» como resultado válido. Repetir la calibración solo si el usuario
lo decide; si vuelve a fallar, cambiar el método de revisión antes de escalar.

Luna puede ayudar ya a inventariar casos, extraer métricas y localizar candidatos,
con auditoría. Este piloto no justifica delegarle la aprobación visual de la aldea.
No se ha medido coste monetario ni consumo individual de tokens; no se inventa
una estimación a partir del número de imágenes.

## Informes originales

- Luna 1: [visual](luna1-visual.md), [contraste](luna1-contrast.md).
- Luna 2: [visual](luna2-visual.md), [contraste](luna2-contrast.md).
- Luna 3: [visual](luna3-visual.md), [contraste](luna3-contrast.md).

Se cierra aquí lo autorizado: sin correcciones, segunda calibración, ejecución de
los 24 encargos, commit o push. Solo informes y artefactos locales de observación.

Ampliación posterior autorizada por el usuario: [comparación Terra/Sol y propuesta de recopilación](model-comparison.md). También cerrada, sin iniciar la batería.
