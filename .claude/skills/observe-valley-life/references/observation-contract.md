# Contrato de observación de vida

## Qué ejecuta el observatorio

`tools/graphics/observe-life.mjs` abre el HTML empaquetado, crea la partida mediante el
menú real e instala el reloj controlado de Playwright. `window.__valleyAdvance` avanza el
mismo renderer y la misma capa de vida que usa el juego, a pasos de 1/30 s. La captura de
píxel y `window.__valleyLife` ocurre de forma síncrona para que pertenezcan al mismo paso.

Sin `--live`, el estado del motor se clona al comenzar y permanece fijo. Esto hace reproducibles las
rutas y animaciones, pero no prueba nacimientos, obras, encrucijadas, cambios de jornada
ni la renovación escénica provocada por el motor. Para eso hace falta un recorrido del
juego vivo con `--live`.

Con `--live` se instala el reloj **antes de abrir el juego**, se avanza RAF para arrancar,
y se elige la velocidad mediante el control real. `clock.runFor` ejecuta el bucle de la
aplicación, sin llamar a `tick` ni a `__valleyAdvance`. Se responde la primera opción de
una encrucijada cuando aparece. La llamada programática al botón de velocidad evita el
aviso de bienvenida que lo puede tapar: no certifica la accesibilidad táctil del control.
`__valleyObserveLive` ahorra dibujo GPU entre muestras; vida, animaciones y escena siguen
avanzando y `__valleyCapture` dibuja el fotograma sincronizado. No sirve para medir FPS.

## Opciones

| Opción | Uso |
|---|---|
| `--seed` | Valle reproducible. Predeterminado: 43. |
| `--year` | Año cargado desde el menú de desarrollo. Predeterminado: 60. |
| `--lead` | Segundos avanzados sin capturar; 55 sitúa la toma cerca del anochecer y 94 cerca del alba. Rango 0–120. |
| `--seconds` | Duración capturada. |
| `--fps` | Muestras por segundo; debe dividir 30. Usa 2 para trayectorias y 15 para animación. |
| `--follow` | Id de aldeano o id del cuerpo animal. La cámara lo sigue. |
| `--zoom` | Factor aplicado al primer fotograma. Valores menores acercan la cámara. |
| `--out` | Carpeta nueva de salida. Nunca reutilices una que ya tenga `trace.json`. |
| `--page` | HTML alternativo; normalmente usa el bundle predeterminado. |
| `--live` | Avanza la partida mediante el bucle real de la aplicación. |
| `--speed` | Velocidad elegida en la UI en modo vivo; predeterminado 16, ejemplo 64. |

En modo fijo, `lead` y `seconds` son segundos escénicos. En modo vivo son segundos del
reloj del navegador antes de aplicar velocidad: 42 s a ×64 cubren unas 22 jornadas.
La fase esperada del modo fijo es `(0.28 + (lead + segundos) / 120) % 1`. El script aborta si un RAF
externo altera esa fase, porque entonces la imagen y el experimento dejan de ser fiables.

## Archivos de salida

- `frames/*.png`: imagen real de WebGL en cada muestra.
- `trace.json`: cuerpos, modelos dibujados, rutas, estados e interacciones por fotograma.
- `summary.json`: anomalías y transiciones agregadas.
- `index.html`: visor local con reproducción, selector de cuerpo y ruta superpuesta.

## Lectura de campos

- `people[].residence.stage`: `day`, `returning`, `opening`, `entering`, `sleeping`,
  `leaving`, `unreachable`; sin residencia se cuenta como `no-home` en el resumen.
- `routePoints`: ruta vigente proyectada también a pantalla.
- `penetration`: solape del disco físico con la máscara sólida.
- `renderedPeople` y `renderedAnimals`: posición que realmente usa la escena 3D.
- `actors`: actividad o clip visual del aldeano.
- `beasts[].reaction`: fase y compromiso de conducta animal.
- `interactions` y `partners`: escena o participantes activos.
- `firstTick`, `lastTick`: prueban que la partida avanza en modo vivo.
- `nightOutcomes`: medida en el paso fijo justo antes de salir de la noche; `pending`
  son los residentes que aún no duermen. Guarda hasta 64 noches, no sólo los PNG nocturnos.
  No cuenta como fallo a quienes carecen de vivienda. Informa noches completas/total y
  residentes por noche, sin promediar y esconder una noche fallida.

## Trampas que ya dieron conclusiones falsas

1. Avanzar sólo el motor con `tick` no mide la capa de vida ni responde encrucijadas.
2. Probar funciones aisladas no demuestra que el renderer vivo las llame.
3. Capturar PNG y telemetría en tareas distintas permite que RAF avance entre ambas.
4. Instalar un reloj después de arrancar deja RAF pendientes; el modo de observación debe
   impedir que repinten por su cuenta.
5. SwiftShader necesita `--use-gl=angle --use-angle=swiftshader
   --enable-unsafe-swiftshader`; `--use-gl=swiftshader` puede producir un render roto.
6. Dos fps permiten seguir rutas, pero no juzgar una zancada. Usa 15 fps para clips.
7. Cero incidencias muestreadas significa cero en esos fotogramas, no una garantía entre
   muestras ni para todo el catálogo de sólidos.
8. Un animal ambiental —pez o cuervo— y un cuerpo de vida no tienen necesariamente el
   mismo contrato; identifica la fuente antes de denunciar duplicados.
9. `no-home` no se arregla inventando una casa desde presentación. Es estado del motor.
10. Conserva semilla y parámetros al comparar; cambiar de valle invalida el contraste.

## Matriz mínima según el cambio

| Cambio | Evidencia mínima útil |
|---|---|
| Movimiento o navegación | Dos aldeas distintas, toma de rutas y prueba de propiedad. |
| Regreso nocturno | Una aldea inicial y una densa desde antes del ocaso hasta después del alba. |
| Puerta | PNG con hoja abierta/cerrada y transición `opening → entering → sleeping → leaving`. |
| Animal o animación | Toma a 15 fps siguiendo el cuerpo, sin drift y con varios fotogramas inspeccionados. |
| Obstáculo | Ruta real, penetración cero y prueba con la misma geometría y transformación del renderer. |
| Interacción | Participantes e intención en traza, escena visible en varios fotogramas y finalización. |

Amplía la matriz cuando el cambio afecte a más especies, épocas o disposiciones. No
prolongues una tanda durante horas: si la observación no responde a la hipótesis, corrige
la instrumentación primero.
