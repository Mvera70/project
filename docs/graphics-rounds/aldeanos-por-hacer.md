# Los aldeanos que faltan — encargo para la sesión de Blender

**16 sep 2026.** Lista pedida por el dueño del diseño para pasársela al agente
que está modelando en Blender. Está escrita **para quien modela**, no para quien
programa: dice qué figura hace falta, para qué momento del juego, y qué tiene
que cumplir para poder entrar sin tocar código del motor.

Lo que ya se sabe que viene de esa sesión: **el aldeano base, el herrero, el
cura y un granjero**, y sustituirán a los actuales.

---

## 1. Lo que hay que cumplir siempre, y no es negociable

Estas cuatro cosas valen para **todas** las figuras de la lista. Si una no se
cumple, la figura no puede entrar en el juego aunque el modelo sea bueno.

1. **Mismo esqueleto y mismos clips que el aldeano base.** El juego clona una
   malla por persona y **comparte huesos y animaciones** con el base
   (`src/render3d/world/cast.ts`). Lo único que cambia entre dos tipos es la
   malla. Los clips que tienen que funcionar son cuatro, y no hay más:
   `idle` (4 s, en bucle), `walk` (1,33 s), `work_hoe` (2 s) y `carry_walk`
   (1,33 s, lleva algo en las manos). **Una figura que necesite un hueso nuevo o
   un clip nuevo es un encargo aparte y hay que decirlo**, porque cambia el
   contrato del aparejo.
2. **La talla.** Un aldeano mide **0,65 celdas** y una celda del mapa son tres
   metros (D.6.2). Las recetas se escriben en metros y la receta las lleva a
   celdas; el `scale` de `low-voxel.json` ya hace esa cuenta. Una figura que se
   salga de esa talla se lee como un gigante o un niño sin querer.
3. **Se ve a veinte píxeles, y a veces a seis.** Es lo que mide una persona en
   la cámara del juego, y lo midió el propio cuaderno de referencia visual del
   dueño (`docs/visual-reference` §3). Su conclusión, que es la regla de esta
   lista: **a veinte píxeles lo que se lee es la silueta, el bloque de color y
   la pausa; a seis, ni un giro de cabeza ni una cara**. Así que **lo que
   distingue a un tipo de otro tiene que estar en la silueta y en el color, no
   en el detalle**. Un sombrero ancho se ve; una hebilla no.
4. **Pocas mallas y pocos materiales.** El aldeano base son dieciocho mallas y
   tres materiales, unidas por material. Medido: los aldeanos eran el **87 % de
   las llamadas de dibujo** de la escena, y unirlas las dejó en tres sin perder
   un triángulo. Mantener ese orden de magnitud.

Y una que es de criterio, no técnica: **el estado no se cuenta con la malla.**
Si alguien está discutiendo, hablando o de mal humor, el juego lo dice con una
burbuja encima. La figura no tiene que llevar la emoción puesta.

---

## 2. Los siete oficios: cinco por rehacer

El motor tiene siete oficios con nombre, y **el juego ya clona una malla
distinta para cada uno**. Dos están en la sesión de Blender; **los otros cinco
siguen con el modelo viejo** y habrá que rehacerlos en el estilo nuevo, o
quedará media aldea con un aldeano de otra época.

| Oficio | Qué es en el juego | Estado |
|---|---|---|
| Herrero | Trabaja en la fragua. Hay fragua como edificio | **en Blender** |
| Cura | Reza en la capilla o la iglesia | **en Blender** |
| Jefe | El que manda; sale elegido, y hay una encrucijada de sucesión | **por rehacer** |
| Comadrona | Los nacimientos son un sistema del motor | **por rehacer** |
| Guardabosques | El que talla; hay un tajo de bosque donde se corta | **por rehacer** |
| Alguacil | Vigila el grano; trabaja junto al granero | **por rehacer** |
| Herbolario | El de las plagas y la peste | **por rehacer** |

Prioridad entre esos cinco, si hay que elegir: **jefe** y **alguacil** primero,
porque son los que más se ven —el jefe sale en las encrucijadas y el alguacil
está siempre junto al granero, que está en el centro—. El herbolario es el que
menos aparece.

---

## 3. Lo que falta y no es un oficio: aquí está lo que más gana el juego

Esto es la parte importante de la lista, porque **no hace falta que el motor
invente un oficio para usarlas**. El render ya sabe qué está haciendo cada
persona y qué edad tiene, así que una malla se puede elegir por eso. Es lo que
el dueño apuntó el 16 sep: el repertorio de aldeanos puede crecer sin pelearse
con la lista de oficios.

### 3.1 Las dos que yo haría antes que ningún oficio

