# Plan de arte pendiente

**Fecha de registro:** 17 de septiembre de 2026  
**Estado:** catálogo de crónicas generado, normalizado e integrado; las piezas
decorativas y el arte 3D siguen su seguimiento separado.

Este documento reúne los pendientes de arte visual que quedan después de la
tanda de aldeanos. Sirve como lista de trabajo para las siguientes rondas y
separa las ilustraciones de crónica, los adornos de interfaz y el arte 3D del
mundo.

## Propuesta pendiente · portada del menú y apertura del libro

**Estado:** cubierta estática con pergamino, lomo, cuero y canto de páginas
integrada en el menú; pendiente la apertura animada y precarga coordinada.

La portada definitiva de Higgsfield (`public/ui/art/title-valley-higgsfield.png`)
se conserva como una **pantalla plana de inicio de videojuego** con apariencia de
portada de libro medieval. No se debe convertir en un libro 3D permanente ni en
una escena de producto: la tapa frontal contiene el menú y conserva la lectura
inmediata de una pantalla jugable.

La pantalla actual reutiliza la ilustración central de ese PNG; los rótulos y
botones impresos no entran en el recorte. El fondo de pergamino usa el tono
`#E0C39A` y la textura local existente. El marco de cuero, lomo y cantos se
dibujan con CSS, conservando los controles HTML. Falta validar la apertura
descrita abajo; la cubierta estática no la acredita.

### Flujo propuesto

1. El jugador pulsa `START GAME` o `CONTINUE` en la portada.
2. La aplicación inicia inmediatamente la precarga del mapa y de los recursos
   necesarios para el valle elegido, manteniendo la portada visible mientras el
   trabajo avanza.
3. Cuando el mapa ya tiene una escena presentable, comienza la transición: la
   tapa frontal de cuero se abre desde el lomo del lateral izquierdo.
4. Mientras la tapa gira y deja ver el interior, el mapa previamente cargado
   aparece progresivamente detrás/debajo de ella; no debe mostrarse un vacío ni
   una pantalla de carga separada.
5. Al terminar la apertura, la cámara queda en el valle y la portada deja de
   recibir interacción.

### Lenguaje visual de la transición

- El lomo izquierdo, el cuero de la tapa y los cantos de las hojas visibles en
  la portada son las pistas visuales que justifican la animación posterior.
- La portada permanece frontal durante el estado de espera; la perspectiva solo
  aparece al abrirse, lo suficiente para que la tapa tenga bisagra y espesor.
- `START GAME` y `CONTINUE` comparten la misma transición; cambia únicamente el
  estado del valle que aparece debajo.
- La precarga y la apertura son estados coordinados: la animación no debe dejar
  al jugador esperando con el libro abierto a medias, y el mapa no debe aparecer
  antes de que la tapa lo revele.
- Si la precarga falla, la tapa no se abre: la portada conserva el menú y
  muestra el error dentro del lenguaje de pergamino existente.

### Criterio de aceptación pendiente

- La captura inicial sigue pareciendo una portada de videojuego, no un libro
  físico aislado.
- Se distinguen tapa frontal, lomo izquierdo, cuero y hojas en el borde derecho
  e inferior.
- `START GAME` y `CONTINUE` empiezan la precarga sin bloquear la interfaz.
- El mapa se ve cargado antes de que termine la apertura y aparece detrás de la
  tapa, no como un corte brusco.
- La transición funciona con una partida nueva y con una partida continuada, y
  tiene un estado de error comprobable.

## Ilustraciones de la crónica

El catálogo final usa **PNG 640 × 512**, todos con estilo de grabado marrón:

- [ ] Fundación del valle.
- [ ] Las cuatro estaciones.
- [ ] Nacimiento.
- [ ] Muerte.
- [ ] Cosecha.
- [ ] Hambre.
- [ ] Peste.
- [ ] Incendio.
- [ ] Construcción.
- [ ] Ruinas.
- [ ] Camino.
- [ ] Llegadas.
- [ ] Rencor.
- [ ] Sucesión.
- [ ] Riada.
- [ ] Lobo.
- [ ] Boda.
- [ ] Buhonero.
- [ ] Pesca.
- [ ] Oso.
- [ ] Niño perdido.

