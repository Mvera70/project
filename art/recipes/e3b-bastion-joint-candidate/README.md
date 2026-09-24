# E3b · Candidato de bastión con salida lateral abierta

**22 sep 2026 · Fuente de modelo, publicada como candidata G-32; integración pendiente.** Aplica la
corrección de Vera: la unión debe estar abierta. La variante abre la cara
este de una copia de G-27, añade un descansillo al costado de la escalera y
ajusta el primer pretil de la pasarela para obtener un corredor continuo de
**0,70**, con suelo a **Y=1,02**. Conserva las recetas anteriores y los 14
peldaños originales. Es comprobación geométrica, no navegación implementada.

## Fuentes y cambios exactos

- `e3b-bastion-joint-candidate.json`: bastión completo derivado de la receta
  G-27. Elimina `CenterMerlon_3` y `CornerMerlon_SW`; acorta `Parapet_3`;
  prolonga `Platform` hasta X=1; añade `EastLanding` y `LandingCorbel`.
- `e3b-walkway-entry-candidate.json`: copia completa del módulo recto E3b,
  para el **primer tramo exclusivamente**. Su único cambio geométrico es
  `OuterParapet`, que empieza en X local=0,25. Después se usa la receta recta
  anterior sin cambios.
- `review.py`: reconstruye cajas y verifica el corredor de forma continua;
  produce planta, sección, oblicua y medidas en SVG/JSON mediante CPU.

Los peldaños, las otras caras, la almena exterior de esquina este y la
mampostería original quedan idénticos a G-27. El bastión conserva 103 cubos,
**1.236 triángulos estimados**, dos materiales; entrada: 12 cubos,
144 triángulos estimados y un material. Colores y rugosidades proceden de la
paleta del proyecto, sin materiales externos. La revisión inicial no tenía
GLB ni cifras de coste GPU; la exportación aislada posterior se describe al
final. Autoría procedural local, bajo las condiciones del proyecto base.

## Coordenadas y cotas

Tablas en **(X,Y,Z)**, vertical +Y, unidades de celda. Origen de la torre
(0,0,0); interior local +Z; salida lateral +X. En receta Blender,
`(bx,by,bz)=(X,-Z,Y)`, escala 1. El primer módulo de entrada se traslada
X=1 y el segundo módulo recto X=2, sin reescalado.

| Pieza nueva o modificada | X | Y | Z |
|---|---|---|---|
| Plataforma | 0,01…1,00 | 0,958…1,02 | 0,01…1,00 |
| Descansillo al lado de escalera | 0,86…1,00 | 0,958…1,02 | 1,00…1,15 |
| Ménsula del descansillo | 0,86…1,00 | 0,80…0,958 | 0,94…1,15 |
| Resto del pretil este | 0,85…0,99 | 1,02…1,16 | 0,16…0,35 |
| Pretil exterior de entrada, ya colocado | 1,25…2,00 | 1,02…1,20 | 0,33…0,43 |
| Paso recto de entrada | 1,25…2,00 | pies a 1,02 | 0,43…1,15 |

Caja total del bastión candidato: X=0…1, Y=0…1,36, Z=0…2. El acceso
interior sigue midiendo 0,70 entre obstáculos y la escalera 0,72. La superficie
horizontal del peldaño 14 es X=0,14…0,86, Z=1…1,071428571, Y=1,02.
La adición lateral arranca exactamente en **X=0,86**, fuera de ese intervalo:
no cubre, recorta ni invade el volumen de ningún peldaño. Su ménsula se une
al costado de la piedra existente antes de volar hacia Z=1,15.

La plataforma llega a X=1 y toca el tablero de entrada en esa misma cara:
**hueco X=0**, desnivel Y=0. No se oculta el antiguo hueco 0,01 con un collider.
En la abertura del bastión, antes del descansillo, hay Z=0,35…1,071428571,
es decir **0,721428571** de suelo libre. Junto al descansillo crece a 0,80;
en el adarve queda 0,72. El mínimo del giro completo se comprueba aparte,
porque esas anchuras transversales solas no prueban el paso de un disco.

## Giro desde la escalera: comprobación del volumen de paso

Desde el último peldaño se continúa recto por X=0,50 hasta Z=0,72 y sólo
entonces se gira hacia la salida. La línea geométrica del giro, a Y=1,02, es:

`(0,50;0,72) → (0,95;0,72) → (1,20;0,79) → (2,50;0,79)` en (X,Z).

El script obtiene la frontera exterior de la unión de **todas** las cajas
con superficie Y=1,02. Mide analíticamente la distancia mínima entre cada
segmento de la línea y esa frontera, y entre los segmentos y los obstáculos
que sobresalen del suelo. Comprueba además que los extremos están dentro de
la superficie y fuera de obstáculos. No depende de un muestreo de capturas.

