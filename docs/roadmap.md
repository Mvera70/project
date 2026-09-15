# Hoja de ruta: qué le falta a esto para ser un juego

**14 sep 2026 · estado actualizado el 15 sep, tras la auditoría.**
`docs/next-plan.md` dice qué se hace **ahora** y con qué agente. Esto dice qué falta **en total**, en qué orden, y —lo más importante—
**qué no puede hacer ningún agente**, porque depende de una decisión o de una
persona mirando.

La pregunta que ordena el documento es la del dueño del diseño: *que la demo se
lea como un juego de móvil hecho y derecho.* Todo lo de abajo está puesto según
lo que de verdad separa el proyecto de esa frase, no según lo que sea más fácil
de hacer.

---

## Cuatro decisiones del dueño del diseño · 15 sep 2026, tarde

Dichas al repasar lo que quedaba pendiente, y **las cuatro cambian este
documento**. Están aquí arriba porque cancelan trabajo que más abajo sigue
escrito como si hiciera falta.

1. **El juego ya se ha abierto en un móvil de verdad, y funciona.** «Lo probé
   desde mi tablet y mi iPhone y funciona». Así que el bloqueo que ordenaba este
   documento —«un teléfono, diez minutos»— **está resuelto**. Lo que sigue sin
   existir es una medida de fotogramas en dispositivo, pero eso es un dato que
   falta, no un riesgo abierto: el 3D se sostiene en un iPhone y en un iPad.

2. **Los hitos humanos 0 y 6 se descartan.** «Se descartan», literal. Eran la
   deuda más antigua del proyecto —una lectura de tres crónicas por un tercero,
   y el parte de bienvenida leído por alguien que no lo escribió— y dejan de ser
   deuda: no se validan, no se sustituyen por pruebas y no bloquean nada. Quien
   los vea citados como pendientes en otro sitio, está leyendo algo viejo.

3. **La riña de §7.9 hay que revisarla.** Es lo único de la lista de pendientes
   que pidió mantener tal cual. No llega a la capa de vida porque la crónica
   guarda los **nombres** de los dos y no sus `id`, y `quarrelOf` no se puede
   llamar desde `life/` sin consumir azar del motor: servirla es un cambio del
   motor (está en `CLAUDE.md` y en el Anexo E).

4. **El ritmo de decisión deja de ser la prioridad, porque el sistema entero se
   va a rehacer.** Sus palabras: «el ritmo de decisiones tampoco es algo que
   afecte mucho… probablemente hay que hacer un rework, pero **cargárselo casi
   entero**», y el rumbo del rework: **«esto tiene que ser mucho más aleatorio y
   con mucha más vida»**. Cuándo: más adelante, con la iteración del modelo
   Fable.

   **Qué significa para lo que hay escrito abajo:** relajar condiciones del
   catálogo, escribir plantillas de menor peso y fusionar `wolf_winter` —el
   carril B, «lo que convierte esto en un juego»— **ya no se hace**. Invertir
   una ronda en afinar un sistema que se va a tirar es gastar dos veces. Lo que
   sí conviene antes del rework es lo que sobrevive a cualquier rediseño: medir,
   dejar escrito lo que ya se sabe y no romper el motor.

**Y tres más, del 15 sep por la noche**, ya con el rework empezado (R-1 en
`main`, `docs/rework.md`):

5. **La IA de animales y personas es lo siguiente.** «Sobre todo los humanos,
   pero los animales ahora mismo es que están fatal, atraviesan paredes, dan
   vueltas sobre sí mismos.» Brief con diagnóstico en `docs/rework.md` §3.
6. **El caos es el juego.** «Que haya caos y que haya partidas que se rompan y
   no se pueda seguir jugando es la idea del juego.» Ninguna puerta del motor
   debe proteger a la aldea de morir; las dos que R-1 puso al rayo se quitan
   (`docs/rework.md` §2.6).
7. **Los planes de prueba y el nivelado van después**, y la documentación
   tiene que bastar para que Opus o Sonnet sigan sin el modelo caro. «Deja de
   hacer y dar vueltas.»

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

### 3 · La vida — **V-12 cerrada; queda V-11, y no es opcional**

**V-12 se cerró el 15 sep**, antes que V-11 y contra el orden del Anexo E, por
una razón medida: el camino viejo **ya no se ejecutaba** desde G-12. No era una
capa de repuesto, era código muerto con treinta pruebas verdes vigilándolo.
Fuera 6 011 líneas, y con ellas la bandera `valley.life`.

