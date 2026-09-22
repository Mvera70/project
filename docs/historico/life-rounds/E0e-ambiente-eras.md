# E0e · Ambiente de las eras

Fecha: 21 sep 2026. Alcance: acabado 3D de suelo, plaza y señales; no se
modificaron motor, derivación, vida, navegación, guardados ni balance.

## Resultado implementado

- El suelo recibe `Era` desde `renderer.ts`. Cambia el color de los caminos
  existentes y, dentro del mismo círculo reservado de plaza, el empedrado:
  canto oscuro irregular en caserío, mezcla asentada en aldea y piedra clara
  sectorizada en villa. Plaza y vado siguen teniendo prioridad. La clave de
  apariencia combina la firma de suelo existente y la era, por lo que cambiar
  de era vuelve a construirlo aun sin cambio topológico.
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

La continuación de plaza repitió los controles sin alterar humo, bancos ni
caminos: `control-seed-{7,23}-year-{30,31}-{hamlet,village,town}-{mobile,tablet}-plaza-v2.png`.
Son 12 tomas: semilla 7/año 30 y semilla 23/año 31, las tres eras forzadas,
390 × 844 y 1024 × 768. Todas conservan año, estación, cámara y cifras del
estado real, y ninguna produjo errores de página. La inspección visual confirma
el círculo, la fuente y los pasos libres; el pavimento oscurece/mezcla/aclara
en ese orden, aunque en la panorámica de la villa la diferencia sigue siendo
sutil. No se hizo otro ajuste por tanteo: queda pendiente de lectura ciega y
arbitraje, no se declara aceptación visual plena.

El coste medido de esta continuación es cero objetos, meshes, materiales,
texturas, emisores y draw calls adicionales: reutiliza los atributos de color
del único mesh de suelo y sólo recalcula su color en la reconstrucción ya
provocada por mapa, estación o era. Se conservan los límites previos de 48/40
esferas de humo y hasta ocho meshes de bancos en las villas medidas.

**Revisión Sol de la continuación (22 sep):** la diferencia caserío → aldea
se aprecia como suelo más claro; aldea → villa apenas se distingue, en especial
en tableta. El patrón parece manchas de color, no un empedrado de distinta
factura. Se mantiene la aceptación visual pendiente. Los controles son válidos
para aislar el acabado, pero inválidos para exigir clasificación histórica de
eras: todos muestran la misma villa amurallada. No se han generado tomas
históricas nuevas tras esta variante ni se ha organizado lectura ciega externa.
El cambio a tierra pisada/empedrado parcial sería más contrastado, pero exige
decisión del dueño porque contradice `docs/design.md` §7.4b. No se seguirá
afinando por tanteo.

**Verificación de la continuación:** `npm run typecheck`, `npm run lint`, 92
pruebas focalizadas (`era-ambience`, `graphics-world`, `graphics-effects`) y
`git diff --check` pasan. Las 12 capturas no produjeron errores de página.

**Veredicto de revisión Sol de la primera ronda:** implementación técnica aceptada; **aceptación
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

---

## Ronda autorizada · tierra → piedra · 22 sep 2026

Se sustituye el acabado anterior de tres tonos de empedrado por la progresión
autorizada de la misma plaza reservada: tierra pisada en caserío, áreas de
tierra y piedra en aldea, y piedra continua en villa. Sólo cambia
`world/ground.ts`: el patrón usa los colores estacionales ya entregados y los
atributos de color del único mesh de suelo. No añade geometría, materiales,
texturas, emisores ni draw calls, y no toca radio, cota, fuente, navegación,
vado ni los caminos externos.

La prueba focalizada cuenta las celdas interiores: 0 de piedra en caserío,
tierra y piedra presentes (sin cobertura completa) en aldea, y todas de piedra
en villa. Conserva las comprobaciones de prioridad de plaza sobre camino, vado
y exterior intactos, firma sensible a era y estado inmutable; además repite la
misma entrada para exigir el mismo patrón determinista.

