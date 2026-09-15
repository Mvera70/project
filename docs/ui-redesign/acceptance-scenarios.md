# The Valley — escenarios de aceptación del rediseño

**v1.0 · 15 de septiembre de 2026 · Base leída: `d2b85b7`.**
**Estado: especificación de pruebas y revisión; ningún caso se ha ejecutado.**

## 0. Para qué sirve

Este documento convierte [el plan de implementación](implementation-plan.md)
en recorridos verificables. Lo leen los agentes responsables de cada módulo y
el coordinador que revisa su entrega. No sustituye las decisiones del plan ni
la normativa de `docs/design.md`; concreta qué observar para aceptarlas.

No obliga a construir toda la batería antes de la primera pantalla. Cada agente
verifica los casos de su módulo conforme lo implementa; UI-R6 recorre el conjunto.
Los cambios de diseño se resuelven en UI-R0 o con el coordinador, no adaptando
una prueba para que el resultado existente parezca correcto.

### Hechos comprobados al preparar esta guía

- `tools/valley.shots.ts` pide Canvas explícitamente para la mayoría de sus
  recorridos. No acredita que los mismos flujos funcionen con WebGL.
- Hay un caso marcado `test.fail()` que espera una encrucijada concreta tras
  58 segundos. Su propio comentario documenta que esa trayectoria ya cambió.
- Ya hay utilidades de reloj de prueba que calculan semanas mediante
  `TIME.REAL_MS_PER_TICK`, y ejemplos de retorno desde segundo plano.
- La aplicación publica señales como `data-app-ready`, `data-screen`,
  `data-tick` y `data-sun-phase`. Se puede reutilizar su observación, pero una
  etiqueta de estado no demuestra por sí sola que la pantalla sea utilizable.
- El guardado usa IndexedDB `the-valley`, almacén `saves`, clave `current`.
  Los fixtures se cargan únicamente en contextos de navegador de prueba aislados.

## 1. Reglas de preparación y observación

### 1.1 Dos clases de caso

**Recorrido de producto:** arranca por el menú real, usa botones/gestos y
observa la aplicación integrada. Es obligatorio para navegar, seleccionar,
contestar, guardar y volver de segundo plano.

**Caso dirigido:** prepara un estado válido para forzar una situación poco
frecuente, como una persona que muere con su ficha abierta. Después usa el mismo
componente o aplicación que el producto. Una prueba de componente acredita
su comportamiento local; no acredita el cableado de `app.ts`.

Usar pruebas puras para invariantes de datos, pruebas de componente para
actualizaciones y recorridos de navegador para integración. No repetir la misma
aserción en todas las capas sin una razón concreta.

### 1.2 Preparar fixtures sin depender del azar

El agente de cada módulo define el fixture que necesita en su fichero de prueba.
Si hace falta un generador compartido, el coordinador asigna un único propietario
y añade el fichero al brief antes de que dos agentes lo creen por separado.

| Fixture | Condición que debe demostrar antes de empezar |
|---|---|
| F-NEW | Fundación normal con semilla registrada; sin partida previa |
| F-WORK | Obra válida en curso; `doingNow` produce el mensaje esperado |
| F-DECISION | Encrucijada pendiente del catálogo real, reparto válido y opciones existentes |
| F-READER | Crónica con contenido suficiente para desplazar; un archivo anterior distinguible |
| F-PERSON | Persona nombrada y presente, id conocido y datos válidos de ficha |
| F-ABSENT | Actualización de F-PERSON en que muere o se marcha, con campos coherentes |
| F-END | Partida terminada válida que activa el epitafio y contiene crónica |
| F-LONG | Textos/nombres y valores largos, preparados solo para probar maquetación |

Para generar partidas mediante simulación, usar `run` con política registrada.
Para capturar una decisión pendiente, detener la búsqueda cuando se plantee,
antes de contestarla. La búsqueda tiene un límite explícito de semanas y
devuelve un error si no la encuentra; nunca un bucle ilimitado ni una espera
ciega en segundos. Registrar cómo se obtuvo cada fixture y qué campos se tocaron.

F-LONG no demuestra que ese estado sea frecuente ni alcanzable en una partida.
F-ABSENT puede probarse primero con actualización de componente; su integración
debe verificarse además con el flujo real que refresca la selección.

No inventar una propiedad `window.app`, un endpoint de prueba o un método público
para cambiar arbitrariamente el estado. Si falta observabilidad, el coordinador
elige una vía acotada antes de añadir código de soporte.

### 1.3 Qué comparar

Para navegación sin mutación, pausar, dejar terminar la actualización pendiente,
capturar el estado y realizar las acciones. Comparar el estado del juego, no la
fecha de escritura del guardado ni el DOM. La prueba local compara además RNG.
Una comparación mientras el juego corre mezcla cambios legítimos del tick con
efectos de navegación y no sirve para demostrar ausencia de mutaciones.