Y borrarlo dejó a la vista lo que el juego había perdido sin decirlo: **las
reuniones de §11.8 no ocurren desde el 14 sep.** Sólo existían en `actorsFor`.
Medido: con una reunión convocada, a media jornada el más lejano está a 12,4
celdas del sitio. **Eso es V-11**, está declarado en
`tests/fast/life-staging.test.ts`, y es lo primero del carril.

Después de V-11 y del enganche del rebaño, la vida está hecha.

### 4 · Que corra y se instale en un móvil de verdad

- **G-09 quedó parcial a propósito**: no había dispositivo real y D.9 no acepta
  emulación. Sigue sin haberlo, y desde la migración **ya no es una deuda: es lo
  que decide si el 3D se sostiene**, porque no queda un 2D al que volver más allá
  de `?render=canvas`. Va antes de borrar `src/render/`.
- **G-11 y G-12 están cerradas.** G-12 en dos mitades: la activación el 14 sep y
  la migración de la especificación el 15, que es el día que separó las dos y
  costó cuatro regresiones invisibles.
- **La suite rápida vuelve a cumplir su presupuesto** (17,5 s contra 20): no
  había que bajar el listón, había que separar los siete ficheros que vivían
  jornadas enteras dentro de ella. El banco de balance sigue en 18,1 min contra
  15, con la causa medida.
- **Y hay demo que se puede abrir en un teléfono sin servidor:** `npm run shot`
  la arma en una sola página con los treinta y nueve modelos dentro.

### 4.1 · Que las rejas midan el juego — **nuevo, del 15 sep**

Lo encontró la auditoría y no estaba en ninguna hoja de ruta:

- **La reja de capturas de §14.3 llevaba roja desde U-01**, 8 de 13 recorridos,
  y nadie lo sabía porque CI sólo dispara en `main` o en un pull request y el
  trabajo lleva 167 commits en una rama. Siete quedan declarados con su medición
  y son el carril C de `next-plan.md`.
- **Los dos recorridos de navegador medían el Canvas creyendo medir el juego**,
  porque no pasaban las banderas de WebGL y el relevo a 3D falla en silencio.
  Arreglado en la reja de PWA, que ahora exige `data-render`.
- **No existe reja visual del 3D.** Hoy se mira a mano. Automatizarla pide
  decidir qué se compara, porque píxeles sobre WebGL por software dan falsos
  rojos.

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

### 6 · Las dos deudas que ningún agente podía saldar — **descartadas**

El hito 0 (tres crónicas leídas por un tercero) y el hito 6 (el parte de
bienvenida leído por quien no lo escribió) **se descartan** por decisión del
dueño del diseño el 15 sep 2026. Fueron la deuda más antigua del proyecto y
llevaban desde el primer día sin saldarse; dejan de bloquear y dejan de
contarse. Se quedan escritos en `docs/design.md` §9.5 y §15.1 como lo que
fueron —el criterio con el que se construyó el motor—, no como algo pendiente.

---

## El orden que yo propondría — reescrito el 15 sep

Los cinco primeros puntos del orden anterior están hechos: U-05 a U-09, V-09b,
el sonido, V-12 y G-12. Lo que queda, por lo que pesa:

1. ~~**Un teléfono.**~~ **Resuelto**: el dueño lo abrió en su iPad y su iPhone
   el 15 sep y funciona. Lo que queda es una medida de fotogramas en
   dispositivo, que es un dato y no un bloqueo.
2. ~~**V-11**~~, cerrada el 15 sep.
3. ~~**El ritmo de decisión.**~~ **Cancelado** por la decisión 4 de arriba: el
   sistema de encrucijadas se va a rehacer casi entero, así que afinarlo ahora
   es gastar dos veces. `wolf_winter` se queda sin fusionar a propósito.
4. **La escala**, si con la interfaz nueva el valle se sigue viendo pobre. Es
   D.6.2 y son seis píxeles por persona, medidos.
5. **La reja visual**: los recorridos declarados, y una para el 3D.
6. **El rework**: mucho más azar y mucha más vida, con la iteración de Fable.
   No hay brief todavía y no se empieza sin él.

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

---

# Decisiones tomadas el 14 sep 2026