El catálogo nominal que consume `src/ui/redesign/chronicle-art.ts` tiene
**23 ficheros**. Las cuatro estaciones son cuatro piezas independientes y
«llegadas» no añade una vigésima cuarta: llegada, partida y forastero reutilizan
`road.svg`. Este recuento manda sobre el «22» antiguo del encargo y sobre la
enumeración resumida de arriba.

La interfaz ya tiene respaldos visuales: cuando falta un dibujo, la crónica
usa la hoja de roble o el diseño alternativo. Eso evita huecos rotos, pero no
sustituye este catálogo final de ilustraciones.

### Primera familia narrativa · vida del valle · 18 sep 2026

Higgsfield generó una hoja 3 × 2 (`9f1b23ac-4a90-46d4-84de-3ce4acbd67c1`)
con fundación, nacimiento, muerte, boda, niño perdido y rencor. Las cinco
primeras escenas cuentan bien su entrada y tienen la silueta kawaii aprobada.
El rencor de la hoja falló —sentó a las figuras juntas— y se corrigió aparte en
`536490d3-2fb7-48ef-84b4-f9220ce0ec00`: cuerpos vueltos en direcciones opuestas
y un hueco inequívoco entre ambos. La costura vertical del papel de esa salida
no pertenece al dibujo y se omite al preparar el activo.

La comparación con `ui-prototypes/02-chronicle-first.png` corrigió el criterio:
**el trazo kawaii no era el defecto**; faltaba el fondo ambiental que convierte
un símbolo en una escena. Una primera prueba con la captura completa
(`241e311f-02b8-49ad-9350-0bcc11e15b88`) copió también la boda y se rechaza.
Después se pasaron dos recortes limpios —sólo la fundación y sólo los dibujos
del prototipo— y `cb1b5195-bacc-4bb9-9a5a-a323e5c304c5` sí da la combinación:
personajes claros, río, hierba, árboles y asentamiento tenue. Reducida a
**133 × 100 px**, la pareja, el hato y la cesta siguen leyéndose y el paisaje
no se vuelve ruido.

El dueño fijó después la mezcla exacta: **las figuras kawaii originales, de
línea marrón y sin relleno**, más ese fondo detallado. La pasada definitiva de
fundación es `f56e5bf2-ef45-4a36-8ef1-3c160b1a291d`; se recorta al formato
canónico **5:4, 640 × 512 px**, sin cortar hato, pies, cesta, río ni aldea, y se
conserva en `visual-reference/higgsfield/chronicle-founding-640x512.png`. Su
prueba a **125 × 100 px** mantiene la lectura. Ésta, y no la hoja 3 × 2 ni las
dos pruebas anteriores, es la referencia para el resto de la crónica.

### Siguiente pieza en revisión · nacimiento · 18 sep 2026

Se pidió una sola generación individual, usando la fundación aprobada como
referencia directa y el mismo formato 5:4. Higgsfield/gpt_image_2_5 devolvió
`2de52186-5583-408d-87aa-f1f58ac1e065` (1 crédito). El resultado queda
**pendiente de aprobación visual**; no se copia al juego ni se marca como final
hasta comprobarlo a tamaño normal y reducido a 125 × 100 px.

La tanda siguiente queda también pendiente de revisión, sin integración:
`d2911ba5-8814-4e72-8a96-a60731501c6d` (muerte),
`548914fb-5daa-42a8-b969-52a9cb6129b7` (boda),
`4a7326e2-40c5-41a9-bf35-99a2c1d53b1b` (niño perdido) y
`78555272-9ea4-4b09-8a4e-ca1b39070949` (rencor). Las cuatro se generaron
individualmente con la fundación aprobada como referencia.

La boda anterior se descartó por un tono demasiado infantil. Corrección
natural: `d36030c6-ded9-481c-a02d-741ef5ce933f`; queda pendiente de aprobación.

**Integración cerrada · 18 sep 2026:** Fundación y Nacimiento se regeneraron
con la boda natural como referencia (`c0881289-43c2-4ff6-bacc-678e725888af` y
`a9d78998-866b-457d-972e-38d9ed069fbf`). Las 23 piezas se normalizaron a
640 × 512, se copiaron a `public/ui/art/`, se registraron en `index.json` y
`chronicle-art.ts` apunta ya a los PNG. La crónica repinta las viñetas cuando
termina de cargar el índice, evitando que la primera apertura conserve el
respaldo antiguo. Verificado en el juego real con Fundación visible.

