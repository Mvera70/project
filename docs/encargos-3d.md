# Lo que el juego no enseña todavía — el registro

**Todo lo que se diseñe sin representación real se apunta aquí en la misma
ronda en que se diseña**, aunque el código funcione sin ello. Lo pidió el dueño
del diseño el 18 sep 2026, dos veces y cada vez más ancho:

> «El tema de la malla, todo lo que se vaya haciendo falta en Blender y en 3D se
> va anotando y se va apuntando.»
>
> «Todas estas cosas que estemos diseñando que no tengan una representación
> real… al igual que todas las animaciones, eventos y tal que no estén
> directamente reflejados, todo eso hay que ir anotándolo como pendiente.»

Así que esto **no es sólo una lista de mallas**: es todo lo que el motor sabe y
la pantalla no cuenta. Una mecánica que no se ve no existe para quien juega.

---

## 1 · Lo que todavía necesita representación (lo más grave)

Son mecánicas **ya en `main`** cuya representación sigue ausente o incompleta.
El asalto dejó de ser una línea de crónica: ya tiene llegada, combate, portón,
huida, saqueo, caída física y final. La tabla conserva el hueco exacto que
queda, no el estado anterior a las rondas del 20 de septiembre.

| Qué | Qué hace el motor | Qué se ve hoy | Qué haría falta |
|---|---|---|---|
| **El asalto** (B1, D3–D6) | Una partida de 5 a 60 hombres baja del valle vecino, pelea, rompe el portón, saquea o toma el valle | **Se ve de punta a punta**: llegada, combate, armas, rotura, entrada, cargas, huellas, retirada y transición terminal. Se reutiliza la figura del forastero | Nada de lo que pedía esta fila: el clan vecino tiene figura propia desde E2 (22 sep, `villager-neighbor.glb`) y el fuego llegó con E4 (25 sep, más abajo). La mecánica y la escena del asalto están cerradas |
| ~~**El aviso**~~ (B2) · **hecho el 20 sep 2026** | Ocho o catorce semanas antes, alguien los ve venir | Al cerrar B2, un adulto regresa desde el acceso real del clan por ruta alcanzable; sólo en la primera jornada, uno como máximo, y después recupera el reparto/reunión normal | Cerrado en E0b sin malla ni animación nueva. Flujo real modal→tick en 7/23, controles cero y sin repetición al día siguiente. [Evidencia y límites](historico/life-rounds/E0b-aviso.md) |
| ~~**Prepararse**~~ (B2, `braced`) · **hecho el 20 sep 2026** | El ganado entra, el grano se esconde, se atranca | Entre dos y cuatro adultos no asignados a la guarnición llevan grano/haces por rutas reales a granero, molino o casa; la cabaña usa anclas interiores mientras la amenaza sigue futura y recupera exactamente su reparto normal después | Cerrado en E0a sin malla ni animación nueva. Dos valles activos/control: 3/4 entregas, puestos conservados, cero errores, penetraciones o atascos. [Evidencia y límites](historico/life-rounds/E0a-preparacion.md) |
| ~~**Pagar al clan**~~ (B2, `bought_off`) · **hecho el 20 sep 2026** | Treinta de plata suben la ladera y la partida se da la vuelta | En el primer día del `turned_back`, dos o tres adultos existentes salen por el portón real con una carga y siguen la ruta de la ladera; no repiten la escena ni retienen el reparto | Cerrado en E0 sin malla ni animación nueva. [Evidencia y límites](historico/life-rounds/E0-pago-al-clan.md) |
| ~~**La semana de después**~~ (B2, `just_sacked`) · **hecha el 20 sep 2026** | La aldea acaba de perder grano y ganado | Durante el único tick posterior, 2–3 cargas fijas quedan junto a almacén/molino (o casa); `raid.beast` deja además dos haces tumbados junto a un ancla real de ganado/casa. No son recursos ni bloquean rutas | Cerrado en E0c reutilizando `Prop`, sin malla ni animación nueva. [Evidencia y límites](historico/life-rounds/E0c-semana-posterior.md) |
| ~~**La segunda puerta, abierta en la muralla hecha**~~ · **hecha el 21 sep 2026** | El jugador paga una puerta y la aldea sustituye un tramo del cerco | Durante la obra, la fuente desaparece y un solar procedural abre el hueco; al completar, entra el portón sin restos | Cerrado en E0d sin derribo físico ni activo nuevo. [Informe](historico/life-rounds/E0d-transiciones-muralla.md) |
| **Las armas** (C1) | La aldea se lleva un cuarto menos de golpe | Lanzas y escudos en guarnición y atacantes (20 sep) | Identidad propia del clan y armas almacenadas |
| **Los arcos** (C1, D2) | Flechas físicas cada 2,1 s | Arco en mano, flecha GLB y tensado/suelta desde el paso real | No hay huesos de dedos: la suelta se expresa con palma y brazo |
| ~~**El asalto que se decide**~~ (B4) | La semana que llegan el juego dice «vienen a por el pueblo» y la siguiente se resuelve con lo que la muralla hizo | La crónica lo cuenta las dos semanas (`raid.assault`, `raid.held`) **y desde F2 (19 sep) lo dice la línea de estado mientras pasa**: la víspera con su cuenta atrás, el clan encima —«en la puerta» sólo si hay puerta— y los tres estados del portón, que salen de la escena y no del motor (`gateNow`, `src/ui/doing.ts`). Medido: el 4,0 % de las semanas de una partida, seis valles de seis | Lo que queda de esta fila es **arte, no interfaz**: las cuatro filas de abajo (el cuerpo a cuerpo, la avalancha en el portón, el saqueador que cae, el valle tomado). La semana ya se siente como una víspera; lo que no se ve es la pelea |
| **El cuerpo a cuerpo** (D4) | Ambos bandos golpean y pueden caer | Gestos, armas y ragdolls de once segmentos con suelo y obstáculos; también sin arqueros | Persistencia entre jornadas no incluida; respaldo animado sin Rapier |
| **La avalancha en el portón** (D3b/D5) | Sesenta golpes y cede | `gate_strike`, hoja articulada, rotura visible y seis tablas físicas; robledal atenuado y separación | Contacto preciso: alcance mecánico de grupo, no de mano; persisten contactos estrechos en embudos |
| **El valle tomado** (B3) | El clan entra y acaba la partida (`stormed`) | D6: objetivos reales, cargas, huellas y transición de 8–12 s sin avanzar el motor | Persistencia de cadáveres entre jornadas. Sangre/fuego siguen siendo decisión del dueño |
| **El saqueador que cae** (D2) | Una flecha lo deja `down` | Caída física articulada y apoyo en terreno/obstáculos; `fall` animado como respaldo | Sangre sin decidir (E4) |
| ~~**La muralla de piedra**~~ (A4, transición) · **hecha el 21 sep 2026** | El cerco cerrado mejora estacas a piedra | `wall.glb` se ve terminado; E0d añade el hueco y solar de obra intermedio, sin ocultar defensas vecinas | Cerrado para transición, sin cascotes ni animación de derribo. [Informe](historico/life-rounds/E0d-transiciones-muralla.md) |
| **La era del valle** (A4, A5) | El valle es caserío, aldea o villa cerrada, y eso ya se puede preguntar (`derive/era.ts`) | La cabecera lo dice desde A5; E0e añade color de caminos existentes, bancos de plaza y humo por era. §7.4b fija tierra pisada → piedra parcial → piedra completa. Doce tomas históricas sin rótulo, dos semillas y móvil/tableta fueron clasificadas 12/12 por otro agente | **Aceptada con reserva:** la separación aldea/villa tiene poco margen en algunos encuadres y la piedra sigue lisa, sin juntas. Ese detalle sería arte de superficie futuro. [Brief](historico/encargos/encargo-e0e-aceptacion-historica.md) e [informe](historico/life-rounds/E0e-ambiente-eras.md) |

