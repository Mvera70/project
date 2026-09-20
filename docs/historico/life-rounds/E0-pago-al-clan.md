# E0 · Pagar al clan

**Cerrado el 20 sep 2026.** Entrega de la fila «Pagar al clan»; E0 global
continúa abierto por la semana posterior y las transiciones de muralla.

## Qué se entregó

La capa de vida reconoce sólo el instante ya resuelto como `turned_back`: hay
una decisión histórica `raiders_coming:pay`, `bought_off` sigue vigente, no
queda una partida en camino y el tick es exactamente el de llegada que B2 fijó.
La ventana se limita a la primera jornada escénica de esa semana; no depende de
la modal, no prolonga la bandera ni modifica el motor.

Si existe un portón en pie y una ruta navegable, dos o tres adultos existentes
que no ocupan un puesto de guarnición conservan su posición del amanecer, cargan
la paga y siguen una ruta que atraviesa el ancla real del portón hacia el acceso
exterior del clan. Cada paso usa la misma navegación, separación y colisión que
un aldeano normal. Al completar la ruta se limpia carga y tarea, por lo que
vuelven al reparto corriente; reconstruir el segundo día no crea ningún
porteador.

No se fuerza una escena si no hay portón o no hay itinerario atravesable: la
capa reduce la representación antes que inventar una salida.

## Pruebas

- `tests/fast/life-payoff.test.ts`: 3 verdes. Ventana única
  `bought_off`/`turned_back`; dos o tres adultos con carga y ruta real, sin
  guardias; posición inicial intacta y paso por el ancla del portón; limpieza
  de tarea/carga y pureza del estado tras una jornada.
- Regresiones focalizadas: `life-siege-warning.test.ts`,
  `life-preparation.test.ts` y `garrison.test.ts`: **24/24** verdes.
- `npm run typecheck` y `npm run lint`: verdes.

## Límites

- La carga se expresa con la silueta de saco existente; no hay una malla nueva
  de monedas ni una animación específica de entrega.
- No se tocaron motor, balance, cadencia, economía, aviso, preparación,
  semana posterior, fuego ni gore.
