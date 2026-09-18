# Plan de arte pendiente

**Fecha de registro:** 17 de septiembre de 2026  
**Estado:** catálogo de crónicas generado, normalizado e integrado; las piezas
decorativas y el arte 3D siguen su seguimiento separado.

Este documento reúne los pendientes de arte visual que quedan después de la
tanda de aldeanos. Sirve como lista de trabajo para las siguientes rondas y
separa las ilustraciones de crónica, los adornos de interfaz y el arte 3D del
mundo.

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

La familia `raid` **no entra en esa tanda**. Está siendo desarrollada ahora
mismo en cambios sin cerrar de `state.ts`, `sim.ts`, `world/threat.ts`, el
banco de crónica y el render 3D (`raid.assault`, `raid.held`, `raid.stormed` y
variantes). Se deja anotada y sin arte hasta que su contrato sea estable.

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

**Si hay que hacer menos de siete**, el orden es: `raid-assault`,
`raid-stormed`, `raid-coming`, `raid-sack`. Las tres primeras son las que salen
en una partida que llega al asedio; `raid-walled` y `raid-held` pueden apoyarse
en `raid-sack` y `raid-assault` mientras no existan, porque el respaldo por
clave lo permite sin tocar código.

## Orden recomendado

1. ~~Resolver el recuento de ilustraciones y cerrar el catálogo nominal.~~
   **Resuelto: 23 ficheros.**
2. Producir el kit decorativo de interfaz, porque sus respaldos ya tienen
   puntos de integración claros.
3. Producir las ilustraciones de crónica por familias narrativas.
4. Abordar el 3D del mundo empezando por defensas y caminos, que pueden
   requerir cambios de generación y colisión.
5. Cerrar escenario, cobertizo, adornos y agua del vado con capturas del juego.
