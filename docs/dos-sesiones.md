# Dos sesiones a la vez: quién toca qué

**14 sep 2026 · repasado el 15 tras la auditoría.** Hubo dos sesiones trabajando
sobre este repositorio al mismo tiempo: una en **diseño de aldeanos en Blender**
y otra en **la vida del valle y la interfaz**. Este fichero existe para que no se
pisen.

**Si estás leyendo esto y sólo hay una sesión, bórralo.** Señal de que la de
Blender estuvo aquí: `tools/art/_test_build_priest.py`, sin seguimiento y con
rutas absolutas a `D:\`. Es suyo y se deja donde está; no lo commitees ni lo
borres sin preguntarle.

## El reparto

| Zona | Dueño | Ficheros |
|---|---|---|
| **Arte** | Sesión Blender | `art/recipes/**`, `art/catalog.json`, `tools/art/**`, `public/assets/valley3d/*.glb` |
| **Vida** | Sesión vida/UI | `src/render3d/life/**`, `src/render3d/world/{ground,forest,ridge,ford,props}.ts` |
| **Derivación** | Sesión vida/UI | `src/derive/**` — nueva el 15 sep; la leen los dos renders, así que un cambio aquí se nota en los dos |
| **Interfaz** | Sesión vida/UI | `src/ui/**`, `index.html`, `UI_BANK` de `bank.en.ts` |
| **Documentos** | Ambas, con cuidado | `docs/**` — cada una en sus propios ficheros |

## Encargo abierto para la sesión de vida y arte · M-3 (17 sep 2026)

**Contexto en una frase:** el juego de los medios (`docs/plan-medios.md`,
`rework.md` §4b) hace que el jugador **dé cosas al valle** en vez de darle
órdenes, y el principio es «ciertas cosas dan lugar a otras». Eso sólo se
sostiene si **lo que se mete se ve**.

**Lo que ya se ve, hecho en M-3 sin tocar `life/`:** los cerdos. Dar la pocilga
sube el techo del corral y los animales entran; `derive/animals.ts` los reparte
alrededor de su casa en vez de apilarlos en el mismo punto —antes, los cerdos de
más caían todos en la misma coordenada y dar dos no cambiaba nada en pantalla—.
Hay recorrido que lo guarda (`lo que se da al valle se ve en el valle`) y una
captura en `artifacts/m3-pigs.png`.

**Lo que falta, y es vuestro porque vive en `life/` y en el arte:**

| Qué | Dónde | Cómo se sabe que hace falta |
|---|---|---|
| **Un barril** y **un arado** como modelos | `art/recipes/**`, y el manifiesto | El carro los ofrece y el valle no los enseña: no hay malla para ninguno de los dos (`manifest.json` tiene 57 y ni barril ni arado) |
| El barril **en la plaza** los dos días de la fiesta | `life/props.ts`, `life/scenes.ts` | El suceso `ale_feast` ya reúne a la aldea en la plaza (`gather square`, dos días); lo que falta es la cosa en medio |
| El arado **acarreado al campo** el día que se da | `life/offers.ts`, como `deliver-stone` | El rasgo `plough` está en el estado desde ese tick; el acarreo es la escena que lo cuenta |
| Los lobos **al corral** y no al bosque | `life/beasts.ts` | Con `wolves_at_the_coop` esa semana, los lobos de invierno ya existen; ir a por los cerdos es lo que liga «tengo ganado» con «vienen lobos» (M-1) |
| Las ratas: el granero abierto y dos dentro | `life/staging.ts` | `rats_in_the_granary` reúne en la plaza porque el efecto visible de §11.5 sólo admite plaza, capilla o vado — si queréis el granero, hace falta un destino nuevo en `VisualEffect` y eso es del motor: pedidlo |

**Lo que el motor ya os da, y no hace falta pedir:** `state.traits` con `plough`
y `sty`, `state.herd` con los animales que entraron, `state.acts` con lo que el
jugador dio y cuándo, `report.means` en el tick en que lo dio, y los sucesos
`ale_feast`, `pig_slaughter` y `rats_in_the_granary` con sus efectos visibles.

**Criterio de terminado** (el del brief M-3): una secuencia de capturas por
medio, en tres momentos —se da, se ve la cosa, se ve lo que provoca— enviada al
dueño del diseño, que dice si se lee. Y la propiedad medible, como en R-5: «en
la semana del suceso X, al menos N cuerpos están en la escena X durante M
segundos», con N y M medidos en tres semillas.

---

## Las tres fronteras donde sí se puede chocar

**1. `src/render3d/renderer.ts` — la más probable.** Ahí viven dos cosas de
dueños distintos: `WANTED` (la lista de recursos que se cargan, que es de arte)
y el montaje de la escena y las luces (que es de la vida). Si Blender añade un
aldeano nuevo hay que meterlo en `WANTED` **y** en
`tools/graphics/bundle-game.ts`, que los empotra en la demo publicable.

**Y desde el 15 sep hay un tercer sitio:** el service worker precachea todo lo
que `public/assets/valley3d/manifest.json` nombre, así que **un modelo nuevo
cuesta descarga en la instalación**. Son 2,7 MB hoy. No hace falta tocar nada
—`publish-assets.ts` escribe el manifiesto y el trabajador lo lee— pero sí
saberlo antes de añadir treinta recetas.

Regla: **quien toque `WANTED` que toque sólo esa lista**, y lo diga. No es un
fichero que se pueda reescribir entero desde dos lados.

**2. `src/render3d/world/cast.ts`.** Es quien clona el aldeano compartido y le
da talla y ropa. Si los aldeanos pasan a ser varios modelos en vez de uno con
variaciones, este fichero cambia de forma y es de arte; hoy lo lee la vida
(`life/cast.ts` le da el reparto). **Que la sesión de Blender avise antes de
tocarlo**, porque la vida depende de su contrato.

**3. La misma rama.** Las dos sesiones están en `graphics/g-04-villager-rig`. No
es un problema si cada una commitea lo suyo y hace `git pull --rebase` antes de
empezar una tanda, pero **sí lo es si las dos escriben el árbol de trabajo a la
vez**. Si la sesión de Blender va a lanzar una construcción larga, mejor que lo
diga.

## Lo que la sesión de vida/UI cambió hoy y afecta al arte

**El valle se revelaba mal, y se ha corregido. Cualquier juicio de color o de
material hecho sobre una captura anterior a hoy está viciado.** Dos cosas:

1. **No había mapeo de tonos.** Three recortaba en seco todo lo que pasara de
   1,0, y a mediodía hay 4,1 de luz combinada (sol 2,60 + cielo 1,50): todo lo
   que no fuera oscuro se saturaba a blanco. Ahora hay ACES con exposición 0,62
   (`renderer.ts`, `TONE_EXPOSURE`). **Un material que se veía bien antes puede
   verse oscuro ahora, y al revés.**
2. **Toda partida nueva abría pintada de invierno.** `paletteFor` mezclaba con
   la estación anterior durante las dos primeras semanas y la mezcla valía cero
   en la semana cero, así que devolvía la anterior entera; el juego empieza en
   primavera semana cero. Corregido: una estación lleva su color desde el primer
   día y se deshiela hacia la siguiente al final.

Para volver a mirar cualquier cosa con el render de hoy:

```
npx tsx tools/graphics/bundle-game.ts
node tools/graphics/shot.mjs --out artifacts/graphics/G-10/lo-que-sea.png
```

`tools/graphics/shot.mjs` funciona sin red usando los navegadores que ya hay
instalados en la máquina (Playwright pide uno exacto y no puede bajarlo).

## Lo que el arte le debe a la vida

Hay trabajo parado esperando modelos, y está anotado en `docs/roadmap.md` §5:

- **Los trastos de V-09 se pintan con primitivas** —una esfera roja para la
  pelota, un cilindro para el resto— porque no hay modelo. Hacen falta
  `ball`, `stick`, `bucket` y `bundle` por la vía de D.4. Están ya colocados,
  se cogen y se tiran: sólo falta con qué dibujarlos.
- **El aldeano no tiene frente** (`handover.md` §5.5): por delante y por detrás
  es casi la misma silueta, y en el valle giran hacia donde caminan. La vía
  propuesta y nunca decidida es un peto en el terracota de la paleta más una
  cuña en la cabeza. A veinte píxeles el color separa mejor que la forma — y a
  seis píxeles, que es lo que mide un aldeano en el encuadre de reposo, la forma
  no separa nada en absoluto.