**Actualización G-41 (27 sep 2026):** la reserva de las paredes lisas queda
atendida con juntas y leve relieve en `stone-house` y sus dos variantes. Las
cuatro siluetas nuevas se eligen de forma estable por parcela: las viviendas de
madera diversifican caserío y aldea; al mejorarse a piedra, la misma parcela
conserva su índice de forma y la villa reúne tres perfiles de piedra. El asedio
no añade una categoría de vivienda.
| ~~**Guardia en la atalaya**~~ (C1, C2) | Ocupan puestos de defensa | Puestos ocupados, armas, tensado y suelta | ~~Adarve y apoyo elevado real (E3)~~: hechos, E3a (22 sep) y E3b.3 (24 sep) |

## 2 · Mallas que faltan

**20 sep 2026 — aceptadas, publicadas e integradas:** `bow`, `spear`, `arrow`,
`shield`, `gate`, `plough` y `fountain`. Armas en las manos de la guarnición y
atacantes, flechas físicas con su malla, hoja `gate_door` con bisagra, arado y
fuente propios. Se conserva la aceptación visual de la primera tanda.
[Integración y límites](historico/life-rounds/E2-integracion-y-defensa.md).

| Malla | Para qué | Qué se ve hoy en su lugar |
|---|---|---|
| **El portón** (`gate`, A2) | La puerta del anillo | GLB propio con hoja articulada y rotura procedural que conserva el marco y genera seis tablas físicas; **no necesita variante rota aparte** |
| **El arado** (M-3) | El medio que libera brazos | GLB propio integrado (136 triángulos) |
| **La fuente** (P-3) | El centro de la plaza | GLB propio integrado (406 triángulos) |
| **La sala del rey** (`hall`, K-4) | La casa del que manda | Una casa más alta con tejado burdeos. Encargo en `docs/historico/plan-rey.md` §8 |
| **Armas y arcos** (C1) | Lo de arriba | Arco, lanza, flecha y escudo publicados e integrados |
| ~~**El clan vecino** (E2)~~ · hecho 22 sep | Quien ataca | `villager-neighbor.glb` integrado: aldeano de otro valle, gorro y esclavina de silueta propia, rig y clips del adulto. Reaprovecha arco, lanza y escudo; sin espada solicitada por la conducta actual. [G-28](historico/graphics-rounds/G-28.md) |
| **El bastión** (`bastion`, A3, 22 sep 2026) | La torre en la línea de muralla | **G-26:** modelo 1×1 aprobado y publicado. **G-27:** variante de 14 peldaños, huella 1×2 y respaldo G-26 si no cabe; el motor prefiere muros accesibles al mejorar, y el GLB se carga en el bundle. **G-29:** la guardia asignada sube, ocupa la plataforma a 1,02 y baja por la ruta privada; conserva colisiones y disparo físico. El adarve continuo llegó el 24 sep, generado desde el anillo (E3b.3). [G-26](historico/graphics-rounds/G-26.md) · [G-27](historico/graphics-rounds/G-27.md) · [G-29](historico/graphics-rounds/G-29.md) |
| ~~**Hacha y pico**~~ · hecho 24 sep (G-40) | Talar y picar piedra | `axe.glb` y `pickaxe.glb` publicados: recetas en `art/recipes/axe` y `pickaxe`, construidas con Blender 5.2 por `tools/art`. Mango de 1 m con `grip`, cabeza de hierro gris (`elderGrey`); el reparto los cuelga con el giro de agarre medido. Una prueba exige que su cabeza caiga a menos de 0,08 del golpe medido. El respaldo por código se conserva |
| ~~**Variantes del adarve**~~ (E3b.2) · **superado el 24 sep 2026**: el adarve dejó de hacerse por piezas y se genera por código desde el anillo real (E3b.3, `world/rampart.ts`); lo de esta fila es historia del camino por piezas | Continuar la guardia por el anillo de piedra | G-32 publicó entrada y módulo recto. Motor y render comparten selector: la nueva villa semilla 7/año 60 levanta espontáneamente un bastión junto a dos muros despejados y la guarnición tiene puesto sobre el segundo tramo durante aviso con armas. La app abre, aunque el bosque tapa la junta desde el ángulo inicial; falta acreditar su lectura cercana y el recorrido visible. Giro, diagonal y coronación del portón no tienen continuidad; [encargo E3b.2b](historico/encargos/encargo-e3b2b-modelos-candidatos.md) |

