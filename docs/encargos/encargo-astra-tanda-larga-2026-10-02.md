# Encargo a Astra · la tanda larga de modelos (2 oct 2026)

Lo pidió Vera el 2 oct: «una sesión larga de encargos de modelos 3D a Astra; se
acaban mañana los créditos y hay que gastarlo todo». Es **una sola sesión, larga
y ordenada**: Astra va de arriba abajo y, si se le acaba el tiempo, lo hecho
queda entregado y lo demás sigue en la lista.

Sale de `docs/encargos-3d.md`, de los encargos sueltos de `docs/encargos/` que
nadie había hecho todavía y de las rondas de hoy (K5 cuero y sastrería, la
ronda del daño, la fauna por estaciones). Lo que ya está hecho no se repite
(abajo, «No se encarga»).

**Como siempre, Astra hace sólo el modelo**: receta, GLB candidato, hoja de
capturas y README. La integración en el juego, el catálogo y la publicación los
hace después otra sesión.

---

## La lista, por bloques y en orden

Una celda son 3 m y un aldeano mide 0,65 celdas (1,95 m). Estilo facetado, sin
texturas, color por material de `palette.json`. Origen en la base y frente a
+Z, salvo que se diga otra cosa.

### Bloque 1 · Lo que el juego ya pinta con cajas y está esperando el modelo

| # | `id` | Qué es | Medidas y presupuesto | Brief |
|---|---|---|---|---|
| 1 | `notice-board` | El tablón de misiones de la plaza: dos postes, tejadillo de dos aguas, tres o cuatro papeles. **Se toca**: tiene que leerse desde lejos | 1,3 × 0,9 × 0,3 celdas; ≤ 400 tri | `visitantes-y-expediciones.md` §1 |
| 2 | `smithy-board` | La tabla de avisos de la fragua: clavo de herradura arriba, hollín en la madera | 0,7 × 0,5 celdas; ≤ 250 tri | `ilustraciones-k8-k9.md` |
| 3 | `chapel-board` | La de la capilla: tejadillo pequeño y una cruz tallada arriba | 0,7 × 0,5 celdas; ≤ 250 tri | `ilustraciones-k8-k9.md` |
| 4 | `tailor-board` | **Nueva (K5, sastrería)**: la tabla de la sastrería, con una madeja de lino y unas tijeras colgadas | Como las dos de arriba | — |
| 5 | `signpost` | El cartel de cada entrada del valle: poste con tablilla, sin texto legible | `cartel-del-camino.md` | `cartel-del-camino.md` |
| 6 | `hide-rack` | El bastidor de pieles: un marco de varas con **cinco estados** (0, 1–2, 3–5, 6+ pieles: cuatro GLB o uno con las pieles en mallas separadas `hide_1`…`hide_4`) | 1 × 0,4 celdas, 0,9 de alto; ≤ 400 tri con las cuatro | `ilustraciones-k5-cuero.md` §3 |
| 7 | `hammer` | El martillo de la obra y del herrero, con el origen en la empuñadura (lo cuelga `hand_r`, como el hacha) | Como `axe`; ≤ 120 tri | `encargos-3d.md` §3, AN-2b |

### Bloque 2 · La sastrería (K5, hoy)

| # | `id` | Qué es | Medidas y presupuesto |
|---|---|---|---|
| 8 | `tailor` | **La sastrería**: el taller de la tejedora, 2 × 2 celdas, madera y adobe como la casa, con un telar visible por una puerta ancha o un porche, y madejas colgadas al sol en un lateral. Tiene que distinguirse de la casa y de la herrería a la cámara de reposo | 2 × 2 celdas; ≤ 1 500 tri |
| 9 | `loom` | El telar de bajo lizo, suelto, para el porche o el interior | ≤ 400 tri |
| 10 | `field-flax` | **El campo de lino**: un campo como `field`, con las matas finas y la flor azul pálido en verano (dos GLB: `field-flax` en flor y `field-flax-cut` segado, en gavillas) | Como `field` |
| 11 | `linen-bolt` | Un rollo de lienzo, para cargar o apilar | ≤ 60 tri |

### Bloque 3 · La armadura (las cuatro edades, `docs/plan-meta.md` AR)

Todas son **piezas que se cuelgan del aldeano**, no figuras nuevas: cada una en
su malla, con el origen en su hueso (`spine` para el torso, `head` para la
cabeza, `leg_l`/`leg_r` para las grebas), y medidas sobre `villager.glb`.
**Tienen que leerse a 20 px de alto** (el aldeano a la cámara de reposo):
silueta y color, no detalle.

