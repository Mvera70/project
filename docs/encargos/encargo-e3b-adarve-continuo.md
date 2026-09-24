# E3b · Adarve continuo — brief de viabilidad y primera entrega

**Estado:** la primera junta y dos tramos tienen recetas candidatas; su
[exportación aislada](../historico/graphics-rounds/E3b0-exportacion-candidata.md)
pasó Blender, `game-dev asset inspect` y GLTFLoader. Los tres GLB se publicaron
como [G-32](../historico/graphics-rounds/G-32-e3b-candidatos.md), la primera
junta ya se selecciona y monta en escena mediante E3b.1a/b. E3b.1c conecta
la ruta privada del guardia y sus colliders; las pruebas focales pasan y
[E3b.1d](../historico/graphics-rounds/E3b1d-revision-app.md) observó la junta
en la app real, en un escenario controlado. El
[inventario E3b.2a](../historico/graphics-rounds/E3b2a-inventario-topologia.md)
midió las formas del anillo y prepara candidatos de giro, diagonal y portón.
E3a ya entrega el puesto navegable del bastión
([G-29](../historico/graphics-rounds/G-29.md)).

## Objetivo

Conectar la plataforma del bastión con puestos de muralla por una pasarela
visible y transitable para guardias asignados, sin abrir la muralla a civiles
ni atacantes. «Continuo» exige resolver uniones rectas, esquinas, diagonales y
el portón en una villa de piedra; un tramo aislado sólo es una primera entrega,
no el cierre de E3.

## Depende de y hallazgo previo

- `docs/design.md` §1b, §2–4, §7.4c, D.4–D.6 y E.3/E.6/E.8; el contrato de
  acceso [E3a](encargo-e3-puesto-navegable.md) y sus cotas publicadas.
- `buildDefence` ensambla la malla de pared con grosor **0,34** y recorta los
  brazos de esquinas y diagonales a su celda. El cuerpo tiene diámetro **0,64**
  y el acceso G-27 exige paso libre mínimo **0,70**. La corona de `wall.json`
  llega a **0,76**; la plataforma del bastión está a **1,02**. El portón llega
  a **0,93** y su hueco debe seguir operativo. Las cotas salen de las recetas
  canónicas y del código, no de una captura.
- Ensanchar sólo el GLB `wall` no basta: `buildDefence` volvería a escalarlo a
  0,34 y recortaría la extensión en los enlaces. La pasarela debe tener
  geometría propia, o una ampliación explícita del ensamblador, con cotas y
  colisiones correspondientes. No se declara transitable una malla visible
  sin apoyo para el cuerpo.

## Alcance y ficheros de la primera entrega

**E3b.0, geometría y topología, antes de producción.** Leer
`src/render3d/world/defences.ts`, `src/render3d/life/{terrain,garrison,elevated-post,physics}.ts`,
`src/derive/{garrison,bastion-access}.ts` y las recetas de pared, portón y
bastión. Entregar una propuesta reproducible para una unión bastión → muro y
una secuencia de dos muros, con planta, sección, paso libre neto, cota de pies,
apoyo estructural, colisión y encaje visual en cuatro orientaciones. Cubrir en
el diseño recta, giro, diagonal y paso sobre portón; señalar las variantes que
no quepan, sin abrir celdas públicas. Los ficheros de salida son este brief y
un informe en `docs/historico/graphics-rounds/`; no se toca aún el motor, los
GLB aprobados ni la escena.

**E3b.1, primera costura implementable tras revisar la geometría.** Un módulo
de pasarela independiente de `wall.glb` y de `bastion.glb`, con una ruta privada
entre la plataforma E3a y un puesto de pared contiguo. Antes de despacharlo se
fijarán sus firmas literales y los ficheros de producción que puede tocar el
agente. `garrisonOf` conserva el número y prioridad de puestos: el adarve
cambia cómo se llega a un puesto existente, no crea más defensores.

