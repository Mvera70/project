# La evidencia visual: cómo se saca, y qué enseñó la primera

**16 sep 2026.** El método obligatorio de `docs/life-ai-implementation-prompt.md`
pide, en cada fase, «una secuencia de capturas: aproximación, encuentro,
resolución y vuelta a la actividad», y que se identifique el backend real,
porque **una captura Canvas no acredita 3D**. IA-0, IA-1 e IA-2 se cerraron sin
ella. Esto cuenta por qué no se podía y qué hizo falta para poder.

---

## 1. Por qué no se podía, y no era pereza

Tres cosas, y ninguna evidente:

1. **La capa de vida sólo corre en 3D.** Lo que IA-1 e IA-2 arreglan vive en
   `src/render3d/life/`; el camino Canvas usa `src/render/crowd.ts`, que es otra
   cosa. Una captura Canvas de estas rondas no prueba nada, literalmente.
2. **La ruta `?debug=1&seed=N&year=Y` monta Canvas**, no 3D (`mountDebug`, en
   `src/ui/debug.ts`). Era el único modo de ver un valle crecido sin esperar, y
   sirvió para el cielo y el mapa, pero no sirve para la vida.
3. **Por el camino del jugador el juego empieza en el año 1 con dos personas**, y
   una semana dura catorce minutos a ×1 (§12.1): llegar al año 19 son más de tres
   horas de reloj de pared. La aldea fotografiable era la pareja fundadora: dos
   cuerpos, ningún animal, ninguna interacción.

O sea: **ninguna fase de la capa de vida podía entregar su evidencia**, y eso
llevaba tres rondas sin decirse.

## 2. Lo que se añadió: `--advance`

`tools/graphics/shot.mjs` gana `--advance <semanas>`: falsea el reloj del
navegador con `page.clock`, que es lo que ya hacían las jornadas de Playwright
(`tools/valley.shots.ts`, `advanceWeeks`). Con eso se fotografía el juego de
verdad —3D, por el camino del jugador, fundando desde el menú— en el año que se
quiera.

Dos cosas que costaron un intento cada una:

- **Un salto grande no vale.** El primer intento adelantaba 864 semanas de golpe
  y la aldea llegaba al **año 2**: el motor no cobra de una vez los ticks que le
  deben, los cobra **por lotes de 64 en fotogramas sucesivos** (`runBatch`,
  §13.2), así que tras el salto hay que dejar correr fotogramas. Ahora va de año
  en año, con medio segundo de reloj real entre saltos.
- **La fase del día no vuelve a cero.** Tras el salto el valle no amanece: la
  hora depende de lo que se haya asentado antes. Con `--settle 12 --advance 892`
  sale la tarde, con luz buena; con `--settle 34`, la noche. Si la captura sale
  negra, es esto y no el render.

El comando que produjo la primera secuencia:

```
node tools/graphics/serve.mjs --port 8131
node tools/graphics/shot.mjs --page "http://127.0.0.1:8131/valley.html" \
  --seed 11 --settle 12 --advance 892 --sequence 8 --every 1.4 \
  --out artifacts/graphics/IA/seq/vida.png
```

**El puerto 8127 estaba ocupado** por un servidor de capturas de otra sesión que
servía un empaquetado viejo, y eso da 404 sin explicar por qué. Si las capturas
salen vacías, comprobar el puerto antes que el código.

**Semilla 11 y no 7**: con el caos de §2.6 la pareja de la 7 se rompe. Las que
llegan a los cuarenta años son 11, 53, 67 y 79 (`rework.md` §2.5).

## 3. Qué enseñó la primera secuencia

Backend 3D real, semilla 11, año 19, otoño día 29, ×1, ocho fotogramas cada
1,4 s. En `artifacts/graphics/IA/seq/`.

**Lo que confirma:**

- **R-1 de punta a punta, y se ve.** El fotograma 2 tiene a la aldea en corro en
  la plaza con tres burbujas de charla, y abajo el aviso: «Grimbald and
  Merewenna came to words in the square that autumn. The village heard every
  one.» Eso es `quarrel_in_the_square` sorteado en el motor, aplicado a las
  opiniones, contado por el banco con los dos nombres y bajado a la capa de vida
  como reunión. Es exactamente lo que `findings-drama.md` decía que no pasaba
  nunca.
- **IA-2 libera de verdad.** En el fotograma 6, catorce segundos después, las
  burbujas ya no están y los cuerpos están en otro sitio: la escena terminó, se
  liberó y cada uno volvió a lo suyo. Ni cuerpos congelados ni burbujas
  huérfanas.
- **IA-1 se nota en negativo:** nadie apretado contra una pared, nadie girando
  sobre sí mismo en el sitio.

**Un fallo de interfaz que la captura destapó y ninguna prueba ve:** en el
fotograma 2, **el aviso de la crónica y la pista de las órdenes se pintan encima
uno del otro** en la franja de abajo, y no se lee ninguno de los dos. Los dos son
texto sobre el valle y comparten sitio sin negociarlo. Va al rediseño de
interfaz —es justo lo que `docs/ui-redesign/` viene a ordenar— y queda anotado
aquí con la captura que lo prueba.

**Y una cifra para mirar, que no es de esta ronda:** ánimo 9 sobre 100 en el año
19, con «The woodpile will not last the winter» y una decisión esperando. Es el
caos de §2.6 haciendo su trabajo, y es el dueño del diseño quien juzga si ése es
el juego que quiere.

## 4. Lo que sigue faltando

- **La secuencia de cuatro tiempos que el brief pide por fase** —aproximación,
  encuentro, resolución, vuelta— no está aislada todavía: lo de arriba es la
  jornada entera y el encuentro sale porque coincidió. Para aislarla hay que
  llegar a la semana de un suceso concreto, y `--advance` ya sirve: se busca el
  tick en `state.happenings` con `tools/fate-report.ts` y se adelanta a él.
- **`GREET_ODDS`** (IA-2) sigue sin medir, y quien la fija es el ojo sobre una
  captura donde se vea si la gente se saluda demasiado o nada.
- **Animales en primer plano.** La secuencia está a la distancia de la aldea
  entera; para juzgar si una gallina picotea como una gallina hay que acercar la
  cámara con `--zoom`.
