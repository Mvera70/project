# Banco M-12

`npm run test:balance` ejecuta `foundGame` y `run` reales para semillas 0–59,
200 años y políticas `prudent`, `first`, `last`, `worst`. No modifica el catálogo ni los
parámetros. El CSV anual incluye la fundación y el último tick de cada partida;
no prolonga artificialmente las curvas de partidas extinguidas. JSON conserva
resultados por semilla, denominadores y fracciones de elegibilidad.

La cadencia cuenta preguntas planteadas, incluidas sucesiones y reserva,
excluyendo solamente `forest_cut` y `wolf_winter` del numerador (§12.9).
Ambas siguen en la simulación. Se informa también la cadencia sin exclusiones.
Cada semilla aporta preguntas / generaciones efectivamente vividas; se informa
la media entre semillas y su máximo. No se diluye la mortalidad con siglos vacíos.

Elegibilidad: `eligible` sobre cada estado previo al tick, con copia de RNG para
evitar consumir aleatoriedad del juego. Mide condiciones, reparto y reposos;
no la selección ni su techo global. Es una sonda de frontera entre ticks, no
instrumentación interna del paso 15. El denominador son ticks realmente jugados.
El diagnóstico de intervalos pegados al techo cuenta distancia exacta de 121
ticks entre preguntas: 120 desde la decisión que se ejecuta al tick siguiente.

La segunda tabla por plantilla mide disparos / máximo teórico permitido por su
reposo: suma de disparos dividida por suma de `ceil(exposición/reposo)` de cada
semilla, donde exposición es tiempo vivido después de `minYear`. Se aplica el
tope `maxPerGame`. No descuenta condiciones ni el techo global; es utilización
del presupuesto teórico, no probabilidad de selección. `quiet_years` se informa
aparte, porque es reserva de garantía y no compite con las demás plantillas.

El choque ramifica al final del año 40 desde cada partida todavía viva y aplica
el efecto real `kill(random, fraction=0.9)`, con redondeo propio del motor. Prosigue
con la misma política hasta extinción o año 200. Denominador: supervivientes al
choque, informado por política; no se atribuyen al choque muertes anteriores.

Los umbrales de pico, primera generación, extinción y mapa lleno pertenecen a
`prudent`. `worst` verifica mortalidad adversa y la horquilla entre jugar con
cabeza y jugar mal. Todas las políticas verifican rangos, geometría,
elegibilidad, cadencia, bosque y choque cuando corresponden.

Mapa y bosque están activos desde M-14/M-15. El porcentaje de intervalos pegados
al techo (<40%) sigue siendo diagnóstico, no aserto. El banco v2.18 queda rojo:
once asertos fallan, enumerados en `docs/design.md` §2.18, incluido el presupuesto
de diez minutos (1 143,63 s). No se recortan semillas ni años para ocultarlo.

Artefactos: `artifacts/balance.csv` y `artifacts/balance-summary.json`, escritos
antes de los asertos para preservar evidencia cuando el banco termina rojo.