**E3b.2, cierre de continuidad.** Extender la misma regla a las uniones,
diagonales y el portón de una villa de piedra, con ruta de regreso. Ninguna
pasarela atraviesa una brecha, un muro perdido o una obra incompleta. El caso
de tramos aún de madera se decide explícitamente antes de llamarlo anillo
completo. Revisar la lectura visual con el bosque aún denso y conforme la
tala despeja progresivamente las celdas próximas a lo construido; contrastar
el tajo visible y la descarga con el árbol y la madera reales de esa semana.

## Reglas

- La planta transitable conserva como mínimo los **0,70** de paso libre ya
  aprobados en G-27, con disco de radio 0,32 dentro de la ruta. La cota de
  pies debe empalmar sin salto con la plataforma a 1,02. El hueco de 0,26
  sobre la corona actual necesita soporte visible y collider coherente.
- El grafo elevado se deriva de edificios vivos y conexiones reales; la
  máscara de suelo permanece cerrada. Sólo el guardia asignado usa la ruta
  privada. Un acceso ausente o aislado deja el puesto en suelo o sin ofrecer,
  nunca arriba por teletransporte.
- Un guardia que deja su puesto regresa por la ruta. Cuerpo, malla, cámara,
  origen de flecha y semilla de caída comparten la cota efímera de E3a.
  La física del adarve no debe interceptar su propia flecha al nacer ni volver
  atravesables la pared y el portón para proyectiles ajenos.
- La decisión posterior del dueño del diseño reserva un corredor por el interior
  de la muralla. Esto permite ajustar la colocación en `src/engine/` para que
  las obras nuevas no lo invadan. La reubicación de edificios existentes aún
  necesita una regla explícita y verificable; no se mueve nada al cargar.
  No cambiar balance, guardados, geometría aprobada de G-26/G-27,
  daño o número de defensores por resolver una necesidad visual. Cualquier
  nuevo modelo se prepara como candidato aislado y se revisa antes de
  publicar. La intervención de Astra para modelar requiere autorización nueva.
- El cerco conserva madera y piedra como dos fases. La piedra se desbloqueará
  mediante un evento pagado con piedra y moneda; queda por decidir si «oro»
  significa la plata ya presente o un recurso nuevo.

### Corredor interior: comprobación actual

`planRingCorridorMoves` calcula una reubicación determinista sin mutar la
partida ni el mapa. En la semilla 7, una iglesia anterior al anillo se puede
reconstruir cuatro celdas más al norte; la simulación posterior conserva el
anillo cerrado y deja el recorrido de 88 tramos sin bloqueo de parcelas. La
semilla 91 ya mantiene el recorrido libre sólo con la reserva de solares
futuros. Esta es una prueba de viabilidad, **no** una acción en producción:
faltan el evento, el cobro, la ejecución de la reforma y la revisión visual.

Una jornada CPU adicional en la semilla 91 sigue al mismo guardia asignado al
circuito candidato: sube, recorre más de 88 puntos y regresa al suelo. Pasa con
las nueve variantes autorizadas sólo dentro de la prueba. La escena pública
sigue aprobando únicamente la recta; la jornada no demuestra mallas, apoyo,
colisión de flechas ni tránsito visible en la app.

La preparación física toma ahora todas las celdas de piedra del circuito
asignado, manteniendo el muro bajo el tablero a Y=1,02. Una prueba Rapier
de la topología candidata confirma que una flecha avanza por encima de dos
muros consecutivos y otra choca con la fábrica inferior. El portón se excluye
expresamente de ese rebaje: al no ser celda bloqueada, necesita su propio
tablero y colliders que conserven el vano público. Los pretiles de las variantes
nuevas tampoco están integrados. Este resultado no acredita aún la colisión
del circuito completo en la escena.

Las sondas Rapier de fuentes nuevas cubren el cruce combinado bastión66/portón24
(1.205 posiciones superiores libres, paso inferior libre en 161 posiciones y
jambas activas), el bastión pasante24 (956 posiciones libres) y las ocho
transiciones mixtas (602 por orientación). El bastión24 revela un riesgo de
integración: una envolvente convexa por pretil invade 908 posiciones del paso;
hay que conservar su concavidad mediante malla triangulada o una partición
convexa exacta. Estas sondas no usan los GLB definitivos ni sustituyen la
medición de colisiones y coste en la demo.

