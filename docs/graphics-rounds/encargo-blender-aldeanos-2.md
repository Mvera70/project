# Encargo G-18 · Los aldeanos que faltan, para la sesión de Blender

**16 sep 2026.** Segundo encargo para el agente que modela en Blender, después
de que G-17 entrara a la primera (`villager`, `villager-smith`,
`villager-priest`, `villager-farmer`, commit `9f33582`). **Todo lo del primer
encargo sigue valiendo tal cual** —`encargo-blender-aldeanos.md`: receta y no
GLB, Blender 5.2.1 LTS, el esqueleto del base sin un hueso de más ni de menos,
los cuatro clips con sus nombres exactos, `hand_l` y `hand_r` libres, 0,65
celdas, cuatro materiales de la paleta, `mergeByMaterial: true`, nada de
`src/` ni de `tools/art/*.py`—. Aquí está sólo lo que este encargo añade: **qué
figuras, en qué orden, con qué id, y las tres cosas nuevas que hay que saber.**

---

## 1. Las doce figuras, en el orden en que se hacen

**El id es lo único por lo que el juego reconoce la figura.** Los doce de abajo
ya están pedidos por el código (`src/render3d/world/models.ts`,
`VILLAGER_MODELS`): el día que existan en el catálogo y el manifiesto, la gente
cambia de figura **sin tocar una línea**. Mientras no existan, cada uno cae al
aldeano base, así que se pueden entregar **de uno en uno** y en cualquier
momento.

| # | `id` | Quién la lleva en el juego | Qué se lee a veinte píxeles |
|---|---|---|---|
| 1 | `villager-child` | Todo el que tiene menos de 16 años. **Son una parte grande de la aldea** y hoy se ven como adultos encogidos | Cabeza proporcionalmente mayor, brazos y piernas más cortos respecto al tronco, sin herramienta. Ver §2.1 antes de empezar |
| 2 | `villager-elder` | Todo el que pasa de 60. Se sientan a la puerta y hacen jornada corta | Espalda encorvada **en la malla** (§2.1), bastón si cabe en la mano sin hueso nuevo, ropa de color apagado |
| 3 | `villager-stranger` | El forastero: quien llega al valle y aún no tiene oficio. Un desconocido entre conocidos es lo que más se nota | Capa o capucha, **un color que ningún aldeano lleva**, sin herramienta |
| 4 | `villager-leader` | El jefe. Sale en las encrucijadas y se le mira | **Rehacer en el estilo nuevo.** Algo que dé altura a la silueta —gorro, capa a los hombros— y un color de acento propio |
| 5 | `villager-reeve` | El alguacil: siempre junto al granero, que está en el centro del valle | **Rehacer.** Túnica corta con cinturón ancho, cuaderno o vara |
| 6 | `villager-woodcutter` | Quien está en el tajo del bosque talando (no es un oficio: es quien está allí) | Hacha, mangas subidas, chaleco |
| 7 | `villager-mason` | Quien está en una obra | Delantal, gorra, carga a hombro |
| 8 | `villager-shepherd` | Quien está con el rebaño: dando de comer, acariciando, espantando | Vara, zurrón, sombrero pequeño |
| 9 | `villager-fisher` | Quien está en el vado | Caña o cesto, botas altas |
| 10 | `villager-midwife` | La comadrona | **Rehacer.** Toca y delantal claro |
| 11 | `villager-woodward` | El guardabosques | **Rehacer.** Verde oscuro, capucha |
| 12 | `villager-herbalist` | El herbolario. El que menos se ve | **Rehacer.** Zurrón, color de hierba |

Las **cinco de «rehacer»** ya tienen receta en `art/recipes/<id>/` con el
esqueleto correcto —comprobado: las siete de oficio comparten huesos y clips con
el base al byte—. Se sobrescribe la receta con el estilo nuevo y se reconstruye.
**No se cambia el id.**

Si hay que cortar, se corta por abajo: **niño y anciano son los que más cambian
el valle**, porque una aldea donde todos miden lo mismo se lee como una fila de
clones.

---

## 2. Las tres cosas nuevas de este encargo

### 2.1 El niño y el anciano se modelan a 0,65 celdas, y el juego los encoge

Es lo que más fácil sale mal. **El juego ya pone la talla por edad** en
`src/render3d/world/cast.ts` (`statureAt`): un recién nacido es 0,62 del
adulto, crece hasta 1,0 a los 16, y a partir de los 60 baja de 0,97 hacia 0,92.
Así que:

- **La receta del niño mide 0,65 celdas, como todas.** Si se modela pequeño,
  el juego lo encoge otra vez y sale un enano. Lo que cambia es la
  **proporción**: cabeza mayor, extremidades más cortas respecto al tronco.
- **La espalda del anciano va en la malla, no en la animación.** Los clips son
  del base y se comparten con todos; una figura no puede traer su propio
  `idle` encorvado. La curva se pone en la geometría en reposo (el bloque del
  torso echado adelante, la cabeza baja), y los clips del base la mueven igual.
- Los **nombres, la jerarquía y el número de huesos** son los del base. Las
  **longitudes** pueden cambiar con moderación —el cura ya cambió la falda—,
  con dos límites: los pies en el suelo y las manos donde `hand_l`/`hand_r`
  puedan sujetar la azada. La zancada **no se elige**: la mide la construcción
  sobre el GLB, así que unas piernas más cortas dan un paso más corto solos.

### 2.2 La prueba del aparejo sólo mira la receta del base

`tests/fast/villager-rig.test.ts` valida `art/recipes/villager/villager.json` y
nada más. Un esqueleto distinto en `villager-child` **no la pondría roja**. G-17
lo cubrió comparando recetas a mano y dejando `shared-clips.json` en la
entrega; **hay que repetir esa comparación por cada figura** y devolverla: mismos
huesos por nombre y orden, mismos `clipDefinitions` que el base.

### 2.3 Cuatro materiales por figura, pero la paleta puede crecer

G-17 añadió `clericalBlack` a `art/recipes/palette.json` para la sotana, y está
bien: **un color nuevo en la paleta compartida vale; un material de más en una
figura, no.** Cada receta sigue con exactamente cuatro (`skin`, `cloth`,
`cloth-accent`, `dark`), y lo que se cambia es a qué color de la paleta apunta
cada uno. Si dos figuras necesitan un color que no existe, se añade **una vez**
a la paleta con un nombre que diga qué es (`strangerGrey`, no `color7`).

---

## 3. Lo que no se encarga todavía, y por qué

Tres figuras de la lista larga (`aldeanos-por-hacer.md` §3.2) **no tienen a
quién representar** hasta que el juego cambie, y un modelo sin uso es un modelo
perdido:

- **Buhonero** (`pedlar`): el suceso ocurre, pero el buhonero no es una persona
  del estado ni tiene cuerpo en la jornada. Falta la escena.
- **Novia y novio** (`wedding`): el suceso junta a la aldea en la capilla, pero
  no señala a los dos. Falta el dato en el suceso, como la riña trae sus `who`.
- **Doliente, el del incendio, el vigía**: lo que decía el primer encargo, sin
  cambios (R-5b y R-6 en `docs/task-log.md`).

Cuando el juego los pida, tendrán su id en `VILLAGER_MODELS` y entrarán como
estos doce. **No adelantarlos.**

---

## 4. Verificación y entrega, como en G-17

Por cada figura, en este orden:

```
npm run typecheck
npx vitest run tests/fast/villager-rig.test.ts tests/fast/life-models.test.ts
npm run art -- all <id>
```

Y además la comparación de §2.2. Publicación **selectiva** en
`public/assets/valley3d/` y `manifest.json`, como hizo G-17: ningún recurso
ajeno se regenera ni se borra, y **los cuatro de G-17 no se reconstruyen**
(conservan su SHA-256). Directorios aprobados en
`artifacts/graphics/G-18/approved/<id>/`.

Se devuelve, por figura: la receta, la entrada de catálogo tal como la genera
`npm run art`, el render aprobado, la salida real de los comandos, la
comparación de esqueleto y clips contra el base, y **una línea diciendo qué la
distingue a veinte píxeles**. Al final, un `docs/graphics-rounds/G-18.md` con
la tabla de triángulos, materiales y altura como la de G-17, y un
`G-18-handoff.md` con lo que el equipo del juego tiene que saber (que debería
ser: «nada que cambiar en `src/`»).

**Un commit por tanda** (niño y anciano; forastero, jefe y alguacil; los cuatro
de tarea; los tres últimos) o por figura, con mensaje en español. **Nunca
`tools/art/_test_build_priest.py`.** Si alguna prueba de `src/` se pone roja
al entrar una figura, **se dice y no se arregla**: es del equipo del juego.

---

## 5. Qué haría inútil una figura de este encargo

Lo del primer encargo, y además: **un niño modelado pequeño** (sale enano); un
**anciano encorvado por la animación** (los clips son compartidos, no se puede);
un id que no sea exactamente uno de los doce de §1; una figura de §3 hecha
antes de tiempo; una reconstrucción del base o de los tres de G-17 que cambie
sus huellas.
