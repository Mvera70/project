# Encargo · Los cuatro aldeanos de Blender, para que entren a la primera

**16 sep 2026.** Instrucciones para el agente que modela en Blender. Están
escritas para que la entrega encaje sin una sola vuelta: cada punto de abajo es
algo que, si falta, hace que el modelo **no entre en el juego** aunque sea
bueno. El contexto largo —qué figuras faltan y por qué— está en
`aldeanos-por-hacer.md`; esto es sólo el «cómo».

---

## 1. Qué se entrega, con su id exacto

Cuatro modelos. **El id es lo único por lo que el juego los reconoce**, y tiene
que ser exactamente éste:

| Modelo | `id` | Qué hace el juego con él |
|---|---|---|
| aldeano base | `villager` | sustituye al actual; es el respaldo de todos los demás |
| herrero | `villager-smith` | sustituye al actual, uno a uno |
| cura | `villager-priest` | sustituye al actual, uno a uno |
| granjero | `villager-farmer` | **entra solo**: el juego ya lo pide para el adulto sin oficio que trabaja la tierra |

Con el mismo id, sustituir es sobrescribir la receta y reconstruir. No hay que
tocar ninguna regla del juego.

---

## 2. Qué es un «modelo» en este proyecto, porque no es lo que parece

**No es un GLB que se suelta en una carpeta.** Es una **receta** JSON que
Blender construye: la geometría, el esqueleto y las animaciones se generan
**desde la receta**, y por eso todos los aldeanos comparten huesos y clips sin
que nadie tenga que vigilarlo a mano. Un GLB exportado a mano de Blender no
tiene forma de entrar.

El flujo entero, que ya existe y funciona:

1. La receta vive en `art/recipes/<id>/<id>.json`.
2. `art/catalog.json` tiene una entrada por id que apunta a esa receta.
3. `npm run art -- all <id>` localiza Blender, construye, valida y registra la
   versión aprobada con su huella.
4. El juego carga el modelo por su id.

**Blender tiene que ser exactamente 5.2.1 LTS.** El constructor comprueba la
versión y se niega con cualquier otra. En la máquina del proyecto está
instalado.

---

## 3. La plantilla: copia el herrero de hoy y no partas de cero

Tres ficheros son la referencia exacta de lo que tiene que salir:

- **`art/recipes/villager-smith/villager-smith.json`** — la receta. Tiene todas
  las claves que hacen falta y ninguna de más.
- **La entrada `villager-smith` de `art/catalog.json`** — lo que el constructor
  produce: `recipe`, `generator`, `blenderVersion`, `approved`, `recipeSha256`,
  `materials`, `clips`, `motion`, `connectors`, `statistics`, `hashes`,
  `provenance`. **No la escribas a mano**: la genera `npm run art`.
- **`art/recipes/palette.json`** — los colores. Todos los aldeanos beben de ahí.

---

## 4. Lo que la receta tiene que declarar, o no entra

Estas cinco cosas las comprueba una prueba automática **antes de llamar a
Blender** (`tests/fast/villager-rig.test.ts`), así que un fallo aquí se ve en
segundos y no tras una construcción de minutos.

1. **El bloque `rig`**, con el esqueleto del aldeano base. **Ni un hueso nuevo,
   ni uno menos.** El juego clona una malla por persona y comparte huesos y
   clips con el base; una figura con otro esqueleto no se puede clonar.
2. **Los cuatro clips, con estos nombres exactos y sólo éstos:** `idle`,
   `walk`, `work_hoe`, `carry_walk`. Los cuatro tienen que mover **los mismos
   huesos**. Los que ciclan tienen que **volver a su primera pose** en el último
   fotograma. **Ninguno mueve la raíz**: la locomoción es en el sitio, el juego
   pone la velocidad.
3. **Los conectores `hand_l` y `hand_r`**, libres. Es donde el juego engancha la
   azada, el cubo y el hato.
4. **La talla:** un aldeano mide **0,65 celdas** y una celda son tres metros. La
   receta se escribe en metros y su `scale` la lleva a celdas. Copia el `scale`
   del herrero; si te sales, se ve un gigante o un niño sin querer.
5. **`palette` apuntando a `../palette.json` y `mergeByMaterial: true`.**

---

## 5. El presupuesto, que es el del herrero de hoy

| | herrero actual | tope |
|---|---|---|
| materiales | 4 (`skin`, `cloth`, `cloth-accent`, `dark`) | **4, y de la paleta** |
| triángulos | 1 320 | del mismo orden |
| objetos | 24 | del mismo orden |

El motivo, medido: los aldeanos eran el **87 % de las llamadas de dibujo** de la
escena hasta que se unieron por material. Un material nuevo por figura deshace
eso.

---

## 6. Lo que se ve y lo que no, a la distancia real de la cámara

Una persona mide **unos veinte píxeles** en la cámara del juego, y a veces
seis. Lo midió el cuaderno de referencia visual del dueño
(`docs/visual-reference` §3), y su conclusión es la regla de diseño de estos
cuatro:

- **Lo que distingue a un tipo de otro va en la silueta y en el bloque de
  color.** Un sombrero ancho, un delantal, una capucha, se ven. Una hebilla, una
  cara, un dibujo en la tela, no existen a ese tamaño.
- **El estado no va en la malla.** Si alguien discute, habla o está de mal
  humor, el juego lo dice con una burbuja encima. La figura no lleva la emoción
  puesta: iría dos veces y se contradiría.
- El granjero se distingue del base por lo que **hace**, no sólo por lo que
  lleva: lo que más se lee es la herramienta en la mano y la ropa de trabajo.

---

## 7. Cómo verificar antes de entregar

En este orden, y cada paso tarda segundos salvo el último:

```
npm run typecheck
npx vitest run tests/fast/villager-rig.test.ts
npm run art -- all <id>
```

Si la prueba del aparejo falla, **no construyas**: dice exactamente qué le falta
a la receta. Si la construcción falla, el log está en el directorio de la
ejecución que el propio comando imprime.

---

## 8. Lo que no puedes tocar

- **Nada de `src/`.** El juego ya sabe qué figura pedir y cuándo; no hay que
  enseñárselo. En particular `src/render3d/world/cast.ts` y
  `src/render3d/world/models.ts` **no se tocan**.
- **Nada de `tools/art/*.py`** salvo que un modelo sea imposible sin ello, y en
  ese caso hay que decirlo antes, no hacerlo.
- **Nunca añadas `tools/art/_test_build_priest.py` a un commit.**
- **Ningún hueso nuevo, ningún clip nuevo, ningún material fuera de la
  paleta.** Si una figura los necesita, es un encargo aparte y hay que decirlo.

---

## 9. Qué se devuelve

Por cada uno de los cuatro:

1. La receta en `art/recipes/<id>/<id>.json`.
2. La entrada de `art/catalog.json` **tal como la genera `npm run art`**, con su
   `approved` y sus `hashes`.
3. El render de referencia que la construcción deja en el directorio aprobado.
4. La salida real de los tres comandos de §7.

Y una línea por modelo diciendo qué lo distingue del base a veinte píxeles, para
que quien lo mire en el valle sepa qué buscar.

---

## 10. Qué haría inútil la entrega

Un id que no sea exactamente uno de los cuatro. Un esqueleto que no sea el del
base. Un clip de más, de menos, o con otro nombre. Un material que no esté en la
paleta. Una figura fuera de 0,65 celdas. Una entrada de catálogo escrita a
mano. Y una seña de identidad que sólo se vea de cerca.
