# Lo que el juego no enseña todavía — el registro

**Todo lo que se diseñe sin representación real se apunta aquí en la misma
ronda en que se diseña**, aunque el código funcione sin ello. Lo pidió el dueño
del diseño el 18 sep 2026, dos veces y cada vez más ancho:

> «El tema de la malla, todo lo que se vaya haciendo falta en Blender y en 3D se
> va anotando y se va apuntando.»
>
> «Todas estas cosas que estemos diseñando que no tengan una representación
> real… al igual que todas las animaciones, eventos y tal que no estén
> directamente reflejados, todo eso hay que ir anotándolo como pendiente.»

Así que esto **no es sólo una lista de mallas**: es todo lo que el motor sabe y
la pantalla no cuenta. Una mecánica que no se ve no existe para quien juega.

---

## 1 · Lo que pasa y no se ve (lo más grave)

Son mecánicas **ya en `main`** que hoy sólo salen como una línea de crónica.

| Qué | Qué hace el motor | Qué se ve hoy | Qué haría falta |
|---|---|---|---|
| **El asalto** (B1, D3) | Una partida de 5 a 60 hombres baja del valle vecino, se lleva plata, grano y una cabeza | **Se les ve llegar** desde D3 (18 sep): doce cuerpos entran por el campo, se plantan ante el portón y se van. Se pintan con **la figura del forastero**, que es lo más honesto que hay hoy | El clan armado (E2) —una línea de `cast.ts` cuando exista— y la segunda mitad de D3: romper, entrar, y lo que arde |
| **El aviso** (B2) | Ocho o catorce semanas antes, alguien los ve venir | La encrucijada, y la aldea reuniéndose (`gather`) | Un jinete que baja del pasto alto, o humo en la loma de enfrente. Es un efecto visual nuevo, no una malla |
| **Prepararse** (B2, `braced`) | El ganado entra, el grano se esconde, se atranca | Nada | El corral vacío y la gente metiendo cosas: se puede hacer con la capa de vida, sin Blender |
| **Pagar al clan** (B2, `bought_off`) | Treinta de plata suben la ladera y la partida se da la vuelta | Nada | Dos o tres cuerpos saliendo por el portón con una carga |
| **La semana de después** (B2, `just_sacked`) | La aldea acaba de perder grano y ganado | Nada | Que se note el saqueo: sacos volcados, un corral abierto |
| **La segunda puerta, abierta en la muralla hecha** (A2c) | El jugador paga una puerta y la aldea **tira un tramo del cerco** para colgarla: la estaca se da de baja el día que la puerta se termina | La estaca desaparece y la puerta aparece en su sitio, sin transición | El derribo: el tramo cayendo, o al menos el hueco marcado mientras la obra dura. Y una puerta en obra hoy se ve como cualquier otra obra |
| **Las armas** (C1) | La aldea se lleva un cuarto menos de golpe | Nada | Lanzas apoyadas en la herrería, o gente que las lleva. **Ninguna malla de arma existe** |
| **Los arcos** (C1, D2) | El valle tienta menos, y desde D2 **se dispara de verdad** | Las flechas se ven volar y clavarse (`world/arrows.ts`), pero **el arquero se pinta con `idle`**: de pie, de brazos caídos, sin arco | Los dos clips de E1 (`bow_draw`, `bow_loose`) y la malla del arco (E2). El momento en que la mano se abre **es** el instante en que el juego dispara, así que el clip encaja sin reajustar nada: la cadencia son 2,1 s, la suma exacta de los dos |
| **El asalto que se decide** (B4) | La semana que llegan el juego dice «vienen a por el pueblo» y la siguiente se resuelve con lo que la muralla hizo | La crónica lo cuenta las dos semanas (`raid.assault`, `raid.held`) | **Nada en pantalla dice que esa semana es la semana**: ni aviso, ni cuenta atrás, ni marcador de lo que aguanta el portón. Es F2 (el HUD del asedio), y es lo que hace que la semana de espera se sienta como una víspera y no como una línea de texto |
| **El cuerpo a cuerpo** (D4) | Quien llega al alcance de un brazo golpea a quien defiende, y el que defiende devuelve; de 0 a 3 de los nuestros caen por asalto | **Nada.** Los dos se pintan con `idle`, quietos y de pie, dándose golpes invisibles. Y el que cae se queda plantado donde cayó | Los tres clips de E1 (`spear_thrust`, `hit_take`, `fall`) y **el ragdoll**, que no es un clip: pide que los cuerpos de la gente sean cuerpos de Rapier, y eso es una tanda entera. Ver `encargo-combate.md` |
| **La avalancha en el portón** (D3b/D5) | La partida se apretuja contra la hoja y la golpea: sesenta golpes y cede | Se ve el grupo empujando contra la puerta y a los que van cayendo, **pero no hay un solo golpe animado**: se pintan con `idle`, quietos contra la madera | **El clip que falta y es el que más se va a mirar de la fase 4**: golpear la puerta con lo que se lleve en las manos. No está en el encargo E1 —que es de arco, lanza y caída— y hace falta. Y la puerta: hoy no se astilla ni se mueve, y cuando cae desaparece de golpe |
| **El valle tomado** (B3) | El clan entra, se lo lleva todo, rompe el portón y **acaba la partida**: hay un final nuevo (`stormed`) | La crónica lo cuenta y el epitafio dice «The valley was taken». En el valle se ve **el boquete**: el portón y cuatro estacas pasan a ruina, que la pantalla ya sabe pintar | **La escena entera está por hacer y es D6**: la entrada por el boquete, la gente huyendo, lo que arde. Y los muertos: hoy los que defendían desaparecen de la lista de vivos sin que se vea caer a ninguno |
| **El saqueador que cae** (D2) | Una flecha le acaba la visita: se queda donde le dio (`phase: 'down'`) | **De pie y quieto.** No hay clip de caer, así que un hombre alcanzado en el pecho se lee como un hombre parado | El clip `fall` de E1 —«la última pose tiene que quedarse quieta y creíble»— y después el ragdoll, que sale de Rapier y es D4. Cómo se ve morir, y si hay sangre, es decisión del dueño (E4) |
| **La muralla de piedra** (A4) | El cerco cerrado abre la piedra y la aldea **dobla su estacada**: 10 de 12 valles, 65 tramos en la semilla 91, desde las 249 h de reloj | `wall.glb` existe y se usa, así que la pieza de piedra **se ve** — y es la primera vez, porque hasta A4 ningún valle levantaba una: la malla llevaba en el juego desde G-10 sin dibujarse en una sola partida | Dos cosas, y ninguna es una malla: **la obra** —una pieza de piedra en construcción se ve igual que cualquier otra obra, y aquí lo que pasa es que se derriba una estaca y se levanta un muro en su sitio— y **el cambio**: la estaca desaparece y el muro aparece de golpe, sin astillas ni transición, que es el mismo hueco que la segunda puerta de A2c. Y el cerco mezclado —madera y piedra en el mismo anillo mientras la obra avanza— **no se ha mirado nunca en una captura** |
| **La era del valle** (A4, A5) | El valle es caserío, aldea o villa cerrada, y eso ya se puede preguntar (`derive/era.ts`) | La cabecera lo dice desde A5 | **Nada en el valle cambia de aspecto al cambiar de fase.** No es una malla: es que una villa cerrada se vea como una villa —el camino más pisado, la plaza con más cosas, humo en más tejados— y eso es material de una ronda de ambiente, no de Blender |
| ~~**Guardia en la atalaya**~~ (C1, C2) | La aldea sube de una a siete manos al cerco la víspera de un asalto | **Sube gente desde C2** (18 sep): ocupan el portón, la atalaya y la muralla junto a la puerta | Lo que falta es de arte, y son tres cosas: **el clip `bow_draw`** (E1) —hoy un arquero se pinta con `idle`, de pie y sin arco—, **la lanza y el arco en la mano** (E2: no existe ninguna malla de arma) y **el adarve**: hoy se está **detrás** de la estaca, no encima, porque la celda de la muralla está cerrada para un cuerpo. Una muralla con paso de ronda (E3) es lo que deja subirse de verdad |

