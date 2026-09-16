# Contrato de observación de vida

## Qué ejecuta el observatorio

`tools/graphics/observe-life.mjs` abre el HTML empaquetado, crea la partida mediante el
menú real e instala el reloj controlado de Playwright. `window.__valleyAdvance` avanza el
mismo renderer y la misma capa de vida que usa el juego, a pasos de 1/30 s. La captura de
píxel y `window.__valleyLife` ocurre de forma síncrona para que pertenezcan al mismo paso.

El estado del motor se clona al comenzar y permanece fijo. Esto hace reproducibles las
rutas y animaciones, pero no prueba nacimientos, obras, encrucijadas, cambios de jornada
ni la renovación escénica provocada por el motor. Para eso hace falta un recorrido del
juego vivo además de esta herramienta.

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

La fase esperada es `(0.28 + (lead + segundos) / 120) % 1`. El script aborta si un RAF
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