### Auditoría posterior · crónicas añadidas

Las diez entradas estables `means.*.given` ya tienen ilustración propia: arado,
cerdos, hacha, reliquia, armas, arcos, atalaya, portón, jornalero y barril de
cerveza. Se generaron con la boda natural como referencia, se normalizaron a
640 × 512, se añadieron al índice y `chronicle-art.ts` las selecciona por
`templateKey`. Una clave futura desconocida conserva el respaldo.

La familia `raid` ya tiene el contrato cerrado en B1–B4. Sus siete escenas se
documentan e integran en la sección específica de este documento.

## Piezas decorativas de la interfaz

- [ ] Sello de lacre.
- [ ] Hoja de roble.
- [ ] Ornamentos de esquina.
- [ ] Borde curvado del pergamino.
- [ ] Marco de la capitular.
- [ ] Anillo del retrato.
- [ ] Catálogo y conexión de cada pieza con su pantalla de destino.

Estas piezas deben conservar el mismo lenguaje de grabado a una tinta y
mantener los respaldos actuales hasta que cada SVG final esté integrado.

### Primer tanteo con Higgsfield · 18 sep 2026

Se usó como referencia la hoja de concepto aprobada para piedra y moneda
(`911bbdc2-35df-4fe6-abaa-e8a0657d942b`) y Seedream 4.5. Se pidieron seis
diseños —la esquina derecha se obtiene reflejando la izquierda—. El primer
envío en paralelo rechazó tres solicitudes, pero el saldo seguía disponible y
se reenviaron individualmente sin duplicar las aceptadas:

| Pieza | Generación | Juicio | Estado |
|---|---|---|---|
| Hoja de roble | `b4f95756-e270-43b6-a6be-36fd9ee88ead` | Buena silueta y trazo; sirve como base para calcar y simplificar a 24 px | pendiente de SVG e integración |
| Borde del pergamino | `d301d6fe-c723-4dff-9f13-82341ca7daa3`, corrección `bda5a32a-3fa5-4420-b213-19db9ad44a24` | El primero dibujó un pergamino completo. La corrección contiene arriba la curva baja útil, pero también copió la referencia debajo | aislar sólo la silueta superior al calcar |
| Marco de capitular | `5423f4f8-35f8-48dd-a4d8-43ffa35b394d`, corrección `d230c251-e9da-4170-a888-f65b63877cbd` | El primero era demasiado grueso; la corrección es más limpia y sirve como guía, aunque aún debe aligerarse a 54 px | pendiente de SVG e integración |
| Sello | `ff129867-c2f3-47f8-b55b-4d680fe5a2f6` | Buena forma irregular y árbol central reconocible | pendiente de SVG, color e integración |
| Esquina izquierda/derecha | `9f78b2c0-011f-4ccf-9200-92e010c83393` | Composición fina y abierta; una sola pieza sirve reflejada para ambos lados | pendiente de SVG e integración |
| Anillo del retrato | `4803dd6f-8b85-4be3-97a6-901a70932b4f` | Doble aro, leve ángulo y canto grabado; limpio y legible | pendiente de SVG e integración |

Ningún PNG se copia directamente a la interfaz: Higgsfield fija la forma y el
trazo; la entrega final sigue siendo SVG limpio, pequeño y con `currentColor`.

## Arte 3D del mundo

- [ ] Geometría más elaborada para campos y caminos.
- [ ] Familia completa de defensas: tramos, esquinas, uniones y portones.
- [ ] Más siluetas y tamaños de árboles.
- [ ] Objetos sueltos y adornos del mapa.
- [ ] Integrar los elementos que aún están pendientes, incluido el cobertizo.
- [ ] Revisar el agua del vado y los detalles restantes del escenario.

En las defensas la tarea incluye la integración con la lógica de colocación y
colisiones; no basta con añadir una malla que se vea bien. En el vado hay que
revisar tanto la lectura visual del agua como su relación con orillas y rutas.

## Las siete del asedio (B1–B4, 18 sep 2026) — **pedidas por el dueño**