## 2 · Mallas que faltan

| Malla | Para qué | Qué se ve hoy en su lugar |
|---|---|---|
| **El portón** (`gate`, A2) | La puerta del anillo | La malla de la empalizada, con dos jambas dibujadas por `obstacles.ts`. **Y necesita una hoja llamada `gate_door`** para que el gozne la abra: es el mismo mecanismo que las puertas de las casas, idea del dueño |
| **El arado** (M-3) | El medio que libera brazos | Nada. Encargo completo en `encargo-arado.md` |
| **La fuente** (P-3) | El centro de la plaza | Tres primitivas. Encargo en `encargo-fuente.md` |
| **La sala del rey** (`hall`, K-4) | La casa del que manda | Una casa más alta con tejado burdeos. Encargo en `plan-rey.md` §8 |
| **Armas y arcos** (C1) | Lo de arriba | Nada existe: ni lanza, ni arco, ni flecha, ni escudo |
| **El clan vecino** (E2) | Quien ataca | Nada. Son **aldeanos armados de otro valle** —no soldados de cota ni bandidos andrajosos— y reaprovechan el aparejo del aldeano |
| **El bastión** (`bastion`, A3, 19 sep 2026) | La torre en la línea de muralla | La malla de `watchtower.glb`, la misma atalaya suelta, escalada de 2×2 a 1×1 (`fitted.scale.set`) — se lee más achatada que una atalaya de verdad. Y hay una costura sin resolver aparte de la malla: `isDefence`/`defenceConnections` (`render3d/world/defences.ts`) sólo conocen `wall`/`palisade`, así que el tramo que llega hasta un bastión **no estira un extremo hacia él** y deja una junta entre el remate del muro y la base de la torre prestada. Necesita malla propia — más ancha en la base que la atalaya, para leerse *dentro* del grosor del muro y no al lado — y que esas dos funciones sepan de `bastion` el día que la malla exista |

