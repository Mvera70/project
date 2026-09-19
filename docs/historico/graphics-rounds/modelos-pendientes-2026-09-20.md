# Primera tanda de modelos · 20 sep 2026

Siete modelos originales construidos con Blender 5.2.1 LTS en procesos de fondo,
sin modificar la escena abierta y sin servicios generativos. Recetas en
`art/recipes/<id>/<id>.json`; declaraciones y hashes en `art/catalog.json`.

## Resultado medido

Dimensiones de los GLB, en metros: ancho X × alto Y × fondo Z.
Las armas conservan su punto de agarre; la caja envolvente no es su pivote.

| Modelo | Triángulos | Materiales | Dimensiones (m) | Directorio por hash |
|---|---:|---:|---|---|
| Arco (`bow`) | 240 | 3 | 0.061 × 1.622 × 0.326 | `7cf930f1bf263151` |
| Lanza (`spear`) | 46 | 2 | 0.170 × 2.100 × 0.170 | `671e526d256a5859` |
| Flecha (`arrow`) | 62 | 3 | 0.076 × 0.084 × 0.800 | `474435e79c604956` |
| Escudo (`shield`) | 122 | 3 | 0.900 × 0.900 × 0.252 | `a6a11ccf641b564c` |
| Portón (`gate`) | 212 | 3 | 3.000 × 2.800 × 0.500 | `6a631196325241e1` |
| Arado (`plough`) | 136 | 3 | 0.880 × 0.999 × 2.373 | `45ef9d8fbe869de5` |
| Fuente (`fountain`) | 406 | 2 | 2.400 × 1.950 × 2.400 | `5a65635457c33168` |

Arado y fuente cumplen sus presupuestos de 400 y 500 triángulos.
Los otros límites de la prueba son guardas técnicas de esta tanda, no nuevos
presupuestos normativos del diseño.

## Archivos y reproducción

Galería local: `artifacts/graphics/G-24/index.html`.
Cada directorio `artifacts/graphics/G-24/approved/<hash>/` contiene el
`<id>.blend`, `<id>.glb`, vista Blender, captura Three.js y recibos.
Los artefactos no se versionan; las siete recetas permiten reconstruirlos con
`npm run art -- all <id>`. El catálogo guarda la última salida verificada.

**G-24 es aquí el directorio de almacenamiento elegido para los modelos**:
no sustituye ni modifica la ronda histórica G-24 sobre el vado.
El nombre interno `approved` del pipeline no supone aceptación humana:
los siete registros mantienen `status: study`.

## Contratos y límites

- Escala 1/3: recetas en metros y GLB en celdas; Y arriba y frente +Z.
- `bow`, `spear`, `arrow` y `shield` incluyen `grip`.
- `gate_door` es un grupo independiente con gozne lateral; el portón no
  fusiona por material para no perderlo. La integración deberá conservar esa
  jerarquía. No se ha probado su apertura dentro del juego.
- Arco estático: sin deformación de cuerda ni flecha incorporada.
- Arado de mano, sin ruedas ni animales. Fuente de piedra y agua opaca.
- Son estudios geométricos facetados, sin texturas externas ni clips.
  La fuente tiene basa ancha y fuste recto, no un fuste de conicidad continua;
  su brocal usa segmentos facetados gruesos, no reproduce exactamente el
  borde de 15 cm del brief. Queda sujeto a revisión visual del dueño.
- No se ha ejecutado `assets:publish`, copiado nada a `public/` ni cambiado
  el render. E2/E3 siguen parciales: faltan integración, clan, adarve,
  portón roto y otros encargos fuera de esta tanda.
- No se ha decidido gore, fuego ni saqueo.

## Verificación

Los siete comandos `npm run art -- all <id>` finalizaron: inspección de bytes
GLB, materiales, conectores, límites finitos y captura en Three.js repetible.
Se revisaron las siete vistas Blender y las vistas Three.js de arco y fuente.
Hashes GLB contrastados por las pruebas cuando existen los artefactos locales.

`npm run typecheck`, `npm run lint` y
`npx vitest run tests/fast/art-manifest.test.ts tests/fast/art-props.test.ts`
pasan: **11 pruebas**. No se ejecutó la suite larga ni se comprobó integración
en una partida, porque esta entrega se limita a producir los modelos.

