# E0e · Ambiente de las eras

Fecha: 21 sep 2026. Alcance: acabado 3D de suelo, plaza y señales; no se
modificaron motor, derivación, vida, navegación, guardados ni balance.

## Resultado implementado

- El suelo recibe `Era` desde `renderer.ts`. Sólo cambia el color de las
  celdas cuyo `map.path[cell] > 0`; plaza y vado siguen teniendo prioridad. La
  clave de apariencia combina la firma de suelo existente y la era, por lo que
  cambiar de era vuelve a construirlo aun sin cambio topológico.
- La fuente no se desplaza. Aldea y villa añaden como máximo dos/cuatro bancos
  mínimos en candidatos estables alrededor de ella. El renderer rechaza cada
  huella que caiga sobre edificio vivo, camino, agua/roca/marisma o fuera del
  mapa; si no hay huecos enseña menos. La reconstrucción de suelo cambia la
  referencia de cota y fuerza también la reinstalación al cambiar de valle.
- El humo sigue saliendo exclusivamente de `tellsFor(state)`. Conserva la
  intensidad de ánimo: tres bocanadas por señal en caserío y aldea, cuatro en
  villa, con volumen y altura progresivos. No se crean emisores nuevos.

## Evidencia de navegador 3D

Tomas reales a 390 × 844, primavera/día 1, sin errores de página. `--year`
abre el inicio del año, por eso se verificaron las transiciones contra
`foundGame` y no contra la ayuda de pruebas `foundTwenty`.

| Semilla | Año mostrado | Era de la toma | Hogares ocupados / humo | `map.path` 5×5 junto a plaza |
|---|---:|---|---:|---|
| 7 | 0 | hamlet | 1 / 1 | todo `0` |
| 7 | 4 | village | 5 / 5 | todo `0` |
| 7 | 30 | town | 12 / 12 | niveles `1` en accesos, resto `0` |
| 23 | 0 | hamlet | 1 / 1 | todo `0` |
| 23 | 3 | village | 4 / 4 | todo `0` |
| 23 | 31 | town | 10 / 10 | una fila de nivel `2`, resto `0` |

Capturas históricas correctas: `artifacts/graphics/E0e/seed-{7,23}-{hamlet,village,town}-year-{0,3,4,30,31}.png`.
Las tomas de villa de semilla 7 (`seed-7-town-year-30.png`) y 23
(`seed-23-town-year-31.png`) se inspeccionaron a tamaño móvil: los bancos no
ocupan el centro de la fuente; la lectura del humo sigue siendo débil.
El acabado de plaza de semilla 7 a año 4 puede mostrar menos complementos si
los candidatos quedan ocupados, que es el comportamiento deliberado.

## Coste acotado

Tras la revisión visual, la villa usa cuatro bocanadas (no cinco), pero con
volumen, altura y opacidad moderadamente mayores; así se lee desde panorámica
sin subir tanto el coste. Semilla 7/año 30: 12 señales, 36 → 48 esferas (+12);
semilla 23/año 31: 10 señales, 30 → 40 (+10). Los bancos, ahora con silueta de
mesa/banco de 0,56 × 0,26 celdas, siguen añadiendo como máximo ocho meshes (cuatro
bancos de dos piezas) y liberan sus geometrías/materiales propios al cambiar
era, valle o al disponer el renderer.

## Verificación

- `npm run typecheck`: verde.
- `vitest` focalizado: `era-ambience`, `graphics-effects`, `graphics-world`:
  91 pruebas verdes.
- `npm run lint` y `git diff --check`: verdes.

Las pruebas nuevas cubren prioridad de plaza/vado, ausencia de acabado en
suelo sin camino, niveles de camino distinguibles, firma de suelo por era,
posiciones libres e idempotencia de plaza, y que las bocanadas siguen el mismo
conjunto de `tellsFor` sin mutar `GameState`.

## Control de la misma escena

Se añadió el puente de diagnóstico mínimo `?preview-era=hamlet|village|town`:
`shot.mjs` lo valida, `backend.ts` lo acepta sólo en archivo local o localhost
y lo entrega al constructor; el renderer lo usa sólo para suelo, plaza y humo.
Sin query sigue usando `eraOf(state)`;
ni el `GameState`, ni la cabecera, ni la vida, ni el motor cambian.

La misma villa real (semilla 7, año 30, misma hora, mismas cifras y misma
cámara) se capturó en las tres apariencias:

- Móvil 390 × 844: `control-seed-7-year-30-{hamlet,village,town}-mobile.png`.
- Tablet 1024 × 768: `control-seed-7-year-30-{hamlet,village,town}-tablet.png`.

Tras una iteración corta de contraste, se repitieron las mismas seis tomas.
No produjeron errores de página. La plaza pasa de vacía a dos y cuatro bancos;
el humo gana volumen y los niveles de camino real se aclaran sin colorear
prado. La cabecera continúa diciendo `WALLED TOWN`, dejando claro que el
override no falsifica la historia. La diferencia de camino sigue limitada a
celdas con desgaste real, no a todo el recinto.

**Veredicto de revisión Sol:** implementación técnica aceptada; **aceptación
visual pendiente**. Sin leer la cabecera y sin comparar las tres capturas lado
a lado no se clasifican las eras de forma fiable, especialmente en tableta.
Los bancos son el rasgo más legible; el camino y el humo todavía aportan poco
en la panorámica. No se seguirá ajustando a ciegas: hace falta una dirección
visual concreta para otra ronda. La comparación controlada prueba qué cambia,
no que ya baste para contar la fase al jugador.

No se usa la toma histórica fundacional como evidencia de una casa vacía. Para
la villa control (semilla 7/año 30), la sonda de `tellsFor` confirma que las
casas vivas 143 (25,49) y 146 (38,61) no tienen señal de humo; la ausencia se
verifica por sonda y prueba focal, no por una toma localizable. Las doce casas
autorizadas sí conservan sus señales.

No se verificó en iPad físico; 1024 × 768 es una inspección de viewport tablet,
no una afirmación sobre hardware real.
