# RD-6 · Antes y después del rework de ritmo, descanso y progresión (1 oct 2026)

Lo que mide este informe es **la integración de todas las ramas de la ronda**,
juntas en la rama local `claude/rd6-integracion` sin fusionar ningún PR:
#19 sol, #20 retiradas pendientes, #21 descanso sin derrota, #22 RD-0, #23 caza
a la vista, #24 y #25 RD-1, #26 regreso, #27 RD-4 y #28 RD-5. «Antes» es `main`
en `3cab2b97`. RD-3 (las encrucijadas reescritas) **no está dentro todavía**: la
lleva un agente aparte y su medida se añadirá cuando llegue.

Velocidad de referencia: **×1** (decisión de Vera tras RD-0). A ×1 una semana
son 14 min, una hora real es un mes de juego y el primer año son unas 11 h.

## 1. La apertura

| Medida | Antes (`main`) | Después |
|---|---|---|
| Primera elección del jugador, a ×1 | 3,5 h (mediana, 24 semillas) | **el forastero llega al vado en el minuto 4,6–5,1** (8 semillas); el motor la apunta en la semana 1 (14 min) |
| Primer suceso del valle | 1,2 h | **28 min** |
| La caza de la fundación se puede tocar | 4 de 7 ofertas | **7 de 7** (D1, #23) |
| Un acto del jugador adelanta el calendario | sí, hasta 7 jornadas (D4) | **no**: espera a su semana (#24) |
| El sol dice la hora a ×16 y ×64 | no (aplanado hacia media mañana) | **sí** (#19) |
| Lo contestado en el vado vuelve | a los 3–8 años | **a las 2–3 semanas** (min. 28–56), y la consecuencia larga sigue |

## 2. El primer año, en entradas de crónica por valle

8 semillas, política `prudent`, sin contar las estaciones. En `main` la ventana
de 3–6 h incluye las dos entradas de la encrucijada del vado, que allí se
planteaba en la semana 15; quitándolas, queda 2,63.

| Tramo a ×1 | Antes | Después | Claves distintas (después) |
|---|---|---|---|
| 0–1 h | 4,75 | **7,50** | 12 |
| 1–3 h | 5,13 | **6,38** | 12 |
| 3–6 h, la meseta | 2,63 | **3,88** | 11; ninguna pasa de 5 de 31 |
| 6–10 h | 10,38 | **11,75** | 23 |
| 10–12 h | 6,75 | **8,50** | 17 |

En 16 semillas, las **muertes de hambre del primer año** bajan de 15 (en 8
valles) a 8 (en 5). A los tres años quedan igual (20 contra 19), con más
población (18,3 contra 21,3).

## 3. El descanso

| Medida | Antes | Después |
|---|---|---|
| Valles acabados durante una ausencia al tope | 4 de 24 (`rest-report`, una ausencia) | **0 de 24**, con cuatro ausencias al tope seguidas |
| Asaltos resueltos sin jugador | 66 | **0** |
| Velocidad al volver | se perdía en la apertura en frío | **la que se dejó**, también la pausa (#26) |
| El parte de regreso | sin lo pendiente | **nombra la pregunta que espera y las semanas del asalto** |

**Al medir esto apareció un hueco, y está cerrado:** un asalto anunciado antes
de irse se resolvía en la ausencia (9 en 24 valles). La ausencia ahora se para
en la víspera (`restTick`, #21, `59694ec`).

## 4. La escalera larga (`pace-report`, 24 semillas × 60 años)

| Peldaño, mediana a ×1 | `main` | Tras RD-1 | Tras RD-4 | Tras RD-5 (= integración) |
|---|---|---|---|---|
| 10 personas | 10 h | 11 h | 11 h | 12 h |
| Edad de piedra | 54 h | 55 h | 55 h | 58 h |
| Primer asalto | 114 h | 114 h | 114 h | 125 h |
| Villa cerrada | 264 h | 330 h | 330 h | 320 h |
| Partidas acabadas | 0/24 | 0/24 | 0/24 | **2/24** |

La escalera que Vera pidió mantener (la piedra hacia las 54–60 h y el primer
asalto hacia las 100 h) se mantiene. **Los dos finales de la última columna no
los trae RD-5.** Se cambia la respuesta de la política de referencia:
`prudentScore` suma 10 a las opciones sin consecuencia plantada, y al darles RD-5
una corta a las tres respuestas del vado, la política pasa de «darle de comer y
despedirlo» a «acogerlo».

Con la misma respuesta forzada, RD-5 no empeora nada:

| Respuesta al vado, 24 semillas × 10 años | Acabados (RD-1) | Acabados (RD-5) | Valles con hambre el primer año (RD-1 → RD-5) |
|---|---|---|---|
| Acogerlo | 2 | 2 | 12 → 13 |
| Darle de comer y despedirlo | 0 | 1 | 8 → 6 |
| Echarlo | 2 | 1 | 7 → 7 |

## 5. Lo que queda para Vera

1. **Acoger al forastero al fundar es caro**, y no viene de RD-6: es así desde
   RD-1. Trae hambre el primer año en la mitad de los valles y acaba 2 de 24 en
   diez años. El texto ya lo avisa («a third mouth before the first harvest»).
   Con «el caos es el juego» puede quedarse así. Si se siente injusto para la
   primera elección del juego, hay dos palancas medibles:
   - que traiga algo de grano consigo;
   - que la llegada de gente del primer año (`arrival.many`, cuatro bocas en la
     semana 4) espere a la cosecha cuando ya hay una boca de más.
2. **La lectura humana y el móvil.** Nada de esta ronda se ha visto en un
   dispositivo. La visita como señal no tiene captura: el Chromium por software
   va a ~3 fps y la vida anda a un tercio, así que el tratante no llega a la
   plaza antes de irse.

## 6. Puertas

- Suite rápida, por ramas: en verde salvo el cronómetro de 960 ticks de
  `save.test.ts`, que también falla en `main` con la máquina cargada.
- Jornadas sobre la integración: en curso; el resultado va al cuaderno.
- Typecheck y lint, limpios en cada rama.

## Qué lo refutaría

- Una partida a ×1 en la que la primera elección no llegue antes del minuto 10.
- Que la meseta de la hora 3 a la 6 siga sin nada que mirar con 16 semillas o
  en una lectura humana.
- Una ausencia tras la que el valle aparezca tomado, o con un asalto resuelto
  que el jugador no vio.
- Que con la misma respuesta al vado la integración acabe más valles que
  `main`.
