# The Valley — Traspaso

**10 de septiembre de 2026 · Al cerrar la dirección desde Cowork**

Hasta aquí el proyecto ha tenido dos papeles separados: alguien que diseñaba y
arbitraba, y alguien que programaba y medía. A partir de ahora los asume el mismo
agente. Este documento existe para que esa fusión no se lleve por delante lo que
hacía funcionar el método.

**La fuente de verdad sigue siendo `docs/design.md`.** Este fichero no la
sustituye: dice cómo trabajarla y en qué estado está.

---

## 1. El método, en cinco reglas

Funciona porque invierte la relación habitual: **el código no es el resultado de
la especificación, es su prueba experimental.** Cada módulo implementado destapa
algo que la spec decía mal, y esa corrección es el producto real de la ronda.
Cuarenta y siete revisiones lo confirman.

1. **Cada ronda termina en evidencia, no en un visto bueno.** Una medición que
   contrastar o una salida que leer, y por escrito **qué resultado falsaría la
   spec**. Sin esa frase, se imprime un número y nadie sabe qué mira.
2. **Toda invención es un hueco de especificación.** Si hubo que inventar un
   número, una regla o un tipo, la spec callaba: ciérralo en el documento, no
   solo en el código.
3. **Ningún número se inventa.** Todos viven en §12 y en `balance.ts`. Uno nuevo
   entra con `// TUNE:` y sube a spec en la ronda siguiente.
4. **Antes de ajustar una constante, comprueba que el mecanismo que mide
   funciona.** Cinco rondas se dedicaron a apretar tuercas de un motor que
   perdía aceite: una peste vencida seguía restando ánimo para siempre (v2.18).
   Un número fuera de banda puede ser un mecanismo roto.
5. **Versionar y verificar.** Cada cambio del documento sube la versión, se
   fecha, y el registro dice **qué cambió y por qué** — el motivo es lo que
   evita que alguien lo revierta dentro de seis meses creyendo que arregla algo.
   Y verificar la edición no es verificar la escritura: **relee del disco**.

### El riesgo de fusionar los papeles

Un implementador que también dirige **optimiza lo que puede medir solo**. Se ve
en el historial: rondas enteras de rendimiento e instrumentación mientras el
hito 0 —que necesita a un lector humano ajeno— lleva ocho módulos sin veredicto.

Contrapeso concreto: antes de abrir una ronda, pregunta **qué haría fallar a esta
decisión**, y si la respuesta necesita a una persona, no la sustituyas por otra
medición.

---

## 2. Estado del proyecto

**Fecha de este corte: 10 de septiembre de 2026.** Rama de trabajo:
`graphics/g-04-villager-rig`. Puerta en verde: `npm run typecheck`, `npm test`
(903 pruebas, unos 31 s) y `npm run lint`.

### El juego

**Hitos 0 a 5 entregados; el hito 0 sigue sin juez.** El motor está completo
—demografía, subsistencia, opiniones, encrucijadas, animales, comerciantes,
crónica— y el render 2D en Canvas es el que se juega hoy y el que está
desplegado en GitHub Pages como PWA.

**El hito 0 no lo ha validado nadie ajeno al proyecto, y el hito 6 tampoco.** Son
los dos criterios humanos y **no se declaran superados ni se sustituyen por
pruebas automáticas.** Es la deuda más antigua y la única que ningún agente
puede saldar.

### El programa gráfico

Un piloto 3D en `src/render3d/`, aparte del juego, que **no sustituye a
`src/render/`** hasta G-12. Rondas cerradas:

| Ronda | Qué dejó |
|---|---|
| G-00 a G-03 | Cadena Blender → GLB → Three.js, catálogo con hashes, dos direcciones artísticas |
| **G-04** | Aldeano articulado, 1 236 triángulos, 16 huesos, cuatro clips, piel rígida decidida en banco común |
| **G-05** | Reloj de presentación y actores derivados: quién hace qué en cada instante |
| **G-06** | Escena alimentada por una partida real: terreno, edificios, gente andando |

Puertas: P0 y P1 cerradas. **P2 pendiente de tu juicio sobre la demo.**

### Lo que se puede mirar sin arrancar nada

- **El aldeano suelto**, girable, con sus cuatro clips y una ventana al tamaño
  real que tiene en el móvil:
  `https://claude.ai/code/artifact/b30ce40b-7f40-4840-bdf9-11a60f2bfb4f`
- **El valle en marcha**, una partida real corriendo con el motor y el renderer
  de verdad en una sola página:
  `https://claude.ai/code/artifact/2e1d7a40-93a2-4406-a0f6-4651caeb380c`
- Capturas y auditorías en `artifacts/graphics/G-04/` y `G-06/`.

### Decisiones tomadas que enmarcan lo que viene

- **D.2.1** · teja y paja conviven; no hay dirección A contra B.
- **D.4.1** · piel rígida, decidida en banco común con coste idéntico.
- **D.6.1** · un día escénico dura 120 s y se acelera con la **raíz** de la
  velocidad, no con ella.