**Son las entradas de más peso de la crónica y son las únicas sin imagen.** El
asedio entró en el motor entre B1 y B4 con un `kind` nuevo (`'raid'`) que la
tabla de arte no conocía, así que las siete líneas caían al respaldo de la hoja
de roble mientras un nacimiento o una cosecha llevan su cuadro. La tabla ya está
escrita por clave (`src/ui/redesign/chronicle-art.ts`, `RAID_ART`): **basta
soltar los PNG en `public/ui/art/` y añadirlos a `index.json`**, a 640 × 512 como
el resto.

Y las claves están cerradas: B1, B2, B3 y B4 están hechas, así que esta lista no
se mueve.

| Fichero | Clave | Qué tiene que enseñar |
|---|---|---|
| `raid-coming.png` | `raid.coming` | **El aviso.** Humo en la loma de enfrente, o el jinete que baja del pasto alto a decirlo. Nadie peleando: es la víspera, ocho semanas antes (catorce con atalaya) |
| `raid-paid.png` | `raid.turned_back` | **Se les pagó.** La plata subiendo la ladera y la partida dándose la vuelta sin un golpe |
| `raid-sack.png` | `raid.open`, `raid.beast` | **El saqueo de un pueblo abierto.** Se llevan grano, plata y una cabeza de ganado; nadie los para |
| `raid-walled.png` | `raid.walled` | **El cerco cerrado.** La misma partida rodeando una muralla con su portón echado, y llevándose poco |
| `raid-assault.png` | `raid.assault` | **La avalancha contra el portón.** Es el cuadro de la semana en que se decide la partida: el grupo apretado golpeando la puerta. *El dueño lo describió así al verlo en marcha: «una especie de avalancha golpeando la puerta… chocándose»* |
| `raid-held.png` | `raid.held` | **El cerco aguantó.** Muertos delante de la puerta y la puerta en pie. Los muertos **no son del valle** |
| `raid-stormed.png` | `raid.stormed` | **El valle tomado**, y es el final de una partida: el portón en pedazos y el boquete a los lados. No es un pueblo vacío —queda gente— es un pueblo perdido |

**Integración cerrada · 18 sep 2026:** las siete escenas se generaron con la
referencia natural aprobada, se revisaron visualmente, se normalizaron a 640 ×
512 y se añadieron al índice de arte. `raid.beast` reutiliza `raid-sack.png`.

## Las cuatro de la villa cerrada (A1, A2, A4, C3 · 18 sep 2026)

**Por la regla del dueño del diseño del 18 sep 2026:** cada crónica nueva crea
aquí la tarea de pedir su imagen, en la misma ronda. Éstas son la deuda que esa
regla destapa al escribirla, y todas tienen la misma causa: son entradas de
`kind: 'built'`, así que `illustrationFor` las manda al grabado genérico de
construcción (`built.png`). Una de las cuatro es **de peso 3** —el cierre de la
villa, que pasa una vez en la vida de una aldea— y comparte dibujo con «se ha
levantado un campo».

Y tres de las cuatro **no existían de verdad hasta esta semana**: el portón es
de A2, la atalaya de aldea es de C3 y la muralla de piedra no la levantaba
ningún valle hasta A4 (cero de doce medidos), así que pedir su dibujo antes
habría sido pedir el dibujo de algo que no se veía.

| Fichero | Clave | Qué tiene que enseñar |
|---|---|---|
| `wall-closed.png` | `wall.closed` | **La villa se cierra**, y es el cuadro de la fase 3 de §1b: el anillo completo visto desde fuera con su portón echado y el pueblo dentro. No es una obra en marcha — es el día en que la última pieza cierra el círculo. Peso 3 |
| `built-gate.png` | `built.gate` | **El portón recién colgado**: la hoja nueva en su hueco de la estacada, con las jambas. Es la puerta de un pueblo, no la de un castillo |
| `built-wall.png` | `built.wall` (y `built.wall.year`) | **La estacada doblada en piedra**: el tramo de madera dando paso al muro, con la piedra de la cantera a pie de obra. Desde A4 lo tienen 10 de 12 valles |
| `built-watchtower.png` | `built.watchtower` (y `built.watchtower.year`) | **La atalaya acabada** contra el cerco, que es donde A4 la planta: una torre de madera y piedra pegada a la muralla, con alguien arriba mirando el camino |

