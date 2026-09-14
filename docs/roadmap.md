# Hoja de ruta: qué le falta a esto para ser un juego

**14 sep 2026.** `docs/next-plan.md` dice qué se hace **ahora** y con qué
agente. Esto dice qué falta **en total**, en qué orden, y —lo más importante—
**qué no puede hacer ningún agente**, porque depende de una decisión o de una
persona mirando.

La pregunta que ordena el documento es la del dueño del diseño: *que la demo se
lea como un juego de móvil hecho y derecho.* Todo lo de abajo está puesto según
lo que de verdad separa el proyecto de esa frase, no según lo que sea más fácil
de hacer.

---

## Dónde está el proyecto, sin adornos

El motor está completo y es bueno: demografía, subsistencia, opiniones,
encrucijadas, crónica, cuarenta años de partida que se sostienen. El render 2D
está desplegado. El piloto 3D se juega. La capa de vida (Anexo E) hace que la
aldea ande, hable, se pelee y toque a los animales como el descarte que gustó.
La interfaz acaba de estrenar piel.

Y aun así no es un juego todavía, por una razón que no es técnica y está medida
desde hace semanas en `docs/findings-drama.md`:

> **El jugador toma entre siete y doce decisiones en cuarenta años, y diez de
> las veinte plantillas del catálogo no salieron ni una vez en cinco partidas.**

Todo lo demás de este documento es secundario comparado con eso. Un idle en el
que decides diez veces en una vida entera de aldea no es un idle tranquilo: es
una pantalla que se mira. La interfaz puede quedar preciosa y la vida puede
leerse viva, y seguirá sin haber un juego debajo.

---

## Los seis frentes, por lo que pesan

### 1 · El ritmo de decisión — **el frente que decide si hay juego**

**Qué pasa.** Siete a doce encrucijadas en cuarenta años. Medio catálogo
muerto. Cuatro plantillas al filo del 1 % de elegibilidad. Y debajo, la
contradicción de `findings-drama.md` §4: las condiciones que hacen elegible a
una plantilla piden estados que el motor casi nunca alcanza.

**Por qué no lo arregla un agente.** No es un bug. Es la pregunta de diseño
central: *¿cada cuánto quiere el juego que decidas?* Duplicar la frecuencia
cambia el balance entero, el peso de cada decisión y la textura de la partida.
Eso lo decide el dueño del diseño con los números delante, no un brief.

**Lo que sí puede hacer un agente, cuando haya decisión.** Instrumentar: una
pasada que cuente, plantilla a plantilla, cuántos ticks es elegible y por qué
regla falla cuando no lo es. Eso convierte «medio catálogo no sale» en una lista
de causas concretas. Está a un brief de distancia y es barato (`Tier: medir`).

**Lo que hay que decidir, en una frase cada uno:**
- ¿Cuántas decisiones por década quiere el juego? Hoy son dos o tres.
- ¿Se relajan las condiciones de elegibilidad, o se añaden plantillas de menor
  peso que salgan a menudo?
- La suite de balance lleva diez pruebas rojas desde antes de todo esto
  (`handover.md` §5.7): jugar bien y jugar mal se parecen demasiado — 11,7
  puntos de distancia contra los 20 que pide el diseño. ¿Se arregla o se cambia
  lo que el diseño pide?

### 2 · La interfaz — **en marcha, carril A de `next-plan.md`**

U-05 a U-08 están escritas con brief y en cola. El diagnóstico es que no falta
color: falta **que se vea qué se puede hacer**. Después de esas cuatro quedan:

- **U-09 · Sonido.** No hay ni una línea de audio en el proyecto. Un juego de
  móvil sin sonido no está terminado, y en un idle el sonido hace la mitad del
  trabajo de ambiente: viento por estación, el río, el yunque, campana de
  capilla, y un acento corto en el hito. Reglas obvias que hay que escribir
  antes: nada que suene en bucle audible, silencio por defecto hasta que el
  jugador toque, y **nada atado al reloj de pared que un salto del reloj del
  juego pueda pillar a medias** (§11.4 otra vez).
- **U-10 · El primer minuto.** U-04 es una cartela. Falta la diferencia entre
  «entiendo qué miro» y «sé qué se espera de mí»: la primera encrucijada
  llegando pronto y de forma fiable, y que la primera vez que aparece la
  píldora de decisión pendiente se note más que las siguientes.

### 3 · La vida — **carril B, casi cerrada**

Queda V-09b (que se juegue de verdad, en marcha), **V-11** (lo que el motor
manda: las riñas de §7.9 y las reuniones de §11.8 pasan a ser escenas de la capa
de vida) y **V-12** (borrar `actors/index.ts` y `life/spike/`, quitar la bandera
`valley.life`). V-12 es la única fase que el Anexo E condiciona a **aprobación
humana viéndolo**, y con razón: borra el camino de vuelta.

