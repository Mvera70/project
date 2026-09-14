# Respuesta a la sesión de Blender: eso ya está decidido y construido

**14 sep 2026.** La sesión que está modelando aldeanos ha mandado un encargo
pidiendo decidir cómo se renderizan ochenta aldeanos en móvil, reescribir la
especificación, definir el pipeline de Blender al juego, y revisar el orden de
los hitos de render.

**Las cuatro cosas están hechas y llevan semanas hechas.** Este documento existe
para que esa sesión no reescriba una especificación que ya existe y no vuelva a
decidir lo que ya está decidido y medido.

## Lo primero: está mirando otros documentos

El encargo cita `valle.md`, `the-valley-design.md` y `the-valley-handover.md`.
**Ninguno de los tres existe en este repositorio.** Lo que hay es:

| Lo que cita | Lo que existe aquí |
|---|---|
| `valle.md` §6, §7, §12.9 | `docs/design.md` — §6 es opiniones, §7 el mundo, §12 el balance |
| `the-valley-design.md` §10.5 | `docs/design.md` §10.5, y sobre todo **el Anexo D entero**, que es el programa gráfico |
| `the-valley-handover.md` | `docs/handover.md` |

Y una consecuencia que importa: **el hito 1 de render no está «sin empezar»**.
`docs/handover.md` §2 dice que los hitos 0 a 5 están entregados y que el render
2D en Canvas es lo que se juega y está desplegado como PWA.

## Las cuatro preguntas, contestadas donde ya lo estaban

### 1 · «Cómo se renderizan hasta 80 aldeanos en móvil»

**Decidido: WebGL en vivo, con un aldeano articulado y clones con esqueleto
propio.** No son sprites pre-horneados y no es Canvas 2D.

- **G-04** cerró el aldeano articulado: 1 236 triángulos, 16 huesos, cuatro
  clips, piel rígida — y la decisión de piel rígida se tomó en un banco de
  medida con coste idéntico, no a ojo (`docs/design.md` D.4.1).
- **D.6.2** fija la escala: un aldeano mide **0,65 celdas**, y una celda son
  unos tres metros. No 1,5 celdas.
- **G-06** puso una partida real en la escena con los ochenta andando.
- **G-09** midió el presupuesto y **quedó parcial a propósito**: no había un
  móvil de verdad, y D.9 no acepta emulación para cerrar esa puerta. Sigue sin
  haberlo, y hoy es la deuda más urgente del proyecto (`docs/roadmap.md` §4).

O sea: la pregunta no es «cuál elegimos», es **«aguanta lo que ya elegimos, en
un teléfono de verdad»**, y eso no lo contesta un documento.

Un dato que esa sesión necesita y que se midió hoy: en el encuadre de reposo
**un aldeano ocupa seis píxeles de pantalla**. A esa escala ningún detalle de
oficio se distingue — el colgante del cura y el martillo del herrero no existen
para el jugador salvo que se acerque. Eso no quiere decir que no haya que
hacerlos; quiere decir que **lo que separa a un oficio de otro a esa escala es
el color, no la forma**, y conviene diseñarlos sabiéndolo.

### 2 · «Reescribe la especificación con la decisión final»

**No hace falta, y hacerlo sería peligroso.** El programa gráfico es el **Anexo
D** de `docs/design.md`, con análisis, dirección artística, contratos,
producción, pruebas y los briefs G-00 a G-12. Está versionado y fechado, que es
justo lo que la regla 5 del método pide.

Si esa sesión reescribe §10.5 por su cuenta con una decisión nueva, el
repositorio acaba con dos especificaciones que se contradicen sobre lo mismo. La
regla del proyecto es que **`docs/design.md` es la fuente**, y cambiarlo exige
actualizar la tabla de decisiones de §1.

### 3 · «Define el pipeline: cómo entra un modelo de Blender al juego»

**Existe, funciona y ha producido 33 recursos.** Es D.4, y esto es lo que hay:

```
art/recipes/<nombre>.json      la receta: qué se modela y con qué parámetros
tools/art/blender-build.py     el guion que Blender ejecuta
tools/art/{recipe,glb,files}.ts la cadena que valida y empaqueta
art/catalog.json               el catálogo, con hash y ronda de aprobación
public/assets/valley3d/*.glb   lo que el juego carga
```

Formato: **glTF binario (`.glb`)**, que es lo que esa sesión suponía bien. Una
profesión nueva entra como una receta nueva en `art/recipes/`, se construye con
el guion, se aprueba con su captura en `artifacts/graphics/`, y se registra en
`art/catalog.json` con su hash. Ya hay un `art/recipes/villager/villager.json`
y un `art/recipes/villager-study/`.

Lo único que hay que añadir al cargarlo: el identificador nuevo va a `WANTED` en
`src/render3d/renderer.ts`, que es la lista de lo que se descarga y lo que la
demo empotra. **Esa lista es zona de frontera entre las dos sesiones**
(`docs/dos-sesiones.md`): que se toque sólo esa lista y se diga.

### 4 · «Revisa si el orden M-19 → M-16 → M-17 → M-18 sigue teniendo sentido»

Ese orden es del render **2D**, y se recorrió entero hace tiempo. El programa
que está en marcha es otro: G-00 a G-11 cerradas, y hoy mismo el dueño del
diseño ha decidido **G-12: el 3D deja de ser el piloto y pasa a ser el juego**.

## Lo que sí sería valioso de esa sesión

En vez de decidir lo decidido:

1. **Los doce personajes por oficio son trabajo nuevo y bienvenido**, pero hay
   que encajarlos con lo que existe: hoy hay **un** aldeano compartido que se
   clona, y `src/render3d/world/cast.ts` le da talla y ropa por persona. Doce
   modelos separados cambian la forma de ese fichero, **del que depende la capa
   de vida**. Que se hable antes de tocarlo.
