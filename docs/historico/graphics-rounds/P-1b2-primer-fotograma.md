# P-1b.2 · Primera tarea del render 3D

**Cierre local:** 22 sep 2026. Se rechaza la partición del primer fotograma y
se conserva el render en una sola llamada. P-1 se cierra aquí por decisión de
Vera: el rendimiento actual le resulta suficiente para continuar con el juego.

## Medida y candidato

Las marcas `valley3d:` separaron la preparación del suelo (~64–83 ms), la vida
(~72–77 ms) y la primera llamada a `renderer.render` (~81–94 ms en las
réplicas típicas). Ninguno de esos tramos explica por sí solo toda la tarea.
Las sondas calientes iniciales se solaparon y sólo sirven como diagnóstico.

El candidato preparaba la escena en un RAF y enviaba el primer fotograma a
WebGL en el siguiente, con el lienzo oculto sobre el fondo verde hasta dibujar.
Vera ejecutó cuatro corridas **secuenciales** de Edge visible: control y
candidato, tres réplicas frías y tres calientes cada uno. Escena real
semilla 11/año visible 21, 48 habitantes, día despejado, fase 0,38, 390 × 844,
DPR 2, calidad estándar. Cada corrida registró diez segundos de cadencia tras
cinco de asentamiento, seis clics posteriores y una captura. Cero errores de
página. No se perfiló CPU durante estas corridas.

| Caché | Control: mediana de la mayor tarea del primer fotograma | Partido: mediana de la mayor tarea | 3D utilizable, control → partido | Clic posterior p95, control → partido |
|---|---:|---:|---:|---:|
| Fría | 255 ms | 167 ms | 1.605 → 1.630 ms | 24 → 24 ms |
| Caliente | 237 ms | 149 ms | 1.600 → 1.787 ms | 24 → 32 ms |

Las primeras réplicas frías incluyeron inicialización adicional: máximo de
481 ms en el control y 337 ms en el candidato. La segunda réplica caliente
del candidato llegó a 207 ms de tarea y 1.991 ms hasta 3D. RAF p95 fue
~7,1 ms salvo esa primera réplica caliente partida, de 13,8 ms. Las cuatro
capturas muestran la misma composición y luz; los aldeanos ocupan posiciones
algo distintas porque la vida sigue moviéndose durante los cinco segundos de
asentamiento. Las capturas estáticas no prueban la transición entre los dos
primeros RAF ni el defecto previo de sombras diurnas.

Datos crudos, con captura en cada carpeta:

- Control frío: `artifacts/graphics/P-1a-app/2026-09-22T14-33-06-032Z-00/`.
- Partido frío: `artifacts/graphics/P-1a-app/2026-09-22T14-34-04-986Z-00/`.
- Control caliente: `artifacts/graphics/P-1a-app/2026-09-22T14-35-03-960Z-00/`.
- Partido caliente: `artifacts/graphics/P-1a-app/2026-09-22T14-37-51-337Z-00/`.

## Decisión

La reducción de la tarea inicial es real en este equipo, pero sólo afecta al
montaje y no acelera la primera imagen. La comparación caliente muestra una
respuesta posterior algo peor y una espera mayor hasta 3D; con tres réplicas
no se puede atribuir la diferencia a una causa única. Vera considera bueno el
rendimiento actual y pidió cerrar la fase. Se retira el candidato para evitar
añadir un relevo de dos fotogramas sin beneficio claro para la experiencia.
P-1b.1, que sí redujo el Event Timing del clic de entrada, permanece.

El INP de 912–1.144 ms observado antes por Vera no se reprodujo como métrica
INP del navegador; no se afirma que esté resuelto. Tampoco se midieron tiempo
GPU ni dispositivo móvil. Las sombras diurnas que parpadean son un defecto
visual separado. No se hizo commit ni push.