| Resultado continuo | Medida |
|---|---:|
| Distancia mínima del eje al borde sin apoyo | 0,351428571 |
| Distancia mínima del eje a obstáculos | 0,350000000 |
| Diámetro de corredor certificado | **0,700000000** |
| Radio corporal solicitado | 0,32 |
| Margen mínimo del cuerpo frente a obstáculo | 0,03 |
| Peldaños idénticos, comparación de primitivas | 14 de 14 |
| Intersección volumétrica de adiciones con escalera | ninguna |

El radio 0,35 verifica una anchura real de 0,70. Por tanto también cabe el
cuerpo de radio 0,32. El retorno es la misma curva invertida. Las distancias
se conservan al girar toda la composición a cualquier orientación cardinal
alrededor de (X,Z)=(0,5;0,5), con la misma fórmula de G-27; no hacen falta
otras mallas para rotar esta **única salida**. No añade salida oeste ni un
doble acceso lateral.

Durante la salida del último peldaño, el centro tiene apoyo y el disco
corporal mantiene al menos 0,35 frente a obstáculos. El disco completo sólo
se exige apoyado horizontalmente **a partir del inicio del giro Z=0,72**:
en una escalera el cuerpo puede proyectarse sobre peldaños a distinta cota.
Esto conserva el contrato E3a; no promete que una suela de diámetro 0,64
quepa en una huella de 0,07143 ni resuelve la animación del pie.

## Por qué también cambia el primer módulo

Abrir solamente el bastión deja un cuello diagonal de **0,656529217**
entre la esquina del suelo junto al peldaño `(0,86;1,071428571)` y la esquina
del pretil exterior anterior `(1;0,43)`. Permite Ø0,64 con poco margen,
pero **incumple** 0,70. La receta de entrada mueve longitudinalmente el
inicio del pretil a X mundial=1,25; el resto del módulo permanece igual.

**Consecuencia visible para revisar:** los primeros 0,25 de borde exterior
del tablero quedan sin pretil alto. El tablero conserva Z=0,33 y la muralla
inferior existente; no se engrosa la fachada. Este alivio forma parte del
candidato, no un cambio oculto de colisión. Si se exige pretil continuo en
ese cuarto de celda, esta variante necesita otra revisión geométrica y no
debe integrarse tal cual. El corredor comprobado se mantiene dentro del
tablero, también en ese intervalo.

## Colisión propuesta y reproducción

Una caja sólida por primitiva, usando sus cotas exactas transformadas a
(X,Y,Z), coincide con suelo, ménsulas y pretiles. La abertura no contiene
las antiguas cajas de almenas ni un obstáculo genérico de torre hasta Y=2.
No se ha programado ningún collider o ruta del juego.

Desde la raíz del proyecto:

```powershell
python art/recipes/e3b-bastion-joint-candidate/review.py
```

Escribe sólo `artifacts/graphics/E3b-bastion-joint-candidate/`:

- `candidate-top.svg`: planta, corredor Ø0,70, escalera y descansillo.
- `candidate-section.svg`: junta sin escalón y proyección del soporte lateral.
- `candidate-oblique.svg`: vista desde el interior con abertura real.
- `candidate-top.png`, `candidate-section.png`, `candidate-oblique.png`:
  copias rasterizadas por CPU para revisar rápidamente las tres vistas.
- `measurements.json`: mediciones, límites y hashes de las cinco recetas.

El script reutiliza las funciones de lectura/proyección del candidato recto,
sin escribir en él. Las fuentes JSON pasan el cargador nativo `loadRecipe`.
Los SVG son diagramas técnicos CPU. Vera aceptó la abertura y el alivio de
pretil en ellos. Colisiones reales, marcha, flechas, sombras e integración
continúan pendientes; las recetas previas no se han sustituido.

`build.ts` exportó, con permiso específico de Vera, una revisión separada de
las tres recetas en
`artifacts/graphics/E3b-bastion-joint-candidate/blender-review-01/`. Primero
comprueba que ese directorio no exista; Blender 5.2.1 produjo `.blend`,
`.glb` y una vista Eevee por recurso. `validate.ts` cargó los tres GLB con
GLTFLoader y guardó `three-validation.json`. El
[informe de exportación](../../../docs/historico/graphics-rounds/E3b0-exportacion-candidata.md)
recoge hashes, tamaños y límites. Los scripts no escriben catálogo ni GLB
públicos. Después de esa exportación, Vera autorizó
[publicar los tres candidatos como G-32](../../../docs/historico/graphics-rounds/G-32-e3b-candidatos.md).
