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
| **El asalto** (B1) | Una partida de 5 a 60 hombres baja del valle vecino, se lleva plata, grano y una cabeza | **Nada.** Una línea de crónica | Es la fase 4 entera: cuerpos que llegan por el camino, la escena, y lo que arde. Ver §3 |
| **El aviso** (B2) | Ocho o catorce semanas antes, alguien los ve venir | La encrucijada, y la aldea reuniéndose (`gather`) | Un jinete que baja del pasto alto, o humo en la loma de enfrente. Es un efecto visual nuevo, no una malla |
| **Prepararse** (B2, `braced`) | El ganado entra, el grano se esconde, se atranca | Nada | El corral vacío y la gente metiendo cosas: se puede hacer con la capa de vida, sin Blender |
| **Pagar al clan** (B2, `bought_off`) | Treinta de plata suben la ladera y la partida se da la vuelta | Nada | Dos o tres cuerpos saliendo por el portón con una carga |
| **La semana de después** (B2, `just_sacked`) | La aldea acaba de perder grano y ganado | Nada | Que se note el saqueo: sacos volcados, un corral abierto |
| **Las armas** (C1) | La aldea se lleva un cuarto menos de golpe | Nada | Lanzas apoyadas en la herrería, o gente que las lleva. **Ninguna malla de arma existe** |
| **Los arcos** (C1) | El valle tienta menos | Nada | Arcos en la cerca, o alguien practicando en el vado |
| **Guardia en la atalaya** (C1) | — | La atalaya está, **vacía** | Alguien arriba mirando el camino. Es capa de vida (C2), no Blender |

## 2 · Mallas que faltan

| Malla | Para qué | Qué se ve hoy en su lugar |
|---|---|---|
| **El portón** (`gate`, A2) | La puerta del anillo | La malla de la empalizada, con dos jambas dibujadas por `obstacles.ts`. **Y necesita una hoja llamada `gate_door`** para que el gozne la abra: es el mismo mecanismo que las puertas de las casas, idea del dueño |
| **El arado** (M-3) | El medio que libera brazos | Nada. Encargo completo en `encargo-arado.md` |
| **La fuente** (P-3) | El centro de la plaza | Tres primitivas. Encargo en `encargo-fuente.md` |
| **La sala del rey** (`hall`, K-4) | La casa del que manda | Una casa más alta con tejado burdeos. Encargo en `plan-rey.md` §8 |
| **Armas y arcos** (C1) | Lo de arriba | Nada existe: ni lanza, ni arco, ni flecha, ni escudo |
| **El clan vecino** (E2) | Quien ataca | Nada. Son **aldeanos armados de otro valle** —no soldados de cota ni bandidos andrajosos— y reaprovechan el aparejo del aldeano |

**Y las que sí están, para no volver a dudarlo:** `watchtower.glb` y `wall.glb`
existen y se usan; la atalaya de C1 se levanta y se ve. Lo que no hay es nadie
dentro.

## 3 · Animación y efecto

| Qué | Estado |
|---|---|
| **Clips de combate** (E1) | **No existe ni uno.** Tensar el arco, soltar, golpe de espada, recibir el impacto, caer y quedar. Es el camino largo del proyecto: sin ellos la batalla de §1b no se puede ver por bien que funcione |
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