**Integración cerrada · 19 sep 2026:** las cuatro escenas se generaron con la
referencia aprobada de la fundación, se normalizaron a 640 × 512, se añadieron
al índice y `illustrationFor` las selecciona por clave antes del respaldo
genérico de construcción.

## El bastión (A3 · 19 sep 2026)

**Por la regla del dueño del diseño del 18 sep 2026:** cada crónica nueva crea
aquí la tarea de pedir su imagen, en la misma ronda. `built.bastion` es
`kind: 'built'`, así que hasta que exista su dibujo `illustrationFor` la manda
al grabado genérico de construcción (`built.png`) — el mismo respaldo que
tuvieron `built.gate`, `built.wall` y `built.watchtower` antes de que la
sección de arriba les diera el suyo.

| Fichero | Clave | Qué tiene que enseñar |
|---|---|---|
| `built-bastion.png` | `built.bastion` (y `built.bastion.year`) | **Una torre saliendo de la propia muralla**, no al lado de ella: la piedra del tramo subiendo de golpe en un punto y quedando más alta que el resto del cerco a los dos lados. Es la pieza que diferencia un bastión de una atalaya suelta (`built-watchtower.png`) — ésa se ve como un edificio aparte pegado al muro; el bastión tiene que leerse como el muro mismo levantándose |

## La temática nueva: grabado de tinta parda (18 sep 2026)

**Cinco piezas subidas por el dueño del diseño**, con la referencia y la
correspondencia pieza a pieza en `docs/visual-reference/engraving/README.md`.
Lo que definen no es una ilustración más: es **el trazo y el color de la
interfaz entera** —una sola tinta parda sobre papel crema, sin un segundo
color—, así que lo que hoy va en oro o en rojo es de la versión anterior.

| # | Pieza | Qué sustituye | Cómo entra |
|---|---|---|---|
| 1 | Hoja de roble | El `oak-leaf` del sprite, hoy pintado en oro (`--skin-gold`) en el ornamento de la bandeja | Calco a SVG (`calcar-iconos`) y al sprite de `public/ui/icons.svg` |
| 2 | Sello de lacre con el roble | El `seal-tree` de VZ-03, el acceso a una decisión aplazada | Igual, al sprite |
| 3 | Esquina de vid de roble | El canalón de la crónica (`paintVine`, `chronicle-ornaments.ts`) | Calco a SVG; es un adorno de página, no un icono |
| 4 | Marco cuadrado con hojas en las esquinas | El capitular de la crónica (`capital-anno.png`: recuadro rojo con la A en oro) | PNG normalizado en `public/ui/art/`, como el resto del capitular |
| 5 | Banderola de pergamino | **Nada todavía, y es el hueco más claro**: es una cinta para un rótulo. La fase del valle (A5) se lee hoy en versalitas sueltas bajo el ornamento de la bandeja; en una banderola sería un rótulo de verdad | Pieza nueva de piel: pide ronda con captura a 390 y a 750 |

Ninguna de las cinco se integra sin pasar por la skill `piel-del-valle` (§10) y
sin retirar, en la misma ronda, el color que sustituye.

## Iconos que faltan en el sprite (UI-V10, 18 sep 2026)

| Icono | Para qué | Qué se usa hoy en su lugar |
|---|---|---|
| **Despejar la pantalla** | El botón nuevo del rincón de mandos: quita cabecera, bandeja y barra, y deja sólo el valle (decisión del dueño del diseño, 18 sep) | **El icono del valle** (`mountains`, el de su pestaña). Dice a dónde se va, así que no miente, pero es el mismo dibujo en dos sitios con dos significados. Lo que pide es un icono propio en la temática de tinta parda: un marco vacío, un ojo, o las dos flechas que abren. No se dibujó en la ronda porque el sprite (`public/ui/icons.svg`) y el documento que lo incrusta (`index.html`) están tocados por el dueño ahora mismo |

## Orden recomendado

1. ~~Resolver el recuento de ilustraciones y cerrar el catálogo nominal.~~
   **Resuelto: 23 ficheros.**
2. Producir el kit decorativo de interfaz, porque sus respaldos ya tienen
   puntos de integración claros.
3. Producir las ilustraciones de crónica por familias narrativas.
4. Abordar el 3D del mundo empezando por defensas y caminos, que pueden
   requerir cambios de generación y colisión.
