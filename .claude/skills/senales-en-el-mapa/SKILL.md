---
name: senales-en-el-mapa
description: El fundamento de cómo el jugador actúa en The Valley — las ocasiones se señalan en el mundo, con un icono pequeño encima de la cosa, se activan tocándolo, y todo lo que pasa después lo deciden el azar y la simulación, con los aldeanos saliendo desde donde están y la cámara siguiéndolos. Úsala antes de diseñar o tocar cualquier mecánica en la que el jugador intervenga (la caza, y las que vengan después), antes de añadir un botón, una tarjeta, un menú o un minijuego al valle, y cuando algo «parezca otro juego».
---

# Señales en el mapa: el jugador mira el valle y toca lo que ve

Lo dijo el dueño del diseño el 27 sep 2026, tras probar tres versiones de la caza
el mismo día (un botón fijo, una tarjeta con armas, unos aros de puntería):

> «No me gusta el sistema de eventos con minijuegos. Sólo quiero que aparezca la
> posibilidad de cazar y sea aleatorio, que tú simplemente aceptes ir a la caza;
> todo lo que pase después debe ser random: el animal consigue huir, o lo
> cazas, o se va malherido.»
>
> «La alerta debe ser pequeña, un simple icono de caza encima de la presa, y el
> aldeano … debe salir desde donde esté, con el follow que tenemos. Al pulsar el
> icono se activa. **Así tienes que estar pendiente del mapa.** Esta mecánica
> debe implementarse para más cosas. Apúntalo en alguna skill como fundamento.»

Es la premisa del juego llevada a los mandos: **un idle bonito de mirar de fondo,
cuya gracia es que cada valle salga distinto**. Mirar es jugar; el premio de mirar
es ver la ocasión a tiempo.

## Las cinco reglas

1. **La ocasión está en el mundo, encima de la cosa.** Un icono pequeño, redondo,
   flotando sobre lo que la provoca —la presa, el buhonero, el tejado que se
   hunde, el fuego—, que sigue a esa cosa y se ve desde la cámara de juego. No
   una tarjeta, no un botón en el rincón, no un aviso en la bandeja: si el
   jugador no está mirando el mapa, **se la pierde**, y eso es parte del juego.
2. **Tocarlo es aceptar, y es lo único que se decide.** Un toque, sin menú de
   opciones ni confirmación. Si la mecánica pide elegir algo (el arma, la
   cantidad), lo elige el azar o la aldea, no un diálogo.
3. **Después, todo es azar y simulación.** Nada de minijuegos, aros de puntería,
   pulsar a tiempo ni barras que parar. Lo que pasa sale de tiradas con semilla
   (`hash32` con la semilla del encuentro, en la capa de vida) y de la física de
   la escena. Tiene que haber **varios finales** y todos tienen que salir: medir
   en muchas semillas antes de dar la mecánica por buena (la caza: la mitad
   cobrada, un cuarto malherida, un quinto ilesa; el oso cae uno de cada seis).
4. **Actúa alguien de la aldea, desde donde está.** Nadie aparece de la nada: el
   aldeano sale caminando desde su sitio, y la cámara lo sigue con el
   seguimiento que ya existe (`renderer.track`, el de la ficha de persona).
   Cuando acaba, sigue su vida desde donde terminó.
5. **La ocasión caduca sola, y el motor manda.** Qué ocasión hay y cuándo lo
   decide el motor (determinista); el icono dura lo que dure la ocasión (la
   caza: su semana) y desaparece si no se toca. El resultado entra al motor
   como dato por `PlayerAct`, como la caza y la batalla.

## Lo que no se hace

- **Ni tarjetas ni modales para ofrecer algo.** La tarjeta de caza con «Ir de
  caza» y su barra de tiempo duró un día; es justo lo que esta skill descarta.
  Las tres superposiciones que sí cubren el valle (encrucijada, epitafio,
  bienvenida) son otra cosa: se leen, no se aprovechan (`piel-del-valle` §8).
- **Ni minijuegos de reflejos.** Los aros de puntería también duraron un día.
- **Ni teletransportes.** Un cuerpo que aparece junto a la presa rompe la
  ilusión de que la aldea vive; es la misma regla que la capa de vida (E.3).
- **Ni un botón permanente** en el rincón de mandos para una ocasión: el rincón
  es para mandos del mirar (despejar, velocidad), no para acciones del valle.

## Cómo se construye una mecánica así

- **El icono**: un elemento de la capa de interfaz posicionado cada fotograma
  sobre la proyección en pantalla de la cosa (su posición 3D más una altura).
  **Pequeño y difuso**, que es la gracia (Vera: «pequeñito y difuso, que no
  parpadee para que se dé cuenta, que no se vea mucho; la gracia es que él se
  dé cuenta y lo pulse»): sin plato ni fondo, sólo el trazo de ~15 px en crema
  al 60 % con un halo blando, quieto, sin latido ni destello. El área de toque
  sí es de dedo (36 px), invisible. Referencia: `redesign/hunt-sign.css`. Se esconde si la cosa sale de pantalla, con la
  pantalla despejada no, y con una hoja abierta sí.
- **El toque**: llama a una sola función del renderer/backend (`startHunt`,
  `startX`…) que elige al aldeano (el adulto libre más cercano), monta la escena
  y pone la cámara a seguirlo.
- **El azar**: tiradas en la capa de vida con `hash32(seed, 'motivo:n')`, con
  sus porcentajes en una constante `TUNE` comentada con lo que se midió.
- **La prueba**: que salgan todos los finales en N semillas (propiedad, no
  implementación), y que el motor cuente cada final con su línea de crónica.
- **Y su imagen**: cada final nuevo con crónica trae su ilustración pedida en
  `docs/plan-arte-pendiente.md` en la misma ronda (regla de `CLAUDE.md`).

## Candidatas (para cuando toquen)

Lo que hoy el motor ofrece de otra forma y encajaría aquí: el buhonero y los
tratantes del camino (hoy, dos botones en la bandeja), la riada o el fuego que
se pueden contener, un niño perdido que buscar, lobos en el corral. Cada una se
decide con el dueño del diseño antes de construirla.