- **D.6.2** · un aldeano mide **0,65 celdas**; una celda son unos tres metros.
- **D.6.3** · al entrar se encuadra la aldea con su entorno, no el mapa entero.
- **D.6.4** · la jornada y el destino pertenecen al día escénico, no a la semana.
- **D.6.5** · un clip en el sitio exige un cuerpo en el sitio.

---

## 3. Qué hacer a continuación

**G-07 está hecha.** El piloto se juega dentro del juego con `?render=3d`, con
Canvas por defecto, gestos conectados y fichas al tocar. Lo que queda de la
ronda, y es poco: probar en el móvil de verdad que el relevo de Canvas a WebGL
no parpadea, y decidir si el interruptor merece un botón en vez de un
parámetro de dirección.

**G-08 está hecha.** El valle cambia de estación —capturas de las cuatro en
`artifacts/graphics/G-08/`— y las señales de `tellsFor` se ven en 3D. Lo que
queda de esa ronda: los efectos que necesitan recurso propio (`art/recipes/
effects/`), que dependen del catálogo, y la paridad de capturas contra Canvas.

**G-09 está medida y es parcial a propósito**: no hay dispositivo real, y D.9 no
acepta emulación para cerrar P3. El presupuesto propuesto está en D.9.1 y el
informe en `docs/graphics-rounds/G-09.md`.

**Lo siguiente, en este orden:**

1. **Correr el banco en un móvil** con `--real true` y llenar las filas de
   tiempo de D.9.1, que hoy están sin presupuestar a propósito. Es lo único que
   falta para poder cerrar P3.
2. **G-10, los lotes que faltan.** El del mundo está empezado: hay árboles
   instanciados y el valle se lee como un valle. Faltan **casa, campo y camino**,
   que son los que quitarían las cajas con tejado, y después el resto de
   familias de la matriz de D.8. Hay margen: la peor escena está en 324 llamadas
   contra un límite de 1 200.

   Ojo con una cosa aprendida ahí: el presupuesto de triángulos hubo que
   corregirlo de 120 000 a 450 000 porque el primero se midió sobre un valle sin
   árboles. Con instanciación los triángulos dejan de seguir al coste.

Hecho ya, y no hay que repetirlo: la unión del aldeano por material. De 914
llamadas a 269 y de 3,60 a 1,30 ms de CPU, sin mover un triángulo. Una receta
lo pide con `mergeByMaterial: true`.

El brief original de G-07, para lo que quede de él:

**G-07: cámara, tacto e integración de interfaz.** Es la ronda que hace jugable
el piloto desde el móvil, y la que el usuario está esperando: hoy la cámara no
se mueve ni se acerca, y él pidió expresamente poder acercarse a ver la gente.

Lee `docs/design.md` §11, D.5 y D.7 antes de tocar nada. Ficheros del brief:
`src/render3d/camera.ts`, `src/render3d/picking.ts`, `src/ui/app.ts`,
`src/ui/inspect.ts`, `src/ui/gestures.ts`, `src/ui/loop.ts`,
`tools/graphics.shots.ts` y `tests/fast/graphics-picking.test.ts`.

Lo que ya está hecho y no hay que rehacer:

- `pick` funciona y prioriza aldeano, edificio y terreno en ese orden. G-07 lo
  perfecciona, no lo empieza.
- El encuadre inicial vive en `renderer.ts`, en `frameCamera`. Sácalo a
  `camera.ts` con el zoom y el arrastre; el encuadre por proyección de las
  esquinas de la caja construida es el que hay que conservar.
- La página `tools/graphics/pilot.ts` es el banco de pruebas más rápido que
  existe: cambia algo, reconstruye y míralo. No es parte del juego.

**Cómo republicar la demo tras un cambio.** El bundle se arma con Vite sobre
`tools/graphics/pilot.html`, con el GLB del aldeano inyectado en base64 por
`define: { VALLEY_VILLAGER_GLB }`, y se mete en una plantilla HTML que vive en
el scratchpad de la sesión. Si la plantilla se ha perdido, cualquier página que
tenga los identificadores `#stage`, `#stage-wrap`, `#readout`, `#touched`,
`[data-speed]`, `#seed`, `#years` y `#refound` sirve.

**Antes de publicar recursos nuevos:** `npx tsx tools/graphics/publish-assets.ts`
copia lo aprobado a `public/assets/valley3d/` con manifiesto y hash. Un
candidato sin promoción no llega al juego.

---

## 4. Trampas que ya han costado tiempo

No son teoría: cada una se pagó con al menos una ronda.

- **El invierno es el momento más lleno del granero.** La cosecha es la semana 35
  y el invierno empieza en la 36. Ninguna plantilla de escasez se apoya en la
  estación; se apoya en `grainToHarvest`. Se cayó dos veces, en A.1 y en A.4.
- **Una condición ambiental dispara siempre que el techo lo permite** (§8.1,
  regla episódica). Y su reverso: **una condición sobre una carencia o un rango
  muere cuando la carencia se cubre** (§8.1, regla de la aldea madura).