| Figura | Por qué | Cómo se distingue a veinte píxeles |
|---|---|---|
| **Niño** | El juego ya sabe quién es un crío y los trata distinto: buscan más cerca de casa, juegan y su jornada es más corta. **Hoy se ven como adultos pequeños o no se distinguen**, y son una parte grande de la aldea | Silueta: más baja, cabeza proporcionalmente mayor, sin herramienta. Es la diferencia más legible que existe |
| **Anciano** | Igual: el juego ya los distingue, se sientan a la puerta y hacen jornada corta | Silueta encorvada, paso corto, bastón si cabe sin hueso nuevo |

Estas dos son las que más cambian lo que se ve, porque **una aldea donde todos
tienen la misma altura se lee como una fila de clones**, y el dueño lleva toda
la sesión pidiendo que la aldea se vea viva.

### 3.2 Las que van con un suceso que ya ocurre

El motor tiene doce sucesos del valle (§7.10) y varios piden una figura que hoy
no existe. Cada uno **pasa de verdad** en la partida, así que la figura se vería:

| Figura | El suceso que la trae | Cómo se distingue |
|---|---|---|
| **Buhonero** | `pedlar`, en verano: cambia leña por grano y junta a la aldea en la plaza | Fardo a la espalda, ropa de otro color que la de la aldea. **Es el que más se nota porque es un forastero entre conocidos** |
| **Forastero** | `stranger_passes`: alguien que pasa | Capa o capucha; no lleva herramienta. Hoy usa el modelo base |
| **Novia y novio** | `wedding`: junta a la aldea en la capilla dos días | Un color claro y una guirnalda. Dos figuras, o una y un color |
| **Pescador** | `good_catch` en primavera y verano, y el vado, donde desde hace poco también se bebe | Caña o cesto. Sin hueso nuevo: en las manos, como `carry_walk` |

### 3.3 Las que van con un trabajo que ya se ve

| Figura | Dónde | Cómo se distingue |
|---|---|---|
| **Granjero** | El trabajo del campo, que es lo que hace la mayoría | **En Blender** |
| **Leñador** | Hay un tajo de bosque, con plazas según las manos que el jugador manda allí | Hacha, mangas subidas |
| **Albañil** | Hay obra cuando se construye, con plazas según los albañiles | Delantal, carga a hombro |
| **Pastor** | Hay rebaño —gallinas, cerdos, vacas— y la gente les da de comer y los acaricia | Vara, sin herramienta de campo |

### 3.4 Las que piden algo más que una malla

Éstas **no las pediría todavía**, y digo por qué, porque pedirlas sin resolver lo
otro deja un modelo sin usar:

- **El doliente del funeral.** El juego sabe quién ha muerto, pero **no sabe
  quién asiste**: no hay dato de acompañantes. Se decidió no inventarlos
  (`docs/life-rounds/IA-6.md` §2), así que la figura no tendría a quién
  representar hasta que exista ese dato.
- **El que apaga el incendio.** Lo mismo: hay edificio quemado y no hay dato de
  quién acude. Hay cubos como trasto, pero falta la escena.
- **El vigía de la torre o de la empalizada.** Existen los dos edificios y una
  bandera de amenaza, pero no hay una ocupación de vigilar que ponga a nadie
  ahí. Es un encargo de juego antes que de arte.

---

## 4. Lo que no es un aldeano y ya está, para que nadie lo duplique

Ya existen malla y receta de: **gallina, cerdo, vaca, lobo, cuervo y pez**. El
lobo y el cuervo son decorado con fórmula y una fase en curso está mirando si
pasan a tener cuerpo. **No hacen falta más animales.**

---

## 5. Si hay que ordenar todo esto en una sola cola

1. Lo que ya está en marcha: **base, herrero, cura, granjero**.
2. **Niño** y **anciano**. Son los que más cambian lo que se ve y los más
   baratos de distinguir.
3. **Buhonero** y **forastero**. Un desconocido entre conocidos se nota mucho, y
   los dos sucesos ocurren de verdad y a menudo.
4. **Jefe** y **alguacil**, los dos oficios más visibles de los cinco que
   quedan por rehacer.
5. **Leñador**, **albañil**, **pastor**, **pescador**.
6. **Comadrona**, **guardabosques**, **herbolario**.
7. **Novia y novio**, que es una figura de un día pero de un día bonito.
8. Nada de §3.4 hasta que el juego tenga el dato que les falta.

---

## 6. Qué haría inútil un modelo de esta lista

Vale la pena leerlo antes de empezar cualquiera:

- Que necesite **un hueso o un clip que el base no tiene**. Entonces no se puede
  clonar y hay que rehacer el aparejo de todos.
- Que su seña de identidad esté en **un detalle que a veinte píxeles no existe**.
- Que se salga de **0,65 celdas** de alto.
- Que traiga **su propio material nuevo** y multiplique las llamadas de dibujo.
- Que la figura cuente un **estado** —enfado, hambre, alegría— que el juego ya
  dice con una burbuja. Esa información iría dos veces y se contradiría.
