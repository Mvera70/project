---
name: observe-valley-life
description: Graba, inspecciona y diagnostica el comportamiento 3D real de aldeanos y animales de The Valley —movimiento, rutas, animaciones, interacciones, sueño, puertas y colisiones— usando el observatorio reproducible del proyecto. Úsala al validar cambios en src/render3d/life, fauna, edificios u obstáculos; no para probar por sí sola la evolución persistente del motor.
---

# Observar la vida de The Valley

Evalúa lo que el jugador ve en el renderer 3D real. No cierres una corrección sólo con
tests unitarios, una simulación aislada o una captura suelta.

## Antes de grabar

1. Lee `CLAUDE.md`, `docs/task-log.md` y el informe de la ronda en curso.
2. Lee [references/observation-contract.md](references/observation-contract.md). Contiene
   el contrato de la traza, los modos de grabación y las trampas ya comprobadas.
3. Conserva cambios ajenos del worktree. Usa una carpeta de salida nueva para cada toma;
   el observatorio rechaza sobrescribir `trace.json`.

## Flujo de trabajo

Empaqueta el juego después de cada cambio relevante:

```powershell
npm run bundle
```

Si hay otros agentes empaquetando, usa una salida propia y pásala al observatorio:
`npm run bundle -- --out artifacts/graphics/MI-RONDA/game`, y después
`--page artifacts/graphics/MI-RONDA/game/valley.html`. No pruebes sobre una página
que otro agente esté reconstruyendo.

Escoge una toma que responda a la hipótesis:

- Rutas, puertas, sueño o colisiones: 2 fps y 30–45 segundos.
- Articulación, gait o transición idle/walk: 15 fps y 4–8 segundos, siguiendo un cuerpo.
- Comparación antes/después: conserva semilla, año, `lead`, duración, fps y cuerpo seguido.

Ejemplos:

```powershell
node tools/graphics/observe-life.mjs --seed 7 --year 1 --lead 55 --seconds 45 --fps 2 --follow 0 --zoom 0.5 --out artifacts/graphics/IA-10/check-night-7
node tools/graphics/observe-life.mjs --seed 43 --year 60 --lead 55 --seconds 45 --fps 2 --out artifacts/graphics/IA-10/check-night-43
node tools/graphics/observe-life.mjs --seed 7 --year 1 --lead 94 --seconds 6 --fps 15 --follow 10002 --zoom 0.18 --out artifacts/graphics/IA-10/check-hen-walk
node tools/graphics/observe-life.mjs --live --speed 64 --seed 43 --year 60 --seconds 42 --fps 2 --out artifacts/graphics/IA-11/check-live-43
```

Para una semana concreta del motor usa `--advance N` antes de congelar la
toma. Por ejemplo, la cosecha de una trayectoria que abre en la semana 1 puede
alcanzarse con `--advance 34`. Comprueba siempre `engineTick` en la traza: el
selector de año juega la trayectoria completa y dos semillas pueden abrir con
un tick de diferencia.

Si Chromium no puede iniciarse dentro del sandbox, solicita autorización para ejecutar
ese mismo comando. No cambies los flags WebGL del observatorio: usa ANGLE con SwiftShader.

## Leer la evidencia

Abre el `index.html` generado y reproduce la toma. Selecciona los casos relevantes y
comprueba visualmente la ruta, el estado, la animación y el entorno. Mira varios
fotogramas; una captura estática no demuestra movimiento ni articulación.

Lee también `summary.json` y, para investigar un id concreto, `trace.json`. Comprueba:

- `errors` vacío;
- `meshDrift` y `peopleMeshDrift` en cero;
- `penetratingCircles` y `blockedCentres` en cero;
- `penetratingBeasts` en cero, incluida la primera muestra (aparición del animal);
- con `--live`, `lastTick > firstTick` y `nightOutcomes`: residentes, durmiendo e ids pendientes en cada amanecer;
- transiciones esperadas y ausencia de estados que se prolongan sin progreso;
- concordancia entre lo que dice la traza y lo que se ve en los PNG.

Para rutinas diurnas, ejecuta `node tools/graphics/day-report.mjs RUTA/trace.json`.
Resume puestos asignados/alcanzados, actividades por persona y discrepancias entre
burbujas, actores y clips del mixer. Un clip con el nombre correcto no prueba que
mueva los huesos: inspecciona secuencias cercanas y comprueba los nombres importados
por GLTFLoader (por ejemplo, `forearm.R` pasa a `forearmR`).