- **Un umbral que pasa por el motivo equivocado es peor que uno que falla.**
  `worst` llegó al 100 % de terminaciones midiendo una sola opción repetida 178
  veces. Cuando una política degenera, se arregla **la política**, no el juego.
- **El precio escrito es un contrato** (§8.1). De 48 opciones auditadas, 13
  mentían. Si el texto promete un coste y los efectos no lo entregan, el jugador
  aprende que las opciones duras son palabrería.
- **Nunca un umbral con una sola semilla.** Dos partidas divergen desde el primer
  tick.
- **Dos copias de la spec divergen.** Se sincroniza reemplazando, nunca
  parcheando, y siempre construyendo sobre la copia del repositorio.

---

### Las que ha costado el programa gráfico

- **Un umbral absoluto en una cadena que escala recursos caduca.** Al llevar el
  aldeano a 0,65 celdas, la auditoría de animación empezó a denunciar clips que
  no habían cambiado: medía el tamaño de la figura, no su animación. Los
  umbrales van en proporción al alto del recurso.
- **Un ángulo no distingue una rodilla de una rodilla del revés.** El signo de
  la flexión estuvo cambiado dos veces —espinillas primero, antebrazos
  después— y las dos veces todo lo demás pasó en verde. Se mide el **sentido**,
  no solo la amplitud. Y verifica la comprobación contra el artefacto
  defectuoso, no contra el arreglado: mi primera versión denunciaba justo los
  clips que estaban bien.
- **La validación en verde no ve una cabeza suelta.** El atado emparentaba cada
  pieza a la cola de su hueso y la cabeza flotaba separada del torso, con GLB
  bien formado, clips presentes, materiales correctos y captura repetible. Se vio
  mirando una hoja de contactos. §14.3 no es retórica.
- **Tres formas de medir una zancada dan tres números y dos son falsos.** La
  separación máxima entre tobillos dio 1,50 m donde la marcha da 0,95; el
  recorrido bajo un umbral de altura dijo que cargado se anda más largo que
  suelto. La buena: el pie más bajo es el que pisa, y lo que retrocede es lo que
  el cuerpo avanza. Ninguna de las tres se desmentía a ojo.
- **La promoción presupone la misma receta.** `report` comparaba el candidato con
  el artefacto aprobado usando la receta nueva, así que ningún cambio deliberado
  de geometría podía promoverse jamás. El catálogo guarda ahora el hash de la
  receta.
- **Los fallos de animación se ven jugando, no en una prueba.** Los cinco últimos
  —teletransporte al trabajar, parpadeo a velocidad alta, gente amontonada en
  una celda, deslizamiento con la azada, botón de velocidad sin efecto— los
  encontró el usuario mirando la demo, con la suite entera en verde. Cada uno
  tiene ya su prueba; ninguna existía antes de que él lo viera.

---

## 5. Deudas sin dueño

1. **La lectura del hito 0 por un tercero.** Las tres crónicas, sin contexto y
   sin el documento de diseño, y una sola pregunta: *«¿en qué se diferencian
   estas tres aldeas?»*. Ni quien diseñó el juego ni quien lo programó sirven.
   **El hito 6 está en la misma situación y tampoco se declara superado.**
2. **El presupuesto del banco.** 638 s de los 900 tras la subida de la v2.45, que
   queda escrita como la última sin optimizar.
3. **Cuatro plantillas al filo del 1 % de elegibilidad** (§12.9), entre 1,0 % y
   2,5 %.
4. **Los hitos 4, 5 y 6** siguen esbozados en §16, a propósito.
5. **El aldeano no tiene frente.** El torso es un cajón liso y la cabeza una
   esfera: por delante y por detrás es casi la misma silueta, y en el valle
   giran hacia donde caminan. Es asunto de geometría y de P1. La vía que propuse
   y nadie ha decidido aún: un peto de color en el pecho, en el terracota que la
   paleta ya tiene, más una cuña en la cabeza. A veinte píxeles el color separa
   mucho mejor que la forma.
6. **Azadonar no se distingue de cargar a la escala de juego.** Lo que las
   separaría es la herramienta, no la pose. Por eso el rig lleva conectores en
   las dos manos, y por eso D.4 dice que la herramienta es un accesorio. Espera
   a la ronda de la biblioteca de herramientas.
7. **La suite rápida tarda 31 s contra los 20 que fija `CLAUDE.md`**, y unos 21
   son de carga de módulos. El banco de balance sigue en 18,1 min contra el
   techo de 15; la causa medida es que el coste del suelo cambia 631 veces por
   partida y cada cambio vacía la caché de pares de ruta. Bajarlo obliga a tocar
   el tráfico, que es balance, y esa decisión sigue abierta.
8. **Los edificios del piloto son cajas con tejado.** El catálogo de verdad es
   G-10. Es deliberado: lo que hay que juzgar antes es si un valle de estas
   proporciones se lee desde arriba.
