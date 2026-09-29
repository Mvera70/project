---
name: fisica-combate
description: Cómo se trabaja la física del combate de The Valley —qué decide hoy Rapier y qué deciden distancias y relojes, cómo se mide en sombra antes de dejar que un contacto decida, cómo se compara (con distribuciones, nunca batalla a batalla), el cuerpo que se pinta como cuerpo que decide, y qué se mide en el aparato—, con el método del diagnóstico y del experimento F-0 (29 sep 2026). Úsala antes de tocar physics.ts, archery.ts, melee.ts, el golpe al portón de raiders.ts, ragdoll.ts, hunt-shot.ts o hunt-encounter.ts, al abrir una fase F (F-1 «la flecha que se clava» y siguientes), o cuando Vera pregunte si la física decide algo.
---

# La física del combate

Vera lo pidió así el 29 sep 2026: «que las batallas tengan consecuencias
físicas reales … me preocupa que Rapier dé apariencia de física mientras el
resultado siga dependiendo de distancias y temporizadores». El diagnóstico
(`docs/diagnostico-fisica-combate-2026-09-29.md`) dice qué decide cada cosa,
el experimento F-0 lo midió en sombra, y la fila F de `docs/plan-meta.md`
ordena lo que viene. Esta skill es ese método en una página. Lee también
`battle-sandbox` (el banco) y, si tocas un gesto, `animacion`.

## 1 · Qué decide qué, hoy

| Decisión | Quién | Dónde |
|---|---|---|
| Vuelo de la flecha, almenas, caída de los muertos, cascotes | **Rapier** | `life/physics.ts` (`launch`, `articulate`, `debris`) |
| Si la flecha alcanza | **Cilindro** de 0,45 × 0,7 **desde y=0**, mirado al final del paso | `life/archery.ts`, `stepArchery` |
| Qué hace un flechazo | Regla: una flecha tumba | `stepArchery` |
| Cuerpo a cuerpo | Distancia 0,9, un golpe cada 15 pasos, cae a los 3 | `life/melee.ts`, `stepMelee` |
| Portón | Distancia 2,6, un golpe por segundo, 60 lo rompen | `life/raiders.ts` |
| Movimiento y empujes | Integrador de la vida en rejilla, no Rapier | `life/body.ts`, `integrate`; `separate` |
| Caza | Balística propia, lanza por distancia (atraviesa empalizadas) y suerte | `life/hunt-shot.ts`, `life/hunt-encounter.ts` |
| Resultado para la partida | El parte `life.defence` entra por `PlayerAct` `battle`; si nadie miró, B3 | `engine/world/threat.ts`, `settle` |

**Rapier sólo ve a los muertos**: los ragdolls son colisionadores y los vivos
no. Las animaciones **fechan** los hechos (`combatClip`, `since`), no los
deciden.

## 2 · Las reglas de esta línea

1. **El motor no cambia.** Lo que decida la física entra como dato por
   `PlayerAct` (`kind: 'battle'`); el motor sigue determinista dadas sus
   entradas (§1b). La batalla no lo es, y está bien.
2. **Primero en sombra.** Una decisión nueva de Rapier se mide antes de que
   decida: al lado de la regla de hoy, apuntando qué habría dicho, sin cambiar
   nada. La sombra tiene que ser **neutra y comprobada**: `battle-report.ts`
   corre cada batalla sin y con sombra y dice «mismo resultado» o
   «DISTINTO».
3. **Colisionadores que no deciden van en otro mundo.** En F-0, cápsulas con
   los grupos de colisión a cero **en el mismo** `World` cambiaron el orden
   interno de Rapier y la semilla 42 acabó con uno o dos aciertos distintos.
   Las sondas viven en un mundo de consulta aparte (`probes`, `sweep`).
4. **Con y sin física se compara con distribuciones, nunca batalla a
   batalla.** Veinte batallas o más, varias semillas, en llano y con
   `--relief`. Un listón con una batalla es ruido.
5. **El cuerpo que decide es el que se pinta.** `DRAWN_BODY` en
   `archery.ts`: 0,65 de alto, 0,12 el tronco, 0,17 con brazos (medido sobre el
   GLB). La cápsula arranca en los pies (la semiesfera de abajo, enterrada). Y
   el control del método es la cápsula del tamaño de la regla vieja: lo que
   cambia con ella (5–7 % en F-0) es ruido del método, no física.
