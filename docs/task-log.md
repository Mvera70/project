# Cuaderno de tareas — el rework

**Este fichero es lo primero que hay que leer, y lo último que hay que tocar
antes de cerrar una ronda.** Existe porque el dueño del diseño dijo, el 16 sep
2026: «te has perdido… necesitas un documento en el que te vaya guiando
siempre». Tenía razón: había un informe por ronda (`docs/life-rounds/`,
`docs/ui-redesign/rounds/`) pero **ningún sitio que dijera dónde estoy**, así
que cada vez que se retomaba la sesión había que reconstruirlo leyendo commits.

**La regla, y es una sola:** ninguna ronda se cierra sin actualizar aquí el
tablero (§2), las cifras (§3) y lo abierto (§4). Si sólo se puede hacer una
cosa, es ésta: un informe de ronda sin esta actualización es un informe que
nadie va a encontrar.

---

## 1. Dónde estamos ahora mismo

| Qué | Valor |
|---|---|
| Rama | `rework/parada-a-media` |
| HEAD | ver `git log -1`; la última ronda mía es el nivelado de las estancias y el plazo vencido |
| `main` | **`5e34e5c`, al día** — 16 commits del rework subidos el 16 sep a petición del dueño; la rama también está en el remoto |
| Fusionado aquí | `docs/visual-reference` (`f842a8d`), el cuaderno de referencia visual del dueño |
| Sin seguimiento, a propósito | `docs/life-ai-implementation-prompt.md` es del dueño; se deja para que lo commitee él |
| Puerta usada en cada ronda | `npm run typecheck`, `npm run lint`, y **sólo los ficheros tocados** |
| **En vuelo ahora** | nada |
| Lo que acabo de cerrar | IA-6, más la burbuja que hace visible la riña y el suelo de la convocatoria |

## 2. El tablero

Orden fijado por el dueño: auditoría, movimiento, interacciones, hábitos,
animales, fauna, escenas históricas, **y después interfaz**.

### La IA de la vida (`docs/life-ai-implementation-prompt.md`)

| Fase | Estado | Commit | Informe |
|---|---|---|---|
| IA-0 · auditoría y contratos | **hecha** | `0a45e0c` | `life-rounds/IA-0.md` |
| IA-1 · movimiento y destinos | **hecha** | `1509121` | `life-rounds/IA-1.md` |
| IA-2 · compromisos e interacciones | **hecha** | `17e9022` | `life-rounds/IA-2.md` |
| IA-3 · aldeanos con hábitos | **hecha** | `37c7da6` | `life-rounds/IA-3.md` |
| IA-4 · animales con conducta propia | **hecha**, con dos rondas de arreglo encima | `d7cac67`, `528a764`, `7822454` | `life-rounds/IA-4.md` |
| IA-5 · fauna silvestre (cuervos, lobos) | **la única que queda de la tanda** | — | — |
| IA-6 · historia visible | **hecha** — la riña con sus dos `id`; funeral e incendio quedan para R-5 por falta de dato | (este commit) | `life-rounds/IA-6.md` |

### El rediseño de interfaz (`docs/ui-redesign/implementation-prompt.md`)

| Ronda | Estado | Commit |
|---|---|---|
| UI-R0 · auditoría y cierre de especificación | **hecha** | `f9f2df4` |
| UI-R1 · carcasa, tokens y navegación | pendiente | — |
| UI-R2 · cabecera, actividad, órdenes, velocidad | pendiente | — |
| UI-R3 · crónica · UI-R4 · personas | pendientes (pueden ir en paralelo tras congelar UI-R2) | — |
| UI-R5 · integración y decisiones · UI-R6 · validación | pendientes | — |

### El rework de fondo (`docs/rework.md`)

| Fase | Estado |
|---|---|
| R-1 · los sucesos del valle | **hecha** (v3.75), y el caos de §2.6 aplicado (v3.76) |
| R-2 · gente distinta | **cubierta en la práctica por IA-3**; la riña con `id` la cubre IA-6 |
| R-3 · diez rasgos de valle | pendiente. **El cuaderno del dueño ya trae las diez plantas** (`visual-reference` §4) |
| R-4 · encrucijadas | no es trabajo: se quedan y no se afinan |
| R-5 · más vida en pantalla | se cubre con IA-6 y con el nivelado de §4 |

## 3. Las cifras que mandan

**Movimiento** (`npx tsx tools/life-report.ts 7 23 97 --days 2`, 26 880
cuerpo-segundos). La primera columna es el estado antes de tocar nada.