Para comprobar el reloj 3D, leer hora y fase en una misma evaluación de página,
con el reloj controlado. Usar `hourAt` como fuente esperada. El caso 3D falla o
queda bloqueado si no se demuestra que el backend activo es 3D; no se omite la
aserción porque falte la fase. Registrar la caída a Canvas por separado.

Elegir elementos por rol y nombre accesible. Usar atributos estables cuando
la semántica no permita distinguirlos. No congelar clases CSS, orden interno
del DOM o colores históricos si no son parte de una propiedad del diseño.

## 2. Casos de aceptación

Cada caso exige estado inicial, acción y resultado. «Se ve bien» o una captura
sin explicación no sustituyen el resultado esperado.

### AC-01 — Primera mirada · UI-R1/UI-R2

**Dado:** F-NEW, 390 × 844, backend 3D confirmado, introducción completada.
**Cuando:** se observa el valle sin abrir una consulta.
**Entonces:** hora y fecha legibles, cuatro indicadores con su significado,
velocidad actual y acceso a órdenes; navegación disponible; al menos la mitad
de la altura útil libre de paneles. No aparecen claves de traducción.
**Evidencia:** captura completa y medida de área ocupada por los paneles.

### AC-02 — Obra y respuesta a una orden · UI-R2

**Dado:** F-WORK; una segunda variante en que `answerFor` devuelve un motivo.
**Cuando:** se consulta la actividad y se cambia una orden desde la bandeja.
**Entonces:** la frase corresponde al estado; la respuesta usa su texto real;
no se muestra una fecha estimada ficticia ni se duplica permanentemente el aviso.
**Evidencia:** clave/parámetros de origen y captura de ambas variantes.

### AC-03 — Órdenes completas · UI-R2

**Dado:** partida pausada e intención conocida.
**Cuando:** se visita cada opción de `INTENT_STOPS` y `PRIORITY_STOPS`.
**Entonces:** valor y etiqueta coinciden; las otras órdenes se conservan; cerrar
y reabrir mantiene la selección. Abrir sin elegir no modifica la intención.
**Evidencia:** comparación de intención antes/después y recorrido de aplicación.

### AC-04 — Velocidad y pausa · UI-R2

**Dado:** partida activa.
**Cuando:** se elige cada velocidad disponible, incluida pausa, y se cambia de
consulta mientras está pausada.
**Entonces:** se refleja la selección de `TIME.SPEEDS`; el tick permanece fijo
durante la navegación pausada; reanudar conserva la orden elegida.
**Evidencia:** valores de velocidad y tick. Los intervalos se derivan del reloj
vigente; no se copian los 15 segundos de documentación histórica.

### AC-05 — Navegación y salida · UI-R1/UI-R5

**Dado:** Valley, juego pausado.
**Cuando:** Valley → Chronicle → People → Valley; repetir usando el cierre
visible y Escape donde corresponda.
**Entonces:** una consulta principal como máximo; pestaña y contenido coinciden;
canvas conservado; sin cambios en el estado; foco vuelve a un control disponible.
**Evidencia:** recorrido y comparación de estado; inspección de controles activos.

### AC-06 — Gesto de lectura frente a gesto de cámara · UI-R5

**Dado:** bandeja con lista desplazable y paisaje visible.
**Cuando:** se arrastra dentro de la lista; después se arrastra el paisaje.
**Entonces:** el primer gesto desplaza solo la lista y no cierra la bandeja;
el segundo conserva el comportamiento de cámara actual. El cierre por gesto
solo parte del área definida para ello en el plan.
**Evidencia:** observación antes/después; incluir ratón y entrada táctil emulada.

### AC-07 — Lectura estable · UI-R3

**Dado:** F-READER, leyendo un año antiguo.
**Cuando:** llega una entrada nueva a la fuente actual.
**Entonces:** el pasaje leído sigue visible en la misma posición; aparece la
acción para ir a lo reciente. Solo esa acción lleva al principio.
**Evidencia:** ancla de texto visible antes/después, no solo `scrollTop`, porque
insertar contenido puede cambiar coordenadas sin cambiar el pasaje visible.

### AC-08 — Archivos y retorno al epitafio · UI-R3/UI-R5

**Dado:** F-READER con entradas distintivas por valle; variante F-END.
**Cuando:** se cambia la fuente de crónica y se cierra; desde el epitafio se abre
la crónica y se vuelve a cerrar.
**Entonces:** no se mezclan entradas; cambiar fuente abre su comienzo; cerrar
desde el epitafio devuelve el mismo epitafio, sin fundación ni archivo duplicado.
**Evidencia:** identidad de fuentes y estado antes/después.

### AC-09 — Lista y ficha de persona · UI-R4