6. **La vida no conoce la pose.** Un arma con colisionador pide la trayectoria
   de la punta **como dato horneado de los clips**, con prueba contra la pose
   pintada; leer la pose del render desde `life/` rompe las capas.
7. **El integrador de la vida manda en el movimiento.** Las sondas **siguen**
   al cuerpo; si un contacto decide un empujón, se aplica como velocidad en
   `body.ts`. Nada de controlador de personajes de Rapier sin una causa medida.
8. **Las reglas hablan con la física por `physics.ts`**, nunca con tipos de
   Rapier: el día de un port se reescribe esa interfaz y no las reglas.
9. **El balance es del dueño.** Un cambio de letalidad llega con su cifra
   (bajas por flecha, asaltantes caídos, portón, villas que caen) y Vera
   decide. F-0 dejó tres salidas para el acierto: aceptar la muralla un tercio
   menos letal, apuntar con el aire, o separar lo que se ve de lo que decide.
10. **El coste se decide en el aparato.** Como fracción del fotograma de la
    línea de base del iPhone o el iPad, no con milisegundos de este contenedor.

## 3 · Cómo se mide

- **Sin navegador**:
  `npx tsx tools/reports/battle-report.ts --seeds 7,11,21,42,3,5,13,23 --shadow 0.12,0.17,0.37 [--relief]`.
  Imprime la neutralidad, la tabla de acuerdo (iguales, a otro, sólo el
  cilindro con suelo o muro delante, sólo Rapier), la altura del contacto,
  cuánto sigue volando la flecha que acierta y el coste (`stepMsTotal`,
  `probeMsTotal` por paso). Las salidas de F-0 están en `artifacts/physics/F-0/`.
- **En el aparato (F-0b)**: `?sandbox=battle&defenders=10&raiders=24`, «Copiar
  métricas» en el pico, y lo mismo con `&shadow=0.12` (fila «Sondas F-0» y
  bloque `probes`). En el Chromium sin GPU del contenedor el banco va a 0 fps y
  no llega a la pelea: ahí no se mide.
- **Lo que se ve**: una tira del observatorio a 390×844
  (`observe-valley-life`, `trace-strip.py`). Una física que no se lee a
  10–20 px no existe para quien juega.
- **Pruebas**: propiedades del contrato (`tests/fast/physics-probes.test.ts`:
  la cápsula a la altura justa y con pies, el muro que tapa, un vuelo idéntico
  al bit con sondas, la arquería con bitácora que da lo mismo), no umbrales de
  una batalla.

## 4 · Trampas que ya costaron una tarde

- **`castShape` de Rapier 0.20**: el punto tocado en coordenadas del mundo es
  `witness1`, aunque el tipado diga «local»; `witness2` es el punto de la
  bola. La prueba de las sondas lo vigila.
- **Las sondas se colocan antes de `world.step()`** del mundo de consulta: sin
  paso, lo que ven las consultas es la posición de antes.
- **El informe sin `--relief` corre en llano**, y el juego no: la misma villa
  7/60 dura 36 s con relieve y 96 en llano. Para medir combate, `--relief`
  (ni así es exactamente el banco, que añade los sólidos de los edificios).
- **El cilindro y el apuntado miden la altura desde y=0**, no desde el suelo
  del blanco. Bajo el portón de las villas medidas el suelo está a cota 0 y no
  muerde; en una ladera, sí.
- **La flecha que acierta sigue volando** (7 m de mediana): Rapier no sabe que
  ha dado. Cualquier fase que haga decidir al contacto la para donde toca.
- **La primera batalla del proceso paga el WASM**: `battle-report.ts` tira una
  de calentamiento antes de medir coste.
- **Un criterio por flecha se diluye**: cuatro de cada cinco flechas no dan a
  nadie. Lo que decide quién cae son los aciertos; mídelo por acierto.
- **La caza no pasa por Rapier** (`hunt-shot.ts`): lo que se mida del asalto
  no vale para la caza, ni al revés.

## 5 · Cerrar una fase F

Lo de `goal` §4 y además: la tabla de neutralidad y de acuerdo con su
comando; la cifra de balance escrita para Vera si algo decide distinto; la
toma a 390×844; el coste en el aparato o dicho como pendiente; la fila F de
`docs/plan-meta.md`; y en `docs/encargos-3d.md` lo que la pantalla todavía no
cuenta (la flecha que no se para, la caída sin impulso).