| | línea de partida | ahora (`7822454`) |
|---|---|---|
| centro en celda cerrada | 0 | **0** |
| círculo en celda cerrada | 1,31 % | **0,09 %** |
| giros > π/2 estando parado | 4,75 % | **0,39 %** |
| parados con impulso ≥ 0,9 | 0,20 % | **0,00 %** |

Los giros subieron de 0,21 % a 0,39 % en `7822454` y es efecto conocido: un
animal que ahora se queda quieto en su sitio gira ahí. **Vigilar.**

**El día de cada especie** (`npx tsx tools/life-report-species.ts 7 23 --days 2`):

| | andando | quieta sin nada | lo suyo |
|---|---|---|---|
| gallina | 35,7 % | 51,3 % | **13,0 %** |
| cerdo | 28,5 % | 30,6 % | **40,9 %** |
| vaca | 82,5 % | 0,7 % | **16,9 %** |

De partida eran: gallina 88,7 % andando y 8,9 % lo suyo; cerdo 65 % y 34,6 %;
**vaca 95 % andando y 2,8 % pastando**. La vaca sigue siendo la que más anda —es
el cuerpo más lento y el de parches más anchos— y el siguiente nivel está en las
duraciones y distancias del cuaderno del dueño.

**Interacciones** (IA-2): 1 144 empiezan, 1 122 terminan, **0 colgadas**.
**Historia visible** (IA-6): 80–91 riñas reales por semilla en 40 años, de ellas
6–20 montadas, terminadas y liberadas el mismo día del suceso; **0 canceladas,
0 colgadas** en las ~514 revisadas.
**Sucesos del valle** (R-1, `tools/fate-report.ts`): 12,3 al año, mediana de 3
semanas, y **8 de 12 valles se rompen a los 40 años** (el caos que el dueño
pidió).

## 4. Lo abierto, por orden de lo que más duele

1. **Falta poder descartar una plaza que ya falló.** Es la pieza que bloquea
   dos cosas a la vez. El plazo vencido de las personas (`village.ts`) tiene el
   mismo fallo que tenían los animales, **pero aplicar el arreglo empeora la
   cifra**: «parados con un impulso al máximo» sube de 0,06 % a 0,20 %, la de
   partida, porque con las estancias fijas de `SEAT_DWELL` se vuelve a elegir
   la misma plaza inalcanzable y se reintenta en bucle. Probado, medido y
   **retirado**, con el número escrito en el propio sitio del código
   (`village.ts`) y en `life-rounds/IA-6.md` §4.3. Con el descarte, el arreglo
   entra solo.
2. **Las duraciones y distancias de las actividades**, con los tiempos del
   cuaderno (`visual-reference` §2 y §3) como referencia declarada como
   hipótesis. La vaca sigue andando el 82,5 %: sus cinco parches están a 1,2–3,2
   celdas y anda a 0,32 celdas por segundo.
3. **Las nueve jornadas rojas de `rework.md` §2.8.** Casi todas son de la capa
   de vida y sus números cambian con cada fase, así que se tocan **al final de
   la tanda de IA**, no antes.
4. **Un trabajador de vitest se cae en la suite rápida en paralelo**
   («Worker exited unexpectedly»; no es montículo, con 4 GB cae igual), y **la
   suite ya no cabe en treinta segundos** como promete `CLAUDE.md`. Hay que
   decidir si las tres pruebas caras del motor (bosque de un siglo 19 s, riñas
   25 s, crónica anual 12 s) se mudan a las jornadas o si se reescribe la
   promesa. Bloquea UI-R6, que pide la suite entera.
5. **El zoom de las capturas topa por encima de unas dos muescas**, así que no
   se puede acercar la cámara a un animal en una aldea grande. Lo midieron IA-3
   e IA-4 por separado. Es lo primero que hace falta para juzgar de cerca.
6. **Dos decisiones del dueño, pendientes de él**: `spring_valley` y
   `wide_ford` se contradicen literalmente como pareja de rasgos, y
   `spring_valley` con `marsh_valley` hay que acordarla (`visual-reference`
   §4). Y si el caos actual —ocho de doce valles roto— es el juego que quiere.
7. **`GREET_ODDS` sigue sin medir en la jornada**, sólo acotado. Ya no es
   «siempre» (ver §5), pero cuántos saludos al día hay es cosa del ojo.
8. **Deuda de `IA-1.md` §4.2**: `ProgressState` vive en un `Map` de
   `village.ts` y en `Beast` en vez de en `Dweller`. Arreglo escrito allí.
9. **§3.5 punto 5 de `rework.md`**: la malla contra el radio. Una vaca colisiona
   con radio 0,4 y su malla mide más de una celda. Es de `render3d/`, no de
   `life/`.
