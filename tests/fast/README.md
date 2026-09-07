# Cobertura de M-11

§14.1 enumera **nueve grupos**, aunque el brief M-11 dice diez. Esta matriz
sigue la enumeración publicada; no inventa un décimo requisito.

| Grupo | Cobertura |
|---|---|
| Determinismo | `sim.test.ts`: SHA-256 de JSON del estado completo, incluidos los arrays del mapa, obras y pregunta pendiente. Partida de semilla 6 y replay de su registro exacto de decisiones; ambos alcanzan explícitamente 5 000 ticks. |
| Aislamiento | `invariants.test.ts`: tras 1 000 ticks se consumen 1 000 números de `chronicle`, se avanzan otros 1 000 y se compara todo el estado, excluyendo únicamente el flujo intervenido. `rng.test.ts` cubre además el generador. |
| Arquitectura | `module-graph.test.ts`: restricciones del motor y dependencias. |
| Invariantes por tick | `invariants.test.ts`: grano finito y no negativo, ánimo/fe en rango y nacimientos no futuros; cada uno de 200 ticks en semillas 0, 6, 7, 42 y 108, con decisiones del catálogo. Geometría pendiente de M-13/M-14. |
| Catálogo | `catalog.test.ts`: opciones visibles, cardinalidad, claves de bancos, referencias de reparto y semillas. También comprueba letras usadas en textos de consecuencias. |
| Condiciones | `crossroads.test.ts`: tabla de casos del DSL y resolución. |
| Mapa | Pendiente de M-13: río continuo, bosque en rango y fundación válida sobre 200 semillas del generador real. |
| Gestos y cámara | Pendiente de M-20 y su lógica pura. |
| Guardado | Pendiente de M-23 y sus funciones reales de guardado/carga. |

Los cuatro pendientes figuran como `it.todo` en la suite. M-11 **no está cerrado**
hasta cubrirlos. No se usa un clon JSON como sustituto de la API de guardado,
ni el mapa provisional como prueba del futuro generador.

## Defectos encontrados al añadir las propiedades

El anterior test de 5 000 ticks usaba la semilla 7 sin verificar el reloj final:
la partida se extingue en el tick 3 186. La semilla 42 también acaba antes, en
el 4 343. El test nuevo reproduce decisiones de una partida que llega al horizonte
y comprueba ambos relojes para impedir ese falso positivo.

La fundación provisional incumple ya la geometría: `foundGame(7)` coloca el
edificio 5 (`field`) sobre las celdas de agua `(19,48)` y `(19,49)`.
Los intentos de comprobar geometría con las cinco semillas de invariantes
fallaron desde el primer tick por agua bajo edificios. §15.1 excluye la geometría
del hito 0 y `found.ts` delega expresamente mapa/colocación a M-13/M-14;
la cobertura espacial se mantiene pendiente sin cambiar producción ni esperar
que el defecto ocurra para dar un test por aprobado.

## Ejecución

`npm test` debe completar toda la suite rápida en menos de 20 segundos según
§14.1. `npm run typecheck` y `npm run lint` complementan la verificación.
La suite de balance se ejecuta aparte con `npm run test:balance`.
