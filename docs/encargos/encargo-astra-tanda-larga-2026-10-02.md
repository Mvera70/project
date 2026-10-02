# Encargo para Codex · la tanda larga de modelos (2 oct 2026)

Lo pidió Vera el 2 oct, en dos mensajes: «una sesión larga de encargos de
modelos 3D a Astra; se acaban mañana los créditos y hay que gastarlo todo», y
después, al precisar a quién va: **«Esto es para Codex. Me gustaría que la
aldea tuviese más artículos, un poco más de variedad, sin sobrecargar el
rendimiento, siempre teniendo cuidado. Pero en general faltan elementos 3D a
todo el valle. La sesión la dirige Sol 6 como director y Astra va a hacer
todos los modelos con agentes. Importante usar las skills.»**

**Cómo se reparte:**

- **Sol 6 dirige.** Escribe la hoja de reparto en `docs/task-log.md` antes de
  mandar el primer encargo (skill `director` §3), reparte los bloques entre los
  agentes de Astra, revisa cada hoja de capturas contra la cámara de reposo e
  integra en el juego, de una PR en una, lo que la tabla marca como
  «se integra en esta tanda».
- **Astra modela, con agentes**, un bloque por agente cuando no compartan
  receta: receta, GLB candidato, hoja de capturas y README.
- **Versiones reservadas: v5.90 a v5.99.** Las sesiones de Claude que siguen
  abiertas tienen hasta la v5.89; no se cruzan.

Sale de `docs/encargos-3d.md`, de los encargos sueltos de `docs/encargos/` que
nadie había hecho todavía y de las rondas de hoy (K5 cuero y sastrería, la
ronda del daño, la fauna por estaciones). Lo que ya está hecho no se repite
(abajo, «No se encarga»).

## Las skills, que no son opcionales

Viven en `.claude/skills/<nombre>/SKILL.md`. Se leen **antes** del trabajo que
gobiernan, no después:

| Skill | Cuándo |
|---|---|
| `director` | Sol 6, al empezar: hoja de reparto, versiones, integración de una en una con `main` verde, informe de fusión al cerrar |
| `goal` | Al abrir la tanda: leer `docs/plan-meta.md`, medir, escribir el porqué y dejar `task-log.md` al día |
| `performance` | **Antes de integrar cualquier malla.** Medir antes y después con `gl-probe.mjs` y `scene-report.mjs`, y escribir las cifras en la PR |
| `animacion` | Las piezas que se cuelgan de un hueso (armaduras, accesorios) y todo lo que se mueve (ruedas, alas, el mineral que se vuelca) |
| `observe-valley-life` | Al integrar objetos en el suelo: que nadie los atraviese ni se quede atascado contra ellos |
| `press-kit` | Al cerrar: las capturas del valle con lo nuevo, a escala de móvil |

## El presupuesto de rendimiento, que manda sobre la lista

Vera: «sin sobrecargar el rendimiento, siempre teniendo cuidado». Las cifras de
referencia están en la skill `performance` (27 sep: **villa grande 421 llamadas
de dibujo y 586 mil triángulos; aldea 335 y 482 mil**). Para esta tanda:

- **Todo lo que se repite va instanciado**, con una `InstancedMesh` por tipo
  como los trastos de `src/render3d/world/steading.ts`, y **sin sombra
  proyectada** salvo lo que pase de 1 celda de alto.
- **El bloque entero de objetos del valle no puede sumar más de 30 llamadas ni
  60 mil triángulos** en la villa grande. Si no cabe, se quitan tipos, no se
  sube el tope.
- Cada pieza suelta, **≤ 150 triángulos** salvo que la fila diga otra cosa.
- Se mide antes y después de cada PR de integración, y la cifra va en la PR.
  Una subida de más del 10 % en llamadas se explica o no se fusiona.

---

## La lista, por bloques y en orden

Una celda son 3 m y un aldeano mide 0,65 celdas (1,95 m). Estilo facetado, sin
texturas, color por material de `palette.json`. Origen en la base y frente a
+Z, salvo que se diga otra cosa.

**Qué se integra en esta tanda y qué sólo se modela:**

| Bloques | Qué hace Sol 6 con el modelo |
|---|---|
| 0 (objetos del valle) | **Se integra**, con el presupuesto de arriba |
| 1 (lo que hoy son cajas) | **Se integra**: es cambiar la pieza provisional por el GLB, uno por uno, midiendo |
| 2 (sastrería) | Se integra **cuando la PR de K5 (sastrería y lino) esté en `main`**; la lleva otra sesión hoy, no se toca antes |
| 5, 6, 7 | Se integra lo que tenga ya un sitio en el código (accesorios de visitantes, cigüeña, polluelo, mariposa, banco, carro); lo demás, sólo modelo |
| 3 y 4 (armaduras, mina) | **Sólo modelo**: la mecánica todavía no existe (`docs/plan-meta.md`, AR). El peto de cuero (12) sí se integra, porque ya existe en el juego |
| 8 | Sólo si Vera lo pide |

### Bloque 0 · La aldea y el valle con más cosas — lo primero

Es lo que Vera pide de verdad: **más artículos y más variedad**, entre una casa
y la siguiente y por todo el valle. Se pintan como los trastos de
`steading.ts` (G-15): se deducen del estado —edificios, terreno, estación,
era—, no entran en el motor ni en el guardado, y **se integran en esta
tanda**, midiendo con `performance`. Ninguno se coloca donde la vida necesite
pasar (skill `observe-valley-life`).