El inventario de esa misma villa distingue **28 rectas, 28 codos, 29
transiciones cardinal–diagonal, un segundo bastión, un cruce de portón mixto
(máscara 24) y el retorno al bastión de acceso**. Existen fuentes candidatas
para esas seis familias, pero ninguna de las nuevas fuentes tiene aún GLB
validado. En particular, la malla mixta común no sustituye el marco ni la hoja
del portón. Esta villa no ejerce el caso de dos diagonales consecutivas ni los
portones cardinal o diagonal; habrá que verificarlos con otras topologías antes
de afirmar cobertura general.

La semilla 23, en la misma semana 3846, aporta 104 tramos: 36 rectas, 51
codos, 14 transiciones mixtas, dos bastiones y un portón mixto de máscara 65.
Tampoco presenta dos diagonales consecutivas ni portón cardinal/diagonal. Entre
ambas villas se observan las ocho máscaras mixtas de muro, pero no todas las
formas posibles del catálogo. El `geometryReady` de estas sondas se obtiene al
admitir artificialmente las nueve variantes y sólo demuestra topología y
obstáculos; no constituye aprobación de los recursos.

La clasificación `bastion-crossing` también necesita desglosarse: el segundo
bastión de la semilla 91 enlaza cardinal con diagonal (máscara 24). La antigua
fuente llamada bastión296 tiene la mano equivocada y no cubre esa planta. La
fuente nueva `e3b-bastion-crossing-24-candidate` abre W+NE y pasa 67.795
muestras CPU del disco. Sus bocas de 0,70 casan con las secciones medidas de
los tramos recto y diagonal, sin huecos en los pretiles de origen. El disco
de radio 0,35 queda tangente: falta acreditar tolerancia física en runtime.
El segundo bastión de la semilla 23 tiene dos
brazos cardinales en codo (máscara 6); ni bastión296 ni el bastión295 de dos
bocas opuestas son su pieza. Ya existe una fuente candidata específica para
este codo en `art/recipes/e3b-bastion-turn-candidate/`. Su sonda CPU pasa
358.329 muestras de disco de radio 0,35, mide tres bocas de 0,70 y conserva
14 peldaños; aún faltan exportación, revisión visual, ensamblaje y colisión.

Las nuevas fuentes colocan el eje transitable en el centro de cada celda;
E3b.1 lo desplaza 0,29 hacia dentro. El selector admite ambas plantas de
manera explícita. La jornada candidata de la semilla 91 pasa por el centro y
completa el circuito y el regreso del guardia; el respaldo publicado mantiene
su desplazamiento original. En la semilla 7, el corredor interior sigue
detectando la iglesia anterior a la reserva incluso con el eje centrado.
Las cuatro pruebas de jornada y las 30 pruebas rápidas focales pasaron el
24 sep 2026. Ninguna acredita todavía las mallas en la app.

Una sonda adicional del mismo estado reveló otra boca pendiente que la
clasificación genérica ocultaba: los bastiones de **acceso** 283 (semilla 23)
y 295 (semilla 91) tienen máscara 66, es decir, salida cardinal este y
retorno diagonal suroeste, con escalera interior hacia sur. La fuente de
acabado `bastion295` abre este y oeste: **no sirve para cerrar ese retorno**.
La fuente `bastion296` tiene escalera y diagonal con otra disposición; un
giro simple cambiaría el lado de la escalera. Hay dos fuentes 66 específicas
en `art/recipes/e3b-bastion-anchor-66-candidate/`, una para el vecino muro
de la semilla 23 y otra para el vecino portón de la semilla 91. La primera
pasa su barrido CPU de disco 0,35; la segunda deja libre el vano 0,84 y la
hoja en 91 ángulos, pero **no está aprobada**: su tablero se superpone al
conector24 y no se ha probado su apoyo sobre el nuevo dintel ligero. Hasta
resolver esa junta, ninguna de las dos villas tiene anillo
geométricamente completo aunque el guardia supere el circuito lógico.
La fuente 66 desplaza los catorce peldaños 0,65 hacia el interior para
liberar la boca diagonal. La ruta candidata de vida ya usa pie local Z2,65,
salida Z1,65 y puesto Z0,58, mientras E3a conserva su escalera Z2→1. La
jornada focal de seed91 asigna el circuito sólo al retorno66, desplaza el
puesto del portón que compartía la celda de entrada y confirma subida,
recorrido completo y descenso del mismo guardia. Aún faltan la colisión del
GLB integrado y la revisión visual. La escena publicada sigue usando E3b.1.