Después de V-12, la vida está hecha y el valle se pinta por un solo camino.

### 4 · Que corra y se instale en un móvil de verdad

- **G-09 quedó parcial a propósito**: no había dispositivo real y D.9 no acepta
  emulación. Sigue sin haberlo. **Esto es un bloqueo para «juego de móvil»**, no
  un detalle: todo lo medido de rendimiento es de un portátil.
- **G-11** (PWA, distribución, recuperación) está cerrada para el piloto. Lo que
  falta es **G-12**: la migración, que el 3D deje de estar detrás de
  `?render=pilot3d` y sea el juego. Depende de aceptación visual.
- La suite rápida tarda 31 s contra los 20 que fija `CLAUDE.md`, y el banco de
  balance 18 min contra 15. Deuda vieja y conocida.

### 5 · Lo que se ve — arte y escala

- **La escala es una decisión pendiente y es gorda.** En el encuadre de reposo
  una persona mide **seis píxeles**, medido. A esa escala no se ve una charla,
  ni un encaro, ni a quién mira nadie: toda la capa de vida es invisible por
  defecto. Se decidió dejar la cámara como está para poder juzgar con números.
  **Si con la interfaz nueva el juego se sigue viendo pobre, esto es lo
  siguiente, y es D.6.2, no interfaz.**
- **El aldeano no tiene frente** (`handover.md` §5.5): por delante y por detrás
  es casi la misma silueta. A veinte píxeles el color separa mejor que la forma;
  la vía propuesta y no decidida es un peto terracota y una cuña en la cabeza.
- **Los trastos de V-09 no se pintan** porque no hay modelo. Y no hay Blender en
  este entorno, así que toda la vía de producción de D.4 —pelota, palo, cubo,
  haz, herramientas— está parada. **Es el único bloqueo puramente de
  herramientas que tiene el proyecto**: se desbloquea abriendo una sesión con el
  conector de Blender activo.

### 6 · Las dos deudas que ningún agente puede saldar

1. **El hito 0 nunca ha sido leído por un tercero.** Tres crónicas, sin
   contexto y sin el documento de diseño, y una pregunta: *«¿en qué se
   diferencian estas tres aldeas?»*. Ni quien diseñó ni quien programó sirven.
   Es la deuda más antigua del proyecto y la que más dice sobre si esto
   funciona.
2. **El hito 6 está igual.** Y ninguno de los dos se declara superado ni se
   sustituye por una prueba automática. Está escrito en `CLAUDE.md` y sigue
   siendo cierto.

---

## El orden que yo propondría

1. **Terminar el carril A y el B** (U-05–U-08, V-09b, V-11). Está en marcha y
   son agentes baratos con briefs escritos.
2. **Mirar la demo y decidir la escala.** Es una sesión de diez minutos del
   dueño del diseño y desbloquea o cierra el frente 5 entero.
3. **Atacar el ritmo de decisión.** Primero la instrumentación (agente barato),
   luego la decisión de diseño con los números delante. Es lo que convierte esto
   en un juego.
4. **Sonido** (U-09), que es lo que más cambia la sensación por lo que cuesta.
5. **V-12** y después **G-12**: borrar el camino viejo y migrar.
6. **Un móvil de verdad** para cerrar G-09, y **el hito 0 con un tercero**.

Y aparcado a propósito, después de todo eso: **V-15 y V-16** (el mapa grande y
la comarca con relieve). Son una ronda de motor con `SCHEMA_VERSION` a 4 y
rompen partidas guardadas. El cuenco de V-14 es decorado y el valle sigue plano
por dentro; eso no impide nada de lo de arriba.

---

## Cómo se trabaja esto

`docs/agents.md` dice qué modelo lleva cada clase de tarea y cómo se audita lo
que entrega. Lo aprendido y que conviene no olvidar:

- El brief que verifica el worktree tiene que nombrar **ficheros recientes**.
  Dos agentes anclaron en un commit de meses atrás; el que lo detectó fue el que
  tenía que comprobar `scenes.ts`, no `notice.ts`.
- **Ninguna ronda de interfaz se cierra sin captura.** `tools/graphics/shot.mjs`
  funciona sin red con los navegadores que ya hay en la máquina.
- Una prueba que asserta «más que cero» sumando semillas esconde defectos. Ha
  pasado dos veces.
- Y cuando algo no llega, se escribe lo que se midió y se deja la prueba como
  `it.fails` con la propiedad del brief intacta, en vez de bajar el listón. Está
  hecho así en `life-props.test.ts` y es el patrón a repetir.
