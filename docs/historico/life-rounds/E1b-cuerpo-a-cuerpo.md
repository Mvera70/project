# E1b · Contacto y reacción — 20 sep 2026

Siguiente prioridad pedida por el dueño tras aceptar los siete modelos.
[Contrato](../../encargos/encargo-cuerpo-a-cuerpo.md). Motor y modelos intactos.

## Entregado

`stepMelee` fecha `thrustAt`, `hitAt` y orientación al oponente cuando cuenta
cada golpe. No modifica daño, alcance, cadencia, selección ni posición física.
`meleePose` sirve ambos bandos; `village` lo lleva a los defensores y `cast`
a los atacantes. La caída gana en el mismo paso fatal y conserva orientación.

`spear_thrust` (0,9 s) y `hit_take` (0,5 s) son clips procedurales sobre el
esqueleto publicado, como E1, no nuevas animaciones en el GLB. Contacto en
fase cero, recuperación y pasos insinuados mediante articulación. Sin bucle.
Si se golpean a la vez, los primeros tres pasos enseñan estocada y los restantes
el impacto con su edad original. Un hecho posterior interrumpe el anterior;
la cadencia de D4, 0,5 s, no se cambia para completar un gesto de 0,9 s.

## Verificación

Typecheck, lint y **53 pruebas** pasan en `combat-clips`, `melee`,
`graphics-clock`, `raiders`, `archery` y `life-observation`. Guardan fechas,
prioridad, expiración, penalización del arquero y movimiento real del GLB;
pose idéntica con salto, repetición, retroceso y otro clip previo.
No suite larga ni nuevo banco de balance.

## Observación

El empaquetador se detiene con `Sin promover: fountain, plough`, porque la
tanda anterior los catalogó sin publicarlos. No se elude esa comprobación
en producción ni se publican modelos implícitamente. Para observar se usa
`npm run dev -- --host 127.0.0.1 --port 5174 --strictPort` y una copia local
del observatorio cuya única diferencia es abrir esa URL en vez de un HTML.
La copia vive en `artifacts/graphics/E1-melee/observe-local.mjs`.

Comando común: `node artifacts/graphics/E1-melee/observe-local.mjs --year 30
--means bows,arms --raid 24 --assault`. Todas las salidas tienen visor,
imágenes, traza y resumen; añadir `--out artifacts/graphics/E1-melee/<carpeta>`.

| Carpeta | Argumentos adicionales | Qué se observó |
|---|---|---|
| `duel-23` | `--seed 23 --lead 14 --seconds 6 --fps 15 --follow 135 --zoom 0.16` | Aún no hay cuerpo a cuerpo: no valida los gestos |
| `find-7` | `--seed 7 --lead 8 --seconds 18 --fps 2 --follow -9000 --zoom 0.2` | Localiza impacto del defensor 68 y estocadas del clan cerca de 18 s |
| `contact-23` | `--seed 23 --lead 23 --seconds 6 --fps 15 --follow 135 --zoom 0.16` | Atacantes -9001/-9002/-9003: estocada en 31, impacto en 32–34 |
| `contact-7` | `--seed 7 --lead 17 --seconds 4 --fps 15 --follow 68 --zoom 0.12` | Árboles ocultan el intercambio: no es validación visual positiva |
| `impact-23` | `--seed 23 --lead 25 --seconds 2 --fps 15 --follow -9001 --zoom 0.075` | -9001: andar en 0, estocada en 1, impacto en 2–3, caída desde 4 |

Toma diagnóstica adicional: mismo comando con `observe-study.mjs`, `--seed 7
--lead 17 --seconds 4 --fps 15 --follow 68 --zoom 0.18
--out artifacts/graphics/E1-melee/study-7`. La segunda diferencia es el tercer
argumento `true` de `__valleyCapture`, ya existente: encuadra el portón y oculta
bosque sólo al capturar, restaurándolo después. No altera terreno ni física.

Inspección visual: `contact-23` 31/33/40, `contact-7` 15/18/24 (ocluida),
`study-7` 8/10/15 (brazo extendido, recuperación, defensor cayendo),
`impact-23` 1/3/5 (contacto, reacción, comienzo de caída).

Todas las tomas: cero errores de página, drift de personas/animales, centros
bloqueados y penetraciones muestreadas. Semilla 7: 69 personas/19 animales;
23: 71/12. Motor congelado en tick 1458: esto prueba renderer y vida, no
evolución persistente ni mortalidad. La física puede variar entre tomas;
no se presentan ventanas distintas como comparación causal.

## Límites y siguiente trabajo

E1 sigue parcial: `flee` pendiente. Las manos siguen sin armas porque se
conserva la entrega de modelos sin publicación; la estocada no certifica aún
contacto de punta y cuerpo. El grupo atacante se superpone y puede ocultar
brazos; la oclusión por bosque sigue en la vista normal. No hay ragdoll,
empujón físico nuevo, gore ni decisión de saqueo.

Se observó además que la llamada a `stepMelee` está dentro de la rama de
física de arquería de `village.ts`. La pelea sin ese mundo inicializado merece
una comprobación propia; esta ronda usa arcos y no cambia esa condición.

El bloqueo de `bundle` requiere resolver explícitamente la publicación de
los modelos aceptados o el tratamiento de estudios aún no publicados. Esta
entrega no declara un bundle nuevo distribuible.