Se generaron 12 controles sin errores de página, todos en primavera/día 1 y
con la misma escena por terna: semilla 7/año 30 y semilla 23/año 31, las tres
eras forzadas y ambos viewports. Están en
`artifacts/graphics/E0e/control-seed-{7,23}-year-{30,31}-{hamlet,village,town}-{mobile,tablet}-earthstone-v3.png`.
También se generaron seis tomas históricas sin `preview-era`: 7/años 0, 4 y 30,
y 23/años 0, 3 y 31, en
`artifacts/graphics/E0e/historical-seed-*-earthstone-v3.png`; tampoco tuvieron
errores de página. El capturador disponible no ofrece ocultación de cabecera o
pie sin ampliarlo, así que esas tomas se conservan con HUD y no se presentan
como lectura ciega.

Inspección propia a 1024 × 768 de los tres controles de semilla 7: la tierra
ocre del caserío se distingue claramente del prado y la villa queda como plaza
gris continua; la aldea conserva una zona ocre continua frente a la piedra, por
lo que se separa de la villa al compararlas. Aun así, aldea frente a villa no
es una clasificación independiente demostrada: el cambio ocupa un círculo
pequeño dentro de una panorámica de villa. La lectura visual queda pendiente de
una clasificación independiente de las tomas históricas; no se ajustaron más
colores a ciegas. Esa lectura sería útil para aceptación del conjunto, pero no
es la puerta de cierre de esta ronda acotada.

La revisión de Sol de las doce tomas confirma tres grados de superficie
distinguibles en móvil y tableta, sin regresión del círculo, la fuente ni los
accesos. Límite explícito: la piedra se lee todavía lisa, sin juntas; resolver
esa textura exigiría geometría o textura nueva y queda fuera del presupuesto de
esta ronda.

Verificación de esta ronda: `vitest` focalizado de `era-ambience`, `npm run
typecheck`, `npm run lint` y `git diff --check`, verdes.

---

## Aceptación histórica sin rótulos · 22 sep 2026

La prueba pendiente se repitió sobre el bundle actual
`6CDD3171E88C41C15A7102B7E625BA7D00D2F3365000B655FE62A778CA36F76E`.
`shot.mjs` puede centrar una coordenada real con `--look X,Z` y extraer el PNG
del renderer con `--scene-only`, sin cabecera, pie ni texto de era. El gancho
no cambia `GameState` ni fuerza `preview-era`. Se abrieron por el menú las
historias prudentes de semilla 7/años 0, 4 y 30 y semilla 23/años 0, 3 y 31,
en móvil 390×844 y tableta 1024×768. Las 12 capturas están en
`artifacts/graphics/E0e/A01.png`…`A12.png`; cero errores de página y plaza
visible en las doce. Orden, por parejas móvil/tableta: 7/0, 7/4, 7/30,
23/0, 23/3 y 23/31. El año 0 del menú muestra el primer año, como hace el
juego.

Un agente distinto del que capturó recibió únicamente A01…A12, sin nombres de
semilla, año o era, y no consultó metadatos. Clasificó **12/12** por la superficie
de la plaza y también **12/12** por la escena completa: caserío, aldea y villa
en ambas semillas y ambos tamaños. No asumió que el orden de archivo fuera
cronológico. Cuatro clasificaciones de superficie tuvieron confianza media
(A03, A09, A10, A11); ninguna plaza quedó tapada. Esto es una lectura ciega
de otro agente, **no** una prueba con cinco lectores externos ni una inspección
en iPad físico.

Como control separado, se volvió a abrir **la misma villa real** (semilla 7,
año 30, misma cámara y hora) con las tres apariencias `preview-era`, en móvil
y tableta: `control-focused-seed-7-{hamlet,village,town}-{mobile,tablet}.png`.
Los seis PNG no tuvieron errores de página. Aíslan el acabado, pero no son
historias de otras eras. La tierra del caserío se distingue claramente;
**aldea frente a villa tiene poco margen visual** en ese control aunque el
patrón 0/parcial/total de piedra esté verificado en pruebas. En las escenas
históricas la lectura se sostiene por la plaza y el resto de signos de fase;
no se atribuye el acierto exclusivamente al pavimento.

**Arbitraje:** se acepta la lectura histórica del conjunto E0e, con esa
reserva de contraste. La piedra lisa sin juntas sigue como acabado futuro;
no se añade geometría ni se afina color a ciegas. No se modificó motor,
derivación de era, navegación, costes ni fuente en esta aceptación. Sus 92
pruebas focalizadas y la suite rápida completa de la tanda (1.706/1.706)
pasaron; la suite de jornadas conserva rojos ajenos al acabado, anotados en
el cuaderno, sin rebajar listones para cerrar E0e.