10. **El aviso de la crónica y la pista de las órdenes se pintan encima uno del
   otro** en la franja de abajo. Captura que lo prueba en
   `life-rounds/evidencia-capturas.md`. Va al rediseño; el cuaderno del dueño da
   la geometría (`visual-reference` §5).

## 5. Lo que ya se aprendió y no hay que volver a aprender

De método, y cada una costó tiempo:

- **Nada de suites largas.** Orden del dueño: «no podemos estar parando a hacer
  pruebas de 15, 30, 45, una hora». Typecheck, lint y los ficheros tocados.
- **Una sola cosa corriendo a la vez, y al matar un run se matan sus
  trabajadores.** Esta sesión llegó a tener **121 procesos de vitest huérfanos**
  comiéndose la máquina, y todo parecía lentísimo por eso.
- **Nunca `git stash` sobre el árbol entero si hay otro agente escribiendo.** La
  forma segura de comparar antes/después es `git show HEAD:<fichero> > tmp`.
- **Reparto de ficheros por escrito antes de lanzar dos agentes en paralelo**, y
  decirle a cada uno qué ficheros son del otro. Funcionó con IA-3 e IA-4.
- **Medir antes de afirmar.** **Cinco veces** esta sesión tuve una hipótesis
  convincente y falsa, y las cinco lo supe porque la medida no se movió. Lo que
  sí funciona, siempre: **seguir un solo cuerpo paso a paso** imprimiendo su
  intención, su destino y su distancia. Así salieron las cuatro causas del
  defecto de los animales y la de V-11. Y una vez estuve a punto de informar de
  que el mundo era incoherente por contar sólo las casas de madera: eran de
  piedra.
- **Un arreglo que empeora la cifra no se queda «porque es correcto en
  principio».** Se retira, se escribe el número en el sitio del código y se
  nombra la pieza que falta. Pasó con el plazo vencido de las personas.

De diseño, y son las que más valen:

- **Una cota absoluta calibrada con una persona no vale para un cuerpo que no es
  una persona.** Tres fallos distintos de la misma familia: el umbral de avance,
  el margen con las paredes y el radio de la pausa. Lo que se le pide a un
  cuerpo se mide **con ese cuerpo**.
- **Una probabilidad que se tira cada paso no es la probabilidad que parece.**
  `GREET_ODDS = 0.2` se leía como «uno de cada cinco cruces» y era «siempre»,
  porque la llave llevaba el paso: con p repetida n veces sale 1 − (1 − p)^n.
- **Un compromiso es una interacción de verdad, no una cercanía.** Reservarlo
  por proximidad dejaba a los animales esperando en `approach` hasta caducar.
- **Una convocatoria se obedece, no se sopesa.** La reunión de §11.8 daba
  compañía y quitaba aburrimiento, así que a quien no le faltaba ninguna de las
  dos no le ofrecía nada y se quedaba en su sitio, viéndola a cuatro celdas.
  Lo que el motor ordena no compite por utilidad con estar de brazos cruzados.
- **Tapar el síntoma mejora la cifra y empeora el juego.** Hacer que estar
  parado saciara la sed quitaba a los sedientos de la estadística y les quitaba
  las ganas de ir al agua. El hueco real era que **sólo se podía beber en un
  sitio y con dos plazas**.
- **A 6 píxeles no hay que confiarle el significado a un gesto fino**, dice el
  cuaderno del dueño: ni un giro de cabeza ni un picotazo. Lo que sobrevive a la
  reducción es la continuidad de la trayectoria y la alternancia de quietud y
  marcha. Eso cambia qué merece la pena implementar.
- **La capa de vida sólo corre en 3D.** Una captura Canvas no acredita nada de
  estas fases, y la ruta `?debug=1` monta Canvas. Para ver un valle crecido hay
  que adelantar el reloj: `shot.mjs --advance <semanas>`
  (`life-rounds/evidencia-capturas.md`).

## 6. Qué hacer cuando se retoma esto

1. Leer §1 y §2 de aquí. Si hay algo «en vuelo», **no tocar sus ficheros**.
2. Mirar `git status` y `git log --oneline -5`. Conservar lo ajeno; nada de
   `reset` ni `checkout` destructivo sin documentarlo.
3. Coger el punto 1 de §4, o la fase «siguiente» de §2 si el 1 está hecho.
4. Cerrar con: informe de ronda en `docs/life-rounds/` o
   `docs/ui-redesign/rounds/`, **actualizar este fichero**, y commit con las
   medidas dentro del mensaje.