| # | `id` | Edad | Qué es | Presupuesto |
|---|---|---|---|---|
| 12 | `jerkin` | Cuero (hoy) | El peto de cuero modelado, para sustituir a las seis cajas de `render3d/world/jerkin.ts`: cuero, hombreras más oscuras y una bandolera clara | ≤ 200 tri |
| 13 | `mail` + `helm-nasal` | Hierro | La cota de malla gris hasta medio muslo, y el casco cónico con nasal | ≤ 250 + ≤ 120 tri |
| 14 | `plate` + `greaves` | Acero | La pechera de acero sobre la malla, más clara y brillante que la cota, y las grebas | ≤ 250 + ≤ 150 tri |
| 15 | `harness` + `helm-closed` | Caballeros | El arnés completo con yelmo cerrado: **la silueta del caballero, distinta de todas** | ≤ 600 + ≤ 150 tri |

### Bloque 4 · La mina (`docs/plan-meta.md` AR-2)

Vera: **«que la mina tuviese una entrada que se viese como la cueva del oso, más
grande, y que entrasen y se viesen entrar, desaparecer y salir; carruajes con
el mineral: que lleguen llenos, se descarguen y salgan vacíos para adentro»**.

| # | `id` | Qué es | Presupuesto |
|---|---|---|---|
| 16 | `mine-mouth` | La boca de la mina: parte de la receta de la cueva del oso (`art/recipes/bear-den`) **más grande**, hundida en la ladera como ella, con un marco de entibado de madera (dos postes y un dintel) y los raíles que salen | ≤ 1 200 tri |
| 17 | `minecart` + `minecart-full` | La vagoneta vacía y llena de mineral (el mineral en malla aparte, `ore_load`, para poder quitarlo al volcar), con las ruedas en mallas `wheel_*` con su eje como origen | ≤ 300 tri |
| 18 | `ore-pile` | El acopio de mineral junto a la herrería, con cuatro tamaños (como el bastidor de pieles) | ≤ 300 tri el mayor |
| 19 | `rails` | Un tramo recto de raíles de madera de 1 celda, que se repite | ≤ 80 tri |

### Bloque 5 · Los visitantes y los expedicionarios

Accesorios para el aldeano, con su punto de enganche (mano derecha, espalda o
cabeza) como las armas. Brief: `visitantes-y-expediciones.md` §2 y §3.

| # | `id` | Quién |
|---|---|---|
| 20 | `fiddle` | El juglar |
| 21 | `pilgrim-hat` + `pilgrim-staff` | Los peregrinos |
| 22 | `grindstone-pack` | El calderero |
| 23 | `herb-basket` | La curandera |
| 24 | `bundle-pack` | La familia que huye |
| 25 | `forage-basket`, `rope-pick`, `trade-pack`, `hide-bundle` | Los expedicionarios, a la vuelta |

### Bloque 6 · La fauna por estaciones (v5.85, hoy)

| # | `id` | Qué es | Presupuesto |
|---|---|---|---|
| 26 | `stork` + `stork-nest` | La cigüeña de verdad, de pie en el prado (cuello y patas largas, blanca y negra, pico rojo), y su nido de ramas para un tejado o el campanario | ≤ 250 + ≤ 200 tri |
| 27 | `chick` | El polluelo: hoy es una gallina diminuta y se lee mal. Una bola amarilla con pico y patas | ≤ 80 tri |
| 28 | `crane` | La grulla en vuelo, para la uve de otoño, con las alas en mallas `bird_wing_l`/`bird_wing_r` como la golondrina | ≤ 150 tri |
| 29 | `butterfly` | Una mariposa de dos alas planas (`wing_l`, `wing_r`), para instanciar | ≤ 16 tri |

### Bloque 7 · El pueblo que se sienta, trabaja y suena

| # | `id` | Qué es | Presupuesto |
|---|---|---|---|
| 30 | `bench` + `log-seat` | Un banco junto a la puerta de casa y un tronco para sentarse alrededor de la hoguera (`sit` sube a la altura del asiento el día que existan) | ≤ 100 cada uno |
| 31 | `cart` | Un carro de dos ruedas con varas, para el factor y para la leña lejana (ruedas en malla aparte) | ≤ 500 tri |
| 32 | `horse` | Un caballo de tiro, con el mismo esqueleto de cuadrúpedo que la mula | ≤ 900 tri |
| 33 | `fence` + `fence-gate` | Un tramo de cerca de varas de 1 celda y su portillo (para los corrales de K12, si Vera los aprueba: no bloquea nada si no) | ≤ 60 + ≤ 100 tri |