5. Cerrar escenario, cobertizo, adornos y agua del vado con capturas del juego.

### La primera vectorización, descartada (19 sep 2026)

Se calcaron las seis piezas a SVG (`public/ui/decorative/prototypes/`) y **el
dueño del diseño las descartó**. Lo que merece la pena guardar de ese intento es
la medida, porque la misma piedra está esperando al siguiente: cinco de las seis
estaban dibujadas **para verse grandes** —lienzo de 256 con trazos de 2 a 9— y
el hueco que les toca en la interfaz mide entre 30 y 66 px, así que su trazo más
fino salía a:

| Pieza | Hueco | Trazo fino en pantalla |
|---|---|---|
| Hoja de roble | 30 px | 0,47 px |
| Sello del roble | 30 px | 0,35 px |
| Marco del capitular | 56 px | 0,44 px |
| Esquina de vid | 32 px | 0,50 px |
| Anillo de retrato | 66 px | 0,52 px |
| Banderola | 358 px | 1,12 px |

Por debajo de un píxel un trazo no se dibuja: se insinúa. **La banderola era la
única cuyo dibujo y cuyo destino coincidían** —se enseña ancha— y sigue siendo
la pieza con el hueco más claro: un rótulo para la fase del valle, que hoy va en
versalitas sueltas bajo el ornamento.

Así que quien vuelva a intentarlo: **el tamaño de destino va antes del trazo**, y
lo que hay hoy en el sprite son siluetas rellenas calcadas para leerse a 26 px,
no dibujos de línea.

### Caza física: ilustraciones de crónica pendientes

Los nuevos registros `hunt.kill.partridge`, `hunt.kill.rabbit`,
`hunt.kill.deer`, `hunt.kill.boar` y `hunt.kill.bear` necesitan una estampa
sepia distinta por especie. El encuadre debe mostrar la presa, el arma elegida
cuando sea visible y el entorno propio: prado, linde, bosque y entrada rocosa.
La del oso ocurre **fuera** de la guarida; no hay interior ni pantalla jugable
dentro de ella. Las huidas usan el mismo motivo sin cadáver. Los modelos 3D
aprobados ya cubren la escena en vivo; esta tarea es solo para la crónica.

## Pendiente · el año del campo (IA-fields, 24 sep 2026)

Pedido por Vera: cada fase del campo es un suceso de la crónica («la primera
siembra de X»). Mientras no haya dibujo, estas líneas caen al grabado genérico
de la cosecha (`kind: 'harvest'`). Mismo tamaño que el resto, 640 × 512, y se
integran por `public/ui/art/index.json` y `src/ui/redesign/chronicle-art.ts`.

| Fichero | Clave | Qué tiene que enseñar |
|---|---|---|
| `field-manure.png` | `fields.first_manure`, `fields.manured` | **El estiércol al salir del invierno.** Una carretilla de estiércol junto al rastrojo y alguien echándolo con la horca; tierra oscura y vapor en la mañana fría |
| `field-plough.png` | `fields.first_plough`, `fields.ploughed` | **El arado.** La tierra abriéndose en surcos oscuros detrás de la reja o de la azada; la primera vez, que se note que es tierra que nunca se había vuelto |
| `field-sow-grain.png` | `fields.first_sowing.grain`, `fields.sown.grain` | **La siembra a voleo.** Un sembrador con la bolsa a la cadera lanzando la simiente en abanico sobre los surcos |
| `field-sow-cabbage.png` | `fields.first_sowing.cabbage`, `fields.sown.cabbage` | **Plantar coles.** Plantones en fila, alguien de rodillas asentándolos con la mano |
| `field-sow-leeks.png` | `fields.first_sowing.leeks`, `fields.sown.leeks` | **Plantar puerros.** El plantador abriendo hoyos con la estaca y metiendo cada puerro |
| `field-ripe-grain.png` | `fields.ripe.grain` | **El cereal dorado en pie**, doblado por el peso, justo antes de la hoz |
| `field-ripe-cabbage.png` | `fields.ripe.cabbage` | **Las coles hechas**, cabezas grandes y apretadas en su fila |
| `field-ripe-leeks.png` | `fields.ripe.leeks` | **Los puerros altos**, listos para arrancar |
