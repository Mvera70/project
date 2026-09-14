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
| **G-07** | Cámara, tacto e interfaz: se juega dentro del juego con `?render=3d` |
| **G-08** | Estaciones y señales: el valle dice lo que le pasa sin abrir una ficha |
| **G-09** | Banco de medida y presupuesto propuesto (D.9.1), parcial por falta de móvil |
| **G-10** | Catálogo: 31 recursos, río con cauce, ruinas, fauna, luz del día y gente distinta |

Puertas: P0 y P1 cerradas. **P2 pendiente de tu juicio sobre la demo.**

**Dónde vive cada cosa de G-10.** Los guiones que escriben las recetas están en
`tools/art/lots/` con su README; la plantilla y el armador de la demo
publicable, en `tools/graphics/pilot-page.html` y `bundle-pilot.ts`. Los tres
vivían en el scratchpad de la sesión y se perdieron dos veces.

**Lo que G-10 dejó y no es catálogo**, porque no se ve en la lista de recursos:
el relieve del suelo (`world/ground.ts`: el agua baja, la roca sube, el camino
se hunde con lo pisado que esté, y las esquinas promedian, que es lo que da la
orilla); la lámina de agua con su onda; la luz del día escénico
(`effects/daylight.ts`, función pura de la hora); la fauna de §7.7 instanciada
(`effects/fauna.ts`), que reutiliza `animalPositions` del render 2D; el humo que
sube; y la variación de talla y ropa del reparto (`world/cast.ts`).

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

**Las reuniones de §11.8 ya se ven en 3D** (v3.50). El día que hay reunión nadie
va al tajo. Se decide al amanecer, como los destinos, y por eso no teletransporta
a nadie; `valley.html?gather=1` convoca una a mano para poder mirarla, porque
salen dos veces en treinta años.

**Y un hallazgo que no es de gráficos y es el más gordo de todos:** dos sistemas
del motor no se disparan nunca. Los rencores de §6.4 no se forman ni una vez en
cuarenta años, lo que deja muertas las riñas de M-39 y las dos encrucijadas que
las exigen; y el jugador toma **entre siete y doce decisiones en cuarenta años**
sobre la mitad del catálogo, porque diez de las veinte plantillas no salieron ni
una vez en cinco partidas. Medido y escrito en `docs/findings-drama.md`. Ninguna
cantidad de arte tapa eso.

**Lo siguiente, en este orden:**

1. **Correr el banco en un móvil** con `--real true` y llenar las filas de
   tiempo de D.9.1, que hoy están sin presupuestar a propósito. Es lo único que
   falta para poder cerrar P3.
2. **G-10, los lotes que faltan.** Hechos: mundo (árbol, roca), vivienda (casa,
   casa de piedra, cobertizo), sustento (granero, molino, herrería) y comunidad
   (capilla, iglesia, pozo). **Faltan el campo, el camino y la familia de
   defensa** —empalizada, muralla, atalaya— más el cementerio. El campo y el
   camino son terreno, no edificio: se pintan desde el suelo y aún no tienen
   geometría propia. Hay margen de sobra: la peor escena está en 364 llamadas
   contra un límite de 1 200.

   Cómo se añade uno: `art/recipes/<id>/<id>.json`, entrada en `art/catalog.json`,
   `build` → `validate` → `report`, `publish-assets.ts`, y la correspondencia
   con su `BuildingKind` en `BUILDING_ASSETS` de `world/buildings.ts`. La receta
   se escribe en metros con `scale: 1/3` y la huella hacia +X y +Z desde la
   esquina.

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
7. **La suite de balance falla diez pruebas de §12.9, y ya fallaba antes de
   esta ronda.** Medido con dos pasadas completas el 13 sep 2026, una con el
   motor tal cual y otra con la calle de §7.2: las mismas diez en las dos. La
   de fondo es que jugar mal y jugar bien se parecen demasiado —la política
   adversa mata el 13 % de las aldeas y el diseño pide 25 %, y la distancia
   entre prudente y mala es de 11,7 puntos contra los 20 pedidos—. Está medido
   entero en `docs/findings-drama.md` §3. **No lo arregla una ronda gráfica:
   es balance del motor y lo decide el dueño del diseño.**
8. **La suite rápida tarda 31 s contra los 20 que fija `CLAUDE.md`**, y unos 21
   son de carga de módulos. El banco de balance sigue en 18,1 min contra el
   techo de 15; la causa medida es que el coste del suelo cambia 631 veces por
   partida y cada cambio vacía la caché de pares de ruta. Bajarlo obliga a tocar
   el tráfico, que es balance, y esa decisión sigue abierta.
9. **Los edificios del piloto son cajas con tejado.** El catálogo de verdad es
   G-10. Es deliberado: lo que hay que juzgar antes es si un valle de estas
   proporciones se lee desde arriba.

## 5. La vida del valle (Anexo E) — el estado exacto