**Y las que sí están, para no volver a dudarlo:** `watchtower.glb` y `wall.glb`
existen y se usan; la atalaya de C1 se levanta y sus puestos se ocupan, y
desde el 24 sep el adarve recorre el anillo entero cuando todo él es
transitable (E3b.3). **Y `wall.glb` dejó de ser malla muerta el 18 sep** (A4): hasta ese día
ningún valle levantaba una sola pieza de piedra, así que la malla estaba en el
juego desde G-10 sin aparecer en una partida.

## 3 · Animación y efecto

**Actualización E1b, 20 sep:** `spear_thrust` y `hit_take` ya están conectados
al cuerpo a cuerpo real, además de los cuatro gestos de E1. La ronda posterior
entrega también `flee` con huida civil y refugio;
ya están integradas las armas. Las menciones anteriores a esos dos clips como
ausentes quedan superadas por [esta entrega](historico/life-rounds/E1b-cuerpo-a-cuerpo.md).

| Qué | Estado |
|---|---|
| **Clips de combate** (E1) | **Entregados por código, 20 sep:** tensar, soltar, golpear portón, lanza, recibir impacto, caer y huir. Reacción de puerta integrada. No son clips embebidos nuevos. [Cierre y límites](historico/life-rounds/E3-visibilidad-y-huida.md) |
| **La hoja del portón** | Integrada con pivote `gate_door`; rotura procedural que conserva el marco y genera tablas, sin otro GLB |
| **Talar y picar** (IA-anim, 24 sep) | **Entregados por código:** `chop` y `mine` con carga, golpe acelerado, rebote y astillas en el impacto; el filo del hacha va por delante. **Contacto medido:** la cabeza de la herramienta queda de −0,06 a 0,19 de la corteza y el pico en el borde de la roca (`tests/journeys/work-contact.test.ts`); el árbol golpeado oscila y suelta hojas. **Falta:** que la roca cambie al picarla (se dibuja como cantos sueltos y no se lee como cara de cantera) |
| **Fuego, humo y gore** (E4) | Nada. Cómo se ve arder una casa en un asalto y cómo se ve morir. **El gore es decisión del dueño** |
| **Escombros y ragdoll** | Entregados por código el 20 sep: once segmentos por cuerpo, suelo real, obstáculos y tablas físicas. Topes 24/24; reposo conservado y liberación al cambiar escena. [Evidencia](historico/life-rounds/D6-saqueo-y-fisica.md) |