Una fuente combinada nueva de bastión66 y portón24 elimina el solape entre
tableros y pretiles. Su sonda CPU comprueba el disco de radio 0,35, los bordes,
el vano 0,84 y 91 posiciones de la hoja; el dintel contacta una viga continua
bajo el tablero. No es una certificación de resistencia. La fuente y medidas
están en `art/recipes/e3b-bastion-anchor-66-candidate/COMBINED.md`.
Su exportación estática, incorporación de la hoja articulada, importación GLB,
colisiones y prueba en la app siguen pendientes; la variante bloqueada anterior
no debe instalarse encima.
El montaje CPU separado ya compara el pivote y la hoja del GLB ancho a 0°, 45°
y 90°: extraerlos del marco deja sus posiciones idénticas. Otra sonda coloca
la fuente estática en las coordenadas de la semilla 91 y confirma 118 muestras
de la ruta a Y1,02, sin fallo. Sigue siendo geometría fuente; no sustituye la
revisión del GLB exportado ni de la escena GPU.
El inventario reproducible `check-source-coverage.ts` encuentra fuentes y
direcciones correctas para los 104 segmentos de la semilla 23 y los 88 de la 91,
con cuartos de vuelta en las variantes reutilizables. La fuente antigua
`bastion296` abría W+SE frente al W+NE real; ahora se asigna la fuente nueva.
En esas dos partidas se necesitan rectas, codos, ocho orientaciones mixtas,
dos pasos mixtos sobre portón (máscaras 65 y 24), el bastión de cruce 6 o 24
y el retorno 66. El inventario de GLB confirma que las fuentes nuevas de
esas familias siguen sin exportar; el portón ancho aislado sí tiene GLB.
Exportar sólo la recta o el portón no autoriza la ruta completa.
La escena publicada compone únicamente `bastionWalkway` (dos celdas) en
`Village.add`; `ELEVATED_RING_ASSETS` sólo enumera la recta antigua. Antes de
activar el circuito completo hay que llevar la selección de las 104/88 piezas
desde `sceneRingOf` al plan de escena, montar cada recurso con su giro y máscara,
y conservar la hoja articulada del portón sin duplicar su marco. El selector
de vida debe recibir exactamente ese mismo anillo acreditado; el recorrido
inyectado en las jornadas no es aún el selector de producción.
`ringCandidateAssetsOf` ya convierte la topología apta en identidades y giros
de las fuentes, y devuelve `null` si los árboles o cualquier otro obstáculo
cortan el circuito. En la semilla 23 selecciona 103 colocaciones para 104
tramos; en la 91, 87 colocaciones cubren 88 tramos. Cada ancla66 y su vecino
suroeste comparten una pieza combinada, de muro24 o de portón24. La colocación del
portón65 exige también el marco ancho completo; la combinada exige extraer
la hoja de ese marco sin duplicar piedra. La prueba comprueba que cada
edificio de la ruta queda cubierto exactamente una vez y que el conector24
aislado no se superpone al conjunto. Este selector **no carga GLB ni altera la
demo**; todavía faltan exportación autorizada, validación, publicación y
montaje de las piezas y la hoja móvil.
`missingRingAssets` da el inventario para una futura carga atómica: la falta
de cualquier recurso, incluido el marco u hoja del portón, deberá mantener
el respaldo E3b.1 en vez de abrir una ruta invisible para los guardias.
Además, `unresolvedRingSeams` detecta una junta que el inventario de IDs no
prueba: en seed23 el ancla66 invade media celda del muro192 al suroeste. La
fuente `wall-combined-source.ts` reúne ambos en una sola geometría de revisión.
Su barrido CPU de 43.730 muestras da cero huecos y cero invasiones de pretil,
con 3.164 triángulos, cuatro hiladas de piedra, tres juntas de mortero y 14
peldaños. La sonda Rapier de la fuente coloca dos
colliders estáticos triangulados, mide 480 posiciones superiores libres y
confirma fábrica inferior y pretil exterior activos. La prueba de 103
colocaciones acredita asignación sin duplicar la fuente antigua, **no** aptitud
de montaje: faltan exportar el GLB, verificar geometría y colliders importados,
revisar el acabado de piedra y comprobar la ruta en la app. La marca de junta
pendiente se conserva hasta esa revisión. Seed91 usa la fuente combinada de
bastión y portón, aún sin GLB.
La sonda de ocupación de esa pieza en seed91 no encuentra edificios, obras ni
troncos adicionales en la huella ampliada; sólo toca sus dos muros vecinos.
El alcance sigue siendo geometría fuente y huella XY: no acredita GLB,
costura física, colisiones ni escena renderizada.
La selección de escena ahora incluye los rebrotes visibles cuando la corteza
escalada alcanza la cara inferior del tablero (Y0,94). La prueba focal distingue
un plantón que aún cabe debajo de otro que bloquea el tramo posterior. Es una
comprobación geométrica de tronco; no sustituye la revisión de las copas ni de
la tala en movimiento dentro de la app.
La jornada real de la semilla 23 encuentra dos adaptadores mixtos obstruidos
por árboles adultos en (26,59) y (25,58): el anillo no se acredita mientras
siguen en pie. Tras despejar ese pequeño borde forestal en la copia de prueba,
la misma ruta recupera sus 104 tramos. La semilla 91 permanece despejada.