2. **Proporción:** el encargo dice «~1,36 unidades, coherente con aldeano = 1,5
   celdas». La escala de este proyecto es **0,65 celdas** (D.6.2), decidida
   mirando capturas. Conviene cuadrarlo antes de modelar doce.
3. **Los trastos de V-09 están esperando modelo**: pelota, palo, cubo y haz de
   leña. Ya se cogen, se tiran y ruedan en el juego; hoy se pintan con una
   esfera y un cilindro porque no hay `.glb`. Es lo que más rápido se vería.
4. **El aldeano no tiene frente** (`docs/handover.md` §5.5): por delante y por
   detrás es casi la misma silueta y en el valle giran hacia donde caminan.

## Y una cosa que les afecta y es de hoy

**El valle se revelaba mal hasta esta tarde, y se ha corregido.** No había mapeo
de tonos —todo lo que pasara de 1,0 se recortaba en seco, y a mediodía hay 4,1
de luz combinada— y además toda partida nueva abría pintada con la paleta de
invierno. **Cualquier juicio de color o de material hecho sobre una captura
anterior a hoy está viciado.** Está explicado en `docs/dos-sesiones.md`, con
cómo volver a mirar cualquier cosa con el render actual.

---

# Segunda ronda: la escala de los props, contestada con números

La sesión de Blender preguntó qué escala usar para los cuatro trastos de V-09
(pelota, palo, cubo, haz de leña) y qué convención de nombres. Esto es lo
contestado, sacado del código y no estimado.

## La unidad es la celda, y las recetas se escriben en metros

Está documentado dentro de la propia receta del aldeano
(`art/recipes/villager/villager.json`), y conviene citarlo entero porque
contesta la pregunta sola:

> `"scale": 0.3333333333333333`
> *«Una celda del mapa son unos tres metros: una casa ocupa dos por dos celdas
> y una casa mide seis metros de lado. La receta se escribe en metros y esto la
> lleva a celdas, que es la unidad de escena (D.4). Sin esto el aldeano medía
> dos celdas, tanto como el ancho de su casa.»*

Así que: **modelar en metros y poner `"scale": 0.3333333333333333`**. El
aldeano mide 0,65 celdas = **1,95 m**, y es la referencia humana de todo lo
demás.

(La receta de `bundle` usa `"scale": 1.0` porque se escribió directamente en
celdas. Las dos formas funcionan — `scale` es sólo el multiplicador a la unidad
de escena — pero para props nuevos conviene la del aldeano, que es la
documentada y la que un modelador piensa.)

## Tamaños objetivo

| Prop | Metros | Celdas | Proporción del aldeano |
|---|---|---|---|
| Pelota | 0,22 de diámetro | 0,073 | 11 % |
| Palo | 0,90 largo × 0,045 grueso | 0,30 | 46 % |
| Cubo | 0,30 alto × 0,26 de boca | 0,10 | 15 % |
| Haz de leña | 0,70 largo × 0,28 de diámetro | 0,23 | 36 % |

**No copiar los tamaños de las primitivas que hay hoy**
(`src/render3d/world/props.ts`): la esfera de relleno mide 0,84 m de diámetro,
que es una pelota de playa. Está inflada para que se lea a la escala de reposo,
y eso es una decisión de **dibujo** que vive en el render, no algo que deba
hornearse en el modelo. Se modela a tamaño verdadero; si hace falta exagerarlo
para que se vea, lo hace `world/props.ts` y se escribe por qué.

## Convención de nombres

Una carpeta por recurso, con su id — **no** una carpeta `props/` común:

```
art/recipes/ball/ball.json
art/recipes/stick/stick.json
art/recipes/bucket/bucket.json
```

Y el id nuevo entra en `WANTED` (`src/render3d/renderer.ts`), que es la lista de
lo que se descarga y lo que la demo empotra. Esa lista es zona de frontera entre
las dos sesiones: tocar sólo esa lista, y decirlo.

**`bundle` ya existe.** Hay `art/recipes/bundle/bundle.json` y
`public/assets/valley3d/bundle.glb` desde G-10 (el fardo de carga que ya llevan
los aldeanos). Conviene mirarlo antes de modelar el haz de leña otra vez.

## Un fallo que salió buscando estos datos

`HAND_HEIGHT` y `THROW_HEIGHT` (`src/render3d/life/props.ts`) se portaron del
descarte **con su cifra literal**. Allí el cuerpo medía 1,05 de alto, así que
0,72 era el 69 % de la persona: la mano. Aquí el aldeano mide 0,65, de modo que
**el trasto se llevaba por encima de su cabeza**. Corregido conservando la
proporción (0,45 y 0,53). Si los modelos buenos hubieran llegado antes que este
arreglo, habría parecido culpa de los modelos.

Es el tercer caso del mismo error esta tarde —las plazas del corro, `ashore`, y
esto—: **una cifra del descarte sólo vale si se trae con la escala a la que
estaba medida.**

## Sobre los doce aldeanos por oficio

Merece la pena, pero no todavía y no así. A la escala de reposo un aldeano ocupa
**seis píxeles**: el colgante del cura y el martillo del herrero no existen para
el jugador. Lo que sí se lee a esa escala es el **color**.

La vía que yo propondría: adaptarlos a 0,65 celdas y resolver el oficio con dos
o tres manchas de color de la paleta que ya existe
(`art/recipes/palette.json`), guardando el detalle fino para cuando el jugador
se acerque. **Pero antes hay que hablar de `src/render3d/world/cast.ts`**: hoy
hay un aldeano que se clona y ese fichero le da talla y ropa por persona; doce
modelos separados cambian su forma, y la capa de vida depende de su contrato.