## 4 · De otras rondas, aún abierto

- **El arado acarreado** el día que se da: una escena de dos con la carreta, no
  una colocación (`task-log.md`).
- **La reunión de §11.8 no cabe en una aldea grande**: se junta el 54 %, y la
  fracción baja con el tamaño. Tres pruebas declaradas con su medida.

---

**Cómo se mantiene esto.** Cuando una ronda diseñe algo que la pantalla no
cuenta, se añade aquí **en la misma ronda**, con qué hace el motor, qué se ve
hoy y qué haría falta. Un encargo que sólo vive en un comentario del código es
un encargo que nadie hará — y una mecánica que no se ve no existe para quien
juega.

## La madera a la vista (28 sep 2026, esquema 12)

La madera entra en la leñera de una en una, a su hora, con un porteador que la
trae y un «+1» encima (`docs/design.md` §5.4). Lo que el motor ya sabe y la
pantalla todavía no enseña del todo:

| Qué | Qué hace el motor | Qué se ve hoy | Qué haría falta |
|---|---|---|---|
| **La madera en la parcela** | La obra paga toda su madera al abrirse | Hasta tres albañiles llevan un haz de la leñera a la parcela la primera jornada, y el haz desaparece al llegar | Un montón de tablones en la parcela que baja a medida que la obra sube (`bpDone / bpCost`), reutilizando `log-pile` a escala |
| **La leñera que sube de uno en uno** | Cada entrega suma una unidad | El montón de `steading.ts` cambia por tramos de 60 (`floor(wood/60)`), así que casi ninguna entrega lo mueve | Un tronco más en el montón por entrega, o un escalón más fino, sin rehacer el grupo entero |
| **La entrega sin leñadores** | Entra igual, a su hora | El «+1» sale sin nadie delante los días en que el reparto no pone a nadie en el bosque (3 de 38 entregas medidas) | Que el reparto de la jornada (`life/day.ts`) ponga un leñador los días con entregas |
| **La piedra y el grano** | Siguen entrando por semanas enteras | La piedra se acarrea sin «+1»; el grano sube de golpe | Lo mismo que la madera: entregas con hora, porteador y aviso. Pedido por el dueño del diseño el 28 sep 2026, para después de probar la madera |

## El roble del valle (24 sep 2026)

**G-42:** `great-oak.glb` sustituye las primitivas cuando está publicado. Toma
la silueta del árbol del escudo: raíces abiertas, tronco bifurcado, ramas
horizontales y grupos de hojas separados por huecos. Mide 3,4 celdas de alto,
mantiene el color estacional y queda a la orilla del agua. Las primitivas
anteriores sólo son respaldo si falta el recurso. En valles con bosque denso,
algunos árboles vecinos pueden taparlo desde ciertos ángulos. Todavía no es
un lugar de actividad de la capa de vida.

## E4 · El fuego (25 sep 2026)

**G-42:** la casa de madera arde carbonizada en pie con `burnt-house.glb`.
Durante el tercer día caen tejado y paredes, dejando a la vista `ruin-wood.glb`.
Al terminar el fuego, la ruina persistente de la parcela ocupa el mismo sitio.
La transición está revisada en tres capturas de juego de
`artifacts/graphics/G-42/fire-transition/`. Quedan fuera de esta entrega los
derrumbes de otros tipos de edificio.