Los contadores localizan casos; no sustituyen la inspección de imagen. Si una persona
queda `returning`, `entering` o `unreachable`, sigue ese id en otra toma cercana y revisa
su ruta y los obstáculos. Distingue `no-home` —dato del motor— de un fallo de navegación.

## Cerrar una comprobación

Añade una prueba de propiedad cuando el arreglo tenga una invariante estable. Ejecuta
los tests afectados, `npm run typecheck` y `npm run lint`. No conviertas una sola semilla
en un umbral universal; usa más de una aldea cuando la conclusión sea poblacional.

Informa siempre:

- comando exacto, semilla, año, fase inicial, duración y fps;
- cuántos cuerpos se observaron y qué casos completaron o no el comportamiento;
- errores, penetraciones y desajustes detectados;
- qué se inspeccionó visualmente;
- límites de la evidencia y trabajo aún abierto.

No declares que “la IA funciona” porque una toma controlada pase. Sin `--live` el estado
persistente permanece fijo. Con `--live` avanzan el bucle de la aplicación y el motor:
comprueba varias noches y ticks, y distingue el total de residentes en cada amanecer
porque puede haber bajas o cambios de vivienda. A ×64 y 2 fps se miden ciclos, no la
calidad de las zancadas: para eso conserva las tomas lentas de 15 fps.

## Lo que la ronda AN añadió (29 sep 2026)

- `--viewport 390x844` (o `320x568`) mira el valle al tamaño de un móvil;
  `--look X,Z` encuadra una coordenada sin seguir a nadie; `--follow ID
  --zoom 0.18` a 15 fps durante 4–8 s es la toma de detalle de un cuerpo.
- **Antes y después del mismo estado:** misma semilla, año, lead, actor,
  cámara y zoom; el «antes» con `--page <empaquetado-anterior>/valley.html`
  (se construye con el GLB viejo copiado a `public/assets/valley3d/` y se
  restaura después). Las trazas casan fotograma a fotograma (mismo
  `engineTick`, mismas posiciones).
- **Saltos y ritmo se miden sobre `trace.json`** (posiciones por fotograma,
  pasos exactos): `film.mjs` rueda en tiempo real y bajo SwiftShader tarda
  8 s por fotograma, así que su informe cuenta el reloj como saltos.
- `--hunt` arranca la caza de la semana con el gancho `__valleyHunt` (lo
  mismo que tocar la señal, sin depender de que esté en cuadro) y, si no
  empieza, dice el motivo (`no-offer`, `no-prey`, `no-hunter`…): la
  oportunidad la ofrece el motor (`huntOpportunity`), no el observatorio. La
  traza lleva `hunt` (fase, especie, arma, acción de la presa, clip del
  cazador) fotograma a fotograma.
- `--hunted partridge,rabbit…` da por cazadas esas especies (abre las cazas
  siguientes); con `--happening bear_in_the_wood` y el jabalí cazado llega la
  visita del oso. `--beast` sólo actúa junto a `--aftermath`. Un asalto con
  arqueros: `--means bows,arms --raid N --assault --follow -9000`.
  `fps` tiene que dividir a 30; `page.goto` espera 240 s (una villa con
  asalto tarda en cargar bajo SwiftShader).
- Las tiras de un actor siguiendo la traza, escaladas al PNG que la
  resolución adaptativa puede bajar:
  `python3 artifacts/graphics/AN-4b/trace-strip.py <toma> --find | --id N [--animal]`.
- `export VALLEY_CHROMIUM=/opt/pw-browsers/chromium` cuando Playwright pide
  un Chromium que no está; un solo Chromium a la vez, encadenados con un
  script y un `grep` de su marca de fin. Para saber si hay uno rodando,
  `ps -eo args | grep "observe-life[.]mjs"`: el patrón con corchetes no se
  encuentra a sí mismo (`pkill -f` con el texto de tu propia orden mata tu
  propia shell).
- **Rueda el empaquetado de `artifacts/graphics/G-10/game`**: tras tocar
  código, `npx tsx tools/graphics/bundle-game.ts` primero.
- La visita del oso dura 3 s desde el paso 0 (AN-4c): `--lead 0` y `--look`
  en la guarida (`bearDen` en la traza). Si un actor que el motor pidió no
  sale, mira la traza desde el paso 0: puede no haber nacido en el juego
  (el oso no nacía con los troncos de `solidTerrain` hasta AN-4c).
- Las comparaciones a escala nativa (GIF «antes | después» a 1:1 y tira):
  `python3 artifacts/graphics/AN-4/compare/build-compare.py`.