**Dado:** F-PERSON y población que incluya personas no nombradas.
**Cuando:** se abre People y se selecciona por nombre; después se vuelve a lista.
**Entonces:** la lista contiene solo nombrados presentes, su etiqueta explica
ese alcance, y la ficha corresponde al id elegido y al contenido de `panelFor`.
Volver no elige otra persona ni muestra una ficha anterior.
**Evidencia:** ids esperados/mostrados; no comparar solo nombres, pueden repetirse.

### AC-10 — Selección desde el mundo y seguimiento · UI-R4/UI-R5

**Dado:** F-PERSON con cuerpo localizable en 3D.
**Cuando:** se toca su cuerpo, se activa y desactiva seguimiento y se cierra ficha.
**Entonces:** ficha y cuerpo representan el mismo id; seguimiento actúa sobre
ese id; cerrar cancela el seguimiento iniciado desde esa ficha. La etiqueta
describe lo que `track` realmente hace: marcar no acredita centrar cámara.
**Evidencia:** capturas y recorrido real. Espiar una llamada no basta.

### AC-11 — La persona deja de estar · UI-R4/UI-R5

**Dado:** F-PERSON con ficha abierta y seguimiento activo.
**Cuando:** se aplica F-ABSENT; repetir para muerte y marcha.
**Entonces:** se actualiza la ficha, termina el seguimiento y se puede salir;
no se presenta a un fallecido como vivo ni a un emigrado como muerto. Una
referencia inexistente muestra el estado vacío que corresponda.
**Evidencia:** caso de actualización local y comprobación del refresco integrado.

### AC-12 — Edificio y terreno · UI-R4/UI-R5

**Dado:** mapa con edificio y terreno seleccionables.
**Cuando:** se abre cada ficha y se cierra tocando fuera.
**Entonces:** datos de `panelFor`, ninguna acción de seguimiento de persona,
ninguna pérdida de la navegación y ningún cambio en el estado del motor.
**Evidencia:** dos capturas y comparación pausada de estado.

### AC-13 — Aplazar y recuperar una decisión · UI-R5

**Dado:** F-DECISION mientras hay una consulta abierta.
**Cuando:** el flujo existente presenta la decisión; se vuelve a Valley y se reabre.
**Entonces:** la decisión tiene prioridad; al aplazar conserva plantilla,
`posedTick`, reparto y opciones; su acceso sigue visible. Reabrir no genera una
decisión nueva ni deja activa detrás la consulta suspendida.
**Evidencia:** identidad completa de la pendiente antes/después y captura.

### AC-14 — Contestar una vez, también en pausa · UI-R5

**Dado:** F-DECISION; una variante en marcha y otra pausada.
**Cuando:** se pulsa dos veces una opción rápidamente.
**Entonces:** una sola aceptación. En pausa el tick no avanza ni se anuncian
consecuencias ya aplicadas; tras reanudar se resuelve una vez. Se comprueba la
entrada correspondiente en el historial, no un contador de clicks.
**Evidencia:** `DecisionRecord` del caso y tick antes/después; capturas opcionales.

### AC-15 — Precio y contexto largos · UI-R5

**Dado:** decisión válida con contenido largo; variantes 390 × 844 y 320 × 568.
**Cuando:** se recorren todas las opciones mediante scroll y teclado.
**Entonces:** cada precio acompaña a su verbo, sin elipsis ni segundo toque;
todas las opciones son alcanzables. El permiso para desplazar no equivale a
ocultar costes. No exigir que un catálogo arbitrario quepa entero sin scroll.
**Evidencia:** capturas por tramo; sincronizar el criterio histórico que exigía
tres opciones sin desplazamiento antes de reemplazar su prueba.

### AC-16 — Extinción durante consulta · UI-R5

**Dado:** consulta abierta en una partida que pasa a estado terminado válido.
**Cuando:** la aplicación procesa la actualización de fin.
**Entonces:** aparece epitafio; se retiran consultas y seguimiento; los controles
de órdenes no siguen activos detrás. La crónica conserva su vía de consulta.
**Evidencia:** recorrido integrado y conteo de acciones ejecutadas, sin reinicios.

### AC-17 — Regreso desde segundo plano · UI-R5

**Dado:** consulta abierta; ejecutar una variante pausada y otra a velocidad activa.
**Cuando:** se oculta la página, se adelanta su reloj de prueba y vuelve visible.
**Entonces:** el flujo existente calcula el letargo una vez; pausa permanece
pausada; la selección se revalida y la interfaz muestra el estado actualizado.
No exigir un número de ticks superior al permitido por extinción o topes.
**Evidencia:** deuda esperada según `resumeAfterHidden`, condiciones del fixture,
tick efectivo y estado de selección; el parte de bienvenida no queda tapado.

### AC-18 — Tamaño, foco y legibilidad · UI-R6

