# Bastión de cruce 24 — fuente candidata

Fuente nueva y aislada para el fixture facilitado: semilla 91, tick 3846,
bastión 296 en celda (40,65), máscara 24. Entrada NE (+1,-1) y salida W
(-1,0). El generador no lee el `state.ts` antiguo ni su región obsoleta:
estos datos son el contrato del encargo, no una reproducción nueva del motor.

## Entregables y coordenadas

`e3b-bastion-crossing-24-candidate.mesh.json` contiene los vértices y triángulos
de cada sólido, materiales, medidas, puertos y recorrido. Usa el formato
explícito `valley-candidate-explicit-mesh-v1`, como las otras fuentes combinadas;
**no es una receta de primitivas para `loadRecipe`**. `generate.ts` la reproduce
sin Blender; `probe.ts` verifica sus propios triángulos por CPU. No importa
generadores ajenos ni depende de la fuente incorrecta W/SE.

XYZ de mundo, Y arriba, norte=-Z. Origen en la esquina de la celda del bastión;
en la colocación prevista se suma (40,0,65). Recorrido local:
NE (1.5,-0.5) → centro (0.5,0.5) → W (0,0.5), todo a Y=1.02.

El bastión es macizo, con seis hiladas de piedra, juntas horizontales rellenas,
tablero de 0.08 y pretiles continuos de 0.24. No incluye escalera. La planta
convexa amplía el giro; sus límites son X=0..1.853553 y Z=-0.853553..1.
No se ha comprobado ocupación de otras construcciones en esa huella ampliada.

## Propiedad de la unión

La boca W termina en X=0. La boca NE termina en X-Z=2, en el centro del
vecino nordeste (celda 41,64). Esta fuente sustituye el bastión y la mitad
adyacente del muro NE: no debe superponerse a su tablero/pretiles existentes.
El integrador debe recortar o sustituir esa mitad. El contrato de recorte es:
en coordenadas locales del bastión, retener del vecino W sólo X<=0, y del
vecino NE sólo X-Z>=2. Ninguna geometría anterior permanece dentro de la
huella sustituida. Los planos tienen grosor cero y se comparten por contacto.

Ambas bocas ahora tienen ancho libre **0,70**, centradas exactamente en sus
ejes. Se midieron los sólidos `Deck`, `ParapetNorth` y `ParapetSouth` de las
fuentes straight y diagonal de `e3b-walltop-finish-candidate`, incluyendo
rotación real del diagonal, no sus metadatos: tablero 0,90 de ancho,
Y=0,94..1,02; pretiles en bandas transversales [-0,45,-0,35] y [0,35,0,45],
Y=1,02..1,20. Las mismas bandas contactan enteras con los extremos de esta
fuente. El bastión cierra además toda sección sobrante hasta su borde exterior.
La altura 1,26 del bastión crea un pequeño escalón respecto al pretil 1,20 del
vecino, sin abrir ningún hueco por debajo. Los merlones del vecino son aditivos.

W se monta con el eje del vecino paralelo a X y centro transversal Z=0,5.
NE se monta con su eje paralelo a (1,-1), centro de sección (1,5,-0,5).
La sección es uniforme, por lo que el recorte debe ejecutarse a esas cotas sin
desplazar lateralmente el vecino. Los hashes de las dos fuentes leídas están
en `measurements.json`. La colocación efectiva sigue siendo responsabilidad
de la integración.

## Medidas CPU

Resultado guardado en `measurements.json`:

| Propiedad | Resultado |
|---|---:|
| Triángulos / presupuesto local | 244 / 600 |
| Sólidos / materiales / texturas | 15 / 2 / 0 |
| Cota del suelo | 1.02 |
| Boca W libre | 0.70 |
| Boca NE libre | 0.70 |
| Distancia mínima continua del eje a pretiles | 0.35 |
| Margen sobre disco radio 0.35 | 0 |
| Muestras de disco con suelo y sin pretil | 67.795 / 67.795 |
| Muestras del borde cerrado cubiertas por pretil | 2.997 / 2.997 |
| Estratos apoyados desde suelo a tablero | 13 |
| Contactos medidos con pretiles vecinos W / NE | 202 / 202 |
| Cierres medidos en sección sobrante W / NE | 500 / 300 |

La cota y el paso se comprueban con rayos sobre los triángulos reales. Además,
la distancia exacta entre segmentos de ruta y aristas finitas de los pretiles
prueba el disco continuo, incluso en la pieza cóncava del giro: no depende
sólo del muestreo. La unión interior en inglete mantiene libre el disco.
6.510 puntos fuera de los dos planos de interfaz corresponden al vecino y
se excluyen expresamente. Apoyo acreditado por igualdad de toda la sección
horizontal y contacto exacto de cada estrato, incluyendo juntas rellenas.
Cada sólido tiene malla cerrada, orientación exterior y cero caras degeneradas.
Hay caras interiores compartidas entre sólidos en contacto; no volúmenes
superpuestos ni dos tableros coplanares.

La sonda Rapier `check-rapier.ts` comprueba los pretiles como mallas trianguladas:
956 posiciones de un cilindro de radio 0,32 a lo largo del eje quedan libres
y un volumen sobre el borde exterior sí choca. **No usar una sola envolvente
convexa por pretil**: la prueba negativa produjo 908 intersecciones falsas
porque esa envolvente rellena la concavidad del giro. La colisión final debe
conservar el contorno triangulado o descomponerlo en convexos exactos.

Controles negativos: quitar tablero deja sin suelo; reflejar el norte deja
sin suelo la boca NE; un tapón en W invade el paso. TypeScript focal y ESLint
focal pasan. El presupuesto es de esta candidata, no una medida de rendimiento.

## Reproducción

Desde CMD:

```bat
cd /d "D:\DESARROLLO\PROYECTOS\VALLEY\project"
node node_modules/tsx/dist/cli.mjs art/recipes/e3b-bastion-crossing-24-candidate/generate.ts --write
node node_modules/tsx/dist/cli.mjs art/recipes/e3b-bastion-crossing-24-candidate/probe.ts --record
node node_modules/tsx/dist/cli.mjs art/recipes/e3b-bastion-crossing-24-candidate/check-rapier.ts
node node_modules/typescript/bin/tsc -p art/recipes/e3b-bastion-crossing-24-candidate/tsconfig.json --noEmit
node node_modules/eslint/bin/eslint.js art/recipes/e3b-bastion-crossing-24-candidate/generate.ts art/recipes/e3b-bastion-crossing-24-candidate/probe.ts
```

## Límites

No se exportó GLB ni se ejecutó Blender, GPU o runtime. No hay aceptación
visual, prueba de cápsula en movimiento, resistencia estructural, ocupación
de escena ni unión con los vecinos ya integrados. La sonda geométrica no
autoriza esos pasos. La fuente anterior y el software del juego quedan intactos.
Selección, adaptación de exportación e integración corresponden al coordinador.
El ancho 0,70 deja contacto tangente con un disco de diámetro 0,70: no se
acredita tolerancia para separación física, collider skin o error de montaje.

`export-static.py` deja preparado un exportador de revisión aislada. Su
ejecución exige autorizar antes la invocación exacta con `--authorize-export`;
la salida prevista queda en `artifacts/graphics/E3b2-candidates/` y no altera
el catálogo ni la demo.