Cuatro preguntas que estaban bloqueando áreas enteras, contestadas por el dueño
del diseño. Lo que sigue es lo que se hace con cada una.

## 1 · El ritmo de decisión: **las dos cosas**

Arreglar los dos fallos **y** relajar condiciones **y** escribir plantillas
nuevas de menor peso. Se acepta el riesgo de pasarse al otro lado.

Orden, porque importa: primero los dos fallos (son bugs y no cambian balance),
después medir de nuevo con `tools/eligibility-report.ts`, después relajar, y
sólo entonces escribir plantillas nuevas — **cada paso remidiendo**, porque
relajar y añadir a la vez hace imposible saber cuál de los dos movió qué.

Y un tope que hay que vigilar: **un idle que interrumpe cada dos minutos deja de
ser un idle.** El número al que se apunta es del orden de seis a ocho decisiones
por década, no treinta. Si la suite de balance de §12.9 empeora, es señal de que
se ha pasado.

## 2 · El aldeano: **que diseñen libre**

No se impone dirección a la sesión de Blender. Queda dicho, para cuando haya que
juzgar lo que traigan, que a la escala de reposo un aldeano mide **seis
píxeles** y que hoy su silueta es casi la misma por delante y por detrás.

## 3 · El sonido: **ambiente y acentos**

Se abre el área. Viento por estación, el río, el yunque, campana de capilla; y
un acento corto en el hito y en la encrucijada. Silencio por defecto hasta que
el jugador toque. Es un área que no choca con nada y puede ser una sesión
aparte.

## 4 · La migración: **el 3D es el juego**

Se quitan las banderas y se borra el camino viejo (V-12 + G-12). **El riesgo
queda dicho una vez y aceptado**: todo lo medido de rendimiento es de un
portátil, G-09 quedó parcial por no haber un dispositivo real, y al migrar deja
de haber un 2D al que volver si en un móvil de verdad no va.

De ahí sale una prioridad nueva que antes era una deuda vieja: **probarlo en un
móvil de verdad pasa a ser urgente**, y va antes de borrar `src/render/`.

---

## Sobre mezclar 2D y 3D, que se preguntó al decidir la migración

La intuición es buena y la respuesta corta es: **sí, pero al revés de como
suena**. Conviene que quede escrito porque la versión ingenua es una trampa.

**Lo que no funciona: fondo 2D con personajes 3D.** El fondo es la parte
*barata* —una malla de suelo con color por vértice, y árboles, rocas y juncos
como instancias, que la GPU dibuja de una tacada—. Hornearlo a una imagen
ahorraría poco y rompería todo lo que el suelo hace de verdad: cambia de color
con la estación, el bosque **encoge** según se tala, el camino se **desgasta**
con el tráfico de §7.6, los edificios se levantan y se arruinan. Una imagen
horneada no puede hacer nada de eso sin volver a hornearse.

**Lo que sí funciona: personajes 2D cuando son pequeños.** Lo caro son los
ochenta aldeanos, cada uno un clon con su propio esqueleto de dieciséis huesos,
más las sombras. Y aquí está el dato que lo decide: **en el encuadre de reposo
un aldeano ocupa seis píxeles**. Dibujar una malla con esqueleto para una figura
de seis píxeles es absurdo — a esa escala nadie distingue un esqueleto animado
de un sprite. Cambiarlos por carteles planos (*impostors*) por debajo de un
tamaño en pantalla, y volver al modelo de verdad al acercarse, es la palanca más
grande que hay y es exactamente «mezclar 2D con 3D», bien aplicado.

Las otras dos palancas, por orden de lo que dan:

1. **Las sombras.** `PCFSoftShadowMap` con mapa de 1024 es normalmente el primer
   gasto de una escena así. Ya hay una puerta (`options.quality !== 'low'`).
2. **Menos esqueletos a la vez**, aunque no se cambien por carteles: los que
   están dentro de casa ya no se pintan (v3.62); los muy lejanos podrían
   compartir animación en vez de tener esqueleto propio.

**Pero nada de esto se hace todavía, y la razón es de método:** no sabemos que
vaya pesado. Todo lo medido es de un portátil. Optimizar sin medir es la forma
más cara de no arreglar nada — y este proyecto ya tiene escrito lo que pasa
cuando se ajusta a ciegas (E.3, regla séptima). **Primero un móvil de verdad**,
y con el número delante se decide si hace falta alguna de las tres.