**Dado:** escenas de día/noche/invierno/tormenta y F-LONG.
**Cuando:** se recorren los tamaños de §7 del plan, texto ampliado al 200 %,
teclado y movimiento reducido.
**Entonces:** ningún control esencial queda inaccesible; áreas táctiles y
contraste cumplen §3 del plan; foco visible y orden coherente. La lectura puede
ocupar más pantalla según la excepción ya definida; no reducir letra para encajar.
**Evidencia:** dimensiones medidas, contraste calculado y capturas inspeccionadas.

### AC-19 — Persistencia y recarga · UI-R2/UI-R5

**Dado:** órdenes cambiadas y una decisión pendiente aplazada.
**Cuando:** se guarda por el flujo habitual, se espera fin de escritura y se recarga.
**Entonces:** se preservan intención y pendiente según el formato vigente;
se puede continuar la partida. No exigir restauración de pestaña, scroll o
velocidad si el formato actual no los guarda.
**Evidencia:** valores guardados y aplicación tras continuar, en contexto aislado.

### AC-20 — Desmontaje y compatibilidad · UI-R5/UI-R6

**Dado:** sesión con varias aperturas/cierres; repetir en Canvas explícito.
**Cuando:** se vuelve a abrir un control y se ejecuta una acción.
**Entonces:** una acción produce un único efecto; no quedan paneles invisibles
capturando punteros/foco. Canvas permite los mismos flujos de consulta y decisión,
sin que se le exijan efectos exclusivos del renderer 3D.
**Evidencia:** acciones/efectos y revisión de recursos del panel al desmontar.

## 3. Reparto de trabajo y entregables

| Responsable | Casos principales | Entrega |
|---|---|---|
| Integrador UI-R1/UI-R2 | AC-01 a AC-05, AC-19 | Carcasa funcional y pruebas de órdenes/tiempo |
| Agente de crónica UI-R3 | AC-07, AC-08 | Panel, fixtures locales y evidencia de lectura |
| Agente de personas UI-R4 | AC-09 a AC-12 | Paneles y casos de identidad/actualización |
| Integrador UI-R5 | AC-05/06, AC-08, AC-10 a AC-17, AC-19/20 | Cableado y recorridos de aplicación |
| Coordinador UI-R6 | Revisión conjunta y AC-18 | Matriz final y capturas verificadas |

Esta tabla no amplía los ficheros autorizados en cada brief. El integrador
posee `tools/ui-redesign.shots.ts`; los agentes A/B entregan casos y necesidades
para integrarlos, no editan simultáneamente ese fichero. Las pruebas de
componente se incorporan a los ficheros asignados en el plan. Si el entorno
actual carece de soporte DOM, el coordinador ubica ese caso en navegador; no se
añade una dependencia por iniciativa de cada agente.

## 4. Formato del parte de evidencia

Cada informe de ronda incorpora una tabla como esta; no hace falta otro archivo
por caso. Estado permitido: **pendiente, pasa, falla, bloqueado**. «Heredado» es
una causa del fallo, no una forma de considerarlo verde.

| Caso | Commit | Fixture y backend real | Resultado observado | Estado | Evidencia |
|---|---|---|---|---|---|
| AC-xx | SHA exacto | Semilla/tick/velocidad o fixture dirigido | Qué ocurrió | Pendiente | Captura, salida o recorrido |

Un caso bloqueado especifica qué falta: por ejemplo, WebGL no disponible o
fixture que no puede cargarse por la vía actual. No confundir una prueba no
ejecutada con una prueba que pasa. Registrar resolución y fecha de captura.

Antes de cerrar UI-R6, el coordinador verifica que las pruebas nuevas fueron
descubiertas y ejecutadas. Las capturas de referencia solo se actualizan tras
inspeccionar la diferencia y explicar el cambio esperado. No borrar pruebas
históricas que sigan guardando una propiedad vigente.

## 5. Encargo breve para un agente de módulo

Añadir este bloque al prompt de su ronda, después de las lecturas comunes:

```text
Lee acceptance-scenarios.md §0–1 y los casos asignados a tu módulo en §3.
Prepara los fixtures necesarios dentro de los ficheros de tu brief.
Comprueba sus precondiciones; no esperes un suceso a un segundo fijo.
Entrega por caso: acciones, resultado observado y evidencia según §4.
Separa el comportamiento local verificado del recorrido integrado pendiente.
Si necesitas instrumentación o un fichero no asignado, concreta el cambio
para el integrador; no inventes una API de prueba en la aplicación.
```

## 6. Registro

v1.0: veinte casos de aceptación vinculados a UI-R1–UI-R6, fixtures por
precondiciones, evidencia y reparto de propiedad. Se documenta la separación
entre cobertura Canvas y 3D y se evita depender de trayectorias temporales antiguas.
Documento preparado sin modificar código, tests ni configuración.
