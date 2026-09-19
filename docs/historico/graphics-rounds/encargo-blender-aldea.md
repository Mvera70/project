# Encargo · Rediseño de los elementos de la aldea

16 sep 2026. Petición del dueño: continuar el estilo de los aldeanos con
edificios, variedad de viviendas, adornos, campos y carros. Este documento
define el alcance; no declara modelos construidos ni aprobados.

## Objetivo

Una aldea medieval coherente con los aldeanos G-17/G-18: volúmenes sencillos,
formas facetadas, madera visible, tejados y entradas reconocibles. Cada edificio
debe poder reconocerse por su forma y función al mirar el valle. Las variantes
de viviendas deben cambiar la silueta, no sólo el color.

## Depende de

`docs/design.md` (convenciones y Anexo D), `CLAUDE.md`, `docs/task-log.md`,
paleta compartida y constructor existente. Consultar G-19/G-20 para no confundir
una miniatura de taller con su legibilidad sobre el terreno y luz del juego.

## Tandas

| Orden | Recursos existentes | Qué se diseña |
|---|---|---|
| 1 · Viviendas | `house`, `stone-house` | Casa de paja y madera; casa de piedra y teja. Prototipos adicionales con porche, cobertizo adosado o planta alargada, sujetos a la misma huella de su familia |
| 2 · Edificios del pueblo | `mill`, `smithy`, `granary`, `chapel`, `church`, `well` | Aspas y torre del molino; taller abierto de herrería; almacén; capilla pequeña; iglesia con campanario; pozo con brocal y cubierta |
| 3 · Campo y trabajo | `field`, `field-cut`, `handcart`, `haystack`, `log-pile`, `shed` | Cultivo y campo cosechado coherentes; carro de madera; heno, leña y cobertizo |
| 4 · Límites y memoria | `palisade`, `wall`, `watchtower`, `grave-yard`, `ruin-wood`, `ruin-stone` | Cercado defensivo, muro, torre, cementerio y ruinas que recuerden a los edificios nuevos |
| 5 · Adornos adicionales | A definir con integración | Barriles, sacos, bancos, cercas de huerto, comederos y útiles exteriores, elegidos por su utilidad visual y espacio disponible |

No se incluyen en este encargo los aldeanos ni la fauna. Los árboles, rocas,
juncos y río pueden ser otra ronda; no son necesarios para cerrar los edificios.

**Aviso solicitado por el dueño:** avisarle al llegar a los muros, antes de
comenzar esa parte de la tanda 4. Recordarlo al terminar campo y trabajo.

## Ficheros y contrato

Modelado: `art/recipes/<id>/<id>.json`, paleta sólo si hace falta un color
semántico, `art/catalog.json`, publicación selectiva en `public/assets/valley3d/`
y evidencias/documentación de la ronda correspondiente. Asignar el número de
ronda libre al comenzar: G-19 y G-20 ya existen.

Conservar ids, escala, huellas, origen y orientación de los recursos existentes.
Los edificios ocupan su parcela desde una esquina; no deben pasar a modelarse
centrados como los aldeanos. La conversión Blender/glTF ya se compensa en
`world/buildings.ts`. Conservar las posiciones de entrada y las relaciones con
ventanas, humo, nieve y demás efectos; comprobarlas antes de mover esos detalles.

Construcción reproducible con Blender 5.2.1 LTS, paleta común y mallas unidas por
material donde lo permita el contrato. Los presupuestos son los de cada recurso
y del Anexo D: **no trasladar automáticamente el límite de cuatro materiales
de los aldeanos a todos los edificios**. Registrar el antes/después en geometría
y materiales y justificar el coste del detalle visible.

## Costuras de integración comprobadas

- `world/buildings.ts`, `BUILDING_ASSETS`, ya selecciona los edificios de las
  tandas 1 y 2, los campos, defensas y cementerio por sus ids existentes.
- `world/plan.ts` ya pide `field-cut`, `ruin-wood` y `ruin-stone`.
- `world/steading.ts` ya coloca `haystack`, `log-pile` y `handcart`.
- Hay receta de `shed`, pero no se ha encontrado una selección de ese recurso
  en `src/render3d/`. Su rediseño por sí solo no garantiza que aparezca.
- Viviendas adicionales y adornos nuevos necesitan ids acordados y selección
  determinista en el juego. El equipo de integración debe conectarlos; no basta
  añadirlos al catálogo. Las variantes de casa son visuales y no implican nuevos
  tipos de edificio, capacidad ni reglas del motor.
- La animación de aspas, poleas o ruedas requiere comprobar su reproducción en
  el juego. No prometer movimiento por el simple hecho de modelar las piezas.

Los cambios en `src/` corresponden al equipo de integración y se entregarán
como una lista concreta de requisitos, después de verificar el contrato vigente.
Excepción autorizada por el dueño el 16 sep: corregir junto a los modelos de
defensa las uniones, direcciones y esquinas. Esta entrega toca
`world/defences.ts`, `world/plan.ts`, `world/buildings.ts` y sus pruebas;
no cambia el motor ni las reglas de paso.

## Verificación y evidencia

Por tanda: typecheck, lint y pruebas pertinentes a los recursos y su selección;
`npm run art -- all <id>` para cada receta modificada. Conservar las huellas
de los recursos ajenos. No reconstruir los aldeanos.

Entregar las recetas, catálogo generado, binarios, renders y salidas reales.
Comparar los modelos entre sí y junto a aldeanos para comprobar proporciones.
Revisar sobre hierba con luz y cámara del juego, a distancia normal y acercada,
indicando resolución y densidad de pantalla. Un render de taller ayuda a mirar
el acabado, pero no sustituye esa comprobación.

La propuesta falla si las viviendas sólo varían de color, si molino/herrería/
iglesia parecen la misma casa, si los habitantes atraviesan los nuevos volúmenes,
o si los adornos invaden accesos y puestos de trabajo.

## Terminado cuando

Cada tanda tiene modelos revisables, validación técnica, documentación de lo
que entra directamente y lo que necesita integración, y una entrega versionada.
Mostrar primero las viviendas que fijan el estilo y aplicar los comentarios del
dueño a las siguientes tandas. Subir cada tanda terminada antes de ampliar el
trabajo, siguiendo la petición expresa del dueño de no acumular entregas locales.