| # | `id` | Dónde aparece | Qué es |
|---|---|---|---|
| 0a | `barrel`, `crate`, `sack-pile` | Junto al granero, la herrería, el molino y las casas con oficio | Tonel, caja y sacos apilados, cada uno en dos o tres variantes de tamaño |
| 0b | `tool-rack` | Contra la pared de las casas de oficio | Herramientas apoyadas (horca, rastrillo, pala) |
| 0c | `washing-line` | Entre dos casas cercanas, en buen tiempo | Dos postes con ropa tendida (colores de la paleta) |
| 0d | `flower-pot`, `herb-bed` | A la puerta de las casas y junto a la curandera | Maceta y un bancal de hierbas |
| 0e | `beehive` | Dos o tres en el prado junto a los campos | Colmena de paja (skep) sobre una tabla |
| 0f | `scarecrow` | Uno por campo grande, en verano | Espantapájaros con sombrero |
| 0g | `trough` | Junto al ganado y al pozo | Abrevadero de madera |
| 0h | `chicken-coop` | Si hay gallinas | Gallinero pequeño sobre patas |
| 0i | `wood-chopping` | Junto a la leñera | Tocón con el hacha clavada y astillas |
| 0j | `stump`, `fallen-log` | En la linde del bosque y donde se taló | Tocón suelto y tronco caído con musgo |
| 0k | `bush`, `wildflowers`, `mushrooms` | Por el prado y la linde, según estación | Arbusto, mata de flores y un corro de setas en otoño |
| 0l | `stone-wall` | Entre campos vecinos, desde la era de aldea | Murete de piedra seca de 1 celda, que se repite |
| 0m | `wayside-shrine` | En el camino de cada entrada | Hornacina de piedra con una cruz |
| 0n | `lantern-post` | En la plaza, desde la villa | Farol en un poste (de noche, una luz falsa: **ninguna luz real nueva**) |
| 0o | `market-awning` | En la plaza los días de visita | Toldo suelto con dos cestos |

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

## El prompt para Codex

Se pega tal cual:

````text
Sesión de Codex para The Valley, un juego idle de una aldea medieval en
Three.js (repositorio en D:\DESARROLLO\PROYECTOS\VALLEY\project; trae main
antes de empezar). Es una SESIÓN LARGA: hay que gastar el crédito que queda
haciendo todos los modelos que se pueda.

Papeles:
- SOL 6 dirige. Reparte, revisa e integra en el juego.
- ASTRA hace todos los modelos, con agentes en paralelo (un bloque por agente
  cuando no compartan receta).

Lo primero, y no es opcional: usad las skills de .claude/skills/. Sol 6 lee
director/SKILL.md y goal/SKILL.md antes de repartir; antes de integrar
cualquier malla, performance/SKILL.md; para piezas colgadas de un hueso o
que se mueven, animacion/SKILL.md; al poner objetos en el suelo,
observe-valley-life/SKILL.md; al cerrar, press-kit/SKILL.md. Y CLAUDE.md
entero, que vale igual para Codex.

El brief es docs/encargos/encargo-astra-tanda-larga-2026-10-02.md: la lista
por bloques (del 0 al 8), medidas, presupuestos, el presupuesto de
rendimiento y qué se integra en esta tanda y qué sólo se modela. Lo que pide
Vera por encima de todo es el Bloque 0: más artículos y más variedad en la
aldea y por todo el valle, SIN sobrecargar el rendimiento.

ASTRA, por cada modelo:
- Receta en art/recipes/<id>-candidate/<id>.json, reproducible (ver
  tools/README.md, sección «art/», y recetas hechas como bear-den, axe o
  stall-pedlar-candidate).
- GLB en artifacts/graphics/astra/<id>/<id>.glb, dentro del presupuesto.
- Hoja de capturas en artifacts/graphics/astra/<id>/sheet.png: tres cuartos
  desde arriba (la cámara del juego), frente y perfil, junto a villager.glb y
  house.glb. Armaduras y accesorios, puestos sobre villager.glb.
- README.md corto: medidas, triángulos, nombres de mallas y orígenes, y lo que
  no llegó.
- Commit y push al acabar cada bloque, para que nada se pierda si se corta.

SOL 6:
- Escribe la hoja de reparto en docs/task-log.md antes del primer encargo
  (ramas, versiones v5.90–v5.99, quién hace qué).
- Revisa cada hoja de capturas: si no se lee desde la cámara de reposo, vuelve.
- Integra de una PR en una, con main verde, lo que el brief marca como
  integrable; mide antes y después con
  tools/graphics/performance/gl-probe.mjs y scene-report.mjs y pon las cifras
  en la PR. El Bloque 0 entero no pasa de +30 llamadas ni +60 mil triángulos en
  la villa grande; si no cabe, se quitan tipos.
- La puerta de cada PR: npm run typecheck, npm run lint y las pruebas de lo que
  toca; y una captura (npm run shot).

Reglas que no se negocian:
- Una celda son 3 m; un aldeano mide 0,65 celdas (1,95 m).
- Low-poly facetado, sin texturas, color por material de
  public/assets/models/palette.json. Sin texto legible. Nada de sangre ni
  fuego.
- El motor (src/engine/) no se toca: los objetos se deducen del estado, como
  los trastos de src/render3d/world/steading.ts.
- La sastrería no se integra hasta que la PR de K5 (otra sesión, hoy) esté en
  main. Las armaduras y la mina, sólo modelo.
- Si falta un dato, no se inventa ni se para: se apunta como pregunta para
  Vera y se sigue.
- Commits por rutas explícitas, nunca git add -A.

Al acabar, en español: qué modelos están, cuáles se integraron, las cifras de
rendimiento antes y después, dónde están las capturas, qué falta y qué
preguntas quedan para Vera.
````