**Y la brigada de cubos (tanda 4):** la gente rodea la casa y vacía cubos
contra ella, pero **no va y viene del agua**: el cubo está siempre lleno. Una
cadena de cubos desde el pozo o el río sería más fiel. Tampoco se ve la
brigada en una captura todavía: está probada en `fire-brigade.test.ts`.

## Líder y rey (27 sep 2026)

- **La Edad del Hierro: el castillo y el evento de coronación.** Hasta
  entonces el que manda es «leader» y se le da un bastón de mando (Vera). El
  icono de la corona (`#crown`) en la ficha y la lista sigue a la vista.
- ~~**La sala del líder**~~: la casa larga de Astra, en v4.67.

## El agua (26 sep 2026)

Hecho en v4.63: el agua viva, la lluvia sobre ella, la riada y el cubo que se
tira. Pendiente, por orden de lo que se vería:

- ~~Las gotas atraviesan la pared; el vado no salpica; los charcos no crecen;
  no hay cascadas.~~ Hecho en v4.64. Queda: la cascada del lago se ve estrecha
  desde la cámara de reposo, y la niebla al pie de las cascadas no existe.
- ~~**Los pájaros son una uve dibujada**~~: la golondrina de Astra, en v4.65.

## Montañas y gargantas (26 sep 2026)

- ~~**El camino que sale por la garganta.**~~ Hecho en v4.60: una senda de
  tierra por la orilla, de dentro del valle a la sierra (`buildGorgeRoads`).
- ~~**El suelo de la garganta norte.**~~ Hecho en v4.60: no era el mapa, que
  ya es estrecho en los extremos, sino cómo se medía la subida de la roca.
- **Los peñascos y el mojón** son primitivas por código: en el encargo a
  Astra como kit de roca (`docs/encargos/encargo-astra-modelos.md`).

**Los modelos que faltan, en una lista y con su prompt:**
`docs/encargos/encargo-astra-modelos.md` (26 sep 2026).

## El valle más vivo (25 sep 2026)

Lo que la tanda dejó a medias, y lo que se hizo después el mismo día:

- ~~**Un perro, un zorro y patos.**~~ Hechos (`life/companions.ts`), y desde
  la segunda ronda el perro **ladra** —dibujado, `effects/barks.ts`: no hay
  sonido— al forastero y al zorro, y corre a por la pelota en juego.
  **Hecho después (25 sep):** el perro corre, ladra y hace la reverencia de
  juego (`effects/animal-gestures.ts`), fabricados sobre su esqueleto, y el
  perro nuevo de Vera ya está en el juego. **Pendiente:** el ladrido con sonido
  cuando haya audio (hay hueco en `src/ui/sound.ts`). El zorro sigue sin
  llevarse ninguna gallina (lo decide el motor, y hoy sólo con el lobo).
- ~~**La mula del buhonero, el puesto y lo que trae cada visita.**~~ Hechos:
  la mula va detrás del que vende; mientras se queda, monta delante su puesto
  (`effects/stalls.ts`): **el buhonero**, un tenderete a rayas con baratijas;
  **el factor**, la mesa con el libro de cuentas y la balanza y sacos vacíos;
  **el salinero**, sus sacos con uno abierto. **El tratante** trae detrás la
  vaca que vende. **Hecho después (25 sep):** los puestos son sólidos
  mientras están montados, la gente se acerca a mirar el género, y el trato
  cerrado se ve: le llevan la leña o el grano, la mula sale cargada, la vaca va
  al pasto, la sal se queda. **Hecho después (26 sep):** se ve pagar
  (monedas de mano a mano, `effects/coins.ts`) y la perdiz despega con su
  `takeoff` antes de aletear. **Pendiente:** el zorro de Vera, con esqueleto
  hecho por script, espera su visto bueno para publicarse.
- ~~**Los postes del tendedero y el bancal, sólidos.**~~ Hecho
  (`yardSolids`, `world/obstacles.ts`).
- ~~**A cubierto bajo un alero, y con gesto.**~~ Hechos: `shelterUnder` y el
  clip fabricado `shelter` (`action-clips.ts`): encogido, brazos cruzados,
  cabeza gacha y un tiritón. Nadie espera ante una puerta, de casa o de obrador.
- **Los charcos no salpican ni reflejan de verdad**: son discos grises lisos
  (`effects/puddles.ts`). Un mapa de entorno los haría espejos.