### Bloque 8 · Si queda tiempo: lo abierto del primer encargo

| # | `id` | Qué es | Nota |
|---|---|---|---|
| 34 | `great-oak` | El roble del valle | Ya hay un candidato (`art/recipes/great-oak-candidate`); **sólo si Vera lo pide**: mejorar el candidato, no rehacerlo |
| 35 | `house-burnt` | La casa quemada | Ya hay un candidato (`art/recipes/burnt-house-candidate`); lo mismo |

---

## No se encarga

Está hecho: `bow`, `spear`, `arrow`, `shield`, `gate`, `plough`, `fountain`,
`axe`, `pickaxe`, `bastion` y variantes, `villager-neighbor`, los candidatos del
adarve, los modelos de Vera del 25 sep, el zorro, la sala del líder, los tres
puestos, la cara de cantera, los peñascos y el mojón, y la golondrina. **Sangre
y fuego no están autorizados**: nada de este encargo los lleva.

---

## El prompt para Astra

Se pega tal cual:

````text
Eres Astra y vas a modelar en 3D para The Valley, un juego idle de una aldea
medieval en Three.js (repositorio en D:\DESARROLLO\PROYECTOS\VALLEY\project;
trae main antes de empezar). Es una SESIÓN LARGA: hay 35 modelos en la lista y
la idea es hacer todos los que puedas, de arriba abajo, sin parar a preguntar.

Tu trabajo es SÓLO el modelo: recetas, GLB candidatos y capturas de revisión.
No toques src/, tests/, el motor, public/assets/ ni art/catalog.json; no
publiques ni integres nada. La integración la hace otra sesión después.

Lee primero:
1. docs/encargos/encargo-astra-tanda-larga-2026-10-02.md: la lista, medidas,
   presupuestos y el bloque en que va cada modelo. Es tu brief.
2. Los encargos que cita cada fila (visitantes-y-expediciones.md,
   ilustraciones-k8-k9.md, ilustraciones-k5-cuero.md, cartel-del-camino.md).
3. tools/README.md, sección «art/», y una receta hecha como ejemplo
   (art/recipes/bear-den, art/recipes/axe, art/recipes/stall-pedlar-candidate).
4. public/assets/models/palette.json: los únicos colores que valen.

Por cada modelo, en el orden de la lista:
- La receta en art/recipes/<id>-candidate/<id>.json, reproducible.
- El GLB en artifacts/graphics/astra/<id>/<id>.glb, dentro del presupuesto.
- Una hoja de capturas en artifacts/graphics/astra/<id>/sheet.png: tres
  cuartos desde arriba (la cámara del juego), frente y perfil, y al lado de
  villager.glb y house.glb para la escala. Las piezas de armadura y los
  accesorios, puestos sobre villager.glb.
- Un README.md corto: medidas reales, triángulos, nombres de las mallas y
  orígenes, y lo que no llegó y por qué.
Y al acabar cada BLOQUE, commit y push (así, si la sesión se corta, lo hecho
queda entregado).

Reglas que no se negocian:
- Una celda son 3 m; un aldeano mide 0,65 celdas (1,95 m). Se mide, no a ojo.
- Low-poly facetado como el resto del valle: caras planas, sin texturas, color
  por material de la paleta. Sin texto legible. Nada de sangre ni fuego.
- Las piezas que se mueven o se cuelgan van en mallas separadas, con el
  nombre y el origen que dice la fila (bisagras, ruedas, alas, el mineral de
  la vagoneta, las pieles del bastidor, el hueso de cada pieza de armadura).
- Todo tiene que leerse desde la cámara de reposo del juego, lejos y desde
  arriba: silueta y color antes que detalle.
- Si te falta un dato, no lo inventes ni pares: apúntalo en el README como
  pregunta para Vera y sigue con el siguiente modelo.
- Rama propia art/astra-tanda-larga, commits por rutas explícitas, nunca
  git add -A, y no toques ficheros sin seguimiento que no sean tuyos.

Al acabar (o cuando se te acabe el tiempo), di en español qué modelos están,
cuántos triángulos tiene cada uno, dónde están las capturas, cuáles faltan y
qué preguntas quedan para Vera.
````