El portón ancho aislado se ha montado por CPU con `buildFromAsset` y el plan
real de ambas villas (`check-wide-in-scene.ts`), sin sustituir `gate.glb` ni
abrir la app. En las orientaciones X y Z, la abertura de piedra resultante es
0,84000007 y el centro del marco coincide con el centro de su parcela a menos
de 4×10⁻⁸ celdas. Se conserva `DoorHinge`; la semilla 23 incluye además la
junta diagonal del portón. Esto valida la transformación y el vano en
coordenadas de escena, **no** la imagen en pantalla, el apoyo del tablero ni la
colisión de la hoja con la futura transición.

## Tests y evidencia que falsan la propuesta

- Geometría pura: ancho neto, continuidad de X/Z/Y y giro en las cuatro
  orientaciones; unión recta, esquina, diagonal y portón. Un hueco >0 o un
  paso <0,70 descartan esa variante.
- Navegación: guardia entra desde un bastión accesible, cruza dos tramos,
  ocupa y regresa sin salto; se niega ante brecha o acceso imposible. Civil y
  atacante siguen sin poder tomar la ruta.
- Física: apoyo, parapeto y flechas comparados con los modelos; tiro desde la
  pasarela sin autocolisión al nacer y con impacto posible en piedra ajena.
- Captura y traza de **partida real** en dos semillas con adarve, incluida una
  unión no recta y el portón. La revisión debe mostrar el trayecto completo,
  continuidad visual, cota, errores y posición de las flechas. Un render
  aislado o una captura fija no prueban navegación.
- Typecheck, ESLint y pruebas focales durante la implementación. Los recorridos
  que abran la app, usen GPU o midan el equipo requieren autorización expresa
  para esa ejecución.

**Terminado cuando:** un guardia recorre la pasarela continua de una villa de
piedra hasta los puestos alcanzables y vuelve, con geometría, colisiones y
combate coherentes, observado en el juego real. Si la primera unión no cabe
sin rehacer las defensas aprobadas, se informa el bloqueo geométrico y se
revisa el diseño antes de seguir.