**Lo que hay que saber en una frase:** el render dibujaba una fórmula del
tiempo y por eso nadie podía chocar, perseguir ni encontrarse; se está
construyendo una capa de agentes con paso fijo (`src/render3d/life/`) que lo
da sin escribir en el motor. **Todo lo normativo está en `docs/design.md`,
Anexo E.** Esto es sólo el estado.

**Hecho (v3.59–v3.64):** V-00 el descarte, V-01 reloj, V-02 cuerpos y rejilla,
V-03 navegación, V-04 impulsos, V-05 ofertas, V-06 elección y la aldea entera
ensamblada dentro del juego detrás de `valley.life`; V-14 el cuenco. 1 873
líneas de producción, 60 pruebas propias en la suite rápida (1 068 en total, en
verde). Informes con lo medido en `docs/life-rounds/`.

**Siguiente: V-07, escenas de dos.** Y es la que decide: tras ella se vuelve a
enseñar en el juego y sólo entonces se juzga lo demás.

**Lo que el dueño del diseño ve hoy, y por qué.** Vio la aldea viva dentro del
juego y dijo que parece rota comparada con el descarte —«se quedan pillados,
dando vueltas, no se chocan, tienen como un imán; no interactúan con los
objetos»—. Tres de esas cosas eran fallos y están arreglados con sus números
(E.7). La cuarta no es un fallo: **faltan V-07 y V-09**, que son las charlas,
los empujones y los trastos, o sea todo lo que hacía que el descarte pareciera
vivo. Se enseñó lo vistoso, se construyó lo invisible durante seis fases sin
volver a enseñar nada, y la primera demo tras ellas fue una regresión desde el
asiento del que mira. Está escrito en E.6 con la regla que sale de ahí: cada
fase que cambie lo que se ve, se enseña antes de cerrar la siguiente.

**Abierto y sin resolver, para no volver a tantear a ciegas:**

- **El reparto entre andar y hacer**: 74–81 % del tiempo en tránsito, tras
  cuatro ajustes que no lo bajaron. Por la regla séptima de E.3 no es el número,
  es el modelo. La hipótesis (E.6) es que el tránsito con interrupciones se lee
  como vida y sin ellas como hormigas: se comprueba haciendo V-07, no moviendo
  otra constante.
- **«No se desplazan como en la demo»**: sin poder verlo, no se sabe si es
  percepción o un fallo del clip en `life/cast.ts`. V-07 lo comprueba primero,
  con prueba.
- **El descarte y la producción son dos códigos** (`life/spike/`, 1 715 líneas,
  contra `life/*.ts`). V-07 y V-09 **portan** del descarte lo que ya está
  medido; V-12 lo borra.

**Deudas que siguen en pie de antes** (los puntos 1–9 de arriba) más éstas:

- **`ashore` bajó de 1,08 a 0,326 celdas (V-08), no a 0,06.** El defecto que
  hacía saltar al rebaño una celda entera —repartir por la cara más cercana de
  la propia celda, que cambia de bando de golpe— está arreglado: ahora busca
  el punto de tierra más cercano de verdad en un entorno (`fauna.ts`,
  `ashore`). Lo que queda es un empate más raro entre dos orillas de un recodo
  ancho del río, y arreglarlo del todo pediría un A* por tierra en vez de
  geometría de un punto — desproporcionado para una vía cosmética que
  `life/beasts.ts` ya vuelve innecesaria en cuanto la bandera `valley.life` se
  generaliza: un animal-`Dweller` no llega a pisar el agua porque colisiona con
  ella, así que no necesita corrección ninguna. La prueba de G-10 tiene el
  techo en 0,4.
- **El río parte el valle y no se cruza**: sólo el 37 % del suelo libre está
  conectado con el centro. No es un fallo, es el motor. Condiciona la caza y
  los asentamientos que vengan: o el mapa gana un puente (motor) o van del
  mismo lado. `reachableFrom` en `life/terrain.ts` es lo que hay.
- **El balance del motor está peor que antes de v3.60–v3.61**: doce pruebas
  rojas contra diez. La extinción prudente entró por fin en banda, pero la
  distancia entre políticas cayó a cinco puntos y `smith_feud` se triplicó. Es
  la contradicción de `findings-drama.md` §4–§6 medida, y la decide el dueño
  del diseño: o los rencores sanan más rápido, o la prueba de elegibilidad
  mide salidas en vez de ticks elegibles.
- **El cuenco es decorado**, no relieve. El valle sigue plano por dentro y una
  roca rodando sigue sin tener dónde. V-15 y V-16 van juntas, después de la
  vida, y son una ronda de motor con `SCHEMA_VERSION` a 4.
- **Afinar el tick a día no arregla el desfase con la jornada** (sería 56 pasos
  por jornada en vez de 8) y su coste está medido constante a constante en
  `docs/brief-reloj.md`. Si se hace, que sea por simulación y no por dibujo.
