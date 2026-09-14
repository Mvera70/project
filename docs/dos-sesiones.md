# Dos sesiones a la vez: quién toca qué

**14 sep 2026.** Hay dos sesiones trabajando sobre este repositorio al mismo
tiempo: una en **diseño de aldeanos en Blender** y otra en **la vida del valle y
la interfaz**. Este fichero existe para que no se pisen. Si estás leyendo esto y
sólo hay una sesión, bórralo.

## El reparto

| Zona | Dueño | Ficheros |
|---|---|---|
| **Arte** | Sesión Blender | `art/recipes/**`, `art/catalog.json`, `tools/art/**`, `public/assets/valley3d/*.glb` |
| **Vida** | Sesión vida/UI | `src/render3d/life/**`, `src/render3d/world/{ground,forest,ridge,ford,props}.ts` |
| **Interfaz** | Sesión vida/UI | `src/ui/**`, `index.html`, `UI_BANK` de `bank.en.ts` |
| **Documentos** | Ambas, con cuidado | `docs/**` — cada una en sus propios ficheros |

## Las tres fronteras donde sí se puede chocar

**1. `src/render3d/renderer.ts` — la más probable.** Ahí viven dos cosas de
dueños distintos: `WANTED` (la lista de recursos que se cargan, que es de arte)
y el montaje de la escena y las luces (que es de la vida). Si Blender añade un
aldeano nuevo hay que meterlo en `WANTED` **y** en
`tools/graphics/bundle-game.ts`, que los empotra en la demo publicable.

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