**Y las que sí están, para no volver a dudarlo:** `watchtower.glb` y `wall.glb`
existen y se usan; la atalaya de C1 se levanta y se ve. Lo que no hay es nadie
dentro. **Y `wall.glb` dejó de ser malla muerta el 18 sep** (A4): hasta ese día
ningún valle levantaba una sola pieza de piedra, así que la malla estaba en el
juego desde G-10 sin aparecer en una partida.

## 3 · Animación y efecto

| Qué | Estado |
|---|---|
| **Clips de combate** (E1) | **No existe ni uno**, y es el camino largo del proyecto. **Encargo escrito el 18 sep: `encargo-combate.md`** — seis clips sobre el aparejo del aldeano que ya existe, con sus nombres, duraciones y el orden en que hacen falta. Con los tres primeros (tensar, soltar, caer) ya se puede hacer una defensa que se mire |
| **La hoja del portón** | El gozne está escrito y funciona; falta la hoja que girar |
| **Fuego, humo y gore** (E4) | Nada. Cómo se ve arder una casa en un asalto y cómo se ve morir. **El gore es decisión del dueño** |
| **Escombros y ragdoll** | Rapier ya está (D1, 18 sep): el mundo existe y `launch()` vuela. Lo que falta es **qué lanzar y quién lo lanza** (D2) y los clips para que un cuerpo caiga como un cuerpo (E1) |

## 4 · De otras rondas, aún abierto

- **El arado acarreado** el día que se da: una escena de dos con la carreta, no
  una colocación (`task-log.md`).
- **La reunión de §11.8 no cabe en una aldea grande**: se junta el 54 %, y la
  fracción baja con el tamaño. Tres pruebas declaradas con su medida.

---

**Cómo se mantiene esto.** Cuando una ronda diseñe algo que la pantalla no
cuenta, se añade aquí **en la misma ronda**, con qué hace el motor, qué se ve
hoy y qué haría falta. Un encargo que sólo vive en un comentario del código es
un encargo que nadie hará — y una mecánica que no se ve no existe para quien
juega.
